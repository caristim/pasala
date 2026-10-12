# Pásala

Web app instalable (PWA) para Android e iOS donde la gente comparte recomendaciones de **libros, películas y series**.

- Sin build: HTML + CSS + JS modular. Se publica tal cual en GitHub Pages.
- Backend: [Supabase](https://supabase.com) (Postgres + auth, plan gratuito alcanza).
- **Modo demo** automático si no configurás Supabase (datos locales, útil para probar el diseño).

## Probar en local
```bash
python3 -m http.server 8000   # o: npx serve
# abrir http://localhost:8000
```

## Poner el backend (10 min)
1. Creá un proyecto en supabase.com.
2. SQL Editor → pegá y ejecutá `supabase/schema.sql`.
3. Settings → API: copiá *Project URL* y la clave *anon public* en `js/config.js`.
4. (Opcional, para probar rápido) Authentication → Providers → Email → desactivá "Confirm email".
5. Authentication → URL Configuration: agregá la URL donde publiques la app.

> La clave `anon` es pública por diseño; la seguridad la dan las políticas RLS del `schema.sql`.

## Publicar en GitHub Pages
1. Subí el repo a GitHub.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Abrí `https://TU-USUARIO.github.io/pasala/`.

## Instalar en el celular
- **Android (Chrome):** menú ⋮ → *Instalar app*.
- **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*.

## Estructura
```
index.html            pantalla y diálogos
css/styles.css        estilos (claro/oscuro automático)
js/app.js             interfaz y eventos
js/store.js           datos: backend local (demo) y Supabase
js/config.js          claves de Supabase
sw.js                 service worker (uso offline del shell)
manifest.webmanifest  datos de instalación
supabase/schema.sql   tablas y seguridad
```

## Ideas para próximas versiones
- Buscar portadas automáticamente (Open Library, TMDB)
- Perfiles y seguir a otros usuarios
- Comentarios, listas ("para ver después")
- Notificaciones push, login con Google
- Moderación / reportes
