'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useRole,
} from '@aletheia/frontend-commons';
import { Power, PowerOff, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { NoAccess } from '../../../components/ui/no-access';
import { PageHeader } from '../../../components/ui/page-header';
import { RichTextEditor } from '../../../components/ui/rich-text-editor';
import { Select } from '../../../components/ui/select';
import { SOCIETIES } from '../../_mock/societies';
import { useTemplates } from '../../_mock/useTemplates';

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
  societyId: string;
  content: string;
  active: boolean;
  error: string | null;
  savedAt: string | null;
  onNameChange: (v: string) => void;
  onSocietyChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onSave: () => void;
}

function TemplateForm(props: TemplateFormProps) {
  const {
    isEdit,
    name,
    societyId,
    content,
    active,
    error,
    savedAt,
    onNameChange,
    onSocietyChange,
    onContentChange,
    onSave,
  } = props;

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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nombre</Label>
              <Input
                id="tpl-name"
                placeholder="Ej. Contrato de Prestación de Servicios"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-society">Sociedad asociada (opcional)</Label>
              <Select
                id="tpl-society"
                value={societyId}
                onChange={(e) => onSocietyChange(e.target.value)}
              >
                <option value="">General (todas las sociedades)</option>
                {SOCIETIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error ? (
            <p className="font-mono text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
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
            <Button onClick={onSave}>
              <Save className="h-4 w-4" /> {isEdit ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
            {savedAt ? (
              <span className="font-mono text-xs text-foreground/50">Guardado a las {savedAt}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface TemplateEditorViewProps {
  /** Si se provee, edita la plantilla existente; si no, crea una nueva. */
  templateId?: string;
}

export function TemplateEditorView({ templateId }: TemplateEditorViewProps) {
  const { can } = useRole();
  const { ready, getById, create, update, toggleActive } = useTemplates();
  const router = useRouter();

  const isEdit = Boolean(templateId);
  const [name, setName] = useState('');
  const [societyId, setSocietyId] = useState<string>('');
  const [content, setContent] = useState<string>(EMPTY_CONTENT);
  const [active, setActive] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Carga inicial de la plantilla en modo edición.
  useEffect(() => {
    if (!ready || !isEdit || loadedRef.current || !templateId) return;
    const tpl = getById(templateId);
    if (tpl) {
      setName(tpl.name);
      setSocietyId(tpl.societyId ?? '');
      setContent(tpl.content);
      setActive(tpl.active);
    }
    loadedRef.current = true;
  }, [ready, isEdit, templateId, getById]);

  if (!can('TEMPLATES_MANAGE')) return <NoAccess />;

  const notFound = Boolean(
    isEdit && ready && loadedRef.current && templateId && !getById(templateId),
  );

  const handleSave = () => {
    if (!name.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }
    setError(null);
    const payload = {
      name,
      societyId: societyId || null,
      content,
      active,
    };
    if (isEdit && templateId) {
      update(templateId, payload);
    } else {
      const created = create(payload);
      router.push(`/plantillas/${created.id}`);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString('es-MX'));
  };

  const handleToggleActive = () => {
    if (!templateId) return;
    toggleActive(templateId);
    setActive((a) => !a);
    setSavedAt(new Date().toLocaleTimeString('es-MX'));
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
                disabled={notFound}
                onClick={handleToggleActive}
              />
            ) : null
          }
        />

        {notFound ? (
          <Card>
            <CardContent className="py-12 text-center font-mono text-foreground/60">
              La plantilla solicitada no existe.
            </CardContent>
          </Card>
        ) : (
          <TemplateForm
            isEdit={isEdit}
            name={name}
            societyId={societyId}
            content={content}
            active={active}
            error={error}
            savedAt={savedAt}
            onNameChange={setName}
            onSocietyChange={setSocietyId}
            onContentChange={setContent}
            onSave={handleSave}
          />
        )}
      </div>
    </main>
  );
}
