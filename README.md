# Operación Baeza — notas de mantenimiento

Planificador de estudio y entrenos para la oposición de Guardia Civil. PWA estática
(HTML + JS, sin build ni frameworks) con los datos guardados en Firebase Firestore.

## Datos del proyecto

- **Proyecto Firebase:** `plan-29e7c`
- **Consola Firebase:** https://console.firebase.google.com/project/plan-29e7c
- **Dónde vive la web:** GitHub Pages, repo: _(anota aquí la URL de tu repo)_
- **URL pública de la app:** _(anota aquí tu enlace de GitHub Pages, algo tipo
  `https://tu-usuario.github.io/tu-repo/`)_
- **Tu código de acceso:** _(NO lo pongas aquí si vas a subir este README a un repo
  público en GitHub — guárdalo aparte, en un gestor de contraseñas o una nota privada)_

## Archivos del proyecto

| Archivo               | Para qué sirve                                                |
|------------------------|----------------------------------------------------------------|
| `index.html`           | Toda la app (HTML + CSS + JS en un único archivo)              |
| `manifest.json`        | Metadatos de la PWA (nombre, iconos, colores)                  |
| `service-worker.js`    | Caché offline del "app shell"                                  |
| `icon-192.png` / `icon-512.png` | Iconos de la app (escudo de la Guardia Civil)          |
| `firestore.rules`      | Reglas de seguridad de la base de datos (se pegan en la consola de Firebase, no en GitHub Pages) |
| `firebase.json` / `.firebaserc` | Solo necesarios si algún día despliegas con Firebase Hosting en vez de (o además de) GitHub Pages |

> **Nota:** la pestaña "Tests" (banco de preguntas propio transcritas desde fotos) se
> eliminó de la app. Si en la consola de Firebase quedaban preguntas guardadas en la
> subcolección `plannings/{tu código}/testQuestions/`, ya no se usan ni se muestran en
> la app, pero no se han borrado automáticamente de la base de datos — puedes borrarlas
> a mano desde la consola de Firebase si quieres liberar espacio. Recuerda también volver
> a pegar el `firestore.rules` actualizado (ya no incluye reglas para esa subcolección).

## Cómo publicar un cambio

1. Edita los archivos que necesites (normalmente `index.html`).
2. Si tocas el `index.html`, `manifest.json`, `service-worker.js` o los iconos,
   sube **la versión del caché** en `service-worker.js`:
   ```js
   const CACHE_NAME = 'operacion-baeza-v3'; // sube el número cada vez que despliegues
   ```
   Si no lo haces, los móviles que ya tengan la PWA instalada pueden tardar en ver
   los cambios porque siguen sirviendo la copia cacheada antigua.
3. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Descripción breve del cambio"
   git push
   ```
4. Espera 1–2 minutos a que GitHub Pages despliegue, y comprueba en una pestaña de
   incógnito (para saltarte la caché del navegador) que se ve el cambio.

## Cómo actualizar las reglas de Firestore

Las reglas **no** se suben a GitHub Pages — viven en Firebase y se gestionan aparte:

1. Abre la consola de Firebase → proyecto `plan-29e7c` → **Firestore Database** → pestaña **Reglas**.
2. Copia el contenido de `firestore.rules` de este proyecto y pégalo entero, reemplazando lo que hubiera.
3. Pulsa **Publicar**.

Para comprobar que están activas, abre esta URL (debería dar error `PERMISSION_DENIED`):
```
https://firestore.googleapis.com/v1/projects/plan-29e7c/databases/(default)/documents/plannings
```

## Copia de seguridad de tus datos

Dentro de la app, en la sección de sincronización, hay un bloque **"Copia de seguridad"**
con dos botones:

- **Exportar copia (JSON):** descarga todos tus datos a un archivo. Hazlo de vez en
  cuando (por ejemplo, antes de exámenes importantes o cambios grandes en el plan).
- **Importar copia (JSON):** restaura los datos desde un archivo exportado
  anteriormente. **Sustituye todo lo que hubiera**, así que úsalo con cuidado.

Esta copia es independiente de Firebase: te sirve si algún día pierdes el código de
acceso, se borra el proyecto de Firebase, o simplemente quieres tener un respaldo
local.

## Cómo funciona el guardado offline (resumen rápido)

- Cada cambio se guarda primero en el propio dispositivo (`localStorage`), así que
  nunca se pierde aunque no haya conexión.
- Si hay conexión, se sube a Firebase a los pocos segundos. Si no la hay, queda
  marcado como "pendiente" y se sincroniza solo en cuanto vuelve la conexión (al
  reconectar, al volver a abrir la pestaña, o como máximo cada 15 segundos).
- El indicador de arriba a la derecha te dice el estado: "Sin cambios" / "Guardando…"
  / "Guardado" / "Sin conexión · se guardará al reconectar".

## Cosas pendientes / ideas para más adelante

- [ ] Firebase Authentication real (ahora mismo la seguridad depende de que nadie
      adivine tu código de acceso; las reglas de Firestore ya bloquean que se pueda
      "listar" todos los códigos, pero no hay autenticación de verdad).
- [ ] Firebase Hosting como alternativa/respaldo a GitHub Pages (ya está todo
      preparado en `firebase.json` / `.firebaserc`, solo faltaría ejecutar
      `firebase deploy`).
