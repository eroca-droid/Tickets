# Seguimiento de tickets WFM

Aplicación web para registrar y revisar cambios de horario, enroques, compensados, horas extra, validaciones SIOP y excepciones.

Esta versión ya no conecta el navegador directamente a Supabase. La arquitectura de producción es:

```text
Navegador → Caddy (80/443) → API Node.js → PostgreSQL
                                      └── evidencias privadas en disco
```

La API aplica permisos por rol, valida las reglas operativas en el servidor y usa sesiones `HttpOnly`. PostgreSQL no publica el puerto `5432`.

## Estructura

- `public/`: interfaz web.
- `server/`: API, autenticación y acceso a PostgreSQL.
- `db/init/`: esquema PostgreSQL e información inicial.
- `scripts/`: creación de usuarios, migración, indexación de evidencias y backup.
- `compose.yaml`: aplicación completa para Docker.
- `db/legacy-supabase/`: SQL anterior, conservado solo como referencia.

## Probar localmente

Requiere Docker con Compose.

```bash
cp .env.example .env
```

Cambia `POSTGRES_PASSWORD` en `.env` y usa para desarrollo:

```dotenv
SITE_ADDRESS=http://localhost
SESSION_COOKIE_SECURE=false
```

Después inicia el sistema:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost/healthz
```

Crea el primer usuario WFM (la contraseña no queda en el historial del comando):

```bash
read -s USER_PASSWORD
export USER_PASSWORD
docker compose run --rm -e USER_PASSWORD app npm run user:create -- \
  --email admin@empresa.com \
  --name "Administrador WFM" \
  --role superadmin \
  --department WFM \
  --force-password-change true
unset USER_PASSWORD
```

Abre `http://localhost`.

## Despliegue en la Droplet

Destino preparado:

- Droplet: `wfm-helpdesk`
- Ubuntu 24.04 LTS x64
- IPv4 pública: `134.209.214.88`
- IP privada: `10.116.0.5`

1. Instala Docker Engine y el complemento Compose en la Droplet.
2. Copia este directorio, por ejemplo a `/opt/wfm-helpdesk`.
3. Crea `.env` y genera una contraseña exclusiva para PostgreSQL:

```bash
cd /opt/wfm-helpdesk
cp .env.example .env
openssl rand -hex 32
nano .env
install -d -o 1000 -g 1000 storage/evidence
```

4. Para servir la aplicación con HTTPS directamente desde la IP pública usa:

```dotenv
SITE_ADDRESS=134.209.214.88
TLS_DEFAULT_SNI=134.209.214.88
SESSION_COOKIE_SECURE=true
```

5. Levanta y verifica:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app database proxy
curl https://134.209.214.88/healthz
```

El acceso inicial será `https://134.209.214.88`. Caddy solicita a Let's Encrypt un certificado público
de corta duración para la IP y lo renueva automáticamente. El tráfico HTTP se redirige a HTTPS y las
cookies de sesión se transmiten únicamente por una conexión segura.

La Droplet mostrada es un plan pequeño. La configuración limita PostgreSQL y Node para ese entorno, pero para uso continuo se recomienda al menos 1 GB de RAM. Revisa que exista espacio swap antes de migrar muchos registros o construir imágenes.

### Usar un dominio propio

HTTPS ya está activo sobre la IP. Si deseas una dirección más fácil de recordar, asigna un registro DNS
`A` de tu dominio a `134.209.214.88` y cambia `.env`:

```dotenv
SITE_ADDRESS=tickets.tudominio.com
TLS_DEFAULT_SNI=tickets.tudominio.com
SESSION_COOKIE_SECURE=true
```

Aplica el cambio:

```bash
docker compose up -d
```

Caddy solicitará y renovará el certificado automáticamente. Los puertos públicos necesarios son `80/tcp` y `443/tcp`; permite `443/udp` para HTTP/3. Restringe `22/tcp` a la IP del administrador y no abras `5432`.

### Clasificación en Kaspersky Web Control

Si una política corporativa bloquea la dirección como recurso sin categoría, la corrección consta de dos
acciones independientes:

1. Solicitar la recategorización de `https://134.209.214.88` en Kaspersky OpenTIP. El formulario requiere
   una verificación hCaptcha humana antes de enviarlo.
2. Mientras se procesa la solicitud, el administrador de Kaspersky Security Center debe crear una regla
   de permiso por dirección para `https://134.209.214.88/*`, limitada a los grupos que utilizan el portal y
   con prioridad superior a la regla predeterminada. No se recomienda permitir globalmente todos los sitios
   sin categoría.

Para mejorar la identidad y estabilidad a largo plazo, crea en la zona DNS de `impulsa365.com.pe`:

```text
Tipo: A
Nombre: tickets
Valor: 134.209.214.88
TTL: 300
```

Después cambia `SITE_ADDRESS` y `TLS_DEFAULT_SNI` a `tickets.impulsa365.com.pe`, vuelve a aplicar Compose y
solicita también la clasificación de `https://tickets.impulsa365.com.pe`. El sitio publica metadatos de
identidad y `/.well-known/security.txt`; al usar el dominio se debe actualizar allí la línea `Canonical`.

## Migrar los datos de Supabase

El esquema nuevo conserva los UUID y los identificadores numéricos, por lo que las relaciones históricas permanecen. La migración reemplaza el contenido del PostgreSQL destino; realiza un backup si ya contiene datos.

Obtén en Supabase la cadena de conexión directa a PostgreSQL y ejecútala desde una terminal que no registre el secreto:

```bash
read -s SOURCE_DATABASE_URL
export SOURCE_DATABASE_URL
docker compose run --rm \
  -e SOURCE_DATABASE_URL \
  -e CONFIRM_REPLACE_TARGET=YES \
  app node scripts/migrate-from-supabase.js
unset SOURCE_DATABASE_URL
```

El script migra `profiles`, `dotacion`, `business_rules`, `requests` y `request_events`. También recupera los correos de `auth.users` si la conexión tiene permiso. Los hashes de contraseña de Supabase no se reutilizan: asigna una contraseña nueva a cada usuario con `user:create`. Si el correo fue migrado, no necesitas indicar el UUID; el script localizará el perfil por correo.

Ejemplo para relacionar un supervisor con su coordinador:

```bash
read -s USER_PASSWORD
export USER_PASSWORD
docker compose run --rm -e USER_PASSWORD app npm run user:create -- \
  --email supervisor@empresa.com \
  --name "Nombre Supervisor" \
  --role supervisor \
  --coordinator-id UUID_DEL_COORDINADOR
unset USER_PASSWORD
```

### Migrar evidencias

Descarga de Supabase el bucket privado `request-evidence` dentro de `storage/evidence`, conservando la estructura `UUID/archivo`. Supabase permite hacerlo desde su CLI o desde su endpoint S3. Con un proyecto enlazado, la operación de CLI es:

```bash
npx supabase storage cp -r ss:///request-evidence ./storage/evidence --experimental --linked
```

Después registra los metadatos en PostgreSQL:

```bash
docker compose run --rm app node scripts/index-evidence.js
```

## Usuarios y roles

Roles permitidos:

- `coordinator`: crea solicitudes según las reglas activas.
- `supervisor`: crea solicitudes según las reglas activas.
- `wfm`: revisa tickets, exporta y configura reglas.
- `management`: revisa y exporta tickets.
- `superadmin`: dispone de revisión, exportación y configuración de reglas.

Cuando una cuenta tiene `password_change_required`, la API solo permite consultar la sesión,
cambiar la contraseña o cerrarla. El resto de los datos permanece bloqueado hasta completar el cambio.

La carga controlada del archivo `db/users-2026-09.tsv` se ejecuta sin guardar las contraseñas en el proyecto:

```bash
read -s USER_PASSWORD
read -s SUPERADMIN_PASSWORD
export USER_PASSWORD SUPERADMIN_PASSWORD
docker compose run --rm -e USER_PASSWORD -e SUPERADMIN_PASSWORD app npm run users:import
unset USER_PASSWORD SUPERADMIN_PASSWORD
```

Para conservar un UUID concreto importado desde Supabase, agrega `--id UUID` al comando `user:create`.

En una instalación nueva también debes cargar la dotación. Ejemplo:

```bash
docker compose exec database psql -U tickets_wfm -d tickets_wfm -c \
  "insert into dotacion (dni, full_name, job_title, service) values ('123456789', 'Nombre Agente', 'Asesor', 'Servicio');"
```

## Backups

Ejecuta:

```bash
./scripts/backup.sh
```

Se guardan un dump comprimido de PostgreSQL y un archivo de evidencias en `backups/`. Programa este comando con `cron` y copia los resultados a almacenamiento externo; un backup en la misma Droplet no protege ante la pérdida completa del servidor.

## Operación

```bash
docker compose ps
docker compose logs -f --tail=100
docker compose pull
docker compose up -d --build
```

Si modificas los archivos SQL de `db/init/`, recuerda que PostgreSQL solo los ejecuta al crear un volumen vacío. Para una base existente debes aplicar una migración incremental o restaurar en un volumen nuevo.
