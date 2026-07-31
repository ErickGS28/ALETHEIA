import { TemplateEditorView } from '../../../features/template-editor/components/TemplateEditorView';

export default async function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateEditorView templateId={id} />;
}
