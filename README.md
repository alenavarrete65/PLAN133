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

## Verificación de correo (informativa, no bloquea el acceso)

Al crear una cuenta nueva, se envía automáticamente un correo de verificación. Esto **no**
bloquea el acceso — lo sigue decidiendo el administrador al aprobar la cuenta, igual que
siempre — pero en el Panel de administración (Ajustes) verás junto a cada cuenta pendiente si
ya confirmó su correo o no, como una señal extra antes de aprobarla. Cada persona puede ver su
propio estado y reenviarse el correo desde Ajustes → Cuenta.

## Aviso de cuenta(s) pendiente(s) de aprobar

Como administrador, ya no hace falta que entres a mirar el Panel de administración "por si
acaso": si hay alguna cuenta nueva esperando aprobación, verás un número en rojo junto a la
pestaña **Ajustes** en cuanto abras la app.

## Aviso de nueva versión de la app disponible

Cuando publiques un cambio (subiendo un `index.html`/`service-worker.js` nuevos), quien tenga
la app ya abierta verá una franja arriba avisando de que hay una versión nueva, con un botón
para recargar cuando le venga bien. Así no se queda usando en silencio una versión vieja hasta
que recargue la pestaña por otro motivo.

## La nota del test, el comentario y la vuelta: todo desde el día del calendario

Al lado del desplegable de vuelta (Pendiente / **Nota test** / No test / No tiempo / Solo
lectura) de cada bloque, leve, inglés o psicotécnico, ahora hay:

- El número de la nota del test (ya estaba, pero ahora se actualiza al momento aunque falle
  cualquier otra cosa de la app — antes, si algo fallaba al repintar, el campo del número
  podía no llegar a aparecer aunque hubieras elegido «Nota test»).
- Una **caja de texto siempre visible**, sin tener que pulsar nada para abrirla, para
  escribir el comentario de esa vuelta en concreto (dudas, fallos del test, lo que quieras
  recordar). Ya no hace falta ir a «Temario y notas» para esto.

**La vuelta queda anclada al día real en que la rellenas.** Por ejemplo: el 15 de septiembre
tocaba el Tema 4 y era la Vuelta 1 — metes ahí la nota y el comentario, y esa Vuelta 1 se
queda ligada para siempre al 15 de septiembre (verás una etiqueta **📌 15 de septiembre**
junto al nombre de la vuelta). La próxima vez que el Tema 4 vuelva a tocar en el calendario,
en otro día, se te abre automáticamente la **Vuelta 2** — sin tocar ni pisar lo que ya
guardaste el día 15, mires ese día cuando lo mires.

Si vuelves a dejar una vuelta en «Pendiente», se libera su anclaje (por si te equivocaste de
día o quieres reordenar). Este mismo anclaje y el comentario por vuelta también se ven, y se
pueden editar igual, desde «Temario y notas» — es el mismo dato en los dos sitios.

## Cuarto calendario: «Todo incluido»

Dentro de la pestaña **Calendario**, además del principal, el de clases y el de simulacros,
hay ahora un cuarto botón: **🗂️ Todo incluido**. Ninguno de los otros tres desaparece — este
es una vista más.

Junta en la misma rejilla, día a día, las tres capas, cada una con su etiqueta y solo si
tiene algo:

- **Estudio:** las tareas del día (bloque, leve, inglés, entreno, psicotécnico, orto-grama)
  con sus mismos checks de «NO completado», y la nota del día.
- **Clases:** las clases registradas ese día en el calendario de clases.
- **Simulacro:** el simulacro de ese día, si lo hay.

No guarda nada por su cuenta: lee de los mismos sitios que los otros calendarios, así que
cualquier cambio que hagas en cualquiera de ellos se ve aquí al momento, y al revés. Al
**pulsar un día se abre su ficha completa** (la misma del calendario principal), desde donde
se edita todo: estado del día, notas, clases y simulacro.

Tiene sus propias vistas **rejilla / lista** (la lista va mejor en el móvil) y sus botones de
**exportar imagen / PDF**, igual que los demás.

## La pestaña «Clases» ahora se rellena sola (y es solo informativa)

Antes, en la pestaña **Clases** marcabas a mano los checks de cada tema. Ya no: esa pestaña
**se calcula entera a partir del Calendario de clases**. Manda siempre el calendario, así que
los dos sitios no pueden contradecirse:

- Metes una clase en un día del calendario → su vuelta se marca sola **en cuanto ese día
  termina**. Mientras el día sea hoy o esté por venir, sale como *programada* (◔ con el borde
  a rayas); cuando pasa, se convierte en vista (✓).
- Metes una clase **de un día que ya pasó** (retroactivo) → se marca **al momento**.
- **Quitas una clase del calendario → su check se desmarca solo.**
- Al añadir una clase de Conocimientos / Inglés / Psicotécnicos te sigue preguntando si con
  esa clase **queda completo el tema** o quedan más partes. Si dices que quedan más partes,
  esa clase se guarda marcada como «parte» dentro del día y **no** cierra ninguna vuelta
  hasta que registres la clase que sí lo completa.
- Debajo de cada tema se ven las **fechas concretas** de cada vuelta.
- Ortografía y gramática no tienen temas numerados: se listan las clases agrupadas por
  nombre, con las fechas en que las diste. Las fichas antiguas que había creadas a mano
  aparecen abajo, marcadas como antiguas, por si quieres consultarlas o borrarlas (ya no
  cuentan para nada).

### Vaciar el calendario de clases de golpe

En **Calendario → Calendario de clases**, junto a los botones de exportar, hay un botón
**🗑️ Vaciar calendario de clases** (pide escribir `BORRAR`). Borra todas las clases de todos
los meses y, como la pestaña Clases se calcula a partir de ahí, deja también todas las
vueltas sin marcar — pensado justo para rehacer el calendario desde cero. **No toca** el
calendario principal (estudio/descanso/trabajo, temario, notas del día) ni el tablón de
clases pendientes.

## Todo el día desde el calendario principal

Al pulsar un día en el **Calendario principal** se abre su ficha, y ahora se abre en
**cualquier día**, también en los de **descanso, trabajo o sin horario** (antes solo se abría
en los de estudio, y por eso en esos días no había manera de ponerles una nota). Dentro de la
ficha del día puedes hacer, sin salir del calendario:

1. **Estado del día:** cambiarlo a estudio / descanso / trabajo / sin horario.
2. **Notas del día:** escribirlas directamente (aparece un «guardado» verde al escribir),
   traer una nota del tablón desde un **desplegable** —que ahora sale siempre, aunque el
   tablón esté vacío, avisando de que no hay ninguna— y **apuntar una nota nueva** ahí mismo,
   guardándola en pendientes o metiéndola directamente en ese día.
3. **Clases de este día:** ver las que hay (con «×» para quitarlas), añadir una nueva
   eligiendo materia y tema, tirar de una clase pendiente, y escribir las notas de clase.
   Es el mismo calendario de clases, así que se ve igual en los dos sitios.
4. **Simulacro:** abrir el simulacro de ese día (o marcar uno nuevo).
5. **Tareas del día:** bloque, leve, inglés, entreno, psicotécnico y orto-grama, con sus
   checks y sus controles de vuelta, igual que antes.

Si alguna vez fallara el cálculo de las tareas de un día, el resto de la ficha (notas,
clases, simulacro) sigue funcionando y aparece un aviso en rojo explicándolo, en vez de
quedarse el día medio pintado.

## Exportar el calendario (imagen o PDF)

En la pestaña Calendario, encima de la rejilla, hay dos botones: **🖼️ Exportar imagen** y
**📄 Exportar PDF**, para guardar o imprimir el mes que estés viendo sin depender del archivo
JSON técnico.

## Test de arrastre: primera tarea del día + aviso al abrir la app

- **En la ficha del día** (pulsando un día de estudio en el Calendario), el **Test de arrastre** es
  siempre lo primero de «Tareas del día», en una tarjeta destacada (borde dorado, «★ Lo primero del
  día») que pasa a verde cuando está hecho. Tiene los botones **✓ Ya lo he hecho / Aún no** y el
  campo de la nota. Si pones nota, cuenta como hecho automáticamente.
- **Aviso al abrir la app:** en los días de **estudio** (nunca en descanso, trabajo o sin horario) y
  solo si el test de hoy no está hecho, sale la pregunta «¿Has hecho ya el test de arrastre de
  hoy?». **Sí** lo apunta y ya no vuelve a preguntar ese día (tampoco desde otro dispositivo, porque
  se guarda en tu planning); **No** (o cerrar el aviso) lo repite: cada vez que abras la app y, si la
  dejas abierta, cada 30 minutos al volver a ella (`ARRASTRE_ASK_REPEAT_MS` en `index.html`).
- Es un aviso **dentro de la app**, no una notificación push del sistema: no aparece si la app está
  cerrada. Las push reales siguen pendientes (ver más abajo).
- Dato guardado: `state.arrastreTestHecho` = `{ "YYYY-MM-DD": true }`. La nota sigue en
  `state.arrastreTestNotas`, sin cambios.

## Inglés: Test general y Test 1–4 dentro de cada vuelta

Cada tema (lección) de inglés tiene 4 tests. En **cada vuelta** de un tema de inglés (tanto en
«Temario y notas» como en la ficha del día del calendario) hay ahora un desplegable extra con
**Test general · Test 1 · Test 2 · Test 3 · Test 4**. Lo que eliges ahí es sobre qué test apuntas el
resultado: debajo se pone el estado de siempre (Pendiente / Nota test / No test / No tiempo / Solo
lectura), la nota (con «+ Otro test» si hay más de una) y las notas de ese test.

- **Progreso → Detalle por tema:** cada vuelta muestra sus tests etiquetados («Test general 17/20 ·
  Test 2 15/20 · Test 3 No tiempo»). La flecha ▲/▼ compara cada test con **ese mismo test** de
  la vuelta anterior, y debajo sale la media por test. Todas las notas cuentan en la media y
  el gráfico del tema.
- **Datos:** el «Test general» es lo de siempre (`entry.mode`, `entry.nota`…), así que nada de lo
  ya guardado cambia. Los tests 1–4 van en `entry.textos = {"1":{mode,nota,notasExtra,comentario,extras}, …}`
  y solo se crean cuando se usan. Solo afecta a las claves `ingles-N`; bloques, leves y psicotécnicos
  no cambian.
- **Vuelta por defecto en la ficha del día:** la primera vuelta «sin cerrar». En inglés, una vuelta
  se considera cerrada cuando el test general ya tiene algo apuntado o cuando los 4 tests lo tienen.
- Los tests 1–4 usan la misma nota máxima que el resto de inglés (sobre 20, `GROUP_MAX_NOTA['Inglés']`).

## Fecha del examen editable (cuenta atrás)

En la tarjeta **Cuenta atrás** de la pantalla principal hay un enlace **✏️ Cambiar fecha**: eliges
la fecha del examen oficial y la cuenta atrás se recalcula al momento. **«Volver a la estimada»**
restaura el 10 de julio de siempre. Se guarda en `state.settings.examDate` (`"YYYY-MM-DD"`, o
`null` para usar la estimada), así que se sincroniza y entra en las copias de seguridad.

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
- [x] Verificación de correo al crear cuenta, visible para el administrador antes de aprobar
      (implementado: ver apartado "Verificación de correo").
- [x] Aviso visual (número en la pestaña Ajustes) cuando hay cuentas pendientes de aprobar.
- [x] Aviso de nueva versión de la app disponible, con botón para recargar.
- [x] La pestaña Clases calculada automáticamente desde el Calendario de clases, en vez de
      con checks a mano (implementado: ver apartado «La pestaña Clases ahora se rellena sola»).
- [x] Poder abrir y editar cualquier día desde el calendario principal, incluidos los de
      descanso/trabajo (implementado: ver apartado «Todo el día desde el calendario principal»).
- [x] Un calendario «todo incluido» que junte estudio, clases y simulacros en la misma vista
      (implementado: ver apartado «Cuarto calendario: Todo incluido»).
- [x] Meter y ver la nota del test y un comentario de cada vuelta directamente desde la ficha
      del día, sin ir a Temario y notas, y que esa vuelta quede anclada al día real en que se
      rellena (implementado: ver apartado «La nota del test, el comentario y la vuelta: todo
      desde el día del calendario»).
- [ ] Notificaciones push con recordatorios diarios de estudio/entreno — necesitaría configurar
      Firebase Cloud Messaging desde tu consola de Firebase (claves, permisos del navegador);
      no es algo que pueda dejar activado sin que completes tú esa parte primero.
- [ ] Firebase App Check (protege tu Firestore para que solo tu propia app pueda usarlo, ni
      siquiera con la configuración pública copiada) — necesita que registres un sitio en
      reCAPTCHA/App Check desde la consola de Firebase y me pases la clave; el código está
      preparado para añadirse en cuanto la tengas.
- [ ] Firebase Hosting como alternativa/respaldo a GitHub Pages (ya está todo
      preparado en `firebase.json` / `.firebaserc`, solo faltaría ejecutar
      `firebase deploy`).
- [ ] Dividir `index.html` en varios archivos/módulos si el proyecto sigue creciendo (hoy
      es un único archivo de más de 4700 líneas con HTML+CSS+JS mezclados; funciona bien
      para el tamaño actual, pero a partir de cierto punto cuesta más mantenerlo).
