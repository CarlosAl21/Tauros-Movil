# Tauros-Movil

App móvil de Tauros construida con Expo Router.

## Requisitos

- Node.js instalado.
- Expo Go instalado en el celular.
- Backend de Tauros ejecutándose en tu red local o publicado en Render.

## Variables de entorno

Copia `.env.example` a `.env` y ajusta la URL del backend:

```bash
EXPO_PUBLIC_TAUROS_API_URL=https://tu-backend.onrender.com
```

Si vas a probar Google login, completa también los client IDs de Google en ese mismo archivo.

## Ejecutar en tu móvil

1. Instala dependencias:

```bash
npm install
```

2. Arranca Expo:

```bash
npx expo start -c
```

3. Abre Expo Go en tu celular y escanea el QR.

4. Asegúrate de que el celular y tu PC estén en la misma red Wi-Fi.

5. Si el backend corre en tu PC, usa su IP local en vez de `localhost`; si ya está en Render, usa la URL pública.

## Scripts útiles

- `npm run start`: inicia Expo.
- `npm run android`: abre la app en Android.
- `npm run ios`: abre la app en iOS.
- `npm run web`: abre la versión web.
- `npm run lint`: valida el código.
