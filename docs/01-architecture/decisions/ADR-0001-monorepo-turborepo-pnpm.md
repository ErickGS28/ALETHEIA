# ADR-0001 — Monorepo con Turborepo + pnpm

**Estado:** Aceptado

## Contexto

Frontend y backend del CLM se desarrollan en conjunto y comparten tipos (DTOs, contratos de
API). Tener repos separados duplica configuración y dificulta mantener los tipos sincronizados.

## Decisión

Usar un **monorepo único** con **Turborepo + pnpm**, **aplanado a la raíz git**: `ALETHEIA/`
es a la vez la raíz del repositorio y la raíz del workspace. Ya no existe la carpeta anidada
`clm-system/`. Configuración compartida de TypeScript (`tsconfig.base.json`) y Biome.

## Consecuencias

- Builds incrementales y cacheados con Turborepo.
- Un solo `pnpm install` para todo el workspace; `.husky/` queda junto a `.git`, evitando el
  error `prepare: .git can't be found`.
- Gestor de paquetes unificado: **pnpm 10.8.1** (se elimina el uso de npm en frontend).
