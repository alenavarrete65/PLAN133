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
Firebase Auth), tanto en la interfaz como en `firestore.rules`: una cuenta no puede leer ni
escribir en el planning de otra persona bajo ningún concepto (salvo el administrador, para
labores de mantenimiento).

El PIN opcional (pestaña Ajustes → Seguridad) se mantiene igual que antes, como una capa extra
de protección a nivel de dispositivo. Si alguna vez alguien olvida su PIN, en la propia
pantalla de bloqueo hay un botón "¿Has olvidado el PIN? Quitarlo" que lo retira sin necesidad
de conocerlo (siempre que la sesión ya esté iniciada y aprobada).

> **Nota histórica:** el antiguo sistema de "código de acceso" compartido (donde todo el
> mundo veía el mismo calendario tecleando el mismo código) ya se migró por completo a este
> modelo por cuenta — la única cuenta que tenía datos (`alenavarrete65@gmail.com`) los importó
> una sola vez a través de una pantalla de bienvenida que existió temporalmente para ese fin.
> Esa pantalla y el permiso de leer plannings ajenos por su código ya se han retirado de la
> app y de `firestore.rules`, así que ahora mismo ninguna cuenta puede leer el planning de
> otra bajo ningún concepto. Si en algún momento excepcional hiciera falta traer datos de un
> documento antiguo a una cuenta nueva, el administrador puede copiarlos a mano desde la
> consola de Firebase (Firestore Database → Datos → colección `plannings`).

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

## Copias automáticas en la nube (últimos 7 días)

Además de la copia JSON manual, la app guarda automáticamente, como mucho una vez al día,
una instantánea de cómo estaban tus datos ese día. Se conservan las últimas 7. Puedes verlas
y restaurar cualquiera desde Ajustes → **"Copias automáticas en la nube"**.

Sirve sobre todo para el caso en el que borras o cambias algo por error **y ya se ha guardado**
(con lo que la copia JSON manual no ayuda si no la hiciste ese mismo día): puedes volver a como
estaban las cosas ayer, anteayer, etc. Estas copias se guardan aparte del planning principal
(en `plannings/{tu cuenta}/history/`), con las mismas reglas de seguridad: solo tu cuenta puede
verlas.

## Aviso si editas en dos dispositivos a la vez

Si tienes la app abierta en dos sitios (por ejemplo, móvil y ordenador) y guardas cambios en
uno mientras el otro sigue abierto con cambios propios sin guardar, la app te avisará con una
franja abajo del todo: puedes elegir "Usar la versión más reciente" (para no perder lo que
guardaste en el otro dispositivo) o "Seguir con lo mío" (si prefieres continuar y guardar tus
cambios encima). Si no tienes cambios sin guardar, la app simplemente adopta la versión más
reciente sin preguntarte nada.

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
- [x] Cada cuenta con su propio planning aislado, en vez de un código de acceso compartido
      (implementado: ver apartado "Cada cuenta tiene su propio calendario").
- [ ] Borrar a mano, desde la consola de Firebase, el documento antiguo de `plannings` que
      usaba el código de acceso compartido (ya no lo usa la app ni es accesible por ninguna
      cuenta, pero sigue ocupando espacio si no lo borras tú mismo).
- [x] Copias automáticas de seguridad en la nube, además de la manual (implementado: ver
      apartado "Copias automáticas en la nube").
- [x] Aviso cuando se edita a la vez desde dos dispositivos, en vez de que gane en silencio
      el último que guarda (implementado: ver apartado "Aviso si editas en dos dispositivos
      a la vez").
- [x] Confirmación reforzada (escribir "BORRAR") antes de borrar todos los datos desde
      Ajustes, en vez de un simple aceptar/cancelar.
- [ ] Firebase Hosting como alternativa/respaldo a GitHub Pages (ya está todo
      preparado en `firebase.json` / `.firebaserc`, solo faltaría ejecutar
      `firebase deploy`).
- [ ] Dividir `index.html` en varios archivos/módulos si el proyecto sigue creciendo (hoy
      es un único archivo de más de 4700 líneas con HTML+CSS+JS mezclados; funciona bien
      para el tamaño actual, pero a partir de cierto punto cuesta más mantenerlo).
