// seed-demo.mjs — Datos demo de contratos en varios estados vía la API REST.
//
// Idempotente-tolerante: NO borra datos existentes. Crea ~7 contratos demo y los
// avanza a distintos estados usando los endpoints reales del API Gateway.
//
// Uso (desde la raíz del monorepo):  node scripts/seed-demo.mjs
//
// State machine (workflow-service):
//   DRAFT --SUBMIT--> SUBMITTED --APPROVE--> ADMIN_REVIEW --APPROVE--> LAWYER_REVIEW
//     --APPROVE--> APPROVAL_PENDING --APPROVE--> SIGNING --SIGN--> SIGNED
//   (CANCEL disponible desde cualquier estado no terminal)
//
// El admin tiene TODOS los privilegios → puede ejecutar todas las transiciones.

const BASE = process.env.ALETHEIA_API ?? 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@aletheia.com';
const ADMIN_PASSWORD = 'password123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let accessToken = null;

/**
 * Wrapper de fetch que añade el Bearer, parsea el envelope { data, ... } y, ante
 * una respuesta no-2xx, imprime status + body y devuelve { ok:false }.
 */
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error(`❌ ${method} ${path} — fallo de red: ${err.message}`);
    return { ok: false, status: 0, data: null };
  }

  let payload = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    console.error(
      `❌ ${method} ${path} → HTTP ${res.status}: ${
        typeof payload === 'string' ? payload : JSON.stringify(payload)
      }`,
    );
    return { ok: false, status: res.status, data: payload?.data ?? payload };
  }

  // El interceptor global envuelve las respuestas en { data, statusCode, message }.
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return { ok: true, status: res.status, data };
}

async function login() {
  const res = await api('POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (!res.ok || !res.data?.accessToken) {
    throw new Error('No se pudo iniciar sesión como admin — ¿backend en :3001?');
  }
  accessToken = res.data.accessToken;
  console.log(`🔑 Login OK como ${ADMIN_EMAIL}`);
}

/** Crea un contrato DRAFT. Devuelve el objeto del contrato o null si falló. */
async function createContract(spec) {
  const res = await api('POST', '/contracts', {
    title: spec.title,
    vendorName: spec.vendorName,
    vendorEmail: spec.vendorEmail,
    providerType: spec.providerType,
    areaId: spec.areaId,
    societyId: spec.societyId,
  });
  if (!res.ok || !res.data?.id) {
    console.error(`   ↳ no se pudo crear "${spec.title}"`);
    return null;
  }
  console.log(`📄 Creado #${res.data.id} (${res.data.folio}) — "${spec.title}"`);
  return res.data;
}

async function submit(id) {
  const res = await api('POST', `/contracts/${id}/submit`);
  if (res.ok) console.log(`   ↳ #${id} SUBMIT → SUBMITTED`);
  return res.ok;
}

async function approve(id, comment) {
  const res = await api('POST', `/workflow/${id}/approve`, { comment });
  if (res.ok) console.log(`   ↳ #${id} APPROVE → ${res.data?.status ?? 'ok'}`);
  return res.ok;
}

async function cancel(id, reason) {
  const res = await api('POST', `/contracts/${id}/cancel`, { reason });
  if (res.ok) console.log(`   ↳ #${id} CANCEL → CANCELLED`);
  return res.ok;
}

async function sign(id) {
  const res = await api('POST', `/signatures/${id}`, {
    method: 'CANVAS',
    signatureData:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  });
  if (res.ok) console.log(`   ↳ #${id} SIGN encolado (CONTRACT_SIGNED)`);
  return res.ok;
}

async function uploadDocument(id, doc) {
  const res = await api('POST', `/documents/${id}`, {
    name: doc.name,
    type: doc.type,
    fileUrl: 'https://files/demo.pdf',
    mimeType: 'application/pdf',
  });
  if (res.ok) console.log(`   ↳ #${id} documento "${doc.name}" subido`);
  return res.ok;
}

/** Aprueba n veces seguidas, deteniéndose si alguna falla. */
async function approveTimes(id, n) {
  for (let i = 0; i < n; i++) {
    const ok = await approve(id, `Aprobación demo ${i + 1}`);
    if (!ok) return false;
  }
  return true;
}

async function main() {
  await login();

  // 2) Catálogos reales.
  const socRes = await api('GET', '/societies');
  const areaRes = await api('GET', '/areas');
  const societies = Array.isArray(socRes.data) ? socRes.data : [];
  const areas = Array.isArray(areaRes.data) ? areaRes.data : [];
  if (societies.length === 0 || areas.length === 0) {
    throw new Error('No hay sociedades/áreas en los catálogos — corre los seeds base primero.');
  }
  console.log(`📚 Catálogos: ${societies.length} sociedades, ${areas.length} áreas`);

  const soc = (i) => societies[i % societies.length].id;
  const area = (i) => areas[i % areas.length].id;

  // 3) Especificaciones de los 7 contratos demo (varían providerType, área, sociedad).
  const specs = [
    {
      target: 'DRAFT',
      title: 'Suministro de papelería corporativa',
      vendorName: 'Distribuidora Office Plus S.A. de C.V.',
      vendorEmail: 'ventas@officeplus.com',
      providerType: 'MORAL',
      areaId: area(0),
      societyId: soc(0),
    },
    {
      target: 'SUBMITTED',
      title: 'Servicio de mantenimiento de equipos de cómputo',
      vendorName: 'TecnoSoporte Integral S. de R.L.',
      vendorEmail: 'contacto@tecnosoporte.mx',
      providerType: 'MORAL',
      areaId: area(3),
      societyId: soc(1),
    },
    {
      target: 'ADMIN_REVIEW',
      title: 'Consultoría legal externa',
      vendorName: 'Lic. Roberto Méndez Aguilar',
      vendorEmail: 'rmendez@abogados.mx',
      providerType: 'FISICA',
      areaId: area(1),
      societyId: soc(0),
    },
    {
      target: 'LAWYER_REVIEW',
      title: 'Arrendamiento de oficinas zona norte',
      vendorName: 'Inmobiliaria del Valle S.A. de C.V.',
      vendorEmail: 'arrendamientos@inmovalle.com',
      providerType: 'MORAL',
      areaId: area(0),
      societyId: soc(1),
    },
    {
      target: 'SIGNING',
      title: 'Capacitación en seguridad industrial',
      vendorName: 'Ing. Laura Fernández Cruz',
      vendorEmail: 'lfernandez@capacita.mx',
      providerType: 'FISICA',
      areaId: area(2),
      societyId: soc(0),
    },
    {
      target: 'SIGNED',
      title: 'Licencia de software de gestión documental',
      vendorName: 'Soluciones Digitales Avanzadas S.A.P.I.',
      vendorEmail: 'licencias@sda.com',
      providerType: 'MORAL',
      areaId: area(3),
      societyId: soc(1),
    },
    {
      target: 'CANCELLED',
      title: 'Servicio de catering para eventos',
      vendorName: 'Banquetes y Eventos La Mesa S.A. de C.V.',
      vendorEmail: 'eventos@lamesa.mx',
      providerType: 'MORAL',
      areaId: area(2),
      societyId: soc(0),
    },
  ];

  const summary = [];

  for (const spec of specs) {
    const c = await createContract(spec);
    if (!c) {
      summary.push({
        folio: '(no creado)',
        title: spec.title,
        target: spec.target,
        state: 'ERROR',
      });
      continue;
    }
    const entry = {
      id: c.id,
      folio: c.folio,
      title: spec.title,
      target: spec.target,
      state: 'DRAFT',
    };

    switch (spec.target) {
      case 'DRAFT':
        // Solo crear.
        break;

      case 'SUBMITTED':
        if (await submit(c.id)) entry.state = 'SUBMITTED';
        break;

      case 'ADMIN_REVIEW':
        if ((await submit(c.id)) && (await approveTimes(c.id, 1))) entry.state = 'ADMIN_REVIEW';
        break;

      case 'LAWYER_REVIEW':
        if ((await submit(c.id)) && (await approveTimes(c.id, 2))) entry.state = 'LAWYER_REVIEW';
        // Documento en el contrato de revisión.
        await uploadDocument(c.id, { name: 'Acta constitutiva', type: 'ACTA_CONSTITUTIVA' });
        break;

      case 'SIGNING':
        if ((await submit(c.id)) && (await approveTimes(c.id, 4))) entry.state = 'SIGNING';
        break;

      case 'SIGNED':
        if ((await submit(c.id)) && (await approveTimes(c.id, 4))) {
          entry.state = 'SIGNING';
          // Documentos antes de firmar.
          await uploadDocument(c.id, { name: 'Contrato firmado', type: 'CONTRATO' });
          await uploadDocument(c.id, {
            name: 'Identificación del representante',
            type: 'IDENTIFICACION',
          });
          if (await sign(c.id)) {
            // El SIGN se completa por cola → pequeña espera antes de leer el estado.
            await sleep(1500);
            const fresh = await api('GET', `/contracts/${c.id}`);
            entry.state =
              fresh.ok && fresh.data?.status ? fresh.data.status : 'SIGNING (firma encolada)';
          }
        }
        break;

      case 'CANCELLED':
        // CANCEL requiere un workflow existente; SUBMIT lo crea (SUBMITTED es cancelable).
        await submit(c.id);
        if (await cancel(c.id, 'Proveedor no cumplió requisitos fiscales'))
          entry.state = 'CANCELLED';
        break;
    }

    summary.push(entry);
  }

  // 5) Resumen final.
  console.log('\n================= RESUMEN DEMO =================');
  for (const e of summary) {
    const folio = (e.folio ?? '?').padEnd(20);
    const state = (e.state ?? '?').padEnd(22);
    const flag =
      e.state === e.target || (e.target === 'SIGNED' && e.state === 'SIGNED') ? '✅' : '⚠️ ';
    console.log(`${flag} ${folio} ${state} ${e.title}`);
  }
  console.log('===============================================');
  console.log(`Total: ${summary.length} contratos demo (objetivo de estados variados).`);
}

main().catch((err) => {
  console.error('\n💥 Error fatal:', err.message);
  process.exit(1);
});
