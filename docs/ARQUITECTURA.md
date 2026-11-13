# Arquitectura

## Estructura

```
prisma/schema.prisma          Modelo de datos
prisma/migrations/            Tablas + restricciones (anti-solapes, rangos válidos)
prisma/seed.ts                Contenido provisional y administrador inicial
src/proxy.ts                  Protege /admin y aplica la Content-Security-Policy
src/auth.ts                   Auth.js: acceso con contraseña + segundo factor
src/lib/slots.ts              Cálculo puro de horas libres (probado en tests/slots.test.ts)
src/lib/availability.ts       Horas libres a partir de la base de datos
src/lib/booking.ts            Crear, mover y cancelar citas (transaccional)
src/lib/email.ts              Emails con Resend + registro de cada envío
src/lib/rate-limit.ts         Límite de peticiones guardado en PostgreSQL
src/app/                      Páginas públicas, /admin y /api
src/app/admin/actions.ts      Todas las acciones del panel (cada una exige sesión)
```

## Modelo de datos

| Tabla | Para qué |
|---|---|
| `Setting` | Fila única: textos, contacto, valoración, reglas de reserva, datos legales |
| `Service` | Servicios (precio, duración, visible o no). Borrado lógico |
| `WeeklyHours` | Horario de cada día de la semana, con un descanso opcional |
| `ClosedDay` | Festivos y días cerrados |
| `TimeBlock` | Horas bloqueadas dentro de un día abierto |
| `Customer` | Nombre, email y teléfono del cliente |
| `Appointment` | Cita, con copia del nombre, precio y duración del servicio en el momento de reservar |
| `GalleryImage`, `Review` | Galería y reseñas |
| `AdminUser` | Administrador (hash bcrypt, secreto del segundo factor) |
| `EmailLog`, `AuditLog`, `RateLimit` | Registro de emails, de accesos y contadores de peticiones |

Las fechas se guardan en UTC y se calculan en `Europe/Madrid`.

## Decisiones

- **Sin cuentas de cliente.** El cliente gestiona su cita con un enlace privado. El token se deriva del secreto del servidor (HMAC) y en la base de datos solo se guarda su hash.
- **La web no muestra precios.** Al completar una cita se anota el importe cobrado en efectivo, y esa cifra alimenta la facturación.
- **Los ingresos cuentan solo citas completadas**, con el importe que anota Carlos.
- **Mapa de OpenStreetMap cargado bajo demanda** y **fuentes servidas desde el propio dominio**: la web no usa cookies de terceros ni necesita aviso de cookies.
- **Recordatorios**: tarea diaria a las 17:00 UTC que avisa de las citas de las siguientes 36 horas. Con Vercel Pro puede ser horaria (ver despliegue).

## Seguridad

| Riesgo | Medida |
|---|---|
| Reservas duplicadas | Bloqueo transaccional + restricción de exclusión en PostgreSQL |
| Acceso al panel | Auth.js, sesión de 8 h en cookie `HttpOnly`, comprobación en `proxy.ts` **y** en cada página y acción |
| Fuerza bruta | 8 intentos cada 15 min por IP y por cuenta; registro de accesos; segundo factor TOTP |
| Inyección SQL | Prisma con consultas parametrizadas; ninguna consulta concatena texto del usuario |
| XSS | React escapa la salida; entradas validadas con Zod (se rechazan `<` y `>`); CSP con nonce por petición |
| CSRF | Server Actions de Next (comprobación de origen) y comprobación de `Origin` en las rutas `/api` |
| Abuso del formulario | Límite por IP, campo trampa para bots, máximo de 3 citas pendientes por email |
| Fuga de datos | La disponibilidad pública solo devuelve horas; los datos de clientes solo salen por rutas con sesión |
| Subida de archivos | Solo administrador, máximo 4 MB, tipo detectado por el contenido del archivo |
| Cabeceras | HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Secretos | Solo en variables de entorno; `.env` está fuera del repositorio |

## RGPD: qué hace la aplicación

- Casilla de consentimiento obligatoria, con fecha guardada.
- Solo se piden nombre, teléfono y email.
- Exportar los datos de un cliente (derecho de acceso) y borrarlos (derecho de supresión) desde **Clientes**.
- Anonimización automática a los 24 meses sin citas (`RETENTION_MONTHS`).
- Política de privacidad y aviso legal generados con los datos del titular.

Lo que la aplicación **no** puede hacer por Carlos está en [`PENDIENTE.md`](PENDIENTE.md).
