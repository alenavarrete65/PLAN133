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
> a mano desde la consola de Firebase si quieres liberar espacio.

## Autenticación (cuentas reales, aprobadas por el administrador)

La app ya **no** usa login anónimo. Ahora, para entrar, cada persona crea su propia cuenta
con correo y contraseña (pantalla "Crear cuenta nueva"). Esa cuenta queda **pendiente de
aprobación** — solo ve la pantalla "Cuenta pendiente de aprobación" — hasta que tú, como
administrador, la apruebas desde el **Panel de administración** (pestaña **Ajustes**, dentro
de la app). Esto lo garantizan las reglas de `firestore.rules`, no solo la interfaz: una
cuenta sin aprobar no puede leer ni escribir ningún planning.

## Cada cuenta tiene su propio calendario

Desde este cambio, **cada cuenta ve únicamente su propio planning** — ya no existe un código
de acceso compartido que todo el mundo tenga que teclear o repetir. En cuanto una cuenta está
aprobada, su planning queda ligado automáticamente a esa cuenta (por dentro, al `uid` de
Firebase Auth), tanto en la interfaz como en `firestore.rules`: nadie puede leer ni escribir
en el planning de otra persona, aunque conociera su antiguo código.

El PIN opcional (pestaña Ajustes → Seguridad) se mantiene igual que antes, como una capa extra
de protección a nivel de dispositivo, pero ahora es "tu PIN de tu cuenta", no de un código
compartido.

### Migrar los datos antiguos a la cuenta correspondiente (una sola vez)

Como antes todo el mundo compartía calendario a través de un código de acceso, la primera vez
que cada cuenta entre en la app con este cambio ya publicado, verá una pantalla de
**bienvenida** con dos opciones:

- **Empezar de cero** — para cuentas nuevas que nunca han usado la app.
- **Importar datos de ese código** — escribiendo el código de acceso antiguo que se usaba
  para ver el calendario compartido, copia esos datos (una sola vez) al planning propio y
  aislado de esa cuenta. El documento antiguo no se borra ni se toca, así que si te
  equivocas puedes repetir la operación.

**Para dejar el planning actual (el que ya existía) en la única cuenta activa,
`alenavarrete65@gmail.com`:**

1. Publica primero las reglas nuevas de `firestore.rules` (ver más abajo) y despliega este
   `index.html` actualizado.
2. Entra en la app con la cuenta `alenavarrete65@gmail.com` (si ya estaba aprobada, entra
   directo; si no, apruébala primero desde el Panel de administración).
3. Verás la pantalla de bienvenida. Pulsa **"Importar datos de ese código"** y escribe el
   código de acceso que se usaba hasta ahora para el calendario compartido.
4. Listo: a partir de ahí, esa cuenta tiene su propio planning con todos los datos que ya
   había, y ninguna otra cuenta puede verlo ni tocarlo.

Si en el futuro se aprueban más cuentas, cada una pasará por la misma pantalla de bienvenida
y, si no tienen datos antiguos que importar, simplemente pulsarán "Empezar de cero" para
tener su propio calendario en blanco.

**⚠️ Acción necesaria una sola vez — conviértete en administrador:**
1. **Pega las reglas nuevas**: Firebase Console → tu proyecto → **Firestore Database** →
   pestaña **Reglas** → copia el contenido de `firestore.rules` de este proyecto → pega →
   **Publicar**.
2. **Entra en la app** con tu correo y contraseña habituales (créala si no la tienes; si ya
   usabas la app, con solo iniciar sesión se crea tu perfil automáticamente). Verás la
   pantalla "Cuenta pendiente de aprobación" — es normal, sigue al paso 3.
3. Ve a Firebase Console → **Firestore Database** → pestaña **Datos** → colección **`users`**
   → busca el documento cuyo ID es tu `uid` (verás tu correo dentro). Cambia a mano los
   campos `aprobado` y `esAdmin` de `false` a `true`, y guarda.
4. Vuelve a la app y recarga la página. Ya deberías entrar con normalidad y ver el **Panel de
   administración** dentro de la pestaña Ajustes.

**Aprobar gente nueva a partir de ahora:** cuando alguien cree una cuenta, aparecerá sola en
el bloque "Pendientes" del Panel de administración la próxima vez que entres. Pulsa
**Aprobar** junto a su correo para darle acceso, o **Revocar acceso** para quitárselo más
adelante. El rol de administrador (`esAdmin`) solo se puede cambiar a mano desde la consola
de Firebase, nunca desde la app, para que nadie pueda dárselo a sí mismo.

Si tenías cuentas o accesos configurados con el sistema anónimo anterior, no hace falta que
hagas nada con ellos: dejan de tener permisos en cuanto publiques las reglas nuevas, y cada
persona simplemente crea su cuenta de correo/contraseña y espera tu aprobación.

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

- [x] Firebase Authentication real con cuentas de correo/contraseña y aprobación manual
      por parte del administrador (implementada: ver apartado "Autenticación (cuentas
      reales, aprobadas por el administrador)").
- [ ] Firebase Hosting como alternativa/respaldo a GitHub Pages (ya está todo
      preparado en `firebase.json` / `.firebaserc`, solo faltaría ejecutar
      `firebase deploy`).
