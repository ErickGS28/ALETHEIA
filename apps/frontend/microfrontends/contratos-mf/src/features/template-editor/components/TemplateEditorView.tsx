'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DEFAULT_PAGE_SETUP,
  DocumentPreview,
  Input,
  type PageSetup,
  PageSetupControl,
  RichTextEditor,
  useRole,
} from '@aletheia/frontend-commons';
import { Eye, EyeOff, Power, PowerOff, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { NoAccess } from '../../../components/ui/no-access';
import { PageHeader } from '../../../components/ui/page-header';
import {
  useCreateTemplateMutation,
  useGetTemplateQuery,
  useUpdateTemplateMutation,
} from '../../api/templatesApi';
import { DEFAULT_FOOTER, DEFAULT_HEADER } from '../../templates/types';

const EMPTY_CONTENT = '<h2>Nueva plantilla</h2><p>Escribe aquí las cláusulas del contrato…</p>';

function ActiveToggleButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? 'outline' : 'default'} onClick={onClick} disabled={disabled}>
      {active ? (
        <>
          <PowerOff className="h-4 w-4" /> Desactivar
        </>
      ) : (
        <>
          <Power className="h-4 w-4" /> Activar
        </>
      )}
    </Button>
  );
}

interface TemplateFormProps {
  isEdit: boolean;
  name: string;
  content: string;
  header: string;
  footer: string;
  pageSetup: PageSetup;
  active: boolean;
  error: string | null;
  savedAt: string | null;
  saving: boolean;
  onNameChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onHeaderChange: (v: string) => void;
  onFooterChange: (v: string) => void;
  onPageSetupChange: (v: PageSetup) => void;
  onSave: () => void;
}

function TemplateForm(props: TemplateFormProps) {
  const {
    isEdit,
    name,
    content,
    header,
    footer,
    pageSetup,
    active,
    error,
    savedAt,
    saving,
    onNameChange,
    onContentChange,
    onHeaderChange,
    onFooterChange,
    onPageSetupChange,
    onSave,
  } = props;

  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Datos de la plantilla</CardTitle>
          {isEdit ? (
            <Badge variant={active ? 'default' : 'secondary'}>
              {active ? 'Activa' : 'Inactiva'}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input
              id="tpl-name"
              placeholder="Ej. Contrato de Prestación de Servicios"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          {error ? (
            <p className="font-sans text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diseño de página</CardTitle>
          <CardDescription>
            Tamaño, márgenes, encabezado y pie. El pie admite el token{' '}
            <code className="font-sans">{'{{page}}'}</code> para el número de página al imprimir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <PageSetupControl value={pageSetup} onChange={onPageSetupChange} />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Encabezado</Label>
              <RichTextEditor
                value={header}
                onChange={onHeaderChange}
                compact
                ariaLabel="Encabezado de la plantilla"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pie de página</Label>
              <RichTextEditor
                value={footer}
                onChange={onFooterChange}
                compact
                ariaLabel="Pie de página de la plantilla"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextEditor
            value={content}
            onChange={onContentChange}
            ariaLabel="Contenido de la plantilla"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" />{' '}
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
            <Button variant="neutral" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Ocultar vista previa' : 'Ver documento'}
            </Button>
            {savedAt ? (
              <span className="font-sans text-xs text-foreground/50">Guardado a las {savedAt}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa del documento</CardTitle>
            <CardDescription>Así se verá la plantilla impresa o en PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentPreview body={content} header={header} footer={footer} pageSetup={pageSetup} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

interface TemplateEditorViewProps {
  /** Si se provee, edita la plantilla existente; si no, crea una nueva. */
  templateId?: string;
}

export function TemplateEditorView({ templateId }: TemplateEditorViewProps) {
  const { can } = useRole();
  const canManage = can('TEMPLATES_MANAGE');
  const router = useRouter();

  const isEdit = Boolean(templateId);
  const numericId = templateId ? Number(templateId) : Number.NaN;
  const skipFetch = !canManage || !isEdit || Number.isNaN(numericId);

  const {
    data: template,
    isLoading: isFetching,
    isError: isFetchError,
    error: fetchError,
  } = useGetTemplateQuery(numericId, { skip: skipFetch });
  const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();

  const [name, setName] = useState('');
  const [content, setContent] = useState<string>(EMPTY_CONTENT);
  const [header, setHeader] = useState<string>(DEFAULT_HEADER);
  const [footer, setFooter] = useState<string>(DEFAULT_FOOTER);
  const [pageSetup, setPageSetup] = useState<PageSetup>(DEFAULT_PAGE_SETUP);
  const [active, setActive] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Carga inicial de la plantilla en modo edición (desde el backend).
  useEffect(() => {
    if (!template || loadedRef.current) return;
    setName(template.name);
    setContent(template.content);
    setActive(template.isActive);
    loadedRef.current = true;
  }, [template]);

  if (!canManage) return <NoAccess />;

  const hasFetchError = Boolean(isEdit && !skipFetch && isFetchError);
  // RTK errors expose a numeric HTTP `status` for server responses (FetchBaseQueryError).
  const errorStatus =
    fetchError && typeof fetchError === 'object' && 'status' in fetchError
      ? (fetchError as { status?: number | string }).status
      : undefined;
  const notFound = hasFetchError && errorStatus === 404;
  const loadFailed = hasFetchError && !notFound;
  const isLoadingTemplate = Boolean(isEdit && !skipFetch && isFetching);
  const isSaving = isCreating || isUpdating;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }
    setError(null);
    try {
      if (isEdit && !Number.isNaN(numericId)) {
        await updateTemplate({
          id: numericId,
          body: { name: name.trim(), content, isActive: active },
        }).unwrap();
        setSavedAt(new Date().toLocaleTimeString('es-MX'));
      } else {
        const created = await createTemplate({ name: name.trim(), content }).unwrap();
        router.push(`/plantillas/${created.id}`);
      }
    } catch {
      setError('No se pudo guardar la plantilla. Intenta de nuevo.');
    }
  };

  const handleToggleActive = async () => {
    if (!templateId || Number.isNaN(numericId)) return;
    const next = !active;
    try {
      await updateTemplate({ id: numericId, body: { isActive: next } }).unwrap();
      setActive(next);
      setSavedAt(new Date().toLocaleTimeString('es-MX'));
    } catch {
      setError('No se pudo cambiar el estado de la plantilla.');
    }
  };

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title={isEdit ? 'Editar plantilla' : 'Nueva plantilla'}
          backHref="/plantillas"
          backLabel="Plantillas"
          actions={
            isEdit ? (
              <ActiveToggleButton
                active={active}
                disabled={notFound || loadFailed || isLoadingTemplate || isSaving}
                onClick={handleToggleActive}
              />
            ) : null
          }
        />

        {isLoadingTemplate ? (
          <Card>
            <CardContent className="py-12 text-center font-sans text-foreground/60">
              Cargando plantilla…
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card>
            <CardContent className="py-12 text-center font-sans text-foreground/60">
              La plantilla solicitada no existe.
            </CardContent>
          </Card>
        ) : loadFailed ? (
          <Card>
            <CardContent className="py-12 text-center font-sans text-foreground/60">
              No se pudo cargar la plantilla. Verifica tu conexión o tus permisos e intenta de
              nuevo.
            </CardContent>
          </Card>
        ) : (
          <TemplateForm
            isEdit={isEdit}
            name={name}
            content={content}
            header={header}
            footer={footer}
            pageSetup={pageSetup}
            active={active}
            error={error}
            savedAt={savedAt}
            saving={isSaving}
            onNameChange={setName}
            onContentChange={setContent}
            onHeaderChange={setHeader}
            onFooterChange={setFooter}
            onPageSetupChange={setPageSetup}
            onSave={handleSave}
          />
        )}
      </div>
    </main>
  );
}
