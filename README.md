# Paneli · Menú web (vitrina)

Vitrina digital de un restaurante, hecha en **React + TypeScript + Vite**. Muestra el menú que los clientes ven al escanear un QR en la mesa. Es de **solo lectura**: no hay carrito, ni pagos, ni registro. Solo comida y precios.

Se conecta a Firestore y se actualiza **en vivo**: cuando la app de administración (repo aparte) cambia un precio o marca un plato como agotado, esta página cambia sola, sin recargar.

```
App de administración  ──escribe──►  Firestore  ──empuja──►  ESTA WEB
     (los empleados)                                          (los clientes)
```

No hay servidor propio ni API intermedia. Firestore empuja los cambios por una conexión abierta (`onSnapshot`).

---

## Qué necesitas

- **Node.js** 18 o superior.
- Un proyecto de **Firebase** con Firestore (el mismo que usa la app de administración).

---

## 1. Instalar

```bash
npm install
```

Esto descarga las dependencias, incluida `firebase`.

## 2. Configurar las credenciales

Copia el archivo de ejemplo y llénalo:

```bash
cp .env.example .env
```

Abre `.env` y pega los valores de tu **app web** de Firebase. Los encuentras en:
**Consola de Firebase → Settings (engranaje) → General → Your apps → app web (`</>`)**.

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> **Sobre la seguridad de estas claves:** son públicas por diseño. Viajan al navegador de cualquiera que abra la web — así funcionan todas las apps de Firebase. Lo que protege los datos NO son estas claves, sino las **reglas de Firestore**. Aun así, el `.env` no se sube a git (está en el `.gitignore`), por orden y para no mezclar config de cada quien.

## 3. Correr en desarrollo

```bash
npm run dev
```

Abre la dirección que imprime (normalmente `http://localhost:5173`).

Para verlo desde otro aparato en tu red (un televisor, un celular):

```bash
npm run dev -- --host
```

Usa la dirección `Network:` que aparece. Es la que abres en el navegador del televisor para montar la vitrina.

## 4. Publicar (producción)

```bash
npm run build
```

Genera la carpeta `dist/`. Súbela a **Vercel**, **Netlify** o cualquier hosting estático. En Vercel, recuerda poner las mismas variables `VITE_...` en la configuración del proyecto (Environment Variables), porque el `.env` local no se sube.

---

## Cómo se ve y por qué

El menú está diseñado para que **cualquiera pueda pedir, incluso sin leer bien**:

- **Números grandes** en cada plato: se puede pedir señalando o diciendo "el dos".
- **Botones de categoría de 62px**: imposibles de fallar con el dedo.
- **Precio grande**; el rojo se reserva solo para los especiales.
- Los platos agotados **no desaparecen**: se atenúan y dicen "Hoy no hay".
- **Toca una foto** y se abre en grande (modal), con botón de cerrar y tecla Escape.

"Especiales" no es una categoría real: es un **filtro** sobre el campo `especial`. Así un plato aparece en su categoría Y en Especiales, sin duplicar el dato.

---

## Cómo funcionan las imágenes

Las fotos están en **Cloudinary** (las sube la app de administración). Esta web solo recibe la URL y le pide a Cloudinary la variante que necesita, agregando parámetros a la URL:

```
/upload/w_200,h_200,c_fill,f_webp,q_auto/   → miniatura de la lista (~15 kb)
/upload/w_1000,f_webp,q_auto/               → la grande del modal
```

La miniatura y la foto grande son la misma imagen: la versión de 1000px solo se descarga si alguien toca. Por eso la lista carga rápido aunque haya mala señal.

---

## Estructura del proyecto

```
src/
├── main.tsx          Punto de entrada.
├── App.tsx           El menú completo: lista, categorías, modal.
├── firebase.ts       Conexión a Firestore (lee del .env).
├── cloudinary.ts     Función que optimiza las URLs de imagen.
├── App.css           Estilos del menú (paleta, números, modal).
└── index.css         Estilos globales mínimos.
```

---

## Modelo de datos (colección `platos`)

La web lee estos campos de cada documento:

| Campo | Tipo | Uso en la web |
|---|---|---|
| `nombre` | string | Título del plato. |
| `descripcion` | string | Línea gris bajo el nombre. |
| `precio` | number | Formateado como pesos colombianos. |
| `categoria` | string | Filtra qué pestaña lo muestra. |
| `especial` | bool | Marca roja "HOY" + pestaña Especiales. |
| `disponible` | bool | Si es `false`, se atenúa y muestra "Hoy no hay". |
| `foto_url` | string | URL de Cloudinary. Vacío = recuadro gris. |
| `orden` | number | Ordena la lista. |

Esta web **solo lee**. Nunca escribe en Firestore. Toda la escritura la hace la app de administración.

---

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Pantalla en blanco | Revisa la consola (F12). Casi siempre es una variable del `.env` vacía o mal copiada. |
| `Missing or insufficient permissions` | Las reglas de Firestore no permiten lectura pública de `platos`. |
| El menú carga pero está vacío | No hay platos en Firestore, o les falta el campo `orden`. |
| No se ve desde el televisor | Usa `npm run dev -- --host` y la dirección `Network:`. Deben estar en la misma red. |
| Las variables no se leen | Deben empezar con `VITE_`. Vite ignora las que no lleven ese prefijo. Reinicia `npm run dev` tras editar el `.env`. |

---

## Nota técnica

Este proyecto usa React 19 y TypeScript 6 (versiones recientes). El build corre `tsc -b && vite build`, así que un error de tipos detiene la compilación — es intencional, atrapa errores antes de publicar.
