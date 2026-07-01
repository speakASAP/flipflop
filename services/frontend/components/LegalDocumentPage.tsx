import { LegalDocument } from '@/lib/legal-documents';

export default function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container mx-auto px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dokument</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold text-slate-950 md:text-5xl">{document.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{document.description}</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <article
          className="legal-document mx-auto max-w-4xl"
          dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
        />
      </section>
    </main>
  );
}
