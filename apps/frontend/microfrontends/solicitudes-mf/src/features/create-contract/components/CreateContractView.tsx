'use client';

import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  cn,
  useRole,
  useToast,
} from '@aletheia/frontend-commons';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Field } from '../../../components/ui/field';
import { RadioCards } from '../../../components/ui/radio-cards';
import {
  useCreateContractMutation,
  useGetContractQuery,
  useListAreasQuery,
  useListSocietiesQuery,
  useUpdateContractMutation,
} from '../../_shared/api/contracts-api';
import { toBackendProviderType } from '../../_shared/api/types';
import { ErrorBanner } from '../../_shared/components/ErrorBanner';
import { RequiredDocsList } from '../../_shared/components/RequiredDocsList';
import { PROVIDER_TYPE_LABEL, type ProviderType } from '../../_shared/domain/contract';

interface FormState {
  title: string;
  societyId: number | '';
  providerName: string;
  providerEmail: string;
  providerType: ProviderType;
  areaId: number | '';
}

const EMPTY: FormState = {
  title: '',
  societyId: '',
  providerName: '',
  providerEmail: '',
  providerType: 'PERSONA_FISICA',
  areaId: '',
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.title.trim()) errors.title = 'El título es obligatorio.';
  if (!form.providerName.trim()) errors.providerName = 'El nombre del proveedor es obligatorio.';
  if (!form.providerEmail.trim()) {
    errors.providerEmail = 'El email es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.providerEmail.trim())) {
    errors.providerEmail = 'Email inválido.';
  }
  if (form.societyId === '') errors.societyId = 'Selecciona una sociedad.';
  if (form.areaId === '') errors.areaId = 'Selecciona un área.';
  return errors;
}

const STEPS = [
  { n: 1, label: 'Datos de la solicitud' },
  { n: 2, label: 'Documentos requeridos' },
] as const;

/** 2-step progress indicator: datos → documentos requeridos. */
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${step} de ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-base border-2 border-border font-heading text-xs',
                step === s.n
                  ? 'bg-main text-main-foreground'
                  : step > s.n
                    ? 'bg-secondary-background text-foreground/70'
                    : 'bg-background text-foreground/40',
              )}
            >
              {step > s.n ? '✓' : s.n}
            </span>
            <span
              className={cn(
                'hidden font-sans text-xs sm:inline',
                step === s.n ? 'text-foreground' : 'text-foreground/50',
              )}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-border" aria-hidden="true" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function CreateContractView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('id');
  const editId = editIdParam ? Number(editIdParam) : null;
  const isEdit = editId != null && !Number.isNaN(editId);

  const { can } = useRole();
  const toast = useToast();

  const { data: societies } = useListSocietiesQuery();
  const { data: areas } = useListAreasQuery();
  const {
    data: existing,
    isLoading: loadingExisting,
    isError: errorExisting,
  } = useGetContractQuery(editId as number, { skip: !isEdit });

  const [createContract, { isLoading: creating }] = useCreateContractMutation();
  const [updateContract, { isLoading: updating }] = useUpdateContractMutation();

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Errors>({});
  const [loaded, setLoaded] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2>(1);

  // Hydrate the form in edit mode once the contract loads.
  React.useEffect(() => {
    if (isEdit && existing && !loaded) {
      setForm({
        title: existing.title,
        societyId: existing.societyId,
        providerName: existing.vendorName,
        providerEmail: existing.vendorEmail ?? '',
        providerType: existing.providerType === 'FISICA' ? 'PERSONA_FISICA' : 'PERSONA_MORAL',
        areaId: existing.areaId,
      });
      setLoaded(true);
    }
  }, [isEdit, existing, loaded]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitting = creating || updating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    // Paso 1 solo valida y avanza; el envío real ocurre en el paso 2.
    if (step === 1) {
      setStep(2);
      return;
    }

    const body = {
      title: form.title.trim(),
      vendorName: form.providerName.trim(),
      vendorEmail: form.providerEmail.trim() || undefined,
      providerType: toBackendProviderType(form.providerType),
      areaId: form.areaId as number,
      societyId: form.societyId as number,
    };

    try {
      if (isEdit && existing) {
        await updateContract({ id: existing.id, body }).unwrap();
        toast.success('Solicitud actualizada', `Se guardaron los cambios de ${existing.folio}.`);
        router.push(`/${existing.id}`);
      } else {
        const created = await createContract(body).unwrap();
        toast.success('Solicitud creada', 'La solicitud se registró en estado Borrador.');
        router.push(`/${created.id}`);
      }
    } catch {
      const message = 'No se pudo guardar la solicitud. Intenta de nuevo.';
      setSubmitError(message);
      toast.error('Error al guardar', message);
    }
  };

  // Permission / state guards ------------------------------------------------
  if (!can('CONTRACT_CREATE')) {
    return (
      <main className="bg-grid min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader title="Nueva solicitud" />
          <Card>
            <CardContent className="p-6">
              <Badge variant="destructive">Sin permiso para crear solicitudes</Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (isEdit && loadingExisting) {
    return (
      <main className="bg-grid min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <LoadingState message="Cargando solicitud…" />
        </div>
      </main>
    );
  }

  if (isEdit && (errorExisting || !existing || existing.status !== 'DRAFT')) {
    return (
      <main className="bg-grid min-h-screen p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader title="Editar solicitud" />
          <Card>
            <CardContent className="space-y-4 p-6">
              <ErrorBanner
                message={
                  existing && existing.status !== 'DRAFT'
                    ? 'Solo las solicitudes en estado Borrador pueden editarse.'
                    : 'Solicitud no encontrada.'
                }
              />
              <BackButton href="/solicitudes" label="Volver al listado" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-grid min-h-screen p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={isEdit ? 'Editar solicitud' : 'Nueva solicitud'}
          subtitle={isEdit ? existing?.folio : 'Folio generado automáticamente'}
          backHref="/solicitudes"
        />

        <StepIndicator step={step} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Datos de la solicitud</CardTitle>
                <CardDescription>
                  {isEdit
                    ? `Folio: ${existing?.folio}`
                    : 'El folio se asigna automáticamente al crear'}{' '}
                  · Estado inicial: Borrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  label="Título del contrato"
                  htmlFor="title"
                  required
                  error={errors.title}
                >
                  <Input
                    id="title"
                    placeholder="Ej. Suministro de equipo de cómputo"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                  />
                </FormField>

                {/* Datos de la organización: sociedad + área que solicitan el contrato. */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Sociedad" htmlFor="society" required error={errors.societyId}>
                    <Select
                      id="society"
                      value={form.societyId === '' ? '' : String(form.societyId)}
                      onChange={(e) =>
                        set('societyId', e.target.value === '' ? '' : Number(e.target.value))
                      }
                    >
                      <option value="">Selecciona una sociedad…</option>
                      {(societies ?? [])
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                    </Select>
                  </FormField>

                  <FormField label="Área requirente" htmlFor="area" required error={errors.areaId}>
                    <Select
                      id="area"
                      value={form.areaId === '' ? '' : String(form.areaId)}
                      onChange={(e) =>
                        set('areaId', e.target.value === '' ? '' : Number(e.target.value))
                      }
                    >
                      <option value="">Selecciona un área…</option>
                      {(areas ?? [])
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {a.name}
                          </option>
                        ))}
                    </Select>
                  </FormField>
                </div>

                {/* Datos del proveedor externo. */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    label="Nombre del proveedor"
                    htmlFor="providerName"
                    required
                    error={errors.providerName}
                  >
                    <Input
                      id="providerName"
                      placeholder="Razón social o nombre"
                      value={form.providerName}
                      onChange={(e) => set('providerName', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Email del proveedor"
                    htmlFor="providerEmail"
                    required
                    error={errors.providerEmail}
                  >
                    <Input
                      id="providerEmail"
                      type="email"
                      placeholder="contacto@proveedor.mx"
                      value={form.providerEmail}
                      onChange={(e) => set('providerEmail', e.target.value)}
                    />
                  </FormField>
                </div>

                <Field label="Tipo de proveedor" required>
                  <RadioCards
                    name="providerType"
                    value={form.providerType}
                    onChange={(v) => set('providerType', v)}
                    options={[
                      {
                        value: 'PERSONA_FISICA',
                        label: PROVIDER_TYPE_LABEL.PERSONA_FISICA,
                        hint: 'Individuo con actividad económica',
                      },
                      {
                        value: 'PERSONA_MORAL',
                        label: PROVIDER_TYPE_LABEL.PERSONA_MORAL,
                        hint: 'Empresa / sociedad mercantil',
                      },
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Documentos requeridos</CardTitle>
                <CardDescription>
                  Antes de {isEdit ? 'guardar' : 'crear'} la solicitud, revisa qué documentos
                  deberás subir después para {PROVIDER_TYPE_LABEL[form.providerType]}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RequiredDocsList providerType={form.providerType} />
              </CardContent>
            </Card>
          )}

          {submitError && (
            <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
          )}

          <div className="flex justify-end gap-2">
            {step === 1 ? (
              <>
                <Button type="button" variant="neutral" onClick={() => router.push('/')}>
                  Cancelar
                </Button>
                <Button type="submit">Siguiente</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="neutral" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear solicitud'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
