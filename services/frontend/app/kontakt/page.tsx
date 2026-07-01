import LegalDocumentPage from '@/components/LegalDocumentPage';
import { findLegalDocument } from '@/lib/legal-documents';
import { notFound } from 'next/navigation';

const document = findLegalDocument('kontakt');

export const metadata = {
  title: `${document?.title ?? 'Dokument'} | FlipFlop`,
  description: document?.description,
};

export default function Page() {
  if (!document) {
    notFound();
  }

  return <LegalDocumentPage document={document} />;
}
