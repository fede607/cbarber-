# Barbería Carlos

Web de la barbería con reservas online y panel de administración propio.

- **Web pública** (`/`): portada, servicios y precios, sobre Carlos, galería, reseñas, horario, ubicación.
- **Reservas** (`/reservar`): servicio → día y hora → datos → confirmación. Cambio y cancelación desde un enlace privado (`/reserva/…`).
- **Panel** (`/admin`): resumen con facturación y gráficos, reservas, clientes, servicios, horarios, contenido y seguridad.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Motion · PostgreSQL · Prisma · Auth.js · Resend · Recharts.

## Arrancar en local

Necesitas Node 22 y un PostgreSQL.

```bash
cp .env.example .env        # rellena DATABASE_URL, DIRECT_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:migrate          # crea las tablas y la restricción anti-solapes
npm run db:seed             # contenido provisional + usuario administrador
npm run dev                 # http://localhost:3000
```

## Pruebas

```bash
npm test                                             # cálculo de horas libres
npm run build && npm start &                         # servidor real
TEST_URL=http://localhost:3000 npm test              # + pruebas de extremo a extremo
```

Las pruebas de extremo a extremo comprueban, contra el servidor y la base de datos reales: reserva y bloqueo de la hora,
20 reservas simultáneas sobre la misma hora (solo entra una), rechazo de solapes en la propia base de datos, festivos,
bloqueos de horas, cambio y cancelación por enlace, validación de datos, límite de peticiones y que el panel y los datos
de clientes no son accesibles sin sesión.

## Cómo se garantiza que una hora no se reserva dos veces

1. Cada escritura en la agenda se serializa con un bloqueo de PostgreSQL (`pg_advisory_xact_lock`) y recalcula la disponibilidad dentro de la misma transacción.
2. Aunque eso fallara, la tabla `Appointment` tiene una **restricción de exclusión** (`prisma/migrations/*_no_overlap`): PostgreSQL rechaza cualquier cita activa cuyo intervalo solape con otra.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): estructura, modelo de datos y medidas de seguridad.
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): publicación, dominio, DNS, HTTPS y emails (SPF, DKIM, DMARC).
- [`docs/PENDIENTE.md`](docs/PENDIENTE.md): lo que Carlos tiene que aportar antes de publicar.
