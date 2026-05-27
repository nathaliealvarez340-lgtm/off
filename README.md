# OFF Editorial

Plataforma editorial tipo revista digital para publicar capítulos, captar suscriptores y administrar contenido desde un panel privado.

## Desarrollo local

```bash
npm install
npx prisma generate
npm run seed
npm run dev
```

La app corre en `http://localhost:3000` por defecto.

## Admin

Ruta: `/admin`

Credenciales locales por defecto:

- Email: `nathalie@example.com`
- Password: `off-admin-demo`

Cambia estos valores en `.env` antes de publicar.

## Variables de entorno

```bash
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="nathalie@example.com"
ADMIN_PASSWORD="change-this-password"
ADMIN_SESSION_SECRET="change-this-long-random-secret"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
RESEND_API_KEY=""
FROM_EMAIL="OFF <hola@off.editorial>"
```

Resend queda preparado. Cuando agregues `RESEND_API_KEY` y `FROM_EMAIL`, al publicar un capítulo se intentará enviar el correo a los suscriptores.

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
