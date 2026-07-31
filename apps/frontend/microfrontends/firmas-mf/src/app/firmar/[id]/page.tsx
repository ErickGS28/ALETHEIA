import { SignatureCanvasView } from '../../../features/signature-canvas/components/SignatureCanvasView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SignatureCanvasView contractId={id} />;
}
