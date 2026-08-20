import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { parseManualMarkdown } from './manual-markdown';
import styles from './manual.module.css';

export const metadata: Metadata = {
  title: 'Manual de roles y flujo de revisión · ALETHEIA',
  description:
    'Guía de referencia por rol para probar el flujo de revisión de contratos de ALETHEIA CLM, de punta a punta.',
};

export const dynamic = 'force-dynamic';

const MANUAL_PATH = path.join(
  process.cwd(),
  '..',
  '..',
  '..',
  'docs',
  '04-product',
  'manual-roles-y-flujo-qa.md',
);

async function loadManual() {
  try {
    const raw = await fs.readFile(MANUAL_PATH, 'utf8');
    return parseManualMarkdown(raw);
  } catch (error) {
    console.error(`[manual] no se pudo leer ${MANUAL_PATH}`, error);
    return null;
  }
}

export default async function ManualPage() {
  const manual = await loadManual();

  if (!manual) {
    return (
      <main className={styles.error}>
        No se pudo cargar el manual — verifica que{' '}
        <code>docs/04-product/manual-roles-y-flujo-qa.md</code> existe.
      </main>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.mark}>ALETHEIA · CLM</span>
          <span className={styles.sub}>Manual de roles &amp; flujo QA</span>
        </div>
        <nav className={styles.toc}>
          {manual.toc.map((entry) => (
            <a key={entry.id} href={`#${entry.id}`}>
              {entry.label}
            </a>
          ))}
        </nav>
      </aside>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: contenido generado desde docs/04-product/manual-roles-y-flujo-qa.md, versionado en el repo y editado solo por el equipo — no es input de usuario, mismo nivel de confianza que el JSX de /como-funciona. */}
      <main className={styles.main} dangerouslySetInnerHTML={{ __html: manual.html }} />
    </div>
  );
}
