'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@aletheia/frontend-commons';
import { useMemo, useState } from 'react';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
} from '../../_shared/flujo-api';
import { errorMessage } from '../../_shared/useWorkflow';
import { formatDateTime } from '../../_shared/workflow-rules';

/** Reviewer notifications panel sourced from GET /notifications. */
export function ReviewerNotifications() {
  const { data, isLoading } = useListNotificationsQuery();
  const [markRead, markReadState] = useMarkNotificationReadMutation();
  const [actionError, setActionError] = useState<string | null>(null);

  const onMarkRead = async (id: number) => {
    setActionError(null);
    try {
      await markRead(id).unwrap();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  // Solo no leídas: al marcar una como leída, el refetch (invalidatesTags) la
  // saca de aquí — la card desaparece del todo cuando ya no queda ninguna.
  const notifications = useMemo(
    () =>
      [...(data ?? [])]
        .filter((n) => !n.isRead)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data],
  );

  if (isLoading) return null;
  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">Notificaciones</CardTitle>
        <Badge variant="default">{notifications.length} sin leer</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionError ? (
          <div
            role="alert"
            className="rounded-base border-2 border-border bg-destructive/10 px-4 py-3 font-sans text-sm text-destructive"
          >
            {actionError}
          </div>
        ) : null}
        <ul className="space-y-2">
          {notifications.slice(0, 8).map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-base border-2 border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-border bg-main"
                  aria-hidden
                />
                <div>
                  <p className="font-sans text-sm text-foreground/90">{n.message}</p>
                  <p className="font-sans text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="neutral"
                size="sm"
                disabled={markReadState.isLoading}
                onClick={() => onMarkRead(n.id)}
              >
                Marcar leída
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
