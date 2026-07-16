# Eunoia Frontend

Aplicacion administrativa construida con React, TypeScript, Vite y Tailwind.

## Requisitos

- Node.js 20+
- pnpm

## Configuracion local

1. Copia `.env.example` a `.env`.
2. Ajusta la URL del backend si cambia:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Instalacion

```bash
pnpm install
```

## Ejecutar

```bash
pnpm dev
```

La aplicacion queda disponible en `http://localhost:5173`.

## Scripts utiles

```bash
pnpm build
pnpm test:unit
pnpm lint
pnpm preview
```

## Docker

Desde la raiz del workspace (`D:\eunoia`):

```bash
docker compose up --build
```

El frontend se publica con Nginx en `http://localhost:5173`.

Para cambiar la URL de API en la imagen, ajusta el build arg del servicio `frontend` en el `docker-compose.yml` raiz:

```yaml
args:
  VITE_API_BASE_URL: https://api.tu-dominio.com/api
```

## Estructura

- `src/app`: punto de entrada de la aplicacion.
- `src/routes`: rutas y metadatos de permisos.
- `src/features`: pantallas y logica por modulo.
- `src/shared`: componentes, servicios, hooks y configuracion compartida.
- `test`: pruebas de integracion livianas con Vitest.
