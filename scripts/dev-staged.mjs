/**
 * Sequential staged startup — avoids Windows paging-file exhaustion.
 * Each NestJS/Next.js service starts one at a time with a 10 s gap so
 * TypeScript compilation finishes before the next process allocates memory.
 *
 * Usage: node scripts/dev-staged.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const ROOT = 'C:\\ERICK\\UTEZ\\9NO\\DW Integral\\Integradora\\DocBase\\ALETHEIA';
const NODE_OPTS = '--max-old-space-size=512';

const procs = [];

function startService(label, cwd) {
  if (!existsSync(cwd)) {
    console.warn(`[staged] SKIP ${label} — path not found`);
    return null;
  }
  console.log(`[staged] ▶ ${label}`);
  const p = spawn('pnpm run dev', {
    cwd,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    env: { ...process.env, NODE_OPTIONS: NODE_OPTS },
  });
  p.on('exit', (c) => {
    if (c && c !== 0) console.error(`[staged] ✗ ${label} exited ${c}`);
  });
  procs.push(p);
  return p;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const cleanup = () => {
  console.log('\n[staged] Stopping all services...');
  for (const p of procs) {
    try {
      p.kill('SIGTERM');
    } catch {}
  }
  setTimeout(() => process.exit(0), 500);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// ── Backend (sequential, 10 s apart) ─────────────────────────────────────
startService('gateway', `${ROOT}\\apps\\backend\\gateway`);
await wait(10_000);

startService('auth-service', `${ROOT}\\apps\\backend\\services\\auth-service`);
await wait(10_000);

startService('contracts-service', `${ROOT}\\apps\\backend\\services\\contracts-service`);
await wait(10_000);

startService('workflow-service', `${ROOT}\\apps\\backend\\services\\workflow-service`);
await wait(12_000);

// ── Frontend — web-shell + 7 MFs (two batches of 4) ──────────────────────
console.log('[staged] Starting frontend batch 1…');
startService('web-shell', `${ROOT}\\apps\\frontend\\web-shell`);
startService('solicitudes-mf', `${ROOT}\\apps\\frontend\\microfrontends\\solicitudes-mf`);
startService('contratos-mf', `${ROOT}\\apps\\frontend\\microfrontends\\contratos-mf`);
startService('documentos-mf', `${ROOT}\\apps\\frontend\\microfrontends\\documentos-mf`);
await wait(10_000);

console.log('[staged] Starting frontend batch 2…');
startService('flujo-mf', `${ROOT}\\apps\\frontend\\microfrontends\\flujo-mf`);
startService('firmas-mf', `${ROOT}\\apps\\frontend\\microfrontends\\firmas-mf`);
startService('reportes-mf', `${ROOT}\\apps\\frontend\\microfrontends\\reportes-mf`);
startService('admin-mf', `${ROOT}\\apps\\frontend\\microfrontends\\admin-mf`);

console.log('[staged] All services started. Ctrl-C to stop.');
await new Promise(() => {});
