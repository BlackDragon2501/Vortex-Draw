# Vórtex Draw — Dibuja, sin límites

App de dibujo libre **100% local en el navegador**, de **Vortex Company** (la misma compañía de Vórtex Music, Vórtex Editor y Vórtex PDF). Gratis y sin anuncios.

## Características

- Pincel, borrador, línea, flecha, rectángulo y elipse (con previsualización en vivo)
- Bote de relleno (flood fill con tolerancia) y cuentagotas de color
- Herramienta de texto sobre el lienzo
- Tamaño y opacidad ajustables, paleta de 14 colores + selector personalizado
- Fondo claro u oscuro
- Deshacer / rehacer (hasta 30 pasos) con atajos: `B E L A R O G T I` · `Ctrl+Z` / `Ctrl+Y`
- Abrir imágenes (PNG/JPG/WEBP/GIF) para dibujar sobre ellas
- Guardar proyecto `.vortex-draw.json` y exportar en PNG/JPG
- Soporte táctil y de ratón (Pointer Events), listo para móvil y escritorio

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript · Canvas API (sin backend, sin base de datos)

## Desarrollo local

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # build de producción
bun run lint     # eslint
```

## Despliegue en Vercel

1. Sube este repo a GitHub.
2. En Vercel: **Add New Project → Import Git Repository**.
3. Framework: Next.js (detectado automáticamente). **No requiere variables de entorno.**
4. Deploy. Vercel entregará la URL de producción para el portal.

## Marca y contacto

- Derechos Reservados © 2026 Vortex Company
- Soporte: vortexmusic.soporte.app@gmail.com
- Gratis, sin anuncios y 100% local: tus dibujos nunca salen de tu navegador.
