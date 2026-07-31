# ADR-0003 — JWT con privilegios en payload

**Estado:** Aceptado

## Contexto

Cada request debe verificar permisos. Consultar la BD de auth en cada petición añade latencia
y acopla el gateway a `auth-service` en el camino crítico.

## Decisión

El `access token` (JWT) incluye en su payload `{ userId, roles[], privileges[] }`. El
**gateway** valida el token y verifica el privilegio requerido sin consultar la BD por request.
Tokens de corta duración (15 min) + `refreshToken` (7 días) almacenado en BD para poder
invalidarlo en logout.

## Consecuencias

- El `JwtAuthGuard` + `PrivilegeGuard` del gateway resuelven autorización en memoria.
- Los microservicios confían en el contexto de usuario que el gateway propaga en el mensaje.
- Tokens cortos minimizan el riesgo de robo; cambios de privilegios surten efecto al refrescar.
