# ADR-0006 — Microfrontends con Next.js Multi-Zones

**Estado:** Aceptado · **Reemplaza:** la decisión previa "Module Federation para Microfrontends".

## Contexto

El frontend debe componerse de microfrontends como apps separadas (requisito del curso). La
opción inicial era Module Federation, pero `@module-federation/nextjs-mf` **solo soporta Pages
Router** y se **descontinúa a fin de 2026**; Module Federation + App Router está roto.

## Decisión

Componer los microfrontends con **Next.js Multi-Zones**. El `web-shell` actúa como host y,
mediante `rewrites` de Next, enruta cada `basePath` (p.ej. `/solicitudes`) a la app del
microfrontend correspondiente, todas bajo un mismo dominio. Existen 7 MFs: `solicitudes`,
`contratos`, `documentos`, `flujo`, `firmas`, `reportes`, `admin`.

## Consecuencias

- Mecanismo nativo y estable de Next.js 15 para apps separadas; sin dependencia descontinuada.
- Cada MF es una app Next.js independiente con su propio `basePath` y deploy.
- Trade-off: la navegación entre zonas es navegación de página completa (no comparten runtime).
  El estado global (auth/privilegios) vive en Redux del `web-shell`; el estado local en cada MF.
- Consumo de API vía **RTK Query**; ocultamiento de funciones por privilegio con
  `<PrivilegeGuard>`; diseño consistente vía `commons/ui` (Neobrutalism/shadcn + Tailwind v4).
