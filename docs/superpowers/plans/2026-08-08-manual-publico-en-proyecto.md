# Vista pública `/manual` en el proyecto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el manual de roles y flujo de revisión como una página pública real en `localhost:4000/manual` (web-shell), leyendo `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` en vivo como única fuente de verdad, y reforzar en ese `.md` el momento exacto (Abogado, en `ADMIN_REVIEW`) en que se conecta una plantilla con un contrato.

**Architecture:** Server component de Next.js (App Router) en `apps/frontend/web-shell/src/app/manual/page.tsx`, sin `useAuth` (pública, igual patrón que `/como-funciona`). Lee el `.md` con `fs.readFile`, lo convierte a HTML con `marked` (renderer personalizado solo para IDs de heading + tabla de contenidos), y lo pinta dentro de un layout con sidebar, estilado con un CSS Module que replica el tema "papel" del Artifact de Claude existente.

**Tech Stack:** Next.js 15 (App Router, server components) · `marked` (nuevo) · CSS Modules · TypeScript · Biome (lint).

## Global Constraints

- La página **nunca** debe llamar `useAuth` ni ningún hook de `@/features/auth` — así es como `/como-funciona` queda pública hoy; no existe middleware ni allowlist que tocar.
- **Fuente única de verdad**: el contenido se lee de `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` vía `fs`. No se duplica contenido como JSX/texto hardcodeado en la página.
- No se agrega ningún framework de testing nuevo — el frontend de este monorepo no tiene `jest`/`vitest` configurado en ningún workspace, y el diseño (§8) ya decidió que esta página de solo lectura se verifica en navegador, no con tests automatizados.
- El HTML generado desde el `.md` se inyecta con `dangerouslySetInnerHTML` **sin** pasar por `sanitizeDocumentHtml` de `@aletheia/frontend-commons` — esa función es intencionalmente client-only (devuelve `''` en el servidor, ver `apps/frontend/commons/src/utils/sanitize.ts:36-38`) porque sanea contenido que cualquier usuario autenticado puede escribir (plantillas/contratos vía el editor enriquecido). El `.md` del manual es un archivo versionado en git, editado solo por el equipo con acceso al repo — mismo nivel de confianza que el JSX de `/como-funciona`, no input de usuario. Se documenta la razón inline con un `biome-ignore` (ver Task 2).
- Mantener el archivo de estilos aislado en un CSS Module (`manual.module.css`) — no tocar `globals.css` ni los tokens de `@aletheia/frontend-commons`.

---

### Task 1: Reforzar en el manual la conexión plantilla↔contrato

**Files:**
- Modify: `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md`

**Interfaces:** Ninguna — solo contenido Markdown. No bloquea ni depende de Task 2 (Task 2 solo asume que los headings de sección siguen el patrón `## N. Texto`, que no cambia aquí).

- [ ] **Step 1: Agregar el callout de conexión al inicio de §5 (Abogado)**

En `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md`, busca este bloque exacto:

```markdown
## 5. Abogado

Hace la revisión legal de fondo. Redacta y mantiene plantillas, y elabora el documento formal del contrato a partir de una de ellas — es el contenido que Aprobador, Firmante, y ahora cualquier rol desde el detalle general del contrato van a ver después, no un ejercicio aparte.

**Ojo con la cola:** el Abogado actúa sobre contratos en **`ADMIN_REVIEW`**, no en `LAWYER_REVIEW` — su propia aprobación es lo que produce el estado `LAWYER_REVIEW` (queda para el Aprobador). Si ves la cola vacía estando en `LAWYER_REVIEW`, no es un bug: revisa `ADMIN_REVIEW`.
```

Reemplázalo por (se inserta un párrafo nuevo entre el primero y el segundo):

```markdown
## 5. Abogado

Hace la revisión legal de fondo. Redacta y mantiene plantillas, y elabora el documento formal del contrato a partir de una de ellas — es el contenido que Aprobador, Firmante, y ahora cualquier rol desde el detalle general del contrato van a ver después, no un ejercicio aparte.

> **Aquí se conecta plantilla ↔ contrato:** el Abogado, y solo el Abogado, elige una plantilla y la convierte en el documento formal de *este* contrato específico — ocurre durante `ADMIN_REVIEW`, en **Contratos → Elaborar documento** (paso 2 abajo). Ese documento resultante (no la plantilla en abstracto) es lo que después ven Aprobador, Firmante y el detalle general del contrato. Ninguna otra pantalla ni rol hace esta conexión.

**Ojo con la cola:** el Abogado actúa sobre contratos en **`ADMIN_REVIEW`**, no en `LAWYER_REVIEW` — su propia aprobación es lo que produce el estado `LAWYER_REVIEW` (queda para el Aprobador). Si ves la cola vacía estando en `LAWYER_REVIEW`, no es un bug: revisa `ADMIN_REVIEW`.
```

- [ ] **Step 2: Anotar la conexión en §1 (el recorrido)**

Busca este bloque exacto:

```markdown
Ramas:
- **CANCELLED** ← Solicitante, desde cualquier estado activo (motivo obligatorio). Puede **recuperar** de vuelta a DRAFT.
- **REJECTED** ← Administrador/Abogado regresan a DRAFT con comentario. El Aprobador rechaza en definitiva (estado final, sin regreso).
```

Reemplázalo por (se agrega una línea antes de "Ramas:"):

```markdown
**Conexión plantilla↔contrato:** ocurre durante `ADMIN_REVIEW`, la dispara el Abogado — ver §5.

Ramas:
- **CANCELLED** ← Solicitante, desde cualquier estado activo (motivo obligatorio). Puede **recuperar** de vuelta a DRAFT.
- **REJECTED** ← Administrador/Abogado regresan a DRAFT con comentario. El Aprobador rechaza en definitiva (estado final, sin regreso).
```

- [ ] **Step 3: Ajustar la fila del Abogado en la tabla E2E (§8)**

Busca esta línea exacta (es una fila de tabla Markdown):

```markdown
| 3 | Abogado | Elabora el documento formal desde una plantilla (obligatorio) y aprueba | ADMIN_REVIEW → LAWYER_REVIEW |
```

Reemplázala por:

```markdown
| 3 | Abogado | **Conecta una plantilla con este contrato** elaborando el documento formal (obligatorio) y aprueba | ADMIN_REVIEW → LAWYER_REVIEW |
```

- [ ] **Step 4: Verificar los 3 cambios**

Run: `grep -n "Aquí se conecta plantilla\|Conexión plantilla↔contrato\|Conecta una plantilla con este contrato" "DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md"`

Expected: 3 líneas de salida, una por cada frase buscada.

- [ ] **Step 5: Commit**

```bash
git add "DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md"
git commit -m "docs(manual): aclarar quién y cuándo conecta plantilla con contrato"
```

---

### Task 2: Construir la ruta pública `/manual` en web-shell

**Files:**
- Modify: `apps/frontend/web-shell/package.json` (agregar dependencia `marked`)
- Create: `apps/frontend/web-shell/src/app/manual/manual-markdown.ts`
- Create: `apps/frontend/web-shell/src/app/manual/manual.module.css`
- Create: `apps/frontend/web-shell/src/app/manual/page.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores en código (Task 1 solo garantiza que el `.md` sigue el patrón de headings `## N. Texto`).
- Produces: ruta `GET /manual` servida por `web-shell` en `localhost:4000/manual`, pública. `parseManualMarkdown(markdown: string): { html: string; toc: { id: string; label: string }[] }` exportado desde `manual-markdown.ts` (no consumido fuera de `page.tsx`, pero es la interfaz que un futuro cambio de estilo tendría que respetar).

- [ ] **Step 1: Agregar la dependencia `marked`**

Run: `pnpm --filter web-shell add marked@^18.0.0`

Expected: `apps/frontend/web-shell/package.json` gana `"marked": "^18.0.0"` en `dependencies`, y `pnpm-lock.yaml` se actualiza. Verifica con:

Run: `grep -n '"marked"' apps/frontend/web-shell/package.json`
Expected: `"marked": "^18.0.0",`

- [ ] **Step 2: Crear el helper de parseo `manual-markdown.ts`**

Crea `apps/frontend/web-shell/src/app/manual/manual-markdown.ts`:

```typescript
import { Marked } from 'marked';

export type ManualTocEntry = {
  id: string;
  label: string;
};

export type ParsedManual = {
  html: string;
  toc: ManualTocEntry[];
};

// Los títulos de sección del manual siguen el patrón "## N. Texto" (§0..§10).
// Se usa ese número para generar anchors estables (#s0..#s10), igual que en
// el Artifact de Claude que esta página reemplaza.
const SECTION_HEADING = /^(\d+)\.\s+(.+)$/;

export function parseManualMarkdown(markdown: string): ParsedManual {
  const toc: ManualTocEntry[] = [];
  const marked = new Marked();

  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens);
        const match = SECTION_HEADING.exec(text.trim());
        const id = match ? `s${match[1]}` : undefined;

        if (depth === 2 && match) {
          toc.push({ id: `s${match[1]}`, label: match[2] });
        }

        return id
          ? `<h${depth} id="${id}">${html}</h${depth}>\n`
          : `<h${depth}>${html}</h${depth}>\n`;
      },
    },
  });

  const html = marked.parse(markdown) as string;
  return { html, toc };
}
```

- [ ] **Step 3: Crear los estilos `manual.module.css`**

Crea `apps/frontend/web-shell/src/app/manual/manual.module.css`:

```css
.shell {
  --manual-paper: #ede7d8;
  --manual-paper-raised: #f5f1e6;
  --manual-ink: #1c2024;
  --manual-ink-soft: #4a4f58;
  --manual-ink-faint: #7b7f77;
  --manual-accent: #1f5c6b;
  --manual-accent-soft: #d8e6e6;
  --manual-hairline: rgba(28, 32, 36, 0.16);
  --manual-hairline-strong: rgba(28, 32, 36, 0.32);
  --manual-font-label: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;

  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--manual-paper);
  color: var(--manual-ink);
  font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', ui-serif, serif;
  font-size: 17px;
  line-height: 1.6;
}

@media (prefers-color-scheme: dark) {
  .shell {
    --manual-paper: #16181c;
    --manual-paper-raised: #1d2025;
    --manual-ink: #ece7d9;
    --manual-ink-soft: #b9b6a9;
    --manual-ink-faint: #83807a;
    --manual-accent: #6fb3bd;
    --manual-accent-soft: #1f3438;
    --manual-hairline: rgba(236, 231, 217, 0.16);
    --manual-hairline-strong: rgba(236, 231, 217, 0.34);
  }
}

@media (max-width: 880px) {
  .shell {
    grid-template-columns: 1fr;
  }
}

.sidebar {
  border-right: 1px solid var(--manual-hairline);
  padding: 28px 22px 40px;
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
}

@media (max-width: 880px) {
  .sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--manual-hairline);
  }
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 26px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--manual-ink);
}

.mark {
  font-family: var(--manual-font-label);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.12em;
}

.sub {
  font-family: var(--manual-font-label);
  font-size: 0.68rem;
  color: var(--manual-ink-faint);
  letter-spacing: 0.06em;
}

.toc {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc a {
  text-decoration: none;
  color: var(--manual-ink-soft);
  font-family: var(--manual-font-label);
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  padding: 7px 10px;
  border-radius: 3px;
  display: block;
}

.toc a:hover {
  background: var(--manual-paper-raised);
  color: var(--manual-ink);
}

.main {
  padding: 44px clamp(20px, 5vw, 72px) 100px;
  max-width: 860px;
}

.main :global(h1) {
  font-family: var(--manual-font-label);
  font-weight: 700;
  font-size: clamp(1.5rem, 2.6vw, 2.05rem);
  letter-spacing: 0.01em;
  line-height: 1.25;
  margin: 0 0 22px;
}

.main :global(h2) {
  font-family: var(--manual-font-label);
  font-size: 1.02rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin: 46px 0 18px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--manual-ink);
  scroll-margin-top: 24px;
}

.main :global(h2:first-of-type) {
  margin-top: 0;
}

.main :global(h3) {
  font-style: italic;
  font-size: 1.15rem;
  margin: 28px 0 10px;
}

.main :global(p) {
  margin: 0 0 14px;
}

.main :global(ul),
.main :global(ol) {
  margin: 0 0 16px;
  padding-left: 1.3em;
}

.main :global(li) {
  margin-bottom: 7px;
}

.main :global(strong) {
  color: var(--manual-ink);
}

.main :global(code) {
  font-family: var(--manual-font-label);
  font-size: 0.85em;
  background: var(--manual-paper-raised);
  border: 1px solid var(--manual-hairline);
  border-radius: 3px;
  padding: 0.1em 0.4em;
}

.main :global(pre) {
  font-family: var(--manual-font-label);
  font-size: 0.82rem;
  background: var(--manual-ink);
  color: var(--manual-paper);
  border-radius: 6px;
  padding: 18px 20px;
  overflow-x: auto;
  line-height: 1.55;
  margin: 0 0 16px;
}

.main :global(pre code) {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
}

.main :global(blockquote) {
  margin: 0 0 20px;
  padding: 12px 16px;
  border-left: 3px solid var(--manual-accent);
  background: var(--manual-accent-soft);
  color: var(--manual-ink-soft);
  font-family: var(--manual-font-label);
  font-size: 0.8rem;
  letter-spacing: 0.01em;
}

.main :global(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.92rem;
  margin: 0 0 20px;
}

.main :global(th),
.main :global(td) {
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid var(--manual-hairline);
  vertical-align: top;
}

.main :global(th) {
  font-family: var(--manual-font-label);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--manual-ink-faint);
  background: var(--manual-paper-raised);
  border-bottom: 1px solid var(--manual-hairline-strong);
}

.main :global(a) {
  color: var(--manual-accent);
}

.error {
  padding: 44px clamp(20px, 5vw, 72px);
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  color: #a23b2e;
}
```

- [ ] **Step 4: Crear la página `page.tsx`**

Crea `apps/frontend/web-shell/src/app/manual/page.tsx`:

```tsx
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

const MANUAL_PATH = path.join(
  process.cwd(),
  '..',
  '..',
  '..',
  'DocumentacionParaElEquipo',
  'ManualDeRolesYFlujoQA.md',
);

async function loadManual() {
  try {
    const raw = await fs.readFile(MANUAL_PATH, 'utf8');
    return parseManualMarkdown(raw);
  } catch {
    return null;
  }
}

export default async function ManualPage() {
  const manual = await loadManual();

  if (!manual) {
    return (
      <main className={styles.error}>
        No se pudo cargar el manual — verifica que{' '}
        <code>DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md</code> existe.
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
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: contenido generado desde DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md, versionado en el repo y editado solo por el equipo — no es input de usuario, mismo nivel de confianza que el JSX de /como-funciona. */}
      <main className={styles.main} dangerouslySetInnerHTML={{ __html: manual.html }} />
    </div>
  );
}
```

- [ ] **Step 5: Lint**

Run: `pnpm --filter web-shell lint`
Expected: sin errores (el `biome-ignore` del Step 4 evita que la regla `noDangerouslySetInnerHtml` truene la corrida).

- [ ] **Step 6: Levantar el servidor y verificar el contenido servido**

Run: `pnpm --filter web-shell dev` (déjalo corriendo en background)

Run (en otra terminal, dale ~5-10s al servidor para compilar la ruta la primera vez): `curl -s http://localhost:4000/manual`

Expected: HTML de respuesta (código 200) que incluye, entre otras cosas:
- `id="s0"`, `id="s5"`, `id="s8"` (anchors de sección)
- El texto `Aquí se conecta plantilla` (callout del Task 1, Step 1)
- El texto `Conexión plantilla↔contrato` (anotación del Task 1, Step 2)
- El texto `Conecta una plantilla con este contrato` (tabla E2E del Task 1, Step 3)

Puedes filtrar con: `curl -s http://localhost:4000/manual | grep -o 'Aquí se conecta plantilla\|Conexión plantilla↔contrato\|Conecta una plantilla con este contrato\|id="s[0-9]*"'`

- [ ] **Step 7: Verificación visual en navegador**

Abre `http://localhost:4000/manual` en el navegador **sin haber iniciado sesión** y confirma:
1. Carga directo, sin redirigir a login.
2. El sidebar muestra los 11 links (§0 a §10) y cada uno hace scroll a su sección al hacer clic.
3. Las 3 secciones tocadas en Task 1 se ven bien formateadas (el callout de §5 como recuadro con borde de color, la línea nueva de §1 antes de "Ramas", la celda en negritas de la tabla E2E en §8).
4. Cambiando el tema del sistema operativo/navegador a oscuro, la página cambia de paleta (fondo oscuro, texto claro) sin recargar mal ningún estilo.

Detén el servidor de desarrollo cuando termines.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/web-shell/package.json apps/frontend/web-shell/src/app/manual pnpm-lock.yaml
git commit -m "feat(web-shell): publicar manual de roles y flujo en /manual"
```
