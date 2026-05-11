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

La app usa esa URL para las llamadas HTTP y para el refresco automático del access token.

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

## Flujo offline y autenticacion

- El login guarda `access_token` y `refresh_token` en Secure Store.
- Si el access token sigue vigente, el usuario puede abrir su rutina sin conexion.
- Si expiro pero hay internet, la app llama a `/auth/refresh` y obtiene tokens nuevos.
- Si no hay internet, se muestran las rutinas descargadas y los media cacheados.
- Las rutinas descargadas usan almacenamiento local con un limite de 300MB y limpieza LRU.
- Si el backend responde `twoFactorRequired: true`, la app debe pedir el codigo de 6 digitos antes de terminar el login.

## Validaciones de formulario

- Nombres y apellidos: solo letras y espacios.
- Cedula o RUC de Ecuador: validacion basica de formato y digito.
- Telefono: formato movil ecuatoriano `09XXXXXXXX`.
- Correo: formato valido de email.

## Scripts útiles

- `npm run start`: inicia Expo.
- `npm run android`: abre la app en Android.
- `npm run ios`: abre la app en iOS.
- `npm run web`: abre la versión web.
- `npm run lint`: valida el código.

## Notas de implementacion

- Para medios offline se usan `expo-file-system` y `expo-secure-store`.
- El web no comparte el mismo flujo offline: debe iniciar sesion cada dia como pediste.
