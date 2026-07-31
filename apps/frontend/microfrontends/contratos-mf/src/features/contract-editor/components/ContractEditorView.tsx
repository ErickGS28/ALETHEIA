'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DEFAULT_PAGE_SETUP,
  DocumentPreview,
  PageHeader,
  type PageSetup,
  PageSetupControl,
  RichTextEditor,
  Select,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { Eye, EyeOff, FileText, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { NoAccess } from '../../../components/ui/no-access';
import {
  useGetContractDocumentQuery,
  useListContractsQuery,
  useListTemplatesQuery,
  useSaveContractDocumentMutation,
} from '../../api/templatesApi';
import { readContractDoc, writeContractDoc } from '../../catalogs/contract-drafts';
import { type Template, toUiTemplate } from '../../templates/types';

/**
 * Coerces an untrusted page-setup value (server document or stale local cache,
 * which may have a missing/partial/legacy shape) into a valid {@link PageSetup}.
 * Without this, a malformed `margins` crashes the whole editor in PageSetupControl.
 */
function normalizePageSetup(raw: unknown): PageSetup {
  const value = (raw ?? {}) as Partial<PageSetup>;
  const margins = (value.margins ?? {}) as Partial<PageSetup['margins']>;
  const fallback = DEFAULT_PAGE_SETUP;
  return {
    size: value.size === 'LETTER' || value.size === 'A4' ? value.size : fallback.size,
    margins: {
      top: typeof margins.top === 'number' ? margins.top : fallback.margins.top,
      right: typeof margins.right === 'number' ? margins.right : fallback.margins.right,
      bottom: typeof margins.bottom === 'number' ? margins.bottom : fallback.margins.bottom,
      left: typeof margins.left === 'number' ? margins.left : fallback.margins.left,
    },
  };
}

export function ContractEditorView() {
  const { can } = useRole();
  const toast = useToast();
  const {
    data: contractsData,
    isLoading: isLoadingContracts,
    isError: isContractsError,
  } = useListContractsQuery();
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    isError: isTemplatesError,
  } = useListTemplatesQuery();

  const contracts = useMemo(() => contractsData ?? [], [contractsData]);
  const templates = useMemo<Template[]>(
    () => (templatesData ?? []).map(toUiTemplate),
    [templatesData],
  );

  const [contractId, setContractId] = useState<string>('');
  const numericContractId = contractId ? Number(contractId) : undefined;
  const { data: serverDoc, isFetching: isFetchingDoc } = useGetContractDocumentQuery(
    numericContractId as number,
    { skip: numericContractId === undefined },
  );
  const [saveContractDocument, { isLoading: isSaving }] = useSaveContractDocumentMutation();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [header, setHeader] = useState<string>('');
  const [footer, setFooter] = useState<string>('');
  const [pageSetup, setPageSetup] = useState<PageSetup>(DEFAULT_PAGE_SETUP);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Plantilla pendiente de confirmar cuando reemplazaría contenido sin guardar.
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // Selecciona el primer contrato disponible una vez que se cargan.
  useEffect(() => {
    if (!contractId && contracts.length > 0) {
      setContractId(String(contracts[0].id));
    }
  }, [contracts, contractId]);

  const contract = useMemo(
    () => contracts.find((c) => String(c.id) === contractId) ?? null,
    [contracts, contractId],
  );

  // Plantillas elegibles: las plantillas activas (no tienen sociedad asociada en el backend).
  const eligibleTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);

  // Al cambiar de contrato: muestra de inmediato el borrador local en caché (si existe)
  // mientras el servidor responde, y resetea el estado del editor.
  useEffect(() => {
    if (!contractId) return;
    const cached = readContractDoc(contractId);
    setBody(cached?.body ?? '');
    setHeader(cached?.header ?? '');
    setFooter(cached?.footer ?? '');
    setPageSetup(normalizePageSetup(cached?.pageSetup));
    setSelectedTemplateId('');
    setDirty(false);
    setSavedAt(null);
    setShowPreview(false);
    setPendingTemplateId(null);
  }, [contractId]);

  // Fuente de verdad: cuando el servidor devuelve el documento elaborado, lo hidrata
  // (y refresca la caché local). Si no hay documento en el servidor, conserva la caché.
  useEffect(() => {
    if (!contractId || isFetchingDoc || !serverDoc) return;
    const doc = {
      body: serverDoc.body ?? '',
      header: serverDoc.header ?? '',
      footer: serverDoc.footer ?? '',
      pageSetup: normalizePageSetup(serverDoc.pageSetup),
    };
    setBody(doc.body);
    setHeader(doc.header);
    setFooter(doc.footer);
    setPageSetup(doc.pageSetup);
    setDirty(false);
    writeContractDoc(contractId, doc);
    // serverDoc cambia por contrato; contractId garantiza re-hidratación al cambiar.
  }, [serverDoc, isFetchingDoc, contractId]);

  const canAccess = can('TEMPLATES_MANAGE') || can('CONTRACT_EDIT');
  if (!canAccess) {
    return <NoAccess title="Elaborar documento" />;
  }

  const loadTemplate = (templateId: string) => {
    const tpl = eligibleTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setBody(tpl.content);
    setHeader(tpl.header);
    setFooter(tpl.footer);
    setPageSetup(tpl.pageSetup);
    setDirty(true);
    toast.success('Plantilla aplicada', `Se cargó el contenido de «${tpl.name}».`);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = eligibleTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    // Si hay contenido sin guardar, pide confirmación antes de reemplazarlo.
    if (body && dirty) {
      setPendingTemplateId(templateId);
      return;
    }
    loadTemplate(templateId);
  };

  const confirmApplyTemplate = () => {
    if (!pendingTemplateId) return;
    loadTemplate(pendingTemplateId);
    setPendingTemplateId(null);
  };

  const cancelApplyTemplate = () => {
    setPendingTemplateId(null);
    setSelectedTemplateId('');
  };

  const handleSave = async () => {
    if (!contractId || numericContractId === undefined) return;
    // Caché local inmediata (borrador), luego persistencia en el servidor (fuente de verdad).
    writeContractDoc(contractId, { body, header, footer, pageSetup });
    try {
      await saveContractDocument({
        id: numericContractId,
        body: { body, header, footer, pageSetup },
      }).unwrap();
      setSavedAt(new Date().toLocaleTimeString('es-MX'));
      setDirty(false);
      toast.success('Documento guardado', 'El documento se guardó en el servidor.');
    } catch {
      toast.error(
        'No se pudo guardar',
        'No se pudo guardar en el servidor; se conservó el borrador local.',
      );
    }
  };

  const contractsReady = !isLoadingContracts;
  const templatesReady = !isLoadingTemplates;
  const noContracts = contractsReady && !isContractsError && contracts.length === 0;

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Elaborar documento" backToHome backLabel="Inicio" />

        <Card>
          <CardHeader>
            <CardTitle>Contrato</CardTitle>
            <CardDescription>
              Selecciona el contrato y una plantilla para iniciar su documento (HU-19). El
              encabezado, pie y diseño de página se heredan de la plantilla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contract-select">Contrato</Label>
                <Select
                  id="contract-select"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  disabled={!contractsReady || isContractsError || contracts.length === 0}
                >
                  <option value="">
                    {isLoadingContracts
                      ? 'Cargando contratos…'
                      : isContractsError
                        ? 'No se pudieron cargar los contratos'
                        : contracts.length === 0
                          ? 'No hay contratos disponibles'
                          : 'Selecciona un contrato…'}
                  </option>
                  {contracts.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.folio} · {c.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="template-select">Plantilla</Label>
                <Select
                  id="template-select"
                  value={pendingTemplateId ?? selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  disabled={
                    !contractId ||
                    !templatesReady ||
                    isTemplatesError ||
                    eligibleTemplates.length === 0
                  }
                >
                  <option value="">
                    {isLoadingTemplates
                      ? 'Cargando plantillas…'
                      : isTemplatesError
                        ? 'No se pudieron cargar las plantillas'
                        : eligibleTemplates.length === 0
                          ? 'Sin plantillas activas'
                          : 'Selecciona una plantilla…'}
                  </option>
                  {eligibleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {contract ? (
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
                <span>Sociedad:</span>
                <Badge variant="secondary">{contract.society?.name ?? 'Sin sociedad'}</Badge>
                <span>· Proveedor:</span>
                <span>{contract.vendorName}</span>
              </div>
            ) : null}

            <p className="font-sans text-xs text-muted-foreground">
              El documento elaborado se persiste en el servidor al guardar. Se mantiene además una
              copia local como borrador de respaldo en este navegador.
            </p>
          </CardContent>
        </Card>

        {noContracts ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-sans text-sm text-muted-foreground">
                No hay contratos disponibles para elaborar un documento.
              </p>
            </CardContent>
          </Card>
        ) : body ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Documento del contrato</CardTitle>
                {dirty ? <Badge variant="outline">Sin guardar</Badge> : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <RichTextEditor
                  value={body}
                  onChange={(html) => {
                    setBody(html);
                    setDirty(true);
                  }}
                  ariaLabel="Documento del contrato"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4" /> {isSaving ? 'Guardando…' : 'Guardar documento'}
                  </Button>
                  <Button variant="neutral" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? 'Ocultar vista previa' : 'Ver documento'}
                  </Button>
                  {savedAt ? (
                    <span className="font-sans text-xs text-muted-foreground">
                      Documento guardado en el servidor a las {savedAt}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diseño de página</CardTitle>
                <CardDescription>
                  Heredado de la plantilla; puedes ajustarlo para este contrato.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <PageSetupControl
                  value={pageSetup}
                  onChange={(v) => {
                    setPageSetup(v);
                    setDirty(true);
                  }}
                />
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Encabezado</Label>
                    <RichTextEditor
                      value={header}
                      onChange={(html) => {
                        setHeader(html);
                        setDirty(true);
                      }}
                      compact
                      ariaLabel="Encabezado del documento"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pie de página</Label>
                    <RichTextEditor
                      value={footer}
                      onChange={(html) => {
                        setFooter(html);
                        setDirty(true);
                      }}
                      compact
                      ariaLabel="Pie de página del documento"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {showPreview ? (
              <Card>
                <CardHeader>
                  <CardTitle>Vista previa del documento</CardTitle>
                  <CardDescription>Así se verá el contrato impreso o en PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentPreview
                    body={body}
                    header={header}
                    footer={footer}
                    pageSetup={pageSetup}
                  />
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="font-sans text-sm text-muted-foreground">
                Selecciona una plantilla para cargar el contenido inicial. Luego podrás editarlo
                libremente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={pendingTemplateId !== null}
        title="Reemplazar contenido del documento"
        body="Esto reemplazará el contenido actual del documento, incluido el borrador sin guardar. ¿Deseas continuar?"
        confirmLabel="Reemplazar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={confirmApplyTemplate}
        onCancel={cancelApplyTemplate}
      />
    </main>
  );
}
