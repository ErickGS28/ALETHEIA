import { ContractDetailView } from '../../features/contract-detail/components/ContractDetailView';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractDetailView contractId={id} />;
}
