# Publicación, dominio y emails

Nada de esto está contratado. Son los pasos para hacerlo cuando Carlos lo autorice.

## 1. Dominio

**Quién debe figurar como titular: Carlos.** El titular es el dueño legal del dominio. Quien paga puede ser otra persona:
la tarjeta o la cuenta de PayPal no tienen que coincidir con el titular.

Forma recomendada:

1. Carlos (o tú con él delante) crea una cuenta en el registrador **con el email de Carlos** y una contraseña que él guarde.
2. En los datos de titular: nombre y apellidos de Carlos, su NIF/NIE, dirección, teléfono y email. Para un `.es`, el NIF/NIE es obligatorio.
3. En el pago, usa tu tarjeta o tu PayPal.
4. Activa la renovación automática y la verificación en dos pasos de la cuenta.

Si lo compras en una cuenta tuya y a tu nombre, el dominio es legalmente tuyo, no de Carlos. Se puede transferir después, pero es un trámite evitable.

Registradores: para `.es` conviene uno acreditado por Red.es (DonDominio, Arsys, OVHcloud, IONOS…); para `.com` sirve
cualquiera. Comprueba en el momento de la compra el precio de **renovación** (no solo el del primer año) y si acepta PayPal.

## 2. Base de datos (Neon)

1. Crea un proyecto en neon.tech, región **Frankfurt (eu-central-1)**.
2. Copia las dos cadenas de conexión: la *pooled* (→ `DATABASE_URL`) y la directa (→ `DIRECT_URL`).

## 3. Hosting (Vercel)

1. Importa el repositorio en vercel.com.
2. Añade las variables de entorno de `.env.example` (Settings → Environment Variables).
3. Tras el primer despliegue, ejecuta una vez contra la base de datos de producción:
   ```bash
   npm run db:migrate && npm run db:seed
   ```
   `db:seed` crea el administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Después, entra en `/admin/seguridad`,
   cambia la contraseña, activa la verificación en dos pasos y borra `ADMIN_PASSWORD` de Vercel.
4. Subida de fotos desde el panel: Storage → Blob → crear almacén y conectarlo al proyecto (añade `BLOB_READ_WRITE_TOKEN`).

**Plan.** El plan Hobby de Vercel es solo para uso personal y no comercial, y sus tareas programadas se ejecutan una vez
al día. Esta web muestra precios y lleva la facturación; si Carlos cobra por los cortes, corresponde el plan Pro.
Con Pro, cambia en `vercel.json` el horario a `"0 * * * *"` y pon `REMINDER_WINDOW_HOURS=24` para avisar justo 24 horas antes.

## 4. Conectar el dominio y HTTPS

En Vercel → Settings → Domains añade `tudominio.es` y `www.tudominio.es`. Vercel indica los registros exactos; normalmente:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | la IP que indique Vercel |
| CNAME | `www` | el destino que indique Vercel |

Créalos en el panel DNS del registrador. El certificado HTTPS lo emite y renueva Vercel solo. La aplicación ya envía HSTS
y redirige a HTTPS. Por último, pon `APP_URL=https://tudominio.es` y vuelve a desplegar.

## 5. Emails (Resend) con SPF, DKIM y DMARC

Sin dominio verificado, Resend solo permite enviar a la dirección del titular de la cuenta.

1. Crea la cuenta en resend.com y añade el dominio. Recomendado: un subdominio de envío, por ejemplo `citas.tudominio.es`.
2. Resend muestra los registros DNS. Cópialos **tal cual** en el registrador:
   - **DKIM**: un registro TXT `resend._domainkey…` con la clave pública (firma los mensajes).
   - **SPF**: un TXT `v=spf1 include:amazonses.com ~all` y un MX en el subdominio `send…` (autoriza a Resend a enviar).
3. Añade tú el registro **DMARC** (TXT en `_dmarc.tudominio.es`). Empieza en modo observación:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@tudominio.es
   ```
   Tras dos semanas sin incidencias, súbelo a `p=quarantine` y después a `p=reject`.
4. Pulsa *Verify* en Resend. Crea una clave de API con permiso solo de envío → `RESEND_API_KEY`.
5. Pon `EMAIL_FROM="Barbería Carlos <reservas@citas.tudominio.es>"` y, si Carlos quiere avisos, `ADMIN_NOTIFY_EMAIL`.
6. Haz una reserva de prueba y revisa el resultado en **Panel → Seguridad → Emails enviados**.

Si el dominio ya tiene un SPF, no crees un segundo: solo puede haber uno por nombre.

**Buzón para recibir correo** (`hola@tudominio.es`): Resend solo envía. Para recibir hace falta un buzón (el del
registrador, Zoho Mail, Google Workspace…) o una redirección de correo hacia el email personal de Carlos.

## 6. Comprobaciones finales

- [ ] `https://tudominio.es` carga con candado y `http://` redirige.
- [ ] Reserva de prueba: llega el email y la hora desaparece del calendario.
- [ ] El enlace del email permite cambiar y cancelar.
- [ ] `/admin` pide contraseña y código.
- [ ] Vercel → Cron Jobs muestra `/api/cron/reminders` con ejecuciones correctas.
- [ ] El email pasa SPF, DKIM y DMARC (cabeceras del mensaje recibido, o mail-tester.com).
