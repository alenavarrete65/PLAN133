/* ===================== BOTÓN "CERRAR SESIÓN" DE LA CABECERA ===================== */
// Se engancha pronto (no espera a que sepamos si hay sesión) porque el botón vive en la
// cabecera estática del HTML; si no hay sesión iniciada, las pantallas de acceso sustituyen
// todo el contenido de .wrap (incluida la cabecera) antes de que esto llegue a importar.
(function initHeaderLogout(){
  const btn = document.getElementById('headerLogoutBtn');
  if(!btn) return;
  btn.onclick = ()=>{
    if(typeof auth === 'undefined' || !auth){ return; }
    auth.signOut().then(()=> location.reload());
  };
})();

/* ===================== TEMA CLARO / OSCURO (automático por hora + manual) ===================== */
(function initTheme(){
  const btn = document.getElementById('themeToggleBtn');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const THEME_COLORS = { dark: '#16302a', light: '#f4ecd6' };

  function autoThemeNow(){
    const h = new Date().getHours();
    return (h >= 7 && h < 21) ? 'light' : 'dark';
  }
  function hasManualPref(){
    try { const s = localStorage.getItem('ob-theme'); return s === 'light' || s === 'dark'; }
    catch(e){ return false; }
  }

  function applyThemeUI(theme){
    if (btn) {
      btn.textContent = theme === 'light' ? '☀️' : '🌙';
      btn.title = hasManualPref()
        ? (theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro')
        : (theme === 'light' ? 'Automático (de día) · pulsa para fijar tema oscuro' : 'Automático (de noche) · pulsa para fijar tema claro');
    }
    if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
  }

  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyThemeUI(current);

  if (btn) {
    btn.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = now === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      applyThemeUI(next);
      // A partir de aquí queda fijado a mano: ya no lo decide la hora hasta que se borre este valor.
      try { localStorage.setItem('ob-theme', next); } catch(e){}
    });
  }

  // Si no hay preferencia manual guardada, revisamos la hora cada minuto y al volver a
  // primer plano, para que el tema cambie solo aunque la app se quede abierta un buen rato.
  function tickAuto(){
    if (hasManualPref()) return;
    const t = autoThemeNow();
    if (document.documentElement.getAttribute('data-theme') !== t){
      document.documentElement.setAttribute('data-theme', t);
      applyThemeUI(t);
    }
  }
  setInterval(tickAuto, 60000);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) tickAuto(); });
})();

/* ===================== FRASE MOTIVACIONAL ===================== */
const FRASES_MOTIVACION = [
  'El que persevera, alcanza.',
  'Todo por la Patria.',
  'Disciplina hoy, tricornio mañana.',
  'Un tema más, un paso más cerca.',
  'La plaza no se regala, se conquista.',
  'El honor es mi divisa.',
  'No cuentes los días, haz que los días cuenten.',
  'Cada repaso te acerca a la meta.',
  'La constancia vence donde el talento duda.',
  'Hoy toca sumar, aunque sea poco.'
];
(function initMotivacion(){
  const el = document.getElementById('motivationText');
  if(!el) return;
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  el.textContent = FRASES_MOTIVACION[dayOfYear % FRASES_MOTIVACION.length];
})();

/* ===================== DATOS DE REFERENCIA ===================== */
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DOW_SHORT = ['L','M','X','J','V','S','D'];

const BLOCKS = {
  1:{graves:true, temas:[
    {nombre:'ONU + DUDH', clase:'1 (1-2)', color:'morado'},{nombre:'PRE-55', clase:'4.1', color:'azul'},{nombre:'CPI', clase:'1 (11A)', color:'morado'},
    {nombre:'2/86', clase:'15.1', color:'azul'},{nombre:'1ª PARTE', clase:'8 tem procivil', color:'morado'},{nombre:'8-298', clase:'9,1-2', color:'azul'},
  ]},
  2:{graves:true, temas:[
    {nombre:'TEDH + CARTA SOCIAL', clase:'1 (3-4)', color:'morado'},{nombre:'CPI', clase:'1 (11B)', color:'morado'},{nombre:'56-96', clase:'4.2', color:'azul'},
    {nombre:'REG. PERSONAL', clase:'15.2', color:'azul'},{nombre:'2ª PARTE', clase:'8 tem procivil', color:'morado'},{nombre:'299-450', clase:'9,3-4', color:'azul'},
  ]},
  3:{graves:true, temas:[
    {nombre:'LOS PACTOS', clase:'1 (5-6)', color:'morado'},{nombre:'COOP CPI + CON ASE', clase:'1 (12-13)', color:'morado'},{nombre:'97-136', clase:'4.3', color:'azul'},
    {nombre:'DGGC', clase:'15.3', color:'azul'},{nombre:'DELITOS', clase:'8 fichas 1', color:'morado'},{nombre:'451-588', clase:'9 (5-6)', color:'azul'},
  ]},
  4:{graves:true, temas:[
    {nombre:'CON.DH + CCT + PROTOCOLO', clase:'1 (7,8,9)', color:'morado'},{nombre:'137-169', clase:'4.4', color:'azul'},{nombre:'HGC', clase:'15.4', color:'azul'},
    {nombre:'DELITOS', clase:'8 fichas 2', color:'morado'},{nombre:'HC + PJ', clase:'9,(7-10)', color:'azul'},{nombre:'EST. VICT', clase:'9.11', color:'azul'},
  ]},
  5:{graves:true, temas:[
    {nombre:'CDF', clase:'1 (10)', color:'morado'},{nombre:'DFP + HONOR', clase:'4.5', color:'azul'},{nombre:'DERECH. GC', clase:'15.5', color:'azul'},
    {nombre:'PODER JUDICIAL', clase:'9 (8-9)', color:'azul'},{nombre:'DELITOS', clase:'8 fichas 3', color:'morado'},
  ]},
  6:{graves:false, temas:[
    {nombre:'PRL 1-16', clase:'3.1', color:'morado'},{nombre:'TUE 1-19', clase:'5.1', color:'azul'},{nombre:'ONU + CDE', clase:'6,1-2', color:'azul'},
    {nombre:'CC 1-16', clase:'7.1', color:'azul'},{nombre:'LEXT 1-24', clase:'12.1', color:'morado'},{nombre:'SC 1-29', clase:'13.1', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.1-1.6)', explosivos:'EXPLOSIVOS (epígrafe 1.1)', clase:'22.1/22.2', color:'azul'},
  ]},
  7:{graves:false, temas:[
    {nombre:'PRL 17-54', clase:'3.1', color:'morado'},{nombre:'TUE 20-F', clase:'5.2', color:'azul'},{nombre:'UE + OTAN', clase:'6,3-4', color:'azul'},
    {nombre:'CC 17-89', clase:'7.2', color:'azul'},{nombre:'LEXT 25-35', clase:'12.2', color:'morado'},{nombre:'SC 30-54', clase:'13.2', color:'morado'},
    {nombre:'PRO. CIVIL', clase:'16.1', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.7-1.11)', explosivos:'EXPLOSIVOS (epígrafes 1.2-2.1)', clase:'22.1/22.2', color:'azul'},
  ]},
  8:{graves:false, temas:[
    {nombre:'AGE', clase:'3.2', color:'morado'},{nombre:'TFUE 1-66', clase:'5.3', color:'azul'},{nombre:'INTERPOL', clase:'6.5', color:'azul'},
    {nombre:'CC 89-141', clase:'7.3', color:'azul'},{nombre:'LEXT 36-49', clase:'12.3', color:'morado'},{nombre:'SPV 1-13', clase:'13.3', color:'morado'},
    {nombre:'BIODIVERSIDAD 1ª PARTE', clase:'16,2.1', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.12-1.18)', explosivos:'EXPLOSIVOS (epígrafes 2.2-3.2.2)', clase:'22.1/22.2', color:'azul'},
  ]},
  9:{graves:false, temas:[
    {nombre:'GC', clase:'3.3', color:'morado'},{nombre:'TFUE 67-204', clase:'5.4', color:'azul'},{nombre:'EUROPOL', clase:'6.6', color:'azul'},
    {nombre:'CC 142-180', clase:'7.4', color:'azul'},{nombre:'LEXT 50-61', clase:'12.4', color:'morado'},{nombre:'SPV 14-31', clase:'13.4', color:'morado'},
    {nombre:'LO REPRESIÓN CONTRABANDO', clase:'', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.19-1.20)', explosivos:'EXPLOSIVOS (epígrafes 3.2.3-7)', clase:'22.1/22.2', color:'azul'},
  ]},
  10:{graves:false, temas:[
    {nombre:'TFUE 208-358', clase:'5,5-6', color:'azul'},{nombre:'EUROJUST', clase:'6,8-9-10', color:'azul'},{nombre:'CC 181-238', clase:'7.5', color:'azul'},
    {nombre:'LEXT 62-F', clase:'12.5', color:'morado'},{nombre:'BIODIVERSIDAD 2ª PARTE', clase:'16,2.2', color:'morado'},{nombre:'SPV 32-54', clase:'13.5', color:'morado'},
    {nombre:'REAL DECRETO CONTRABANDO', clase:'', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.21-1.26)', explosivos:'EXPLOSIVOS (epígrafes 8-9)', clase:'22.1/22.2', color:'azul'},
  ]},
  11:{graves:false, temas:[
    {nombre:'FRONTEX + CEPOL', clase:'6.7', color:'azul'},{nombre:'CC 239-300', clase:'7.6', color:'azul'},{nombre:'RD 40/2007', clase:'12.6', color:'morado'},
    {nombre:'VIOGEN', clase:'21.0', color:'morado'},{nombre:'CAU', clase:'', color:'morado'},
  ]},
  12:{graves:false, temas:[
    {nombre:'IGUALDAD', clase:'2.0', color:'morado'},{nombre:'EFICIENCIA ENERGÉTICA', clase:'16.3', color:'morado'},
    {type:'armas_explosivos', armas:'ARMAS (epígrafes 1.27-1.30)', explosivos:'EXPLOSIVOS (epígrafe 10)', clase:'22.1/22.2', color:'azul'},
    {nombre:'FAO + FMI + OMS', clase:'6.0', color:'azul'},{nombre:'TIC', clase:'17.0', color:'morado'},
  ]},
};

const GRAVES_ORDER = [1,2,3,4,5];
const MGRAVES_ORDER = [6,7,8,9,10,11,12];

const LEVES = [
  {nombre:'PD 1-39', clase:'11.1'},{nombre:'PD 40-69', clase:'11.2'},{nombre:'MI', clase:'14.0'},
  {nombre:'MD', clase:'14.0'},{nombre:'TOPOGRAFÍA (TEORÍA)', clase:'18.1'},{nombre:'TOPOGRAFÍA (PROBLEMAS)', clase:'18.2'},
  {nombre:'DEONTOLOGÍA', clase:'19.1'},{nombre:'COD. CONDUC. GC', clase:'19.2'},{nombre:'MENORES 1-15', clase:'20.1'},
  {nombre:'MENORES 16-37', clase:'20.2'},{nombre:'MENORES 38-64', clase:'20.3'},
  {type:'l39_l40', l39:'(L39) 1-17', l40:'(L40) 1-22', clase:'10.0'},
  {type:'l39_l40', l39:'(L39) 18-33', l40:'(L40) 23-53', clase:'10.0'},
  {type:'l39_l40', l39:'(L39) 34-65', l40:'(L40) 140-158', clase:'10.0'},
  {type:'l39_l40', l39:'(L39) 66-89', l40:'(L40) REPASO', clase:'10.0'},
  {type:'l39_l40', l39:'(L39) 90-FINAL', l40:'(L40) D.FINAL 3', clase:'10.0'},
  {type:'l39_l40', l39:'(L39) PLAZOS', l40:'(L40) PACO CLASE ADM. GOBIERNO', clase:'10.0'},
];
const INGLES_TOTAL = 32;
const PSICO_ITEMS = [];
for(let i=1;i<=23;i++) PSICO_ITEMS.push('Prueba '+i);
PSICO_ITEMS.push('CONTROL 1'); PSICO_ITEMS.push('CONTROL 2');

/* ===================== CONFIGURACIÓN FIREBASE ===================== */
// 1) Crea un proyecto gratuito en https://console.firebase.google.com
// 2) Añade una app web y activa Firestore (Databases & Storage > Firestore > Crear base de datos)
// 3) Pega aquí los datos de configuración que te da Firebase al crear la app web
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyATxYTz2H3ZnZWpDw4sKb-akDvMJ0FeYJc",
  authDomain: "plan-29e7c.firebaseapp.com",
  projectId: "plan-29e7c",
  storageBucket: "plan-29e7c.firebasestorage.app",
  messagingSenderId: "836366047642",
  appId: "1:836366047642:web:059eb13a850291cdd08223"
};

let db = null;
let firebaseOk = false;
try{
  if(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf('PEGA_AQUI')===-1 && typeof firebase!=='undefined'){
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    firebaseOk = true;
  }
}catch(e){ console.error('Error iniciando Firebase', e); firebaseOk = false; }

// ---- Autenticación (Firebase Auth: correo/contraseña + aprobación por administrador) ----
// Cada persona crea su propia cuenta (correo/contraseña). Hasta que el administrador la
// apruebe desde el panel de administración (dentro de Ajustes), esa cuenta no puede leer ni
// escribir ningún planning: las reglas de Firestore lo exigen a nivel de servidor, no solo
// en esta interfaz. Cada cuenta aprobada tiene su propio planning privado (identificado por
// su uid, ver accessCode más abajo); el PIN opcional de la sección Ajustes sigue existiendo
// como una capa extra por encima de esto, a nivel de dispositivo.
const auth = firebaseOk ? firebase.auth() : null;
let firebaseUser = null;
let userProfile = null; // datos de users/{uid}: {email, aprobado, esAdmin, creadoEn}
let isAdmin = false;
async function fetchOrCreateUserProfile(user){
  const ref = db.collection('users').doc(user.uid);
  let snap;
  try{ snap = await ref.get(); }catch(e){ console.error(e); return null; }
  if(snap.exists) return snap.data();
  // Perfil no existente todavía (primera vez que entra esta cuenta tras instalar esta
  // función). Se crea sin aprobar. Si esta es tu propia cuenta de administrador, ve a la
  // consola de Firebase → Firestore → users/{tu uid} y cambia "aprobado" y "esAdmin" a
  // true a mano (ver README.md).
  try{
    await ref.set({
      email: user.email || '',
      aprobado: false,
      esAdmin: false,
      emailVerificado: !!user.emailVerified,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(e){ console.error(e); }
  return {email:user.email||'', aprobado:false, esAdmin:false, emailVerificado: !!user.emailVerified};
}
// Resuelve cuando sabemos si hay sesión iniciada, y si está aprobada, antes de tocar el
// resto de Firestore (plannings). Null si no hay firebase, no hay sesión, o no está aprobada.
const firebaseAuthReady = (async ()=>{
  if(!firebaseOk) return null;
  try{
    const user = await new Promise((resolve)=>{
      auth.onAuthStateChanged((u)=> resolve(u));
    });
    if(!user) return null;
    firebaseUser = user;
    userProfile = await fetchOrCreateUserProfile(user);
    isAdmin = !!(userProfile && userProfile.esAdmin);
    const aprobado = !!(userProfile && userProfile.aprobado);
    return (aprobado || isAdmin) ? user : null;
  }catch(e){
    console.error('Error de autenticación', e);
    return null;
  }
})();

// Desde que cada cuenta tiene su propio planning, "accessCode" ya no es un código que la
// persona escribe a mano: es simplemente el uid de su cuenta de Firebase Auth (se asigna en
// init(), en cuanto sabemos qué cuenta ha iniciado sesión). Así, cada correo aprobado ve
// siempre y solo su propio calendario, tanto en la interfaz como a nivel de reglas de Firestore.
let accessCode = null;

/* ===================== ESTADO ===================== */
let state = { months:{}, notes:{}, ticks:{}, dayTicks:{}, ortoTests:{ortografia:[], gramatica:[]}, entrenosLog:[], marcas:{}, marcasHistory:{}, settings:{unifyFromDate:null}, clases:{conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]}, claseCal:{}, simulacros:[], simulacroCal:{} };
let currentMonthKey = null;
let saveTimer = null;
// Última marca de tiempo (campo "updatedAt") que sabemos que hay guardada en Firebase, tal y
// como estaba cuando la cargamos o la guardamos por última vez desde este dispositivo. Sirve
// para detectar si otro dispositivo ha guardado cambios entretanto (ver checkForRemoteChanges).
let lastKnownUpdatedAt = null;

function pad2(n){ return String(n).padStart(2,'0'); }
function monthKey(y,m){ return y+'-'+pad2(m); } // m: 1-12
function dayKey(mKey,d){ return mKey+'-'+pad2(d); } // clave única por día, p.ej. "2026-09-01"
function dayNoteKey(mKey,d){ return 'daynota-'+mKey+'-'+pad2(d); }
function simNoteKey(mKey,d){ return 'simnota-'+mKey+'-'+pad2(d); }
function daysInMonth(y,m){ return new Date(y, m, 0).getDate(); }
function sortedMonthKeys(){ return Object.keys(state.months).sort(); }

// Rellena con valores por defecto cualquier campo que falte en `state` (datos antiguos,
// copias importadas, etc.) y aplica migraciones. La usan tanto loadState() como importBackup().
function normalizeState(){
  if(!state.months) state.months = {};
  if(!state.notes) state.notes = {};
  if(!state.ticks) state.ticks = {};
  if(!state.dayTicks) state.dayTicks = {};
  if(!state.ortoTests || Array.isArray(state.ortoTests) || !('ortografia' in state.ortoTests) || !('gramatica' in state.ortoTests)){
    state.ortoTests = {ortografia:[], gramatica:[]};
  }
  if(!state.entrenosLog) state.entrenosLog = [];
  if(!state.marcas) state.marcas = {};
  if(!state.marcasHistory) state.marcasHistory = {};
  if(!state.settings) state.settings = {unifyFromDate:null};
  if(state.settings.pinHash === undefined) state.settings.pinHash = null;
  if(!state.clases) state.clases = {conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]};
  if(!state.clases.conocimientos) state.clases.conocimientos = {};
  if(!state.clases.ingles) state.clases.ingles = {};
  if(!state.clases.psico) state.clases.psico = {};
  if(!state.clases.ortoGram) state.clases.ortoGram = [];
  if(!state.claseCal) state.claseCal = {};
  if(!state.simulacros) state.simulacros = [];
  if(!state.simulacroCal) state.simulacroCal = {};
  // Migración: antes el modo repaso final se activaba por mes (unifyFromKey = "YYYY-MM").
  // Ahora se activa desde un día concreto (unifyFromDate = "YYYY-MM-DD").
  if(state.settings.unifyFromKey && !state.settings.unifyFromDate){
    state.settings.unifyFromDate = state.settings.unifyFromKey + '-01';
  }
  delete state.settings.unifyFromKey;
  delete state.orto; // sustituido por los tests APTO/NO APTO de ortoTests
  delete state.testBank; // función "Tests" (banco de preguntas) eliminada
  // Migración: las "vueltas" antes eran un array de booleans (hecho/no hecho).
  // Ahora cada vuelta es un objeto {mode, nota} para poder guardar notas de test.
  Object.keys(state.ticks).forEach(key=>{
    state.ticks[key] = state.ticks[key].map(v=>{
      if(v && typeof v === 'object') return v;
      return v ? {mode:'solo_lectura', nota:null} : {mode:'pendiente', nota:null};
    });
  });
  // El estado (posiblemente) ha cambiado por completo: descartamos la caché de computePlan().
  invalidatePlan();
}
function localCacheKey(){ return 'planning_cache_'+accessCode; }
function pendingSyncKey(){ return 'planning_pending_'+accessCode; }
// Hay cambios hechos en este dispositivo que aún no se han confirmado guardados en Firebase
// (por ejemplo, se hicieron sin conexión). Se guarda en localStorage para que sobreviva a
// que cierres la app o recargues la página antes de recuperar la conexión.
function markPendingSync(){ try{ localStorage.setItem(pendingSyncKey(), '1'); }catch(e){} }
function clearPendingSync(){ try{ localStorage.removeItem(pendingSyncKey()); }catch(e){} }
function hasPendingSync(){ try{ return localStorage.getItem(pendingSyncKey()) === '1'; }catch(e){ return false; } }
async function loadState(){
  if(!firebaseOk || !accessCode) return;
  let cargadoDeFirebase = false;
  try{
    const snap = await db.collection('plannings').doc(accessCode).get();
    if(snap.exists && snap.data() && snap.data().state){
      state = JSON.parse(snap.data().state);
      cargadoDeFirebase = true;
      lastKnownUpdatedAt = snap.data().updatedAt || null;
      try{ localStorage.setItem(localCacheKey(), snap.data().state); }catch(e){}
    }
  }catch(e){ console.error(e); }
  if(!cargadoDeFirebase){
    // Sin conexión o falló Firebase: intenta recuperar la última copia sincronizada
    // que se guardó en este mismo dispositivo, para no dejar la app vacía.
    try{
      const cached = localStorage.getItem(localCacheKey());
      if(cached){ state = JSON.parse(cached); showToast('Sin conexión: mostrando la última copia guardada en este dispositivo'); }
      else showToast('Error al cargar datos');
    }catch(e){ showToast('Error al cargar datos'); }
  }
  normalizeState();
}

/* ===================== GUARDADO: indicador + reintento automático ===================== */
let saveRetryTimer = null;
let saveRetryDelay = 4000; // backoff: 4s, 8s, 16s... hasta 60s
function setSaveStatus(status, msg){
  const el = document.getElementById('saveIndicator');
  const textEl = document.getElementById('saveIndicatorText');
  if(!el || !textEl) return;
  el.classList.remove('state-saving','state-saved','state-error');
  if(status==='saving'){ el.classList.add('state-saving'); textEl.textContent = 'Guardando…'; }
  else if(status==='saved'){ el.classList.add('state-saved'); textEl.textContent = 'Guardado'; }
  else if(status==='error'){ el.classList.add('state-error'); textEl.textContent = msg || 'Error al guardar'; }
  else{ textEl.textContent = 'Sin cambios'; }
}
function scheduleSave(){
  if(!firebaseOk || !accessCode) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 500);
}
let savingInFlight = false;
async function doSave(){
  if(!firebaseOk || !accessCode) return;
  // El cambio se guarda YA en este dispositivo (localStorage), pase lo que pase con la
  // conexión. Lo marcamos como "pendiente de nube" hasta que confirmemos que Firebase lo
  // recibió; así, si se cierra la app sin conexión, al reabrirla sabemos que falta sincronizar.
  const payload = JSON.stringify(state);
  try{ localStorage.setItem(localCacheKey(), payload); }catch(e){}
  markPendingSync();
  if(!navigator.onLine){
    // Sin conexión: no lo intentamos siquiera, para no gastar reintentos. En cuanto vuelva
    // la conexión (evento 'online' o el chequeo periódico) se guardará solo.
    setSaveStatus('error', 'Sin conexión · se guardará al reconectar');
    return;
  }
  if(savingInFlight) return; // ya hay un intento en curso; el próximo scheduleSave lo recogerá
  savingInFlight = true;
  setSaveStatus('saving');
  try{
    const nowTs = Date.now();
    await db.collection('plannings').doc(accessCode).set({state: payload, updatedAt: nowTs});
    lastKnownUpdatedAt = nowTs;
    saveRetryDelay = 4000;
    clearTimeout(saveRetryTimer);
    clearPendingSync();
    setSaveStatus('saved');
    showToast('Guardado en la nube');
    setTimeout(()=>{
      const el = document.getElementById('saveIndicator');
      if(el && el.classList.contains('state-saved')) setSaveStatus('idle');
    }, 3000);
    maybeSnapshotHistory(payload);
  }catch(e){
    console.error(e);
    setSaveStatus('error', 'Error al guardar · reintentando');
    showToast('Error al guardar, reintentando…');
    clearTimeout(saveRetryTimer);
    saveRetryTimer = setTimeout(doSave, saveRetryDelay);
    saveRetryDelay = Math.min(saveRetryDelay*2, 60000);
  }finally{
    savingInFlight = false;
  }
}
// Intenta sincronizar cualquier cambio pendiente si hay conexión. Se usa tanto en el evento
// 'online' como en un chequeo periódico de respaldo (algunos navegadores/móviles no disparan
// 'online' de forma fiable), y también al arrancar la app por si quedó algo sin subir de una
// sesión anterior sin conexión.
function trySyncPending(){
  if(!firebaseOk || !accessCode) return;
  if(!navigator.onLine) return;
  if(!hasPendingSync()) return;
  clearTimeout(saveRetryTimer);
  saveRetryDelay = 4000;
  doSave();
}
/* ===================== COPIAS AUTOMÁTICAS EN LA NUBE (historial) =====================
   Cada vez que se guarda con éxito, y como mucho una vez al día, se guarda además una
   instantánea de ese momento en plannings/{accessCode}/history/{YYYY-MM-DD}. Así, si algún
   día borras o estropeas algo por error y ya has guardado ese error (con lo que la copia de
   seguridad JSON manual tampoco ayuda si no la hiciste a tiempo), puedes recuperar cualquier
   día de los últimos 7. Es una subcolección aparte del documento principal para no hacerlo
   más pesado de leer/escribir en el uso normal. */
function historySnapshotDayKey(){ return 'ob_snapshot_day_'+accessCode; }
async function maybeSnapshotHistory(payload){
  if(!firebaseOk || !accessCode) return;
  try{
    const today = new Date().toISOString().slice(0,10);
    let lastDay = null;
    try{ lastDay = localStorage.getItem(historySnapshotDayKey()); }catch(e){}
    if(lastDay === today) return; // ya se guardó una copia hoy desde este dispositivo
    await db.collection('plannings').doc(accessCode).collection('history').doc(today).set({state: payload, at: Date.now()});
    try{ localStorage.setItem(historySnapshotDayKey(), today); }catch(e){}
    // Limpieza: nos quedamos solo con las 7 copias más recientes para no acumular basura.
    const snaps = await db.collection('plannings').doc(accessCode).collection('history').orderBy('at','desc').get();
    const sobran = snaps.docs.slice(7);
    for(const d of sobran){ try{ await d.ref.delete(); }catch(e){ console.error(e); } }
  }catch(e){
    // No es crítico: si falla, simplemente no hay copia de hoy, pero el guardado normal ya
    // se hizo bien.
    console.error('No se pudo guardar la copia automática del día', e);
  }
}
async function listHistorySnapshots(){
  if(!firebaseOk || !accessCode) return [];
  try{
    const snaps = await db.collection('plannings').doc(accessCode).collection('history').orderBy('at','desc').get();
    return snaps.docs.map(d=>({id:d.id, at:d.data().at, state:d.data().state}));
  }catch(e){ console.error(e); return []; }
}
/* ===================== AVISO DE CAMBIOS EN OTRO DISPOSITIVO =====================
   Comprueba si el planning se ha guardado desde otro sitio después de la última vez que lo
   cargamos aquí. Si no tenemos cambios propios sin guardar, simplemente recargamos los datos
   más recientes sin molestar. Si sí los tenemos, avisamos para que la persona decida, en vez
   de arriesgarnos a que el próximo autoguardado sobrescriba en silencio lo que se hizo en el
   otro dispositivo. */
let checkingRemote = false;
async function checkForRemoteChanges(){
  if(!firebaseOk || !accessCode || !unlocked || checkingRemote) return;
  checkingRemote = true;
  try{
    const snap = await db.collection('plannings').doc(accessCode).get();
    if(!snap.exists) return;
    const remoteUpdatedAt = snap.data().updatedAt || null;
    if(lastKnownUpdatedAt !== null && remoteUpdatedAt && remoteUpdatedAt !== lastKnownUpdatedAt){
      if(!hasPendingSync() && !savingInFlight){
        // No hay nada propio sin guardar: adoptamos sin más la versión más reciente.
        state = JSON.parse(snap.data().state);
        lastKnownUpdatedAt = remoteUpdatedAt;
        normalizeState();
        renderAll();
        showToast('Actualizado con los cambios guardados desde otro dispositivo');
      } else {
        renderRemoteConflictBanner(remoteUpdatedAt);
      }
    }
  }catch(e){ console.error(e); }
  finally{ checkingRemote = false; }
}
function renderRemoteConflictBanner(remoteUpdatedAt){
  if(document.getElementById('remoteConflictBanner')) return; // ya se está mostrando
  const banner = document.createElement('div');
  banner.id = 'remoteConflictBanner';
  banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--red-text, #b23b3b);color:#fff;padding:12px 16px;font-family:var(--font-mono);font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;';
  banner.innerHTML = `
    <span style="flex:1;min-width:220px;">Este planning se ha guardado desde otro dispositivo mientras tenías cambios sin guardar aquí. Si sigues editando aquí, tus cambios podrían sobrescribir los del otro dispositivo.</span>
    <span style="display:flex;gap:8px;">
      <button class="btn ghost small" id="remoteConflictReload" style="border-color:#fff;color:#fff;">Usar la versión más reciente (descartar lo mío)</button>
      <button class="btn ghost small" id="remoteConflictKeep" style="border-color:#fff;color:#fff;">Seguir con lo mío</button>
    </span>`;
  document.body.appendChild(banner);
  document.getElementById('remoteConflictReload').onclick = async ()=>{
    try{
      const snap = await db.collection('plannings').doc(accessCode).get();
      if(snap.exists){
        state = JSON.parse(snap.data().state);
        lastKnownUpdatedAt = snap.data().updatedAt || null;
        normalizeState();
        clearPendingSync();
        clearTimeout(saveTimer);
        renderAll();
        showToast('Se ha cargado la versión más reciente');
      }
    }catch(e){ console.error(e); showToast('No se pudo recargar, inténtalo de nuevo'); }
    banner.remove();
  };
  document.getElementById('remoteConflictKeep').onclick = ()=>{
    lastKnownUpdatedAt = remoteUpdatedAt; // para no volver a avisar por el mismo cambio remoto
    banner.remove();
  };
}
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') checkForRemoteChanges(); });
window.addEventListener('online', ()=> checkForRemoteChanges());
function refreshOfflineBadge(){
  const el = document.getElementById('offlineIndicator');
  if(!el) return;
  el.style.display = navigator.onLine ? 'none' : 'inline-flex';
}
window.addEventListener('online', ()=>{ refreshOfflineBadge(); trySyncPending(); });
window.addEventListener('offline', ()=>{
  refreshOfflineBadge();
  if(hasPendingSync()) setSaveStatus('error', 'Sin conexión · se guardará al reconectar');
});
refreshOfflineBadge();
// Respaldo por si el evento 'online' no llega (frecuente en algunos móviles al volver de segundo plano).
setInterval(trySyncPending, 15000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) trySyncPending(); });

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 1200);
}

/* ===================== SEGURIDAD: PIN de acceso ===================== */
// Nota importante: este PIN protege la app frente a alguien que abra el enlace y use la
// interfaz normal. No sustituye a unas reglas de seguridad de Firestore bien configuradas:
// con la configuración de ejemplo (ver FIREBASE_CONFIG más arriba), la base de datos puede
// seguir siendo accesible directamente por la API de Firebase si no restringes las reglas
// en la consola (Firestore Database > Reglas). Para un candado real, añade algo como:
//   allow read, write: if request.resource.data.state == resource.data.state
//                       || <tu propia validación del PIN en las reglas>;
// o, mejor aún, usa Firebase Authentication. El PIN de aquí es una barrera cómoda para el
// día a día, no una garantía criptográfica.
let unlocked = false;
async function sha256Hex(str){
  if(window.crypto && window.crypto.subtle){
    const enc = new TextEncoder().encode(str);
    const buf = await window.crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  // Respaldo simple si el navegador no ofrece Web Crypto (p.ej. contexto no seguro).
  let h = 0;
  for(let i=0;i<str.length;i++){ h = ((h<<5)-h+str.charCodeAt(i))|0; }
  return 'fallback-'+Math.abs(h).toString(16);
}
// Cada vez que se entra, refrescamos el estado de verificación del correo (por si se acaba
// de pulsar el enlace del correo) y lo reflejamos en users/{uid} para que el administrador lo
// vea en el Panel de administración. Las reglas de Firestore solo dejan a cada cuenta tocar
// este campo suyo, nada más (ver firestore.rules).
async function syncEmailVerifiedFlag(){
  if(!firebaseUser) return;
  try{ await firebaseUser.reload(); }catch(e){}
  const verificado = !!firebaseUser.emailVerified;
  if(userProfile && userProfile.emailVerificado === verificado) return;
  try{
    await db.collection('users').doc(firebaseUser.uid).update({emailVerificado: verificado});
    if(userProfile) userProfile.emailVerificado = verificado;
  }catch(e){ console.error('No se pudo actualizar el estado de verificación del correo', e); }
}
function unlockKeyName(){ return 'planning_unlock_'+accessCode; }
// El PIN se guarda con una "sal" fija de la app, NO con accessCode: si dependiera de
// accessCode (como ocurría antes), cualquier cambio en cómo se identifica el planning
// (p.ej. al migrar de un código de acceso antiguo al sistema por cuenta) invalidaría el PIN
// ya guardado sin posibilidad de volver a introducirlo correctamente.
function pinHashFor(val){ return sha256Hex('ob-pin-v1:'+val); }
function rememberUnlock(hash){
  try{ localStorage.setItem(unlockKeyName(), hash); }catch(e){}
}
function renderPinGate(){
  document.querySelector('.wrap').innerHTML = `
    <div class="empty-state" style="text-align:left;max-width:480px;margin:40px auto;">
      <h3 style="color:var(--amber);font-family:var(--font-display);margin-top:0;">PIN de acceso</h3>
      <p>Este planning está protegido con PIN. Introdúcelo para ver y editar tus datos en este dispositivo.</p>
      <label for="pinGateInput" style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">PIN</label>
      <input id="pinGateInput" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <button class="btn" id="pinGateBtn">Entrar</button>
      <div id="pinGateError" role="alert" style="color:var(--red-text);font-family:var(--font-mono);font-size:12px;margin-top:8px;min-height:14px;"></div>
      <p style="font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-top:16px;line-height:1.5;">
        Este PIN evita que cualquiera con el enlace pueda editar tus datos desde esta app. Recuerda que, para una
        protección completa, conviene además restringir las reglas de seguridad de tu proyecto de Firebase.
      </p>
      <button class="btn ghost small" id="pinGateForgotBtn" style="margin-top:8px;">¿Has olvidado el PIN? Quitarlo</button>
    </div>`;
  document.getElementById('pinGateBtn').onclick = attemptPinUnlock;
  document.getElementById('pinGateInput').addEventListener('keydown', e=>{ if(e.key==='Enter') attemptPinUnlock(); });
  document.getElementById('pinGateInput').focus();
  // Vía de emergencia: como ya estamos autenticados y aprobados en este punto (solo falta el
  // PIN de este dispositivo), podemos quitar el PIN directamente contra Firestore sin
  // necesidad de conocerlo. Útil si alguien olvida su PIN. Para reducir el riesgo de que
  // alguien con acceso momentáneo a una sesión ya abierta lo quite sin querer (o sin permiso),
  // pedimos confirmar escribiendo el correo de la cuenta antes de continuar.
  document.getElementById('pinGateForgotBtn').onclick = async ()=>{
    const email = firebaseUser && firebaseUser.email ? firebaseUser.email : '';
    const typed = prompt('Para confirmar que eres tú, escribe el correo de esta cuenta ('+email+') y pulsa aceptar:');
    if(typed === null) return; // canceló
    if(typed.trim().toLowerCase() !== email.toLowerCase()){
      document.getElementById('pinGateError').textContent = 'El correo no coincide. No se ha quitado el PIN.';
      return;
    }
    const btn = document.getElementById('pinGateForgotBtn');
    btn.disabled = true;
    try{
      state.settings.pinHash = null;
      await doSave();
      try{ localStorage.removeItem(unlockKeyName()); }catch(e){}
      location.reload();
    }catch(e){
      console.error(e);
      document.getElementById('pinGateError').textContent = 'No se pudo quitar el PIN. Comprueba tu conexión e inténtalo de nuevo.';
      btn.disabled = false;
    }
  };
}
async function attemptPinUnlock(){
  const val = document.getElementById('pinGateInput').value;
  const hash = await pinHashFor(val);
  if(hash === state.settings.pinHash){
    unlocked = true;
    rememberUnlock(hash);
    // Recargamos para relanzar el init() normal ya desbloqueado (más simple y fiable
    // que reconstruir aquí toda la interfaz).
    location.reload();
  } else {
    document.getElementById('pinGateError').textContent = 'PIN incorrecto.';
  }
}
function renderAccountBox(){
  const host = document.getElementById('accountBox');
  if(!host || !firebaseUser) return;
  const verificado = !!firebaseUser.emailVerified;
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Cuenta</div>
    <div style="font-size:13px;margin-bottom:8px;word-break:break-all;">${firebaseUser.email || ''}</div>
    <div style="font-size:12px;margin-bottom:8px;color:${verificado?'var(--green)':'var(--cream-dim)'};">
      ${verificado ? '✓ Correo verificado' : 'Correo sin verificar todavía (revisa tu bandeja de entrada, incluida la de spam)'}
    </div>
    ${verificado ? '' : '<button class="btn ghost small" id="resendVerifyBtn" style="margin-bottom:8px;">Reenviar correo de verificación</button><div id="resendVerifyMsg" style="font-family:var(--font-mono);font-size:11px;color:var(--muted);min-height:14px;margin-bottom:8px;"></div>'}
    <div><button class="btn ghost small" id="accountLogoutBtn">Cerrar sesión</button></div>
  `;
  document.getElementById('accountLogoutBtn').onclick = ()=>{ auth.signOut().then(()=> location.reload()); };
  const resendBtn = document.getElementById('resendVerifyBtn');
  if(resendBtn){
    resendBtn.onclick = async ()=>{
      resendBtn.disabled = true;
      const msg = document.getElementById('resendVerifyMsg');
      try{
        await firebaseUser.sendEmailVerification();
        msg.textContent = 'Correo enviado. Cuando lo confirmes, vuelve a entrar en la app y se actualizará solo.';
      }catch(e){
        console.error(e);
        msg.textContent = 'No se pudo enviar el correo, inténtalo de nuevo en un rato.';
      }
      resendBtn.disabled = false;
    };
  }
}
function renderSecurity(){
  const host = document.getElementById('securityBox');
  if(!host) return;
  const has = !!state.settings.pinHash;
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Seguridad</div>
    <div style="font-size:13px;margin-bottom:8px;">${has ? 'PIN activado en este planning.' : 'Sin PIN: cualquiera con el enlace puede ver y editar estos datos.'}</div>
    <label for="newPinInput" style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">${has?'Nuevo PIN':'Crear PIN'}</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <input id="newPinInput" type="password" inputmode="numeric" autocomplete="off" placeholder="Mín. 4 caracteres" style="flex:1;min-width:160px;padding:8px;font-family:var(--font-mono);background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;">
      <button class="btn ghost small" id="setPinBtn">${has?'Cambiar PIN':'Activar PIN'}</button>
      ${has ? '<button class="btn danger small" id="removePinBtn">Quitar PIN</button>' : ''}
    </div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);line-height:1.5;">
      El PIN se guarda como huella (hash), nunca en texto claro, y se pedirá en cualquier dispositivo nuevo que abra
      este enlace. Para bloquear también el acceso directo a la base de datos, añade reglas de seguridad en la
      consola de tu proyecto de Firebase (ver comentario junto a FIREBASE_CONFIG en el código).
    </div>
  `;
  document.getElementById('setPinBtn').onclick = async ()=>{
    const val = document.getElementById('newPinInput').value;
    if(val.length < 4){ showToast('El PIN debe tener al menos 4 caracteres'); return; }
    state.settings.pinHash = await pinHashFor(val);
    rememberUnlock(state.settings.pinHash);
    scheduleSave();
    renderSecurity();
    showToast('PIN guardado');
  };
  const removeBtn = document.getElementById('removePinBtn');
  if(removeBtn){
    removeBtn.onclick = ()=>{
      if(confirm('¿Quitar el PIN? Cualquiera con el enlace podrá editar los datos.')){
        state.settings.pinHash = null;
        try{ localStorage.removeItem(unlockKeyName()); }catch(e){}
        scheduleSave();
        renderSecurity();
      }
    };
  }
}

/* ===================== TEMA: estado y opción de volver a automático ===================== */
function renderThemeBox(){
  const host = document.getElementById('themeBox');
  if(!host) return;
  let manual = null;
  try { manual = localStorage.getItem('ob-theme'); } catch(e){}
  const isManual = manual === 'light' || manual === 'dark';
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Tema</div>
    <div style="font-size:13px;margin-bottom:8px;">
      ${isManual
        ? 'Tienes fijado el tema '+(current==='light'?'claro':'oscuro')+' a mano. No cambiará solo con la hora.'
        : 'Automático: claro entre las 7:00 y las 21:00, oscuro el resto del día. Usa el botón 🌙/☀️ de arriba para fijar uno a mano.'}
    </div>
    ${isManual ? '<button class="btn ghost small" id="themeAutoBtn">Volver a automático (por hora)</button>' : ''}
  `;
  const autoBtn = document.getElementById('themeAutoBtn');
  if(autoBtn){
    autoBtn.onclick = ()=>{
      try{ localStorage.removeItem('ob-theme'); }catch(e){}
      const h = new Date().getHours();
      const t = (h>=7 && h<21) ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
      const themeBtn = document.getElementById('themeToggleBtn');
      if(themeBtn){ themeBtn.textContent = t==='light' ? '☀️' : '🌙'; }
      renderThemeBox();
      showToast('Tema puesto en automático');
    };
  }
}

/* ===================== COPIA DE SEGURIDAD: exportar / importar JSON ===================== */
function renderBackupBox(){
  const host = document.getElementById('backupBox');

  if(!host) return;
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Copia de seguridad</div>
    <div style="font-size:12px;color:var(--cream-dim);margin-bottom:10px;">Descarga tus datos en un archivo JSON, o restáuralos si falla Firebase o pierdes el acceso a tu cuenta.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn ghost small" id="exportJsonBtn">Exportar copia (JSON)</button>
      <button class="btn ghost small" id="importJsonBtn">Importar copia (JSON)</button>
      <input type="file" id="importJsonFile" accept="application/json,.json" style="display:none;" aria-label="Seleccionar archivo de copia de seguridad">
    </div>
  `;
  document.getElementById('exportJsonBtn').onclick = exportBackup;
  document.getElementById('importJsonBtn').onclick = ()=> document.getElementById('importJsonFile').click();
  document.getElementById('importJsonFile').onchange = importBackup;
}
function exportBackup(){
  const email = firebaseUser && firebaseUser.email ? firebaseUser.email : '';
  const payload = {app:'planning-oposicion', version:3, account: email, exportedAt:new Date().toISOString(), state};
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0,10);
  a.href = url; a.download = 'planning-backup-'+(email||'sin-cuenta')+'-'+today+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('Copia exportada');
}
function importBackup(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      const incoming = parsed && parsed.state ? parsed.state : parsed;
      if(!incoming || typeof incoming !== 'object' || !incoming.months){
        showToast('El archivo no parece una copia de seguridad válida');
        return;
      }
      if(!confirm('Esto reemplazará todos los datos actuales por los del archivo importado. ¿Continuar?')) return;
      state = incoming;
      normalizeState();
      scheduleSave();
      currentMonthKey = null;
      const keys = sortedMonthKeys();
      currentMonthKey = keys.length ? keys[keys.length-1] : null;
      renderAll();
      showToast('Copia importada');
    }catch(err){
      console.error(err);
      showToast('No se pudo leer el archivo (¿es un JSON válido?)');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ===================== COPIAS AUTOMÁTICAS EN LA NUBE: panel para restaurarlas ===================== */
function formatSnapshotDate(id, at){
  try{
    const d = at ? new Date(at) : new Date(id+'T00:00:00');
    return d.toLocaleDateString('es-ES', {weekday:'short', day:'2-digit', month:'short', year:'numeric'}) +
      (at ? ' · ' + d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}) : '');
  }catch(e){ return id; }
}
async function renderHistoryBox(){
  const host = document.getElementById('historyBox');
  if(!host) return;
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Copias automáticas en la nube</div>
    <div style="font-size:12px;color:var(--cream-dim);margin-bottom:10px;">Cada día que se guarda algún cambio se conserva automáticamente una copia de cómo estaban tus
    datos ese día (hasta 7 días atrás). Útil si borras o cambias algo por error y ya se ha guardado. No sustituye a la copia JSON manual.</div>
    <div id="historyList" style="font-size:12px;color:var(--muted);">Cargando…</div>
  `;
  const list = await listHistorySnapshots();
  const listHost = document.getElementById('historyList');
  if(!listHost) return; // la pestaña pudo cambiar mientras cargaba
  if(!list.length){
    listHost.textContent = 'Todavía no hay copias automáticas guardadas (se irán creando a medida que uses la app en distintos días).';
    return;
  }
  listHost.innerHTML = '';
  list.forEach(snap=>{
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line);';
    const label = document.createElement('span');
    label.textContent = formatSnapshotDate(snap.id, snap.at);
    label.style.cssText = 'font-family:var(--font-mono);color:var(--cream);';
    const btn = document.createElement('button');
    btn.className = 'btn ghost small';
    btn.textContent = 'Restaurar esta copia';
    btn.onclick = ()=>{
      if(!confirm('Esto reemplazará TODOS tus datos actuales por como estaban el '+formatSnapshotDate(snap.id, snap.at)+'. ¿Continuar?')) return;
      try{
        state = JSON.parse(snap.state);
        normalizeState();
        scheduleSave();
        currentMonthKey = null;
        const keys = sortedMonthKeys();
        currentMonthKey = keys.length ? keys[keys.length-1] : null;
        renderAll();
        showToast('Copia restaurada');
      }catch(e){ console.error(e); showToast('No se pudo restaurar esta copia'); }
    };
    row.appendChild(label);
    row.appendChild(btn);
    listHost.appendChild(row);
  });
}

/* ===================== PANTALLAS DE ACCESO ===================== */
function renderConfigNeeded(){
  document.querySelector('.wrap').innerHTML = `
    <div class="empty-state" style="text-align:left;max-width:640px;margin:40px auto;">
      <h3 style="color:var(--amber);font-family:var(--font-display);margin-top:0;">Falta configurar Firebase</h3>
      <p>Para que el planning se guarde en la nube y puedas abrirlo desde cualquier dispositivo, edita este archivo HTML
      y sustituye los valores de <code>FIREBASE_CONFIG</code> (cerca del principio del &lt;script&gt;) por los datos de
      tu proyecto de Firebase (gratis en console.firebase.google.com). Después vuelve a subir el archivo.</p>
    </div>`;
}
function traduceErrorAuth(code){
  const map = {
    'auth/invalid-email':'Correo electrónico no válido.',
    'auth/user-not-found':'No existe ninguna cuenta con ese correo.',
    'auth/wrong-password':'Contraseña incorrecta.',
    'auth/invalid-credential':'Correo o contraseña incorrectos.',
    'auth/email-already-in-use':'Ya existe una cuenta con ese correo.',
    'auth/weak-password':'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests':'Demasiados intentos. Prueba de nuevo en unos minutos.'
  };
  return map[code] || 'No se pudo completar la operación. Inténtalo de nuevo.';
}
let authMode = 'login'; // 'login' | 'register'
function renderAuthScreen(){
  document.querySelector('.wrap').innerHTML = `
    <div class="empty-state" style="text-align:left;max-width:420px;margin:40px auto;">
      <h3 id="authTitle" style="color:var(--amber);font-family:var(--font-display);margin-top:0;">Iniciar sesión</h3>
      <label for="authEmail" style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">Correo electrónico</label>
      <input id="authEmail" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <label for="authPassword" style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">Contraseña</label>
      <input id="authPassword" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <div id="authError" role="alert" style="color:var(--red-text);font-family:var(--font-mono);font-size:12px;margin-bottom:10px;min-height:14px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="authSubmitBtn">Entrar</button>
        <button class="btn ghost" id="authToggleModeBtn">Crear cuenta nueva</button>
      </div>
      <div style="margin-top:12px;">
        <button class="btn ghost small" id="authForgotBtn" style="font-size:11px;">¿Olvidaste tu contraseña?</button>
      </div>
    </div>`;
  const authTitleEl = document.getElementById('authTitle');
  const authSubmitBtnEl = document.getElementById('authSubmitBtn');
  const authToggleModeBtnEl = document.getElementById('authToggleModeBtn');
  const authEmailEl = document.getElementById('authEmail');
  const authPasswordEl = document.getElementById('authPassword');
  const authErrorEl = document.getElementById('authError');
  function showAuthError(msg){ authErrorEl.textContent = msg; }
  authToggleModeBtnEl.onclick = ()=>{
    authMode = authMode==='login' ? 'register' : 'login';
    authTitleEl.textContent = authMode==='login' ? 'Iniciar sesión' : 'Crear cuenta';
    authSubmitBtnEl.textContent = authMode==='login' ? 'Entrar' : 'Crear cuenta';
    authToggleModeBtnEl.textContent = authMode==='login' ? 'Crear cuenta nueva' : 'Ya tengo cuenta';
    showAuthError('');
  };
  authSubmitBtnEl.onclick = async ()=>{
    const email = authEmailEl.value.trim();
    const password = authPasswordEl.value;
    if(!email || !password){ showAuthError('Rellena correo y contraseña.'); return; }
    authSubmitBtnEl.disabled = true;
    showAuthError('');
    try{
      if(authMode==='login'){
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
          email: email, aprobado:false, esAdmin:false, emailVerificado:false,
          creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Enviamos el correo de verificación, pero NO bloqueamos el acceso a la app por esto
        // (eso lo sigue decidiendo el administrador al aprobar la cuenta). Es solo una señal
        // extra: el administrador verá en el Panel si el correo ya se verificó o no.
        try{ await cred.user.sendEmailVerification(); }catch(e){ console.error(e); }
      }
      location.reload();
    }catch(e){
      console.error(e);
      showAuthError(traduceErrorAuth(e.code));
    }finally{
      authSubmitBtnEl.disabled = false;
    }
  };
  document.getElementById('authForgotBtn').onclick = async ()=>{
    const email = authEmailEl.value.trim();
    if(!email){ showAuthError('Escribe tu correo arriba y vuelve a pulsar.'); return; }
    try{
      await auth.sendPasswordResetEmail(email);
      showAuthError('');
      showToast('Te hemos enviado un correo para restablecer la contraseña.');
    }catch(e){
      console.error(e);
      showAuthError(traduceErrorAuth(e.code));
    }
  };
}
function renderPendingScreen(){
  document.querySelector('.wrap').innerHTML = `
    <div class="empty-state" style="text-align:left;max-width:460px;margin:40px auto;">
      <h3 style="color:var(--amber);font-family:var(--font-display);margin-top:0;">Cuenta pendiente de aprobación</h3>
      <p>Tu cuenta (${(firebaseUser&&firebaseUser.email)||''}) se ha creado correctamente, pero el administrador todavía no
      te ha dado acceso. En cuanto lo haga podrás entrar con este mismo correo y contraseña.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn ghost small" id="pendingRefreshBtn">Comprobar de nuevo</button>
        <button class="btn ghost small" id="pendingLogoutBtn">Cerrar sesión</button>
      </div>
    </div>`;
  document.getElementById('pendingRefreshBtn').onclick = ()=> location.reload();
  document.getElementById('pendingLogoutBtn').onclick = ()=>{ auth.signOut().then(()=> location.reload()); };
}
/* ===================== PANEL DE ADMINISTRACIÓN (aprobar cuentas nuevas) ===================== */
async function renderAdminBox(){
  const host = document.getElementById('adminBox');
  if(!host || !isAdmin) return;
  host.style.display = 'block';
  const titleHtml = '<div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Panel de administración</div>';
  host.innerHTML = titleHtml + '<div style="font-size:12px;color:var(--cream-dim);">Cargando cuentas…</div>';
  let snap;
  try{
    snap = await db.collection('users').get();
  }catch(e){
    console.error(e);
    host.innerHTML = titleHtml + '<div style="font-size:12px;color:var(--red-text);">No se pudieron cargar las cuentas.</div>';
    return;
  }
  const cuentas = [];
  snap.forEach((doc)=> cuentas.push(Object.assign({uid:doc.id}, doc.data())));
  cuentas.sort((a,b)=> (a.email||'').localeCompare(b.email||''));
  const pendientes = cuentas.filter((c)=> !c.aprobado);
  const aprobadas = cuentas.filter((c)=> c.aprobado);
  // Aviso visual en la pestaña Ajustes, para no depender de acordarte de entrar a mirar el
  // Panel de administración cada vez.
  const badge = document.getElementById('ajustesPendBadge');
  if(badge){
    if(pendientes.length){ badge.textContent = pendientes.length; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  }
  host.innerHTML = titleHtml +
    '<div style="font-size:12px;color:var(--cream-dim);margin-bottom:10px;">Aprueba aquí las cuentas nuevas que se registren para darles acceso a la app.</div>' +
    '<div id="adminPendList"></div><div id="adminOkList"></div>';
  function filaCuenta(c, esPendiente){
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line);';
    const info = document.createElement('div');
    info.style.cssText = 'font-size:12px;word-break:break-all;';
    info.textContent = c.email || '(sin correo)';
    if(c.esAdmin){
      const tag = document.createElement('span');
      tag.textContent = 'ADMIN';
      tag.style.cssText = 'margin-left:6px;font-family:var(--font-mono);font-size:9px;font-weight:700;background:var(--green);color:#12241a;border-radius:8px;padding:1px 5px;';
      info.appendChild(tag);
    }
    // "emailVerificado" lo escribe cada cuenta sobre sí misma en cuanto inicia sesión (ver
    // syncEmailVerifiedFlag), reflejando si ya pulsó el enlace del correo de verificación.
    // Es solo informativo para ayudarte a decidir si aprobar o no: no bloquea nada por sí solo.
    if(esPendiente){
      const tag = document.createElement('span');
      const verificado = c.emailVerificado === true;
      tag.textContent = verificado ? '✓ correo verificado' : 'correo sin verificar';
      tag.style.cssText = 'margin-left:6px;font-family:var(--font-mono);font-size:9px;font-weight:700;border-radius:8px;padding:1px 5px;' +
        (verificado ? 'background:var(--green);color:#12241a;' : 'background:var(--bg-panel-2);color:var(--cream-dim);border:1px solid var(--line);');
      info.appendChild(tag);
    }
    row.appendChild(info);
    if(c.uid !== firebaseUser.uid){
      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';
      const btn = document.createElement('button');
      btn.className = esPendiente ? 'btn small' : 'btn ghost small';
      btn.textContent = esPendiente ? 'Aprobar' : 'Revocar acceso';
      btn.onclick = async ()=>{
        btn.disabled = true;
        try{
          await db.collection('users').doc(c.uid).update({aprobado: esPendiente});
          showToast(esPendiente ? 'Cuenta aprobada ✓' : 'Acceso revocado');
          renderAdminBox();
        }catch(err){
          console.error(err);
          showToast('No se pudo actualizar la cuenta.');
          btn.disabled = false;
        }
      };
      btnGroup.appendChild(btn);
      if(esPendiente){
        // Solo para solicitudes pendientes: borra el perfil (users/{uid}) para que deje de
        // aparecer en esta lista. IMPORTANTE: esto NO borra la cuenta de Firebase Auth en sí
        // (eso solo se puede hacer desde la consola de Firebase o con el SDK de administración,
        // no desde aquí), así que si esa persona vuelve a iniciar sesión con ese correo,
        // aparecerá de nuevo como pendiente. Sirve para limpiar solicitudes que no quieres
        // aprobar (duplicadas, de prueba, o que no reconoces), no para bloquear a alguien de
        // forma permanente.
        const delBtn = document.createElement('button');
        delBtn.className = 'btn ghost small';
        delBtn.textContent = 'Eliminar solicitud';
        delBtn.onclick = async ()=>{
          if(!confirm('Esto borra la solicitud de "'+(c.email||'(sin correo)')+'" de esta lista.\n\nOjo: si esa persona vuelve a entrar con ese correo, se le creará una solicitud pendiente nueva otra vez (esto no bloquea su cuenta de Firebase, solo quita esta entrada). ¿Continuar?')) return;
          delBtn.disabled = true;
          try{
            await db.collection('users').doc(c.uid).delete();
            showToast('Solicitud eliminada');
            renderAdminBox();
          }catch(err){
            console.error(err);
            showToast('No se pudo eliminar la solicitud.');
            delBtn.disabled = false;
          }
        };
        btnGroup.appendChild(delBtn);
      }
      row.appendChild(btnGroup);
    }
    return row;
  }
  const pendHost = document.getElementById('adminPendList');
  if(pendientes.length){
    const label = document.createElement('div');
    label.textContent = 'Pendientes (' + pendientes.length + ')';
    label.style.cssText = 'font-size:11px;color:var(--red-text);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px;';
    pendHost.appendChild(label);
    pendientes.forEach((c)=> pendHost.appendChild(filaCuenta(c, true)));
  } else {
    const none = document.createElement('div');
    none.textContent = 'No hay cuentas pendientes.';
    none.style.cssText = 'font-size:12px;color:var(--cream-dim);';
    pendHost.appendChild(none);
  }
  const okHost = document.getElementById('adminOkList');
  if(aprobadas.length){
    const label = document.createElement('div');
    label.textContent = 'Con acceso (' + aprobadas.length + ')';
    label.style.cssText = 'font-size:11px;color:var(--green);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;';
    okHost.appendChild(label);
    aprobadas.forEach((c)=> okHost.appendChild(filaCuenta(c, false)));
  }
}


/* ===================== MOTOR DE CÁLCULO ===================== */
// Recorre TODOS los meses guardados en orden cronológico y genera la asignación
// de cada día de estudio, encadenando los contadores mes a mes.
/* ===================== CACHÉ INCREMENTAL DE computePlan() =====================
   computePlan() es intrínsecamente secuencial: el contenido de cada día depende
   de contadores (gIdx, mgIdx, lIdx, iIdx, pIdx, blockTurn, azulCount, leveAppear)
   que arrastran el histórico completo desde el primer mes guardado. Recalcular
   todos los meses en cada pulsación de un tick es caro cuando hay muchos meses
   guardados.

   Solución: al terminar cada mes guardamos una "foto" (checkpoint) de esos
   contadores. En la siguiente llamada, si sabemos desde qué mes hay cambios
   (planDirtyFromKey), restauramos el checkpoint del mes anterior y solo
   recalculamos desde ahí en adelante, reutilizando (misma referencia de objeto)
   los meses anteriores que no han cambiado. Si no se indica un mes concreto, o
   si la propia lista de meses cambia (añadir/eliminar/renombrar mes), se
   recalcula todo — pero eso es una acción puntual y poco frecuente, a
   diferencia de marcar/desmarcar ticks o cambiar el estado de un día, que es
   la operación habitual y la que de verdad necesita ser barata. */
let _planCache = null; // { keysSig, plan, checkpoints }
let _planDirtyFromKey = ''; // '' = recalcular todo; 'YYYY-MM' = recalcular desde ese mes; null = nada pendiente
function invalidatePlan(fromKey){
  if(fromKey === undefined || fromKey === null){ _planDirtyFromKey = ''; return; }
  if(_planDirtyFromKey === '') return; // ya hay un recálculo total pendiente, no hace falta afinar
  if(_planDirtyFromKey === null || fromKey < _planDirtyFromKey) _planDirtyFromKey = fromKey;
}
function freshPlanCarry(){
  const blockTurn = {}, azulCount = {};
  for(let b=1;b<=12;b++){ blockTurn[b]=0; azulCount[b]=0; }
  const leveAppear = {};
  for(let i=0;i<LEVES.length;i++) leveAppear[i]=0;
  return {gIdx:0, mgIdx:0, lIdx:0, iIdx:0, pIdx:0, blockTurn, azulCount, leveAppear};
}
function clonePlanCarry(c){
  return {
    gIdx:c.gIdx, mgIdx:c.mgIdx, lIdx:c.lIdx, iIdx:c.iIdx, pIdx:c.pIdx,
    blockTurn: Object.assign({}, c.blockTurn),
    azulCount: Object.assign({}, c.azulCount),
    leveAppear: Object.assign({}, c.leveAppear)
  };
}
function computePlan(){
  const keys = sortedMonthKeys();
  const keysSig = keys.join('|');
  const cacheReusable = !!(_planCache && _planCache.keysSig === keysSig);

  // Nada pendiente y los meses guardados no han cambiado: devolvemos la caché tal cual.
  if(_planDirtyFromKey === null && cacheReusable) return _planCache.plan;

  // ¿Desde qué índice de `keys` hace falta recalcular?
  let startIdx = 0;
  if(cacheReusable && _planDirtyFromKey !== ''){
    const i = keys.indexOf(_planDirtyFromKey);
    startIdx = i >= 0 ? i : 0;
  }

  const plan = {};
  const checkpoints = {};
  let carry;
  if(startIdx > 0 && cacheReusable){
    // Reutilizamos (misma referencia) los meses anteriores al primero afectado,
    // y partimos de su checkpoint en vez de recalcular desde el mes 1.
    for(let i=0;i<startIdx;i++){ const k = keys[i]; plan[k] = _planCache.plan[k]; checkpoints[k] = _planCache.checkpoints[k]; }
    carry = clonePlanCarry(_planCache.checkpoints[keys[startIdx-1]]);
  } else {
    carry = freshPlanCarry();
  }

  function resolveTema(t, bloque){
    if(t.type==='armas_explosivos'){
      const turn = carry.azulCount[bloque];
      return {nombre:(turn%2===0)?t.armas:t.explosivos, clase:t.clase, color:t.color, rotKey:'arm-'+bloque};
    }
    return t;
  }
  function resolveLeve(idx){
    const item = LEVES[idx];
    if(item.type==='l39_l40'){
      const turn = carry.leveAppear[idx];
      return {nombre:(turn%2===0)?item.l39:item.l40, clase:item.clase};
    }
    return item;
  }

  for(let ki=startIdx; ki<keys.length; ki++){
    const k = keys[ki];
    const [y,m] = k.split('-').map(Number);
    const nDays = daysInMonth(y,m);
    const days = (state.months[k] && state.months[k].days) || {};
    const monthTicks = (state.dayTicks && state.dayTicks[k]) || {};
    plan[k] = {};
    for(let d=1; d<=nDays; d++){
      const status = days[d] || 'ESTUDIO';
      const dateObj = new Date(y, m-1, d);
      const jsDow = dateObj.getDay(); // 0 sun .. 6 sat
      const isTueThu = (jsDow===2 || jsDow===4);
      const isMonWed = (jsDow===1 || jsDow===3);

      if(status !== 'ESTUDIO'){
        plan[k][d] = {status, dow:jsDow};
        continue;
      }
      const ticks = monthTicks[d] || {};
      const entry = {status:'ESTUDIO', dow:jsDow, ticks};
      const dayOfMonthParity = d % 2; // 1 = impar, 0 = par
      if(dayOfMonthParity === 1){
        entry.bloqueTipo = 'grave';
        entry.bloque = GRAVES_ORDER[carry.gIdx % GRAVES_ORDER.length];
      } else {
        entry.bloqueTipo = 'mgrave';
        entry.bloque = MGRAVES_ORDER[carry.mgIdx % MGRAVES_ORDER.length];
      }
      const dayKey = k + '-' + pad2(d);
      const unifyThisMonth = !!(state.settings.unifyFromDate && dayKey >= state.settings.unifyFromDate);
      entry.unify = unifyThisMonth;
      if(unifyThisMonth){
        entry.color = 'unificado';
        const rawTemas = BLOCKS[entry.bloque].temas;
        entry.temasDelDia = rawTemas.map(t=>resolveTema(t, entry.bloque));
      } else {
        entry.color = (carry.blockTurn[entry.bloque] % 2 === 0) ? 'azul' : 'morado';
        const rawTemas = BLOCKS[entry.bloque].temas.filter(t=>t.color===entry.color);
        entry.temasDelDia = rawTemas.map(t=>resolveTema(t, entry.bloque));
      }
      // El tick de cada categoría marca "NO completado". Por defecto (sin marcar) se
      // asume hecho y la racha avanza con normalidad; solo si marcas que NO se ha
      // completado, el puntero se queda quieto y el día siguiente que toque esa misma
      // categoría repetirá exactamente el mismo contenido, hasta que la desmarques.
      if(!ticks.bloque){
        if(dayOfMonthParity === 1) carry.gIdx++; else carry.mgIdx++;
        if(unifyThisMonth || entry.color==='azul') carry.azulCount[entry.bloque]++;
        carry.blockTurn[entry.bloque]++;
      }

      const leveIdx = carry.lIdx % LEVES.length;
      entry.leveNum = leveIdx + 1;
      entry.leveInfo = resolveLeve(leveIdx);
      if(!ticks.leve){ carry.leveAppear[leveIdx]++; carry.lIdx++; }

      entry.inglesNum = (carry.iIdx % INGLES_TOTAL) + 1;
      if(!ticks.ingles){ carry.iIdx++; }

      entry.orto = true;
      if(isTueThu){
        entry.entreno = true;
      } else if(isMonWed){
        const psicoIdx = carry.pIdx % PSICO_ITEMS.length;
        entry.psico = PSICO_ITEMS[psicoIdx];
        entry.psicoIdx = psicoIdx;
        if(!ticks.psico){ carry.pIdx++; }
      }
      plan[k][d] = entry;
    }
    checkpoints[k] = clonePlanCarry(carry);
  }

  _planCache = {keysSig, plan, checkpoints};
  _planDirtyFromKey = null;
  return plan;
}
function setDayTick(monthKey, day, stream, val){
  if(!state.dayTicks[monthKey]) state.dayTicks[monthKey] = {};
  if(!state.dayTicks[monthKey][day]) state.dayTicks[monthKey][day] = {};
  state.dayTicks[monthKey][day][stream] = val;
  invalidatePlan(monthKey); // solo hace falta recalcular desde este mes en adelante
  scheduleSave();
}

