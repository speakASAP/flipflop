import Link from 'next/link';
import { footerCustomerDocuments, footerLegalDocuments } from '@/lib/legal-documents';

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
      <div className="container mx-auto grid gap-8 px-4 py-10 md:grid-cols-4">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">FlipFlop</h2>
          <p className="mt-3 leading-6">
            Chintamani s.r.o.<br />
            Vilémovice 106<br />
            584 01 Vilémovice
          </p>
          <p className="mt-3 leading-6">
            <a className="hover:text-slate-800" href="mailto:flipflop@flipflop.cz">flipflop@flipflop.cz</a><br />
            <a className="hover:text-slate-800" href="tel:+420770125450">+420 770 125 450</a>
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dokumenty</h2>
          <ul className="mt-3 space-y-2">
            {footerLegalDocuments.map((document) => (
              <li key={document.slug}>
                <Link className="hover:text-slate-800" href={`/${document.slug}`}>
                  {document.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pro zákazníky</h2>
          <ul className="mt-3 space-y-2">
            {footerCustomerDocuments.map((document) => (
              <li key={document.slug}>
                <Link className="hover:text-slate-800" href={`/${document.slug}`}>
                  {document.title}
                </Link>
              </li>
            ))}
            <li>
              <Link className="hover:text-slate-800" href="/blog">Blog</Link>
            </li>
            <li>
              <a className="hover:text-slate-800" href="https://www.mall.cz/partner/chintamani-s-r-o" target="_blank" rel="noreferrer">
                Jsme na MALL.CZ
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platby a nastavení</h2>
          <ul className="mt-3 space-y-2">
            <li>Bankovní účet ČR: 2000666557/2010</li>
            <li>IBAN: CZ3520100000002000666557</li>
            <li>
              <Link className="hover:text-slate-800" href="/cookies">
                Nastavení cookies
              </Link>
            </li>
          </ul>
        </section>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} flipflop.alfares.cz
      </div>
    </footer>
  );
}
