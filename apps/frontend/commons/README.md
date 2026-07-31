# @aletheia/frontend-commons

Código compartido entre el `web-shell` y los microfrontends (SOFEA).

```
src/
├─ ui/      → Atomic Design (atoms, molecules, organisms) — neobrutalism/shadcn
├─ hooks/   → hooks reutilizables
├─ state/   → estado global (Redux Toolkit) consumido por los MFs
├─ api/     → clientes HTTP tipados (RTK Query) hacia el gateway
└─ utils/   → utilidades (p.ej. `cn`)
```

**Regla:** un componente vive aquí solo si lo usa **más de un** microfrontend.
Si es exclusivo de una feature, vive dentro de esa feature en su MF.

Para consumirlo desde un microfrontend Next.js, agrega el paquete como
dependencia (`"@aletheia/frontend-commons": "workspace:*"`) y habilita
`transpilePackages: ['@aletheia/frontend-commons']` en su `next.config.ts`.
