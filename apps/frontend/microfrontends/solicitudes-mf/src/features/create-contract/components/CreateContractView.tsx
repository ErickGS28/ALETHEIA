'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  useRole,
} from '@aletheia/frontend-commons';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Field } from '../../../components/ui/field';
import { RadioCards } from '../../../components/ui/radio-cards';
import { Select } from '../../../components/ui/select';
import {
  useCreateContractMutation,
  useGetContractQuery,
  useListAreasQuery,
  useListSocietiesQuery,
  useUpdateContractMutation,
} from '../../_shared/api/contracts-api';
import { toBackendProviderType } from '../../_shared/api/types';
import { PageHeader } from '../../_shared/components/PageHeader';
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

export function CreateContractView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('id');
  const editId = editIdParam ? Number(editIdParam) : null;
  const isEdit = editId != null && !Number.isNaN(editId);

  const { can } = useRole();

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
        router.push(`/${existing.id}`);
      } else {
        const created = await createContract(body).unwrap();
        router.push(`/${created.id}`);
      }
    } catch {
      setSubmitError('No se pudo guardar la solicitud. Intenta de nuevo.');
    }
  };

  // Permission / state guards ------------------------------------------------
  if (!can('CONTRACT_CREATE')) {
    return (
      <main className="bg-grid min-h-screen p-6">
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
      <main className="bg-grid min-h-screen p-6">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-sm text-foreground/40">Cargando…</p>
        </div>
      </main>
    );
  }

  if (isEdit && (errorExisting || !existing || existing.status !== 'DRAFT')) {
    return (
      <main className="bg-grid min-h-screen p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader title="Editar solicitud" />
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="font-mono text-sm text-foreground/70">
                {existing && existing.status !== 'DRAFT'
                  ? 'Solo las solicitudes en estado Borrador pueden editarse.'
                  : 'Solicitud no encontrada.'}
              </p>
              <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4" /> Volver al listado
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={isEdit ? 'Editar solicitud' : 'Nueva solicitud'}
          subtitle={isEdit ? existing?.folio : 'Folio generado automáticamente'}
          actions={
            <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Field label="Título del contrato" htmlFor="title" required error={errors.title}>
                <Input
                  id="title"
                  placeholder="Ej. Suministro de equipo de cómputo"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>

              <Field label="Sociedad" htmlFor="society" required error={errors.societyId}>
                <Select
                  id="society"
                  value={form.societyId === '' ? '' : String(form.societyId)}
                  onChange={(e) =>
                    set('societyId', e.target.value === '' ? '' : Number(e.target.value))
                  }
                >
                  <option value="">Selecciona una sociedad…</option>
                  {(societies ?? []).map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
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
                </Field>

                <Field
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
                </Field>
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

              <Field label="Área requirente" htmlFor="area" required error={errors.areaId}>
                <Select
                  id="area"
                  value={form.areaId === '' ? '' : String(form.areaId)}
                  onChange={(e) =>
                    set('areaId', e.target.value === '' ? '' : Number(e.target.value))
                  }
                >
                  <option value="">Selecciona un área…</option>
                  {(areas ?? []).map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentos requeridos</CardTitle>
              <CardDescription>
                Lista dinámica según el tipo de proveedor (informativo)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequiredDocsList providerType={form.providerType} />
            </CardContent>
          </Card>

          {submitError && (
            <p className="rounded-base border-2 border-border bg-red-100 px-3 py-2 font-mono text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="neutral" onClick={() => router.push('/')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear solicitud'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
