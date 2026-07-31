/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'users',
        'contracts',
        'documents',
        'workflow',
        'signatures',
        'notifications',
        'reports',
        'catalogs',
        'shared-schemas',
        'web-shell',
        'solicitudes-mf',
        'contratos-mf',
        'documentos-mf',
        'flujo-mf',
        'firmas-mf',
        'reportes-mf',
        'admin-mf',
        'commons',
        'infra',
        'deps',
        'ci',
      ],
    ],
  },
};
