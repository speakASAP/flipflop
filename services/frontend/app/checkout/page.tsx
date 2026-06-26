'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cart } from '@/lib/api/cart';
import { CreateGuestOrderData, ordersApi } from '@/lib/api/orders';
import { clearGuestCart, getGuestCart, GuestCart } from '@/lib/guest-cart';
import { useAuth } from '@/contexts/AuthContext';

type CheckoutStep = 'delivery' | 'details';
type CartView = Cart | GuestCart;
type PaymentMethod = 'invoice' | 'webpay' | 'stripe' | 'paypal' | 'payu';

type FormState = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  note: string;
  createAccount: boolean;
  differentDelivery: boolean;
  deliveryStreet: string;
  deliveryCity: string;
  deliveryPostalCode: string;
};

const DELIVERY_OPTIONS = [
  { id: 'store', label: 'Osobní odběr na prodejně FlipFlop', price: 0, meta: 'Připraveno po potvrzení skladové dostupnosti' },
  { id: 'pickup-box', label: 'Výdejní boxy a odběrná místa', price: 59, meta: 'Síť partnerských výdejních míst' },
  { id: 'prague-time', label: 'Doručení Praha na čas', price: 89, meta: 'Kurýr v domluveném časovém okně' },
  { id: 'zasilkovna-address', label: 'Zásilkovna na adresu', price: 89, meta: 'Klasická česká doručovací volba' },
  { id: 'dpd', label: 'Přepravní služba DPD', price: 89, meta: 'Standardní balíková doprava' },
];

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; price: number; meta: string }> = [
  { id: 'invoice', label: 'Zálohová faktura', price: 0, meta: 'Bankovní převod, QR bude dostupný po nastavení účtu' },
  { id: 'webpay', label: 'Platební karta GP WebPay', price: 0, meta: 'Přesměrování na platební bránu' },
  { id: 'stripe', label: 'Platební karta Stripe', price: 0, meta: 'Mezinárodní platební karta' },
  { id: 'paypal', label: 'PayPal', price: 0, meta: 'PayPal účet nebo karta' },
  { id: 'payu', label: 'PayU', price: 0, meta: 'Online platba přes PayU' },
];

const TIP_OPTIONS = [0, 10, 20, 30];
const initialForm: FormState = {
  email: '', phone: '', firstName: '', lastName: '', street: '', city: '', postalCode: '', country: 'Česká republika', note: '',
  createAccount: false, differentDelivery: false, deliveryStreet: '', deliveryCity: '', deliveryPostalCode: '',
};

const getCartProduct = (item: any) => item.product || item.products;
const money = (value: number) => Math.round(value).toLocaleString('cs-CZ') + ' Kč';

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [deliveryMethod, setDeliveryMethod] = useState('zasilkovna-address');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('invoice');
  const [differentDay, setDifferentDay] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const [operatorTip, setOperatorTip] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    setCart(getGuestCart());
    if (user) {
      setForm((current) => ({ ...current, email: user.email || current.email, phone: user.phone || current.phone, firstName: user.firstName || current.firstName, lastName: user.lastName || current.lastName }));
    }
  }, [authLoading, user]);

  const selectedDelivery = DELIVERY_OPTIONS.find((option) => option.id === deliveryMethod) || DELIVERY_OPTIONS[0];
  const selectedPayment = PAYMENT_OPTIONS.find((option) => option.id === paymentMethod) || PAYMENT_OPTIONS[0];
  const subtotal = cart?.total || 0;
  const total = subtotal + selectedDelivery.price + selectedPayment.price + operatorTip;
  const validContact = Boolean(form.email.includes('@') && form.phone.trim() && form.firstName.trim() && form.lastName.trim());
  const validAddress = Boolean(form.street.trim() && form.city.trim() && form.postalCode.trim());
  const orderItems = useMemo(() => cart?.items.map((item: any) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) || [], [cart]);

  const updateForm = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const goToDetails = () => {
    setError(null);
    if (!deliveryMethod) { setError('Není vybrán způsob dopravy.'); return; }
    if (!paymentMethod) { setError('Není vybrán způsob platby.'); return; }
    setStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!cart || cart.items.length === 0) { setError('Košík je prázdný.'); return; }
    if (!validContact) { setError('Doplňte prosím kontaktní údaje.'); return; }
    if (!validAddress) { setError('Doplňte prosím fakturační adresu.'); return; }
    setProcessing(true);
    try {
      const billingAddress = { firstName: form.firstName, lastName: form.lastName, street: form.street, city: form.city, postalCode: form.postalCode, country: form.country, phone: form.phone };
      const payload: CreateGuestOrderData = {
        email: form.email, phone: form.phone, wantsAccount: form.createAccount, billingAddress,
        deliveryAddress: form.differentDelivery ? { ...billingAddress, street: form.deliveryStreet, city: form.deliveryCity, postalCode: form.deliveryPostalCode } : billingAddress,
        items: orderItems, paymentMethod, deliveryMethod, expeditionMethod: 'standard-one-shipment', wantsDifferentDeliveryDay: differentDay,
        requestedDeliveryDate: differentDay ? requestedDate : undefined, operatorTip, notes: form.note, shippingCost: selectedDelivery.price + selectedPayment.price + operatorTip,
      };
      const response = await ordersApi.createGuestOrder(payload);
      if (!response.success || !response.data) { setError(response.error?.message || 'Nepodařilo se vytvořit objednávku.'); return; }
      clearGuestCart();
      if (response.data.redirectUrl) window.location.href = response.data.redirectUrl;
      else router.push('/payment-result?status=created&orderId=' + encodeURIComponent(response.data.order.id));
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || !cart) return <main className="min-h-screen bg-white px-6 py-12">Načítání pokladny...</main>;
  if (cart.items.length === 0) return <main className="min-h-screen bg-white px-6 py-16"><div className="mx-auto max-w-2xl text-center"><h1 className="text-4xl font-black text-neutral-950">Váš košík je prázdný</h1><Link href="/products" className="mt-8 inline-flex bg-green-600 px-8 py-4 font-bold text-white hover:bg-green-700">Prohlédnout produkty</Link></div></main>;

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7"><Link href="/" className="text-3xl font-black tracking-tight">FlipFlop</Link><div className="hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex"><span>Stačí písknout</span><span>+420 226 201 606</span><span>eshop@flipflop.alfares.cz</span></div></div></header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-12 grid grid-cols-3 items-start gap-3">
          {[["✓", "Obsah košíku"], [step === 'delivery' ? '2.' : '✓', 'Doprava a platba'], ['3.', 'Doručovací údaje']].map(([mark, label], index) => (
            <div key={label} className="text-center"><div className={'mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white ' + (index === 2 && step !== 'details' ? 'bg-neutral-400' : 'bg-green-600')}>{mark}</div><div className={'mt-3 text-sm font-black md:text-base ' + (index === 2 && step !== 'details' ? 'text-neutral-800' : 'text-green-600')}>{label}</div></div>
          ))}
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <section>
            {step === 'delivery' ? (
              <div className="space-y-10">
                <section className={'border p-6 ' + (error?.includes('dopravy') ? 'border-red-500' : 'border-neutral-200')}><h1 className="mb-6 text-4xl font-black">Doprava</h1>{error?.includes('dopravy') && <p className="mb-4 font-semibold text-red-600">{error}</p>}<div className="divide-y divide-neutral-200">{DELIVERY_OPTIONS.map((option) => <ChoiceRow key={option.id} checked={deliveryMethod === option.id} onChange={() => setDeliveryMethod(option.id)} label={option.label} meta={option.meta} price={option.price === 0 ? 'ZDARMA' : money(option.price)} />)}</div></section>
                <section className="border border-pink-500 p-6"><h2 className="mb-5 text-3xl font-black">Expedice</h2><label className="flex items-center gap-4"><input type="checkbox" checked readOnly className="h-5 w-5 accent-pink-600" /><span className="flex-1 text-lg font-bold">Standard - jedna zásilka</span><span className="font-black text-green-600">ZDARMA</span></label><p className="ml-9 mt-3 text-sm font-semibold text-neutral-600">Expedujeme: {new Date().toLocaleDateString('cs-CZ')} (doručení: do 3 dnů)</p></section>
                <section className="border border-neutral-200 p-6"><h2 className="mb-5 text-3xl font-black">Platba</h2><div className="divide-y divide-neutral-200">{PAYMENT_OPTIONS.map((option) => <ChoiceRow key={option.id} checked={paymentMethod === option.id} onChange={() => setPaymentMethod(option.id)} label={option.label} meta={option.meta} price={option.price === 0 ? 'ZDARMA' : money(option.price)} />)}</div></section>
                <section className="space-y-5"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={differentDay} onChange={(event) => setDifferentDay(event.target.checked)} className="h-5 w-5 accent-pink-600" />Chci zboží doručit v jiný den</label>{differentDay && <input type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="border border-neutral-300 px-4 py-3" />}<div><h3 className="text-2xl font-black">Poděkování operátorům expedice</h3><div className="mt-4 flex flex-wrap gap-3">{TIP_OPTIONS.map((tip) => <button key={tip} type="button" onClick={() => setOperatorTip(tip)} className={'border px-5 py-3 font-bold ' + (operatorTip === tip ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-neutral-300')}>{tip === 0 ? 'Tentokrát ne' : money(tip)}</button>)}</div></div><button onClick={goToDetails} className="w-full bg-green-600 px-8 py-5 text-xl font-black text-white hover:bg-green-700">Pokračovat na osobní údaje →</button></section>
              </div>
            ) : (
              <form onSubmit={submitOrder} className="space-y-10"><section className="border border-neutral-200 p-8"><div className="mb-8"><p className="font-semibold">Máte již u nás účet?</p><Link href={'/login?redirect=' + encodeURIComponent('/checkout')} className="font-bold text-pink-700 underline">Přihlaste se</Link><span> a my vše předvyplníme.</span></div><h1 className="mb-6 text-4xl font-black">Kontaktní údaje</h1><div className="grid gap-5 md:grid-cols-2"><Field label="E-mail *" value={form.email} valid={form.email.includes('@')} onChange={(value) => updateForm('email', value)} /><Field label="Telefon *" value={form.phone} valid={Boolean(form.phone.trim())} onChange={(value) => updateForm('phone', value)} /><Field label="Jméno *" value={form.firstName} valid={Boolean(form.firstName.trim())} onChange={(value) => updateForm('firstName', value)} /><Field label="Příjmení *" value={form.lastName} valid={Boolean(form.lastName.trim())} onChange={(value) => updateForm('lastName', value)} /></div><h2 className="mb-6 mt-10 text-3xl font-black">Fakturační údaje</h2><div className="grid gap-5 md:grid-cols-2"><Field label="Ulice a č. p. *" value={form.street} valid={Boolean(form.street.trim())} onChange={(value) => updateForm('street', value)} /><Field label="Město *" value={form.city} valid={Boolean(form.city.trim())} onChange={(value) => updateForm('city', value)} /><Field label="PSČ *" value={form.postalCode} valid={Boolean(form.postalCode.trim())} onChange={(value) => updateForm('postalCode', value)} /><label className="block font-semibold">Země<select value={form.country} onChange={(event) => updateForm('country', event.target.value)} className="mt-2 w-full border border-neutral-300 px-4 py-3"><option>Česká republika</option><option>Slovensko</option></select></label></div><label className="mt-8 flex items-center gap-3 font-semibold"><input type="checkbox" checked={form.differentDelivery} onChange={(event) => updateForm('differentDelivery', event.target.checked)} className="h-5 w-5 accent-pink-600" />Dodací údaje jsou jiné než fakturační</label>{form.differentDelivery && <div className="mt-5 grid gap-5 md:grid-cols-3"><Field label="Dodací ulice" value={form.deliveryStreet} valid={Boolean(form.deliveryStreet.trim())} onChange={(value) => updateForm('deliveryStreet', value)} /><Field label="Dodací město" value={form.deliveryCity} valid={Boolean(form.deliveryCity.trim())} onChange={(value) => updateForm('deliveryCity', value)} /><Field label="Dodací PSČ" value={form.deliveryPostalCode} valid={Boolean(form.deliveryPostalCode.trim())} onChange={(value) => updateForm('deliveryPostalCode', value)} /></div>}<label className="mt-8 block font-semibold">Poznámka<textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} className="mt-2 h-24 w-full border border-neutral-300 px-4 py-3" /></label><label className="mt-8 flex items-center gap-3 font-semibold"><input type="checkbox" checked={form.createAccount} onChange={(event) => updateForm('createAccount', event.target.checked)} className="h-5 w-5 accent-pink-600" />Chci vytvořit účet</label>{form.createAccount && <p className="mt-3 max-w-xl text-sm font-semibold text-neutral-600">Po dokončení objednávky vám pošleme e-mail pro bezpečné dokončení účtu. Objednávka tím není podmíněná.</p>}</section>{error && <div className="border border-red-500 bg-red-50 px-5 py-4 font-semibold text-red-700">{error}</div>}<button disabled={processing} className="w-full bg-green-600 px-8 py-5 text-xl font-black text-white hover:bg-green-700 disabled:opacity-60">{processing ? 'Odesíláme objednávku...' : 'Odeslat objednávku s povinností platby →'}</button><p className="text-center text-sm text-neutral-500">Dokončením objednávky souhlasíte s obchodními podmínkami a zpracováním osobních údajů.</p><button type="button" onClick={() => setStep('delivery')} className="font-bold underline">← Zpět na dopravu a platbu</button></form>
            )}
          </section>
          <aside className="lg:sticky lg:top-6 lg:self-start"><div className="border border-neutral-200 bg-white p-6 shadow-lg"><h2 className="mb-6 text-3xl font-black">Souhrn objednávky</h2><div className="space-y-5">{cart.items.map((item: any) => { const product = getCartProduct(item); return <div key={item.id} className="flex gap-4 border-b border-neutral-200 pb-4"><div className="h-16 w-16 overflow-hidden border border-neutral-200 bg-neutral-50">{product?.mainImageUrl ? <img src={product.mainImageUrl} alt={product.name} className="h-full w-full object-cover" /> : null}</div><div className="flex-1"><p className="text-sm font-black">{product?.name || 'Produkt'}</p><p className="text-sm text-neutral-500">{item.quantity}×</p></div><p className="font-bold">{money(item.price * item.quantity)}</p></div>; })}<SummaryRow label="Produkty v košíku v hodnotě" value={money(subtotal)} /><SummaryRow label="Standard - jedna zásilka" value="ZDARMA" /><SummaryRow label={selectedDelivery.label} value={selectedDelivery.price === 0 ? 'ZDARMA' : money(selectedDelivery.price)} /><SummaryRow label={selectedPayment.label} value={selectedPayment.price === 0 ? 'ZDARMA' : money(selectedPayment.price)} />{operatorTip > 0 && <SummaryRow label="Poděkování expedici" value={money(operatorTip)} />}<div className="border-t border-neutral-200 pt-5"><div className="flex justify-between text-2xl font-black text-pink-700"><span>Celkem k zaplacení</span><span>{money(total)}</span></div><p className="text-right text-sm text-neutral-500">Cena bude přepočítána serverem při odeslání.</p></div></div></div></aside>
        </div>
      </div>
    </main>
  );
}

function ChoiceRow({ checked, onChange, label, meta, price }: { checked: boolean; onChange: () => void; label: string; meta: string; price: string }) {
  return <label className="flex cursor-pointer items-center gap-4 py-5"><input type="radio" checked={checked} onChange={onChange} className="h-5 w-5 accent-pink-600" /><span className="flex-1"><span className="block text-lg font-bold">{label}</span><span className="text-sm text-neutral-500">{meta}</span></span><span className="font-black text-green-600">{price}</span></label>;
}

function Field({ label, value, valid, onChange }: { label: string; value: string; valid: boolean; onChange: (value: string) => void }) {
  return <label className="block font-semibold">{label}<span className="relative mt-2 block"><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-neutral-300 px-4 py-3 pr-10 focus:border-pink-600 focus:outline-none" />{valid && <span className="absolute right-3 top-3 font-black text-green-600">✓</span>}</span></label>;
}


function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-neutral-700">{label}</span><span className="font-black">{value}</span></div>;
}
