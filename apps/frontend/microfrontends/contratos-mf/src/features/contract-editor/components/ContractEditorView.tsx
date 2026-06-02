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
  type PageSetup,
  PageSetupControl,
  RichTextEditor,
  useRole,
} from '@aletheia/frontend-commons';
import { Eye, EyeOff, FileText, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Label } from '../../../components/ui/label';
import { NoAccess } from '../../../components/ui/no-access';
import { PageHeader } from '../../../components/ui/page-header';
import { Select } from '../../../components/ui/select';
import { useListContractsQuery, useListTemplatesQuery } from '../../api/templatesApi';
import { readContractDoc, writeContractDoc } from '../../catalogs/contract-drafts';
import { type Template, toUiTemplate } from '../../templates/types';

export function ContractEditorView() {
  const { can } = useRole();
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [header, setHeader] = useState<string>('');
  const [footer, setFooter] = useState<string>('');
  const [pageSetup, setPageSetup] = useState<PageSetup>(DEFAULT_PAGE_SETUP);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // Al cambiar de contrato: carga el borrador local guardado (si existe) y resetea.
  useEffect(() => {
    if (!contractId) return;
    const existing = readContractDoc(contractId);
    setBody(existing?.body ?? '');
    setHeader(existing?.header ?? '');
    setFooter(existing?.footer ?? '');
    setPageSetup(existing?.pageSetup ?? DEFAULT_PAGE_SETUP);
    setSelectedTemplateId('');
    setDirty(false);
    setSavedAt(null);
    setShowPreview(false);
  }, [contractId]);

  const canAccess = can('TEMPLATES_MANAGE') || can('CONTRACT_EDIT');
  if (!canAccess) {
    return <NoAccess title="Elaborar documento" />;
  }

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = eligibleTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (body && dirty) {
      const ok = window.confirm('Esto reemplazará el contenido actual del documento. ¿Continuar?');
      if (!ok) {
        setSelectedTemplateId('');
        return;
      }
    }
    setBody(tpl.content);
    setHeader(tpl.header);
    setFooter(tpl.footer);
    setPageSetup(tpl.pageSetup);
    setDirty(true);
  };

  const handleSave = () => {
    if (!contractId) return;
    writeContractDoc(contractId, { body, header, footer, pageSetup });
    setSavedAt(new Date().toLocaleTimeString('es-MX'));
    setDirty(false);
  };

  const contractsReady = !isLoadingContracts;
  const templatesReady = !isLoadingTemplates;
  const noContracts = contractsReady && !isContractsError && contracts.length === 0;

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Elaborar documento" backHref="/" backLabel="Inicio" />

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
                  value={selectedTemplateId}
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
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-foreground/60">
                <span>Sociedad:</span>
                <Badge variant="secondary">{contract.society?.name ?? 'Sin sociedad'}</Badge>
                <span>· Proveedor:</span>
                <span>{contract.vendorName}</span>
              </div>
            ) : null}

            <p className="font-mono text-xs text-foreground/50">
              El documento elaborado es una previsualización/borrador local: se guarda solo en este
              navegador y aún no se persiste en el servidor.
            </p>
          </CardContent>
        </Card>

        {noContracts ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-8 w-8 text-foreground/40" />
              <p className="font-mono text-sm text-foreground/50">
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
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4" /> Guardar borrador local
                  </Button>
                  <Button variant="neutral" onClick={() => setShowPreview((v) => !v)}>
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? 'Ocultar vista previa' : 'Ver documento'}
                  </Button>
                  {savedAt ? (
                    <span className="font-mono text-xs text-foreground/50">
                      Borrador local guardado a las {savedAt}
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
              <FileText className="h-8 w-8 text-foreground/40" />
              <p className="font-mono text-sm text-foreground/50">
                Selecciona una plantilla para cargar el contenido inicial. Luego podrás editarlo
                libremente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
