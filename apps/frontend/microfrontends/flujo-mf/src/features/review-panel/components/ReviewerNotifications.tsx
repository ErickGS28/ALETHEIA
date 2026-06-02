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

  const notifications = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  const unread = notifications.filter((n) => !n.isRead).length;

  if (isLoading) return null;
  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">Notificaciones</CardTitle>
        {unread > 0 ? <Badge variant="default">{unread} sin leer</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {actionError ? (
          <div className="rounded-base border-2 border-border bg-[#fee2e2] px-4 py-3 font-mono text-sm text-[#991b1b]">
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
                  className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-border ${
                    n.isRead ? 'bg-foreground/20' : 'bg-main'
                  }`}
                  aria-hidden
                />
                <div>
                  <p className="font-mono text-sm text-foreground/90">{n.message}</p>
                  <p className="font-mono text-xs text-foreground/50">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </div>
              {!n.isRead ? (
                <Button
                  variant="neutral"
                  size="sm"
                  disabled={markReadState.isLoading}
                  onClick={() => onMarkRead(n.id)}
                >
                  Marcar leída
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
