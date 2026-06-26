'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function CopyButton({ value }: { value: string }) {
  return <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="ml-2 border border-neutral-300 px-2 py-1 text-xs font-bold">kopírovat</button>;
}

function PaymentResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status');
  const orderId = params.get('orderId');
  const orderNumber = params.get('orderNumber') || orderId || '';
  const variableSymbol = params.get('variableSymbol') || orderNumber.replace(/\D/g, '').slice(-10);
  const amount = params.get('amount') || '';

  if (status === 'bank-transfer') {
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-950">
        <div className="border-b border-neutral-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link href="/" className="text-3xl font-black">FlipFlop</Link>
            <div className="hidden gap-5 text-sm font-semibold md:flex"><span>Stačí písknout</span><span>+420 226 201 606</span><span>eshop@flipflop.alfares.cz</span></div>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-6 py-14">
          <section className="text-center">
            <h1 className="text-4xl font-black md:text-5xl">Zálohovou fakturu jsme vám odeslali na email.</h1>
            <p className="mt-6 text-xl">Potvrzení může trvat několik minut, prosíme o trpělivost.</p>
            <p className="mt-5 font-bold">Při platbě dnes je předpokládaný termín doručení: {new Date(Date.now() + 3 * 86400000).toLocaleDateString('cs-CZ')}</p>
          </section>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <section className="border-2 border-amber-500 bg-amber-50 p-8 text-center">
              <p className="mb-6 text-lg">Údaje pro platbu bankovním převodem budou zaslány i na e-mail.</p>
              <div className="space-y-4 text-xl">
                <p>Variabilní symbol: <strong>{variableSymbol || '[MISSING: variable symbol]'}</strong>{variableSymbol && <CopyButton value={variableSymbol} />}</p>
                <p>Částka k úhradě: <strong>{amount ? Number(amount).toLocaleString('cs-CZ') + ' Kč' : '[MISSING: amount]'}</strong>{amount && <CopyButton value={amount} />}</p>
                <p>Číslo účtu: <strong>[MISSING: production bank account]</strong></p>
              </div>
              <div className="mx-auto mt-8 flex h-48 w-48 items-center justify-center border border-dashed border-amber-700 bg-white p-4 text-sm font-bold text-amber-800">QR platba čeká na nastavení produkčního bankovního účtu.</div>
              <p className="mt-6 font-bold">Důležité upozornění</p>
              <p className="mx-auto mt-2 max-w-xl">Jakmile bude produkční účet nastavený, QR platba bude generována z reálných platebních údajů bez ručního přepisování.</p>
            </section>
            <section className="border border-neutral-200 bg-white p-8">
              <h2 className="mb-4 text-3xl font-black">Detail objednávky →</h2>
              <p className="font-semibold">Souhrn objednávky {orderNumber} jsme poslali i na váš e-mail.</p>
              <div className="mt-8 border-t border-dashed border-neutral-300 pt-6"><p className="font-bold">Způsob platby</p><p>Zálohová faktura</p></div>
              <div className="mt-6 border-t border-dashed border-neutral-300 pt-6"><p className="font-bold">Doprava</p><p>Standard - jedna zásilka</p></div>
            </section>
          </div>
          <section className="mt-10 grid gap-8 border border-neutral-200 bg-white p-8 md:grid-cols-3">
            <div><h3 className="text-2xl font-black">Nevíš si s něčím rady?</h3><p className="font-black text-pink-700">Stačí písknout.</p><p>Po - Pá: 8:30 - 18:00</p><p>So - Ne: 9:00 - 17:00</p></div>
            <div className="font-bold"><p>+420 226 201 606</p><p>eshop@flipflop.alfares.cz</p></div>
            <div><h3 className="text-2xl font-black">Typická vytíženost zákaznické linky</h3><p className="mt-3 inline-block bg-green-600 px-8 py-3 font-black text-white">Nízká</p></div>
          </section>
        </main>
      </div>
    );
  }

  if (status === 'completed') {
    return <Result title="Platba proběhla úspěšně!" body="Vaše objednávka byla potvrzena. Potvrzení vám zašleme na e-mail." orderId={orderId} />;
  }

  if (status === 'created') {
    return <Result title="Objednávka byla vytvořena" body="Objednávku jsme přijali. Jakmile bude potřeba další krok k platbě nebo registraci, pošleme instrukce na e-mail." orderId={orderId} />;
  }

  if (status === 'cancelled') {
    return <Result title="Platba zrušena" body="Platbu jste zrušili. Vaše objednávka nebyla potvrzena." action={<button onClick={() => router.push('/checkout')} className="bg-blue-600 px-8 py-4 font-bold text-white">Zkusit znovu</button>} />;
  }

  return <Result title="Platba se nezdařila" body="Při zpracování platby došlo k chybě. Vaše karta nebyla zatížena." action={<button onClick={() => router.push('/checkout')} className="bg-red-600 px-8 py-4 font-bold text-white">Zkusit znovu</button>} />;
}

function Result({ title, body, orderId, action }: { title: string; body: string; orderId?: string | null; action?: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-white"><div className="mx-4 max-w-lg border border-neutral-200 p-10 text-center shadow-lg"><h1 className="text-4xl font-black">{title}</h1><p className="mt-5 text-lg text-neutral-600">{body}</p>{orderId && <Link href={'/orders/' + orderId} className="mt-8 inline-block bg-blue-600 px-8 py-4 font-bold text-white">Zobrazit objednávku</Link>}{action && <div className="mt-8">{action}</div>}<div className="mt-8"><Link href="/products" className="font-bold text-blue-700 underline">Pokračovat v nákupu</Link></div></div></div>;
}

export default function PaymentResultPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Načítání...</div>}><PaymentResultContent /></Suspense>;
}
