import Link from 'next/link';

export const metadata = {
  title: 'Doprava po Ceske republice | FlipFlop',
  description: 'Prehled doruceni objednavek FlipFlop po Ceske republice.',
};

export default function DeliveryPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-16">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-600">Doprava</p>
          <h1 className="max-w-4xl text-4xl font-extrabold text-slate-950 md:text-6xl">
            Doprava po Ceske republice
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
            Objednavky dorucujeme po cele CR. Konkretni moznosti dopravy a cena se zobrazi v kosiku podle zbozi, skladove dostupnosti a dorucovaci adresy.
          </p>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Rychle odeslani</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Zbozi skladem pripravujeme k expedici co nejdrive po potvrzeni objednavky. U online plateb zaciname zpracovani po potvrzeni platby.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Doruceni domu nebo na vydejni misto</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            V checkoutu si vyberete doruceni na adresu nebo dostupne vydejni misto. Nabidka dopravcu se muze menit podle aktualni dostupnosti.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Informace k objednavce</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Po vytvoreni objednavky posleme potvrzeni na e-mail. Pokud budeme potrebovat doplnit udaje k doruceni, kontaktujeme vas e-mailem nebo telefonem.
          </p>
        </article>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-slate-900 p-8 text-white md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-3xl font-black">Potrebujete pomoc s dopravou?</h2>
            <p className="mt-3 max-w-2xl text-slate-200">
              Pokud si nejste jisti vhodnou dopravou pro konkretni produkt, napiste nam pres kontaktni formular na hlavni strance.
            </p>
          </div>
          <Link
            href="/#kontakt"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-blue-50 md:mt-0"
          >
            Kontaktovat FlipFlop
          </Link>
        </div>
      </section>
    </main>
  );
}
