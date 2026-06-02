'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CookiePrivilegeGuard,
} from '@aletheia/frontend-commons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import {
  useCreateSignatureMutation,
  useGetContractQuery,
  useListApoderadosQuery,
} from '../../signatures/api/signaturesApi';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

interface SignatureCanvasViewProps {
  contractId: string;
}

export function SignatureCanvasView({ contractId }: SignatureCanvasViewProps) {
  const router = useRouter();

  const {
    data: contract,
    isLoading: loadingContract,
    isError: errorContract,
  } = useGetContractQuery(contractId);
  const { data: apoderados } = useListApoderadosQuery();
  const [createSignature, { isLoading: saving }] = useCreateSignatureMutation();

  const [pad, setPad] = useState<SignaturePadHandle | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [apoderadoId, setApoderadoId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const activeApoderados = (apoderados ?? []).filter((a) => a.isActive);
  const selectedApoderado = activeApoderados.find((a) => String(a.id) === apoderadoId);

  const handleSave = async () => {
    setError(null);
    if (!pad || pad.isEmpty()) {
      setError('Dibuja la firma antes de guardar.');
      return;
    }
    const image = pad.toDataURL();
    if (!image) {
      setError('No se pudo capturar la firma. Intenta de nuevo.');
      return;
    }
    try {
      await createSignature({
        contractId: Number(contractId),
        method: 'CANVAS',
        signatureData: image,
        apoderadoId: apoderadoId ? Number(apoderadoId) : undefined,
      }).unwrap();
      router.push(`/detalle/${contractId}`);
    } catch {
      setError('No se pudo registrar la firma. Verifica tus permisos e intenta de nuevo.');
    }
  };

  return (
    <main className="bg-grid min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-heading">Canvas de firma</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            &larr; Volver
          </Button>
        </header>

        <CookiePrivilegeGuard
          privilege="CONTRACT_SIGN"
          fallback={
            <Card>
              <CardContent className="p-6">
                <Badge variant="destructive">No tienes permiso para firmar contratos</Badge>
              </CardContent>
            </Card>
          }
        >
          {loadingContract ? (
            <Card>
              <CardContent className="p-6">
                <p className="font-mono text-sm text-foreground/50">Cargando…</p>
              </CardContent>
            </Card>
          ) : errorContract || !contract ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <Badge variant="secondary">Contrato no encontrado</Badge>
                <div>
                  <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
                    Ir a contratos por firmar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : contract.status !== 'SIGNING' ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <Badge variant="secondary">Este contrato no está disponible para firma</Badge>
                <div>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => router.push(`/detalle/${contract.id}`)}
                  >
                    Ver detalle de firma
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{contract.folio}</CardTitle>
                <CardDescription>
                  {contract.vendorName} &middot; {contract.society?.name ?? '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="attorney">Apoderado (opcional)</Label>
                  <Select
                    id="attorney"
                    value={apoderadoId}
                    onChange={(e) => setApoderadoId(e.target.value)}
                  >
                    <option value="">Sin apoderado</option>
                    {activeApoderados.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.legalPower}
                      </option>
                    ))}
                  </Select>
                  {selectedApoderado ? (
                    <p className="font-mono text-xs text-foreground/50">
                      Poder legal: {selectedApoderado.legalPower}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Firma</Label>
                  <SignaturePad padRef={setPad} onDirtyChange={setHasDrawing} />
                </div>

                {error ? (
                  <div className="rounded-base border-2 border-border bg-secondary-background px-3 py-2 font-mono text-xs text-foreground">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-3">
                  <Button type="button" onClick={handleSave} disabled={!hasDrawing || saving}>
                    {saving ? 'Guardando…' : 'Guardar firma'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CookiePrivilegeGuard>
      </div>
    </main>
  );
}
