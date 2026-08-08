# Vista pública `/manual` dentro del proyecto — Diseño

Fecha: 2026-08-08 · Estado: **diseño aprobado**, pendiente de plan de implementación.

## 1. Contexto y motivación

`DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` es la fuente de verdad del manual de
roles y flujo de revisión (usado para QA interno y para que el equipo entienda el flujo antes
de tocar el código). Hasta hoy, la única versión "visual" de ese documento vivía **fuera del
repo**: un Artifact de Claude (HTML publicado, privado), actualizado a mano cada vez que el
`.md` cambiaba, sin que su URL quedara guardada en ningún lugar del proyecto.

El usuario reportó no poder encontrar esa vista ("ya no está en el proyecto /manual") — el
Artifact seguía existiendo y estaba al día, pero al no tener rastro en el repo, quedaba a
merced de que alguien recordara dónde estaba. Pidió que sea una **vista pública real dentro
del proyecto**, en `localhost:4000/manual`.

Además, señaló que el manual no deja suficientemente claro **quién y en qué momento** conecta
una plantilla con un contrato (trabajo de la sesión del 31 de julio, "conexión
plantillas-flujo") — la información existe pero está implícita dentro de un paso de una lista
en §5, no destacada como su propio hito del flujo.

## 2. Objetivos

- Publicar `/manual` como página pública (sin login) dentro de `web-shell`, con navegación
  lateral (TOC) igual que el Artifact actual.
- **Fuente única de verdad**: la página lee y renderiza
  `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` directamente — no hay contenido
  duplicado en JSX. Actualizar el `.md` actualiza `/manual` automáticamente, eliminando el
  riesgo de que la vista visual quede desactualizada o se "pierda" otra vez.
- Reforzar en el contenido del `.md` (y por lo tanto en `/manual`) el momento exacto — Abogado,
  durante `ADMIN_REVIEW` — en que se conecta una plantilla con un contrato.

## 3. No-objetivos (YAGNI)

- No se replica el sistema de "sellos" de color exactos del Artifact (`stamp-teal`,
  `stamp-red`, etc.) — se simplifican a callouts genéricos (blockquote) para evitar tener que
  inventar una sintaxis Markdown propia solo para eso.
- No se toca la columna `Contract.templateId` (sin usar en BD) — quedó fuera de alcance por
  decisión explícita en sesiones anteriores y el usuario confirmó que no es lo que quiere
  aclarar ahora.
- No se retira ni se deja de mantener el Artifact de Claude existente — sigue existiendo como
  respaldo, pero deja de ser necesario para uso diario del equipo.
- No se añade autenticación ni control de acceso a `/manual` — es pública por diseño, igual que
  `/como-funciona`.
- No se introduce un pipeline MDX completo (`@next/mdx`, `remark`/`rehype`) — basta un parser
  Markdown ligero con un renderer personalizado.

## 4. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Ruta | `apps/frontend/web-shell/src/app/manual/page.tsx` (server component, sin `useAuth`) |
| Fuente de contenido | Lectura en vivo de `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` vía `fs.readFileSync` |
| Parser Markdown | `marked` (nueva dependencia, ligera) + renderer personalizado |
| TOC del sidebar | Generado automáticamente a partir de los headings `##` parseados (id derivado del número inicial: `## 0. ...` → `id="s0"`) |
| Estilos | `manual.module.css` con el tema "papel" migrado del Artifact (serif, paper background, soporte claro/oscuro), aislado del resto del shell |
| Acceso | Público, sin guard — sigue el mismo patrón que `/como-funciona` (nunca llama `useAuth`) |
| Contenido — conexión plantillas↔contrato | Se agrega un callout explícito al inicio de §5 (Abogado), una anotación en §1 (recorrido), y se ajusta la fila del Abogado en la tabla E2E (§8) — ver detalle abajo |

## 5. Arquitectura y flujo de datos

```
DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md   (fuente de verdad, versionado en git)
                    │
                    │ fs.readFileSync (server component, runtime Node)
                    ▼
apps/frontend/web-shell/src/app/manual/page.tsx
                    │
                    │ marked.parse(md, { renderer: customRenderer })
                    ▼
        HTML con ids en cada heading ##  +  TOC extraído de esos headings
                    │
                    ▼
        JSX: <aside class="sidebar">{TOC}</aside> + <main dangerouslySetInnerHTML={html}>
                    │
                    ▼
        manual.module.css (tema papel/serif, claro/oscuro)
```

**Por qué server component + `fs`:** `/como-funciona` ya es un server component sin
`'use client'`, corriendo en runtime Node por defecto en el App Router — no hay razón para que
`/manual` sea distinto, y `fs.readFileSync` funciona sin problema ahí. Si en el futuro se
sirve desde un runtime Edge, habría que migrar a leer el archivo en build time
(`generateStaticParams`/`fs` en build) — no es necesario hoy.

**Renderer personalizado de `marked`:** solo dos overrides:
- `heading`: agrega `id` derivado del número inicial del texto del heading, para que los
  anchors del sidebar (`#s0`, `#s3`, ...) sigan funcionando igual que en el Artifact.
- (opcional, si hace falta legibilidad) `code`: aplica la clase del bloque monoespaciado
  oscuro ya definido en `manual.module.css`.

Todo lo demás (párrafos, listas, tablas, blockquotes, negritas, código inline) usa el
render por defecto de `marked`, estilado vía selectores de `manual.module.css` sobre las
etiquetas HTML estándar (`table`, `blockquote`, `code`, etc.) — sin necesidad de sintaxis
Markdown especial.

## 6. Cambios de contenido en el `.md` (conexión plantillas↔contrato)

Tres ediciones puntuales a `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md`:

1. **Callout nuevo al inicio de §5 (Abogado)**, antes de la nota de cola existente:
   > **Aquí se conecta plantilla ↔ contrato:** el Abogado, y solo el Abogado, elige una
   > plantilla y la convierte en el documento formal de *este* contrato específico — ocurre
   > durante `ADMIN_REVIEW`, en **Contratos → Elaborar documento** (paso 2 abajo). Ese
   > documento resultante (no la plantilla en abstracto) es lo que después ven Aprobador,
   > Firmante y el detalle general del contrato. Ninguna otra pantalla ni rol hace esta
   > conexión.

2. **Anotación en §1** (el recorrido de un contrato), junto al diagrama de estados:
   > **Conexión plantilla↔contrato:** ocurre durante `ADMIN_REVIEW`, la dispara el Abogado —
   > ver §5.

3. **Ajuste en la fila del Abogado de la tabla E2E (§8)**: la descripción cambia de "Elabora
   el documento formal desde una plantilla (obligatorio) y aprueba" a "**Conecta una plantilla
   con este contrato** elaborando el documento formal (obligatorio) y aprueba".

Como `/manual` lee el `.md` en vivo, estos tres cambios se reflejan en la página sin tocar
código de la página en sí.

## 7. Manejo de errores

- Si `fs.readFileSync` falla (archivo movido/borrado): la página debe mostrar un error legible
  en vez de tronar la build — un `try/catch` alrededor de la lectura, con un mensaje tipo "No
  se pudo cargar el manual — verifica que
  `DocumentacionParaElEquipo/ManualDeRolesYFlujoQA.md` existe" en vez de una página 500 en
  blanco.
- Si `marked` no reconoce algún heading con el formato `## N. Texto` (por ejemplo, si alguien
  edita el `.md` y rompe el patrón), el heading simplemente no obtiene `id` corto — sigue
  renderizándose como texto normal, solo sin anchor en el TOC. No es un caso que necesite
  manejo especial más allá de eso.

## 8. Testing / verificación

- Verificación en vivo en navegador (`pnpm dev`, visitar `localhost:4000/manual` **sin haber
  iniciado sesión**) — confirmar que carga sin redirigir a login.
- Confirmar que los 3 cambios de contenido (§6 de este diseño) aparecen correctamente
  renderizados.
- Confirmar navegación del sidebar (cada link ancla a su sección).
- Confirmar que el tema claro/oscuro del navegador cambia el estilo de la página
  (`prefers-color-scheme`).
- No se requieren tests automatizados nuevos — es una página de solo lectura sin lógica de
  negocio; el editor de plantillas/contratos ya tiene su propia cobertura donde corresponde.
