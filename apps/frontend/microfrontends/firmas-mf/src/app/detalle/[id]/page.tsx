import { SignatureDetailView } from '../../../features/signature-detail/components/SignatureDetailView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SignatureDetailView contractId={id} />;
}
