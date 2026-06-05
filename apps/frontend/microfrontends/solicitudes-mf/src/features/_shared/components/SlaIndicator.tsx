'use client';

import { SlaIndicator as CommonsSlaIndicator } from '@aletheia/frontend-commons';
import type { SlaLevel } from '../domain/contract';

// SLA semaphore. Delega en el indicador canónico de commons (punto de color +
// TEXTO accesible, colores tokenizados). El `SlaLevel` del dominio coincide con
// el `SlaColor` de commons ('green' | 'yellow' | 'red').

export function SlaIndicator({
  level,
  showLabel = true,
  className,
}: {
  level: SlaLevel;
  showLabel?: boolean;
  className?: string;
}) {
  return <CommonsSlaIndicator color={level} showLabel={showLabel} className={className} />;
}
