// Crea los archivos .env de cada servicio backend a partir de su .env.example.
// Los .env están en .gitignore, así que un clon nuevo no los trae. Este script
// los genera sin sobrescribir los existentes. Uso: `pnpm setup:env`.

import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'apps', 'backend');

const servicesDir = join(backend, 'services');
const dirs = [
  join(backend, 'gateway'),
  ...(existsSync(servicesDir)
    ? readdirSync(servicesDir)
        .map((name) => join(servicesDir, name))
        .filter((p) => statSync(p).isDirectory())
    : []),
];

let created = 0;
let kept = 0;

for (const dir of dirs) {
  const example = join(dir, '.env.example');
  const target = join(dir, '.env');
  if (!existsSync(example)) continue;
  if (existsSync(target)) {
    console.log(`=  ${target.replace(root, '.')} ya existe — se conserva`);
    kept += 1;
    continue;
  }
  copyFileSync(example, target);
  console.log(`✓  creado ${target.replace(root, '.')}`);
  created += 1;
}

console.log(`\nListo: ${created} .env creado(s), ${kept} conservado(s).`);
console.log('Edita los JWT_SECRET si vas a exponer el backend fuera de tu máquina.');
