# OFF Editorial

Plataforma editorial tipo revista digital para publicar capítulos, captar suscriptores y administrar contenido desde un panel privado.

## Desarrollo local

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

La app corre en `http://localhost:3000` por defecto.

## Producción en Vercel con Neon

1. Crea una base PostgreSQL en Neon.
2. Copia el connection string pooled o directo de Neon.
3. En Vercel, ve a `Project Settings > Environment Variables`.
4. Agrega `DATABASE_URL` con formato:

```bash
postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
```

5. Agrega también `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY` y `FROM_EMAIL`.
6. Vercel ejecutará `npm run build`, que corre:

```bash
prisma generate
prisma migrate deploy
prisma db seed
next build
```

## Admin

Ruta: `/admin`

Credenciales locales por defecto:

- Email: `nathaliegarcia@maiabusiness.com`
- Password: `Ma1a2727!!@`

Cambia estos valores en `.env` antes de publicar.

## Variables de entorno

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
ADMIN_EMAIL="nathaliegarcia@maiabusiness.com"
ADMIN_PASSWORD="Ma1a2727!!@"
NEXT_PUBLIC_SITE_URL="https://off.maiabusiness.com"
RESEND_API_KEY=""
FROM_EMAIL="OFF <off@maiabusiness.com>"
```

En Vercel usa una `DATABASE_URL` de Neon/PostgreSQL, no SQLite. Resend queda preparado. Cuando agregues `RESEND_API_KEY` y `FROM_EMAIL`, al publicar un capítulo se intentará enviar el correo a los suscriptores.

## Contenido editorial

El campo `content` del editor acepta bloques JSON:

```json
[
  { "type": "paragraph", "text": "Texto del capítulo." },
  { "type": "h2", "text": "Título de sección" },
  { "type": "quote", "text": "Quote destacado." },
  { "type": "special", "label": "Reality Check", "text": "Bloque especial." }
]
```

También soporta `h3`, `divider`, `image`, `Reflexión`, `Estrategia` y `Acción`.
