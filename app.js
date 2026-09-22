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


/* ===================== ACCESIBILIDAD: pestañas, encabezados y navegación ===================== */
(function initA11ySync(){
  function sync(){
    // Selectores de vista: role="tab" + aria-selected según cuál esté activo.
    document.querySelectorAll('.view-toggle[role="tablist"] .view-toggle-btn').forEach(b=>{
      if(b.getAttribute('role') !== 'tab') b.setAttribute('role','tab');
      const sel = b.classList.contains('active') ? 'true' : 'false';
      if(b.getAttribute('aria-selected') !== sel) b.setAttribute('aria-selected', sel);
    });
    // Menú principal: marca la sección actual.
    document.querySelectorAll('.tab-btn').forEach(b=>{
      if(b.classList.contains('active')) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    // Los títulos de sección son <h3> sin <h2> encima: los anunciamos como nivel 2 sin tocar el estilo.
    document.querySelectorAll('h3:not([aria-level])').forEach(h=>h.setAttribute('aria-level','2'));
  }
  let queued = false;
  function queue(){ if(queued) return; queued = true; requestAnimationFrame(()=>{ queued = false; sync(); }); }
  new MutationObserver(queue).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  sync();
})();


/* ===================== MODALES: foco dentro, Esc para cerrar y devolver el foco ===================== */
(function initModalFocus(){
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let current = null, opener = null;
  function focusables(m){ return Array.from(m.querySelectorAll(FOCUSABLE)).filter(el=>el.getClientRects().length>0); }
  function onOpen(backdrop){
    if(current === backdrop) return;
    current = backdrop; opener = document.activeElement;
    const box = backdrop.querySelector('.modal');
    if(box){
      if(!box.hasAttribute('tabindex')) box.setAttribute('tabindex','-1');
      // Foco al propio cuadro (no a un campo): así se anuncia el diálogo sin que salte el teclado en el móvil.
      try{ box.focus({preventScroll:true}); }catch(e){}
    }
  }
  function onClose(backdrop){
    if(current !== backdrop) return;
    current = null;
    const o = opener; opener = null;
    // Al cerrar, el foco vuelve a lo que abrió el modal (si sigue en pantalla; el calendario se repinta y a veces ya no está).
    if(o && o !== document.body && document.contains(o) && typeof o.focus === 'function'){ try{ o.focus({preventScroll:true}); }catch(e){} }
  }
  document.querySelectorAll('.modal-backdrop').forEach(b=>{
    new MutationObserver(()=>{ b.classList.contains('open') ? onOpen(b) : onClose(b); }).observe(b, {attributes:true, attributeFilter:['class']});
  });
  document.addEventListener('keydown', e=>{
    if(!current || e.isComposing) return;
    if(e.key === 'Escape'){
      if(e.target && e.target.tagName === 'SELECT') return; // deja que Esc cierre solo el desplegable
      e.preventDefault(); e.stopPropagation();
      current.classList.remove('open'); // mismo cierre que el botón ✕ y el clic fuera
      return;
    }
    if(e.key === 'Tab'){
      const box = current.querySelector('.modal');
      const list = focusables(current);
      if(!list.length){ e.preventDefault(); if(box) box.focus(); return; }
      const first = list[0], last = list[list.length-1], active = document.activeElement;
      if(!current.contains(active)){ e.preventDefault(); first.focus(); }
      else if(e.shiftKey && (active === first || active === box)){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && active === last){ e.preventDefault(); first.focus(); }
    }
  }, true);
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

// Temario general "de Teoría" (el mismo que usas para elegir temas en los test), usado
// SOLO como catálogo del desplegable "Añadir tema a mano" de Conocimientos en Arrastre —
// no tiene relación con BLOCKS ni con la automatización del Calendario/Temario y notas.
const TEMARIO_GENERAL = [
  {num:'1', titulo:'Derechos Humanos', subtemas:[
    'Carta de las Naciones Unidas','Órganos','Declaración Universal de Derechos Humanos',
    'Convenio europeo para la protección de los derechos y de las libertades fundamentales',
    'Tribunal Europeo de Derechos Humanos',
    'Pacto Internacional de Derechos Económicos, Sociales y Culturales',
    'Pacto internacional de Derechos Civiles y Políticos',
    'Consejo de Derechos Humanos de la ONU',
    'Convención contra la tortura y otros tratos o penas crueles, inhumanas o degradantes, de la Asamblea General de Naciones Unidas',
    'Protocolo facultativo de la Convención contra la tortura y otros tratos o penas crueles, inhumanas o degradantes, de la Asamblea General de Naciones Unidas',
    'Carta de los Derechos Fundamentales de la UE',
    'Estatuto de Roma de la Corte Penal Internacional',
    'Cooperación con la Corte Penal Internacional',
    'Consejo Asesor del Mecanismo Nacional de Prevención de Tortura',
    'Carta Social Europea (actualizada)'
  ]},
  {num:'2', titulo:'Igualdad', subtemas:[]},
  {num:'3', titulo:'Prevención de Riesgos Laborales', subtemas:[
    'Prevención de Riesgos Laborales','PRL en la Administración General del Estado','PRL en la Guardia Civil'
  ]},
  {num:'4.1', titulo:'Constitución Española de 1978', subtemas:[
    'Preámbulo','Título Preliminar','Título I De los Derechos y Deberes Fundamentales','Título II De la Corona',
    'Título III De las Cortes Generales','Título IV Del Gobierno y de la Administración',
    'Título V De las relaciones entre el Gobierno y las Cortes Generales','Título VI Del Poder Judicial',
    'Título VII Economía y Hacienda','Título VIII De la Organización Territorial del Estado',
    'Título IX Del Tribunal Constitucional','Título X De la Reforma Constitucional','Disposiciones'
  ]},
  {num:'4.2', titulo:'Defensor del Pueblo', subtemas:[]},
  {num:'4.3', titulo:'Protección Civil del Derecho al Honor, a la Intimidad Personal y Familiar y a la propia Imagen', subtemas:[]},
  {num:'5.1', titulo:'Tratado de la Unión Europea', subtemas:[]},
  {num:'5.2', titulo:'Tratado de Funcionamiento de la Unión Europea', subtemas:[]},
  {num:'6', titulo:'Instituciones Internacionales', subtemas:[
    'Organización de las Naciones Unidas (ONU)','El Consejo de Europa','Unión Europea',
    'La Organización del Tratado del Atlántico Norte (OTAN o NATO)','INTERPOL','EUROPOL','EUROJUST','FRONTEX','CEPOL',
    'ONU para la Alimentación y la Agricultura (FAO)','Fondo Monetario Internacional (FMI)','Organización Mundial de la Salud (OMS)'
  ]},
  {num:'7', titulo:'Derecho Civil', subtemas:[
    'Fuentes del ordenamiento español y normas jurídicas','La persona','Circunstancias modificativas de la capacidad',
    '7.1 TÍTULO PRELIMINAR. De las normas jurídicas, su aplicación y eficacia.',
    '7.2 TÍTULO PRIMERO. De los españoles y extranjeros.',
    '7.3 TÍTULO II. Del nacimiento y la extinción de la personalidad civil.',
    '7.4 TÍTULO III. Del domicilio.','7.5 TÍTULO IV. Del matrimonio.','7.6 TÍTULO V. De la paternidad y filiación.',
    '7.7 TÍTULO VI. De los alimentos entre parientes.','7.8 TÍTULO VII. De las relaciones paterno-filiales.',
    '7.9 TÍTULO VIII. De la ausencia.','7.10 TÍTULO IX. De la tutela y de la guarda de los menores.',
    '7.11 TÍTULO X. De la mayor edad y de la emancipación.',
    '7.12 TÍTULO XI. De las medidas de apoyo a las personas con discapacidad para el ejercicio de su capacidad jurídica.',
    '7.13 TÍTULO XII. Disposiciones comunes.'
  ]},
  {num:'8', titulo:'Derecho Penal', subtemas:[
    'La infracción penal','Personas criminalmente responsables','Medidas de seguridad',
    'Delitos contra la Administración Pública','Delitos contra la Constitución',
    'Garantías penales y de la aplicación de la Ley penal','Infracción penal.',
    'Personas criminalmente responsables de los delitos','Penas',
    'Responsabilidad civil derivada de los delitos y de las costas procesales',
    'Extinción de la responsabilidad criminal y sus efectos','Homicidio y sus formas.','Lesiones.',
    'Delitos contra la libertad.','Torturas y otros delitos contra la integridad moral.',
    'Trata de seres humanos.','Delitos contra la libertad e indemnidad sexuales.',
    'Delitos contra las relaciones familiares.','Delitos contra la Comunidad Internacional.'
  ]},
  {num:'9', titulo:'Derecho Procesal', subtemas:[
    'Ley de Enjuiciamiento Criminal','Habeas Corpus','Poder Judicial','Policía Judicial','Estatuto de la Víctima del Delito'
  ]},
  {num:'10.1', titulo:'Ley 39/2015 Procedimiento Administrativo', subtemas:[]},
  {num:'10.2', titulo:'Ley 40/2015 Régimen jurídico del sector público', subtemas:[]},
  {num:'11', titulo:'Protección de Datos', subtemas:[]},
  {num:'12.1', titulo:'Extranjería. Inmigración', subtemas:[
    'Derechos y Libertades Extranjeros','Infracciones'
  ]},
  {num:'12.2', titulo:'Entrada, Libre Circulación y Residencia en España de ciudadanos de la UE y del Espacio Económico Europeo', subtemas:[]},
  {num:'13.1', titulo:'Seguridad Pública', subtemas:[
    'Protección de la Seguridad Ciudadana','Infracciones'
  ]},
  {num:'13.2', titulo:'Seguridad Privada', subtemas:[]},
  {num:'14.1', titulo:'Ministerio del Interior', subtemas:[
    'Estructura Orgánica Básica','Funciones'
  ]},
  {num:'14.2', titulo:'Ministerio de Defensa', subtemas:[
    'Estructura Orgánica Básica','Funciones'
  ]},
  {num:'15', titulo:'Fuerzas y Cuerpos de Seguridad. Guardia Civil', subtemas:[
    'Fuerzas y Cuerpos de Seguridad','Régimen de Personal de la Guardia Civil','Dirección General de la Guardia Civil',
    'Historia de la Guardia Civil','Derechos y Deberes de la Guardia Civil'
  ]},
  {num:'16.1', titulo:'Protección Civil', subtemas:[]},
  {num:'16.2', titulo:'Desarrollo Sostenible', subtemas:[
    'Ley 42/2007, de 13 de diciembre, del Patrimonio Natural y de la Biodiversidad','Definiciones'
  ]},
  {num:'16.3', titulo:'Eficiencia Energética', subtemas:[]},
  {num:'17', titulo:'TIC', subtemas:[
    'Tecnologías de la Información y las Comunicaciones','Firma Electrónica','Ciberseguridad del CCN-CERT',
    'Esquema Nacional de Interoperabilidad','General de Telecomunicaciones'
  ]},
  {num:'18', titulo:'Topografía', subtemas:['Teoría','Definiciones','Ejercicios']},
  {num:'19.1', titulo:'Empleo de la Fuerza y de Armas de Fuego', subtemas:[]},
  {num:'19.2', titulo:'Código de Conducta de la Guardia Civil', subtemas:[
    'Valores Fundamentales','Principios Institucionales','Normas de comportamiento','Decálogo'
  ]},
  {num:'20', titulo:'Responsabilidad Penal de los Menores', subtemas:[]},
  {num:'21', titulo:'Violencia de Género', subtemas:[]},
  {num:'22.1', titulo:'Armas', subtemas:['Reglamento','Definiciones','Categorías','Licencias']},
  {num:'22.2', titulo:'Explosivos', subtemas:['Reglamento','Definiciones','Clasificación']},
  {num:'23.1', titulo:'Contrabando', subtemas:['Represión del Contrabando','Infracciones Administrativas']},
  {num:'23.2', titulo:'Código Aduanero de la Unión Europea', subtemas:['Definiciones']}
];

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

/* Bandera para evitar repintados duplicados: mientras renderAll() está en marcha, los
   render individuales no repintan además las vistas derivadas (pestaña Clases, calendario
   «Todo incluido»), porque renderAll ya las repinta él. */
let _renderAllEnCurso = false;

/* ===================== ESTADO ===================== */
let state = { months:{}, notes:{}, ticks:{}, dayTicks:{}, ortoTests:{ortografia:[], gramatica:[]}, entrenosLog:[], marcas:{}, marcasHistory:{}, settings:{unifyFromDate:null}, clases:{conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]}, claseCal:{}, clasesPendientes:[], notasPendientes:[], clasesSyncPendiente:[], simulacros:[], simulacrosPendientes:[], simulacroCal:{}, arrastreManual:{graves:[], mgraves:[], leves:[], ingles:[], psico:[], conocimientos:[]}, arrastreTestNotas:{} };
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
  // Fecha del examen oficial para la cuenta atrás ("YYYY-MM-DD"). null = usa la estimada (10 de julio).
  if(state.settings.examDate === undefined) state.settings.examDate = null;
  // Objetivo de vueltas completas de todo el temario antes del examen (tarjeta «Ritmo hasta el examen»).
  if(!(state.settings.objetivoVueltas >= 1)) state.settings.objetivoVueltas = 6;
  // Repaso de flojos: umbral de nota baja (% del máximo) y días sin repasar a partir de los cuales avisa.
  if(!(state.settings.flojosUmbral > 0)) state.settings.flojosUmbral = 60;
  if(!(state.settings.flojosDias > 0)) state.settings.flojosDias = 30;
  // Días en los que has confirmado que hiciste el test de arrastre: {fechaISO: true}.
  if(!state.arrastreTestHecho || typeof state.arrastreTestHecho !== 'object' || Array.isArray(state.arrastreTestHecho)){
    state.arrastreTestHecho = {};
  }
  if(!state.clases) state.clases = {conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]};
  if(!state.clases.conocimientos) state.clases.conocimientos = {};
  if(!state.clases.ingles) state.clases.ingles = {};
  if(!state.clases.psico) state.clases.psico = {};
  if(!state.clases.ortoGram) state.clases.ortoGram = [];
  if(!state.claseCal) state.claseCal = {};
  // Tablón de clases pendientes: clases que ya sabes que tienes por delante (con o sin fecha
  // de "disponible a partir de") y que aún no has colocado en ningún día del calendario.
  if(!Array.isArray(state.clasesPendientes)) state.clasesPendientes = [];
  state.clasesPendientes.forEach(p=>{
    if(p.disponibleDesde === undefined) p.disponibleDesde = null;
    if(p.useExtra === undefined) p.useExtra = false;
    if(p.temaValue === undefined) p.temaValue = null;
    if(p.nota === undefined) p.nota = '';
  });
  // Tablón de notas pendientes del calendario principal (apuntes/tareas sueltas, sin materia
  // ni tema asociado): mismo mecanismo que clasesPendientes, pero con solo texto libre.
  if(!Array.isArray(state.notasPendientes)) state.notasPendientes = [];
  state.notasPendientes.forEach(p=>{
    if(p.disponibleDesde === undefined) p.disponibleDesde = null;
    if(p.texto === undefined) p.texto = '';
  });
  // Temas añadidos a mano en Arrastre (desplegable), aparte de los que calcula la
  // automatización a partir del calendario real.
  if(!state.arrastreManual || typeof state.arrastreManual !== 'object' || Array.isArray(state.arrastreManual)){
    state.arrastreManual = {graves:[], mgraves:[], leves:[], ingles:[], psico:[], conocimientos:[]};
  }
  ['graves','mgraves','leves','ingles','psico','conocimientos'].forEach(pk=>{
    if(!Array.isArray(state.arrastreManual[pk])) state.arrastreManual[pk] = [];
  });
  // Notas del test de arrastre diario: {fechaISO: valor}. No sigue el sistema de vueltas,
  // así que basta con un objeto plano guardado por fecha.
  if(!state.arrastreTestNotas || typeof state.arrastreTestNotas !== 'object' || Array.isArray(state.arrastreTestNotas)){
    state.arrastreTestNotas = {};
  }
  // Migración: antes cada día solo admitía UN tema de "Conocimientos" (entry.conocimientos
  // era un número), UNA lesson de inglés y UNA prueba de psicotécnicos, y "ortografía"/
  // "gramática" eran simples sí/no. Ahora las cinco admiten varias veces el mismo día
  // (arrays), para poder registrar más de una clase de la misma materia en el mismo día.
  Object.keys(state.claseCal).forEach(mKey=>{
    const monthObj = state.claseCal[mKey];
    Object.keys(monthObj).forEach(d=>{
      const entry = monthObj[d];
      if(!entry) return;
      if(!Array.isArray(entry.conocimientos)){
        entry.conocimientos = (entry.conocimientos===null || entry.conocimientos===undefined || entry.conocimientos==='')
          ? [] : [Number(entry.conocimientos)];
      }
      if(!Array.isArray(entry.ingles)){
        entry.ingles = (entry.ingles===null || entry.ingles===undefined || entry.ingles==='')
          ? [] : [Number(entry.ingles)];
      }
      if(!Array.isArray(entry.psico)){
        entry.psico = (entry.psico===null || entry.psico===undefined || entry.psico==='')
          ? [] : [Number(entry.psico)];
      }
      if(!Array.isArray(entry.orto)){
        entry.orto = entry.orto ? [''] : [];
      } else {
        entry.orto = entry.orto.map(v=> (v && typeof v==='object') ? (v.nombre||'') : (typeof v==='string' ? v : ''));
      }
      if(!Array.isArray(entry.gram)){
        entry.gram = entry.gram ? [''] : [];
      } else {
        entry.gram = entry.gram.map(v=> (v && typeof v==='object') ? (v.nombre||'') : (typeof v==='string' ? v : ''));
      }
      if(!Array.isArray(entry.psicoExtra)){
        entry.psicoExtra = [];
      } else {
        entry.psicoExtra = entry.psicoExtra.map(v=> typeof v==='string' ? v : '');
      }
    });
  });
  if(!state.simulacros) state.simulacros = [];
  if(!Array.isArray(state.simulacrosPendientes)) state.simulacrosPendientes = [];
  if(!Array.isArray(state.clasesSyncPendiente)) state.clasesSyncPendiente = [];
  if(!state.simulacroCal) state.simulacroCal = {};
  // Migración: el antiguo calendario de simulacros marcaba los días con un simple true/false
  // (state.simulacroCal) y guardaba la nota del día suelta y aparte (state.notes), sin ninguna
  // conexión con las fichas de la pestaña Simulacros. Ahora cada día marcado es directamente
  // una ficha de state.simulacros (con su propia fecha), así que aquí convertimos, una sola vez,
  // cualquier día antiguo marcado en una ficha nueva (o la dejamos tal cual si ya existe).
  Object.keys(state.simulacroCal).forEach(mKey=>{
    const monthObj = state.simulacroCal[mKey] || {};
    Object.keys(monthObj).forEach(dStr=>{
      if(!monthObj[dStr]) return;
      const d = Number(dStr);
      const fecha = mKey+'-'+pad2(d);
      if(state.simulacros.some(s=> s.fecha===fecha)) return;
      const [my,mm] = mKey.split('-').map(Number);
      const notaAntigua = state.notes && state.notes['simnota-'+mKey+'-'+pad2(d)];
      state.simulacros.push({
        nombre: 'Simulacro '+pad2(d)+'/'+pad2(mm)+'/'+my,
        fecha: fecha,
        conocimientos: null, conAciertos: null, conFallos: null, conBlanco: null, ingles: null, psico: null, orto: null, gram: null, baremo: null,
        nota: notaAntigua || ''
      });
    });
  });
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
/* ===================== ACTUALIZACIÓN AUTOMÁTICA DE TODA LA APP =====================
   Cada vez que se guarda un dato (scheduleSave), al cabo de un momento se repintan solas todas las
   pestañas que dependen de él, sin tener que recargar la página:
   · La cabecera (cuenta atrás, racha, «Hoy»…) se repinta siempre.
   · Las pestañas que NO estás viendo se repintan en segundo plano (no molesta: están ocultas).
   · La pestaña que SÍ estás viendo se repinta solo cuando no estás escribiendo en un campo ni hay
     una ventana abierta; si no, espera a que termines (así no se pierde el foco ni lo que tecleas).
   Además, si guardas algo desde otro dispositivo (móvil ↔ ordenador), esta app lo recoge sola
   cada minuto y al volver a ella. */
let _vistasTimer = null;
const _tabsSucias = new Set();   // pestañas con datos cambiados que aún no se han repintado
let _refrescandoVistas = false;
const VISTAS_DEBOUNCE_MS = 350;
const VISTAS_REINTENTO_MS = 700;
function pestanaActiva(){
  const b = document.querySelector('.tab-btn.active');
  return b ? b.dataset.tab : 'calendario';
}
// ¿Está la persona escribiendo/eligiendo algo (o tiene una ventana abierta)? Si sí, no tocamos su pestaña.
function usuarioEditando(){
  if(document.querySelector('.modal-backdrop.open')) return true;
  const a = document.activeElement;
  return !!(a && a !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
function programarActualizacionVistas(){
  if(typeof _appStarted === 'undefined' || !_appStarted || _refrescandoVistas) return;
  Object.keys(RENDER_PESTANA).forEach(t=> _tabsSucias.add(t));
  clearTimeout(_vistasTimer);
  _vistasTimer = setTimeout(actualizarVistasAhora, VISTAS_DEBOUNCE_MS);
}
function scheduleSave(){
  programarActualizacionVistas();
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
  // Firestore no admite documentos de más de 1 MiB. Si nos pasamos, el guardado en la nube fallaría siempre
  // (y se reintentaría sin parar), así que no se intenta: los datos siguen a salvo en este dispositivo y se
  // avisa con claridad. En cuanto reduzcas el tamaño (o importes una copia más ligera) vuelve a guardar solo.
  const bytesPayload = bytesUtf8(payload);
  if(bytesPayload > DATOS_LIMITE){
    clearTimeout(saveRetryTimer);
    setSaveStatus('error', 'Datos demasiado grandes para la nube · exporta una copia');
    if(!_avisoTamanoMostrado){ _avisoTamanoMostrado = true; showToast('⛔ Tus datos superan el límite de la nube (1 MiB). Se guardan solo en este dispositivo. Mira Ajustes → Tamaño de tus datos.'); }
    return;
  }
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
    avisarSiDatosGrandes(bytesPayload);
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
    const today = hoyLocalISO();
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
        // Si en este momento estás escribiendo o tienes una ventana abierta, lo dejamos para la
        // siguiente comprobación (no se pierde: lastKnownUpdatedAt no cambia) y así no te cortamos.
        if(usuarioEditando()) return;
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
  banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--red,#b23b3b);color:#fff;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));font-family:var(--font-mono);font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;';
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
      <h3 style="color:var(--amber-ink);font-family:var(--font-display);margin-top:0;">PIN de acceso</h3>
      <p>Este planning está protegido con PIN. Introdúcelo para ver y editar tus datos en este dispositivo.</p>
      <label for="pinGateInput" style="display:block;font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">PIN</label>
      <input id="pinGateInput" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <button class="btn" id="pinGateBtn">Entrar</button>
      <div id="pinGateError" role="alert" style="color:var(--red-text);font-family:var(--font-mono);font-size:12px;margin-top:8px;min-height:14px;"></div>
      <p style="font-family:var(--font-mono);font-size:12px;color:var(--muted);margin-top:16px;line-height:1.5;">
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
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Cuenta</div>
    <div style="font-size:13px;margin-bottom:8px;word-break:break-all;">${firebaseUser.email || ''}</div>
    <div style="font-size:12px;margin-bottom:8px;color:${verificado?'var(--green)':'var(--cream-dim)'};">
      ${verificado ? '✓ Correo verificado' : 'Correo sin verificar todavía (revisa tu bandeja de entrada, incluida la de spam)'}
    </div>
    ${verificado ? '' : '<button class="btn ghost small" id="resendVerifyBtn" style="margin-bottom:8px;">Reenviar correo de verificación</button><div id="resendVerifyMsg" style="font-family:var(--font-mono);font-size:12px;color:var(--muted);min-height:14px;margin-bottom:8px;"></div>'}
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
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Seguridad</div>
    <div style="font-size:13px;margin-bottom:8px;">${has ? 'PIN activado en este planning.' : 'Sin PIN: cualquiera con el enlace puede ver y editar estos datos.'}</div>
    <label for="newPinInput" style="display:block;font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">${has?'Nuevo PIN':'Crear PIN'}</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <input id="newPinInput" type="password" inputmode="numeric" autocomplete="off" placeholder="Mín. 4 caracteres" style="flex:1;min-width:160px;padding:8px;font-family:var(--font-mono);background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;">
      <button class="btn ghost small" id="setPinBtn">${has?'Cambiar PIN':'Activar PIN'}</button>
      ${has ? '<button class="btn danger small" id="removePinBtn">Quitar PIN</button>' : ''}
    </div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--muted);line-height:1.5;">
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
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Tema</div>
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
/* ===================== TAMAÑO DE TUS DATOS (límite de Firestore) =====================
   Todo tu planning se guarda en UN solo documento de Firestore, y Firestore no admite documentos de más de
   1 MiB (1.048.576 bytes). Si se llegara a superar, la app dejaría de poder guardar en la nube. Esta caja
   mide cuánto ocupan tus datos (en bytes UTF-8, que es lo que cuenta Firestore: la «ñ» o una tilde
   ocupan 2) y avisa con tiempo. doSave() además se niega a intentar un guardado que sabe que va a fallar. */
const FIRESTORE_DOC_LIMIT = 1048576;
const FIRESTORE_DOC_MARGEN = 512;                          // nombre del documento, nombres de campo, updatedAt…
const DATOS_LIMITE = FIRESTORE_DOC_LIMIT - FIRESTORE_DOC_MARGEN;
const DATOS_AVISO = 0.75;                                  // a partir de aquí se avisa
function bytesUtf8(str){ return new TextEncoder().encode(str).length; }
function fmtKB(bytes){ return (bytes/1024).toFixed(bytes < 10*1024 ? 1 : 0).replace('.', ',') + ' KB'; }
const NOMBRES_SECCION = {
  months:'Calendario (meses y estados de día)', dayTicks:'Días marcados «NO completado»', notes:'Notas de cada tema',
  ticks:'Vueltas y notas de test', clases:'Clases (Conocimientos, Inglés…)', claseCal:'Calendario de clases',
  clasesPendientes:'Clases pendientes', notasPendientes:'Notas pendientes', simulacros:'Simulacros',
  simulacroCal:'Calendario de simulacros', marcas:'Marcas de entreno', entrenosLog:'Registro de entrenos',
  arrastreManual:'Arrastre manual', arrastreTestNotas:'Notas del test de arrastre', arrastreTestHecho:'Test de arrastre hecho',
  settings:'Ajustes'
};
function computeDataSize(){
  const payload = JSON.stringify(state);
  const total = bytesUtf8(payload);
  const partes = Object.keys(state).map(k=>({k, bytes: bytesUtf8(JSON.stringify(state[k]))})).sort((a,b)=> b.bytes - a.bytes);
  const pct = total / DATOS_LIMITE;
  const nivel = pct >= 1 ? 'superado' : (pct >= 0.9 ? 'peligro' : (pct >= DATOS_AVISO ? 'aviso' : 'ok'));
  return {total, limite: DATOS_LIMITE, pct, nivel, partes};
}
function renderDataSizeBox(){
  const host = document.getElementById('dataSizeBox');
  if(!host) return;
  const r = computeDataSize();
  const pctTxt = (r.pct*100 < 10 ? (r.pct*100).toFixed(1) : Math.round(r.pct*100)).toString().replace('.', ',');
  const claseBar = r.nivel === 'ok' ? '' : (r.nivel === 'aviso' ? 'aviso' : 'peligro');
  let msg;
  if(r.nivel === 'superado') msg = '⛔ Tus datos superan el límite de Firestore: ya no se pueden guardar en la nube (sí siguen guardándose en este dispositivo). Exporta una copia y reduce lo que más pesa, abajo.';
  else if(r.nivel === 'peligro') msg = '⚠️ Estás muy cerca del límite. Exporta una copia de seguridad y reduce lo que más pesa, abajo.';
  else if(r.nivel === 'aviso') msg = '⚠️ Ya usas más de las tres cuartas partes del límite. Conviene vigilar lo que más pesa, abajo.';
  else msg = '✓ Vas sobrado: tienes mucho margen para seguir apuntando notas.';
  const top = r.partes.slice(0, 5).map(x=>
    '<tr><td>'+(NOMBRES_SECCION[x.k] || x.k)+'</td><td>'+fmtKB(x.bytes)+' · '+Math.round(x.bytes/Math.max(1,r.total)*100)+' %</td></tr>').join('');
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Tamaño de tus datos</div>
    <div style="font-size:12px;color:var(--cream-dim);">Todo tu planning se guarda en un único documento de Firestore, que admite como máximo 1 MiB.</div>
    <div class="size-bar ${claseBar}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(r.pct*100))}" aria-label="Espacio usado del límite de la nube"><div style="width:${Math.min(100, r.pct*100).toFixed(1)}%"></div></div>
    <div style="font-family:var(--font-mono);font-size:13px;color:var(--cream);"><strong>${fmtKB(r.total)}</strong> de ${fmtKB(r.limite)} · ${pctTxt} %</div>
    <div class="size-msg ${claseBar}">${msg}</div>
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);">Lo que más ocupa:</div>
    <table class="size-parts"><tbody>${top}</tbody></table>`;
}
let _avisoTamanoMostrado = false;
// Se llama al guardar: avisa (una vez por sesión) si te acercas al límite.
function avisarSiDatosGrandes(total){
  if(_avisoTamanoMostrado) return;
  if(total / DATOS_LIMITE >= DATOS_AVISO){
    _avisoTamanoMostrado = true;
    showToast('⚠️ Tus datos ocupan el '+Math.round(total/DATOS_LIMITE*100)+' % del límite de la nube. Mira Ajustes → Tamaño de tus datos.');
  }
}

function renderBackupBox(){
  const host = document.getElementById('backupBox');

  if(!host) return;
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Copia de seguridad</div>
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
  const today = hoyLocalISO();
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
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Copias automáticas en la nube</div>
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
      <h3 style="color:var(--amber-ink);font-family:var(--font-display);margin-top:0;">Falta configurar Firebase</h3>
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
      <h3 id="authTitle" style="color:var(--amber-ink);font-family:var(--font-display);margin-top:0;">Iniciar sesión</h3>
      <label for="authEmail" style="display:block;font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">Correo electrónico</label>
      <input id="authEmail" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <label for="authPassword" style="display:block;font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);text-transform:uppercase;margin-bottom:4px;">Contraseña</label>
      <input id="authPassword" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres" style="width:100%;padding:10px;font-family:var(--font-mono);
        background:var(--bg-panel-2);border:1px solid var(--line);color:var(--cream);border-radius:2px;margin-bottom:10px;">
      <div id="authError" role="alert" style="color:var(--red-text);font-family:var(--font-mono);font-size:12px;margin-bottom:10px;min-height:14px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="authSubmitBtn">Entrar</button>
        <button class="btn ghost" id="authToggleModeBtn">Crear cuenta nueva</button>
      </div>
      <div style="margin-top:12px;">
        <button class="btn ghost small" id="authForgotBtn" style="font-size:12px;">¿Olvidaste tu contraseña?</button>
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
      <h3 style="color:var(--amber-ink);font-family:var(--font-display);margin-top:0;">Cuenta pendiente de aprobación</h3>
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
  const titleHtml = '<div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Panel de administración</div>';
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
      tag.style.cssText = 'margin-left:6px;font-family:var(--font-mono);font-size:12px;font-weight:700;border-radius:8px;padding:1px 5px;';
      tag.className = 'tag-leve';
      info.appendChild(tag);
    }
    // "emailVerificado" lo escribe cada cuenta sobre sí misma en cuanto inicia sesión (ver
    // syncEmailVerifiedFlag), reflejando si ya pulsó el enlace del correo de verificación.
    // Es solo informativo para ayudarte a decidir si aprobar o no: no bloquea nada por sí solo.
    if(esPendiente){
      const tag = document.createElement('span');
      const verificado = c.emailVerificado === true;
      tag.textContent = verificado ? '✓ correo verificado' : 'correo sin verificar';
      tag.style.cssText = 'margin-left:6px;font-family:var(--font-mono);font-size:12px;font-weight:700;border-radius:8px;padding:1px 5px;' +
        (verificado ? '' : 'background:var(--bg-panel-2);color:var(--cream-dim);border:1px solid var(--line);');
      if(verificado) tag.className = 'tag-leve';
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
    label.style.cssText = 'font-size:12px;color:var(--red-text);text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px;';
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
    label.style.cssText = 'font-size:12px;color:var(--green-ink);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;';
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

  // El "key" que se añade aquí a cada tema/leve resuelto es el mismo identificador que usan
  // renderBlocks/renderLeves para guardar sus vueltas y notas (state.ticks[key]); así el
  // calendario puede escribir directamente en el mismo sitio que lee la pestaña Temario y
  // notas (y, por tanto, la pestaña Progreso), sin duplicar nada.
  function resolveTema(t, bloque, idx){
    if(t.type==='armas_explosivos'){
      const turn = carry.azulCount[bloque];
      const esArmas = (turn%2===0);
      return {nombre:esArmas?t.armas:t.explosivos, clase:t.clase, color:t.color, rotKey:'arm-'+bloque, key:'b'+bloque+'-'+idx+'-'+(esArmas?'armas':'explosivos')};
    }
    return {nombre:t.nombre, clase:t.clase, color:t.color, key:'b'+bloque+'-'+idx};
  }
  function resolveLeve(idx){
    const item = LEVES[idx];
    if(item.type==='l39_l40'){
      const turn = carry.leveAppear[idx];
      const esL39 = (turn%2===0);
      return {nombre:esL39?item.l39:item.l40, clase:item.clase, key:'leve-'+idx+'-'+(esL39?'l39':'l40')};
    }
    return {nombre:item.nombre, clase:item.clase, key:'leve-'+idx};
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
        entry.temasDelDia = rawTemas.map((t,idx)=>resolveTema(t, entry.bloque, idx));
      } else {
        entry.color = (carry.blockTurn[entry.bloque] % 2 === 0) ? 'azul' : 'morado';
        // Ojo: el índice hay que calcularlo ANTES de filtrar por color, porque el "key" de
        // cada tema (b{bloque}-{idx}) tiene que coincidir con el índice que usa renderBlocks
        // sobre el array completo b.temas, no con la posición dentro del subconjunto filtrado.
        const rawTemas = BLOCKS[entry.bloque].temas
          .map((t,idx)=>({t,idx}))
          .filter(o=>o.t.color===entry.color);
        entry.temasDelDia = rawTemas.map(o=>resolveTema(o.t, entry.bloque, o.idx));
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

/* ===================== RENDER: NAV MESES ===================== */
function renderMonthBar(){
  const bar = document.getElementById('monthBar');
  const keys = sortedMonthKeys();
  if(!currentMonthKey || !keys.includes(currentMonthKey)){
    currentMonthKey = keys.length ? keys[keys.length-1] : null;
  }
  bar.innerHTML = '';
  const controls = document.createElement('div');
  controls.className = 'month-controls';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'icon-btn'; prevBtn.textContent = '‹'; prevBtn.setAttribute('aria-label','Anterior'); prevBtn.title = 'Anterior';
  prevBtn.onclick = ()=>{ const i = keys.indexOf(currentMonthKey); if(i>0){ currentMonthKey = keys[i-1]; renderAll(); } };
  controls.appendChild(prevBtn);

  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Cambiar de mes');
  keys.forEach(k=>{
    const [y,m] = k.split('-').map(Number);
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = MESES[m-1]+' '+y;
    if(k===currentMonthKey) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ currentMonthKey = sel.value; renderAll(); };
  controls.appendChild(sel);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'icon-btn'; nextBtn.textContent = '›'; nextBtn.setAttribute('aria-label','Siguiente'); nextBtn.title = 'Siguiente';
  nextBtn.onclick = ()=>{ const i = keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey = keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);

  bar.appendChild(controls);

  const rightControls = document.createElement('div');
  rightControls.className = 'month-controls';

  if(currentMonthKey){
    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger small';
    delBtn.textContent = 'Eliminar mes';
    delBtn.onclick = ()=>{
      if(confirm('¿Eliminar el mes '+currentMonthKey+' y todos sus datos de días? Esto no borra las notas del temario.')){
        delete state.months[currentMonthKey];
        currentMonthKey = null;
        invalidatePlan();
        scheduleSave();
        renderAll();
      }
    };
    rightControls.appendChild(delBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn ghost small';
    editBtn.textContent = 'Editar mes';
    editBtn.onclick = openEditMonthModal;
    rightControls.appendChild(editBtn);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+ Añadir mes';
  addBtn.onclick = openAddMonthModal;
  rightControls.appendChild(addBtn);

  bar.appendChild(rightControls);

  const unifyHost = document.getElementById('unifyBar');
  unifyHost.innerHTML = '';
  if(currentMonthKey){
    const unifyBar = document.createElement('div');
    unifyBar.className = 'month-bar';
    unifyBar.style.marginTop = '8px';
    unifyBar.style.flexWrap = 'wrap';
    unifyBar.style.gap = '8px';

    const uf = state.settings.unifyFromDate; // "YYYY-MM-DD" o null
    const ufMonth = uf ? uf.slice(0,7) : null;
    const ufDay = uf ? parseInt(uf.slice(8,10),10) : null;
    const fullyActiveThisMonth = !!(ufMonth && currentMonthKey > ufMonth);
    const partiallyActiveThisMonth = !!(ufMonth && ufMonth === currentMonthKey);
    const isActiveHere = fullyActiveThisMonth || partiallyActiveThisMonth;

    const info = document.createElement('span');
    info.style.fontFamily = 'var(--font-mono)';
    info.style.fontSize = '11px';
    info.style.color = 'var(--cream-dim)';
    if(uf){
      const [uy,um,ud] = uf.split('-').map(Number);
      let estado;
      if(fullyActiveThisMonth) estado = ' — activo en todo este mes';
      else if(partiallyActiveThisMonth) estado = ' — activo desde el día ' + ud + ' de este mes';
      else estado = ' — aún no llega a este mes';
      info.textContent = 'Modo repaso final (azul+morado juntos) activo desde el ' + ud + ' de ' + MESES[um-1] + ' ' + uy + estado;
    } else {
      info.textContent = 'Modo repaso final desactivado (bloques divididos en azul/morado).';
    }
    unifyBar.appendChild(info);

    // Selector de día dentro del mes visible, para fijar o mover el inicio.
    const [cy, cm] = currentMonthKey.split('-').map(Number);
    const nDaysThisMonth = daysInMonth(cy, cm);
    const daySel = document.createElement('select');
    daySel.className = 'status-select';
    daySel.style.width = 'auto';
    daySel.setAttribute('aria-label','Día para activar el modo repaso final');
    for(let d=1; d<=nDaysThisMonth; d++){
      const opt = document.createElement('option');
      opt.value = String(d);
      opt.textContent = 'Día ' + d;
      daySel.appendChild(opt);
    }
    daySel.value = String(partiallyActiveThisMonth ? ufDay : 1);
    unifyBar.appendChild(daySel);

    const setBtn = document.createElement('button');
    setBtn.className = 'btn ghost small';
    setBtn.textContent = uf ? 'Mover inicio a este día' : 'Activar desde este día';
    setBtn.onclick = ()=>{
      const d = parseInt(daySel.value, 10);
      state.settings.unifyFromDate = currentMonthKey + '-' + pad2(d);
      invalidatePlan(); // afecta potencialmente a cualquier mes, recalculo completo
      scheduleSave();
      renderAll();
    };
    unifyBar.appendChild(setBtn);

    if(uf){
      const deactivateBtn = document.createElement('button');
      deactivateBtn.className = 'btn danger small';
      deactivateBtn.textContent = 'Desactivar modo repaso final';
      deactivateBtn.onclick = ()=>{
        if(confirm('Esto desactivará la unificación de colores en todos los meses. ¿Continuar?')){
          state.settings.unifyFromDate = null;
          invalidatePlan();
          scheduleSave();
          renderAll();
        }
      };
      unifyBar.appendChild(deactivateBtn);
    }

    unifyHost.appendChild(unifyBar);
  }
}

function renderLegend(){
  const el = document.getElementById('legend');
  el.innerHTML = `
    <span><i style="background:var(--red)"></i>Bloque grave</span>
    <span><i style="background:var(--amber)"></i>Bloque menos grave</span>
    <span><i style="background:#D0E0E3"></i>Grupo azul</span>
    <span><i style="background:#EAD1DC"></i>Grupo morado</span>
    <span><i style="background:var(--amber)"></i>Unificado (repaso final)</span>
    <span><i style="background:var(--green)"></i>Leve</span>
    <span><i style="background:var(--blue)"></i>Inglés</span>
    <span><i style="background:#7a5c9c"></i>Psicotécnico</span>
    <span><i style="background:#a9531d"></i>Entreno</span>
    <span><i style="background:#6b7368"></i>Orto-grama</span>
  `;
}

// Tablón de notas pendientes del calendario principal: mismo concepto que el tablón de
// "Clases pendientes" de la pestaña Clases, pero para apuntes/cosas sueltas en vez de
// temas concretos. Se cargan aquí de antemano y, al abrir un día del calendario, se pueden
// añadir directamente a las notas de ese día (desapareciendo de este tablón).
function renderNotasPendientes(){
  const host = document.getElementById('notasPendientesHost');
  if(!host) return;
  if(!Array.isArray(state.notasPendientes)) state.notasPendientes = [];
  renderAccordionSection(host, 'notasPendientes', 'Notas pendientes (tablón)', (body)=>{
    const intro = document.createElement('div'); intro.className='sub'; intro.style.marginBottom='12px';
    intro.textContent = 'Apunta aquí cosas sueltas que tengas pendientes (dudas, tareas, recordatorios…) sin saber todavía qué día vas a resolverlas. Al abrir un día del calendario podrás añadir cualquiera de estas notas directamente a ese día, y desaparecerá de aquí.';
    body.appendChild(intro);

    const formHost = document.createElement('div');
    body.appendChild(formHost);

    const listHost = document.createElement('div'); listHost.style.marginTop = '16px';
    body.appendChild(listHost);

    function refreshList(){
      listHost.innerHTML = '';
      const list = state.notasPendientes.slice().sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
      if(!list.length){
        const empty = document.createElement('div'); empty.className='clase-multi-empty';
        empty.textContent = 'No tienes ninguna nota pendiente apuntada.';
        listHost.appendChild(empty);
        return;
      }
      const todayISO = hoyLocalISO();
      const chips = document.createElement('div'); chips.className='clase-multi-chips';
      list.forEach(p=>{
        const isFuture = !!(p.disponibleDesde && p.disponibleDesde > todayISO);
        const chip = document.createElement('span'); chip.className='clase-multi-chip'+(isFuture?' future':'');
        let txt = p.texto;
        if(p.disponibleDesde) txt += ' · '+(isFuture ? 'disponible desde ' : 'desde ')+formatFechaEs(p.disponibleDesde);
        chip.appendChild(document.createTextNode(txt));
        const del = document.createElement('button'); del.type='button'; del.textContent='×';
        del.title = 'Quitar de pendientes'; del.setAttribute('aria-label','Quitar de pendientes: '+txt);
        del.onclick = ()=>{
          const i = state.notasPendientes.findIndex(x=>x.id===p.id);
          if(i>-1) state.notasPendientes.splice(i,1);
          scheduleSave();
          refreshList();
        };
        chip.appendChild(del);
        chips.appendChild(chip);
      });
      listHost.appendChild(chips);
    }
    refreshList();

    renderNotaPendienteForm(formHost, refreshList);
  });
}
// Formulario paso a paso (más sencillo que el de las clases, aquí no hay materia ni tema)
// para añadir una nota al tablón de pendientes: "¿Qué quieres apuntar?" → "¿A partir de
// qué fecha estará disponible?" → guardar, con opción de encadenar varias seguidas.
function renderNotaPendienteForm(container, onSaved){
  function clearC(){ container.innerHTML = ''; }
  function addBackBtn(wrap, label, fn){
    const back = document.createElement('button');
    back.type='button'; back.className='clase-quiz-back'; back.textContent = label || '← Atrás';
    back.onclick = fn;
    wrap.appendChild(back);
  }

  function stepTexto(){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Nueva nota pendiente';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Qué quieres apuntar?';
    wrap.appendChild(q);
    const ta = document.createElement('textarea'); ta.className='note-inline';
    ta.placeholder = 'p. ej. "Preguntar por la revisión del tema 5"';
    wrap.appendChild(ta);
    const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='10px';
    nextBtn.textContent = 'Continuar';
    nextBtn.onclick = ()=>{
      if(!ta.value.trim()) return;
      stepDisponible(ta.value.trim());
    };
    wrap.appendChild(nextBtn);
    container.appendChild(wrap);
  }

  function stepDisponible(texto){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent=texto;
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿A partir de qué fecha estará disponible?';
    wrap.appendChild(q);
    const hint = document.createElement('div'); hint.className='clase-quiz-or'; hint.textContent='Déjalo en blanco si ya está disponible ahora mismo.';
    wrap.appendChild(hint);
    const dateInp = document.createElement('input'); dateInp.type='date'; dateInp.className='clase-quiz-text-input';
    wrap.appendChild(dateInp);
    const saveBtn = document.createElement('button'); saveBtn.type='button'; saveBtn.className='btn'; saveBtn.style.marginTop='10px';
    saveBtn.textContent = 'Guardar en pendientes';
    saveBtn.onclick = ()=> guardar(texto, dateInp.value || null);
    wrap.appendChild(saveBtn);
    addBackBtn(wrap, '← Atrás', stepTexto);
    container.appendChild(wrap);
  }

  function guardar(texto, disponibleDesde){
    state.notasPendientes.push({
      id: Date.now()+'-'+Math.random(),
      texto,
      disponibleDesde: disponibleDesde || null
    });
    scheduleSave();
    onSaved();
    stepConfirm(texto);
  }

  function stepConfirm(texto){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const confirmBox = document.createElement('div'); confirmBox.className='clase-quiz-confirm';
    const okQ = document.createElement('div'); okQ.className='clase-quiz-question'; okQ.textContent='✓ Añadida a pendientes';
    confirmBox.appendChild(okQ);
    const detail = document.createElement('div'); detail.className='clase-quiz-progress'; detail.textContent = texto;
    confirmBox.appendChild(detail);
    wrap.appendChild(confirmBox);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Añadir otra nota pendiente?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí, añadir otra';
    yesBtn.onclick = ()=> stepTexto();
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt'; noBtn.textContent='No, he terminado';
    noBtn.onclick = ()=> stepTexto();
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);
    container.appendChild(wrap);
  }

  stepTexto();
}

/* ===================== RENDER: CALENDARIO ===================== */
function renderCalendar(){
  if(typeof calViewMode !== 'undefined' && calViewMode === 'list') renderCalendarList();
  else renderCalendarGrid();
  renderHomeDash();
  renderArrastre();
  // El calendario "todo incluido" es un reflejo de los otros tres: cada vez que cambia
  // alguno, se repinta también (salvo dentro de renderAll, que ya lo pinta él).
  if(!_renderAllEnCurso) renderTodoCalendar();
}
/* Construye el bloque de tareas de un día (bloque, leve, inglés, entreno, psico, orto).
   Se reutiliza tanto en la vista de rejilla como en la vista de lista/agenda. */
function buildTasksBlock(d, info, compact){
  const tasks = document.createElement('div');
  tasks.className = 'cal-tasks';
  const dticks = info.ticks || {};
  const bloqueTxt = 'B'+info.bloque+' · '+info.color.toUpperCase();
  // En modo compacto (rejilla) solo mostramos el número de tema, sin el articulado,
  // para que la celda no se llene de texto; el detalle completo sigue disponible
  // al pulsar el día (modal) y en la vista de lista.
  const temasTxt = compact
    ? info.temasDelDia.map(t=> t.clase || t.nombre).join('; ')
    : info.temasDelDia.map(t=> t.clase ? (t.clase+' ('+t.nombre+')') : t.nombre ).join(', ');
  tasks.appendChild(taskRow(bloqueTxt, temasTxt, info.bloqueTipo==='grave'?'tag-grave':'tag-mgrave', {monthKey:currentMonthKey, day:d, stream:'bloque', checked:dticks.bloque}));
  tasks.appendChild(taskRow('LEVE', 'Leve '+info.leveNum+' · '+info.leveInfo.nombre, 'tag-leve', {monthKey:currentMonthKey, day:d, stream:'leve', checked:dticks.leve}));
  tasks.appendChild(taskRow('ING', 'Tema '+info.inglesNum, 'tag-ing', {monthKey:currentMonthKey, day:d, stream:'ingles', checked:dticks.ingles}));
  if(info.entreno) tasks.appendChild(taskRow('FÍS', 'Entreno', 'tag-entreno', {monthKey:currentMonthKey, day:d, stream:'entreno', checked:dticks.entreno}));
  if(info.psico) tasks.appendChild(taskRow('PSI', info.psico, 'tag-psico', {monthKey:currentMonthKey, day:d, stream:'psico', checked:dticks.psico}));
  tasks.appendChild(taskRow('ORT', 'Orto-grama', 'tag-orto', {monthKey:currentMonthKey, day:d, stream:'orto', checked:dticks.orto}));
  // Test de arrastre: no tiene "tarea pendiente" (no sigue el sistema de vueltas ni el de
  // "marcar como NO completado"), así que solo se muestra como aviso cuando ya hay una nota
  // guardada ese día — igual que la vista previa de la nota de texto, justo debajo.
  const fechaISOtb = currentMonthKey+'-'+pad2(d);
  const arrastreTestVal = state.arrastreTestNotas ? state.arrastreTestNotas[fechaISOtb] : undefined;
  if(arrastreTestVal !== undefined && arrastreTestVal !== null){
    const arrRow = document.createElement('div');
    arrRow.className = 'task-row day-note-preview';
    arrRow.innerHTML = '<span class="tag tag-nota">TEST ARR.</span><span class="task-txt">Nota: '+arrastreTestVal+'/10</span>';
    tasks.appendChild(arrRow);
  }
  const noteTxt = state.notes[dayNoteKey(currentMonthKey, d)];
  if(noteTxt){
    const noteRow = document.createElement('div');
    noteRow.className = 'task-row day-note-preview';
    const preview = noteTxt.length>34 ? noteTxt.slice(0,34)+'…' : noteTxt;
    noteRow.innerHTML = '<span class="tag tag-nota">NOTA</span><span class="task-txt">'+preview.replace(/</g,'&lt;')+'</span>';
    tasks.appendChild(noteRow);
  }
  return tasks;
}
/* Calcula cuántas tareas del día están pendientes (tick = NO completado).
   Devuelve null en días que no son de estudio. */
function dayCompletionInfo(info){
  if(info.status !== 'ESTUDIO') return null;
  const dticks = info.ticks || {};
  const streams = ['bloque','leve','ingles','orto'];
  if(info.entreno) streams.push('entreno');
  if(info.psico) streams.push('psico');
  const pending = streams.filter(s=> dticks[s]).length;
  return {total:streams.length, pending};
}
/* Racha de días de estudio completados seguidos, a DÍA VENCIDO: se cuenta hacia
   atrás empezando por AYER, así que el día que está corriendo no suma hasta que
   termina (igual que el test de arrastre). Los días de descanso/trabajo/sin
   horario se saltan sin romper la racha. */
function computeRacha(plan){
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate()-1); // empezamos en ayer: hoy todavía no cuenta
  let streak = 0, guard = 0;
  while(guard++ < 3650){
    const mk = d.getFullYear()+'-'+pad2(d.getMonth()+1);
    const monthPlan = plan[mk];
    const info = monthPlan ? monthPlan[d.getDate()] : null;
    if(!info) break;
    if(info.status === 'ESTUDIO'){
      const comp = dayCompletionInfo(info);
      const done = comp && comp.pending === 0;
      if(done) streak++;
      else break;
    }
    d.setDate(d.getDate()-1);
  }
  return streak;
}
/* Fecha del examen y días restantes. Si has fijado una fecha propia (botón «Cambiar fecha» de la
   cuenta atrás, state.settings.examDate = "YYYY-MM-DD") se usa esa; si no, la estimada: el próximo 10 de julio. */
function nextExamInfo(){
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let examDate = null, personalizada = false;
  const custom = (typeof state !== 'undefined' && state && state.settings) ? state.settings.examDate : null;
  if(typeof custom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(custom)){
    const parts = custom.split('-').map(Number);
    const dt = new Date(parts[0], parts[1]-1, parts[2]);
    if(!isNaN(dt.getTime())){ examDate = dt; personalizada = true; }
  }
  if(!examDate){
    let year = now.getFullYear();
    const thisYearExam = new Date(year, 6, 10);
    if(now > thisYearExam) year++;
    examDate = new Date(year, 6, 10);
  }
  const daysLeft = Math.round((examDate - today0) / 86400000);
  const iso = examDate.getFullYear()+'-'+pad2(examDate.getMonth()+1)+'-'+pad2(examDate.getDate());
  return {year:examDate.getFullYear(), daysLeft:daysLeft, iso:iso, personalizada:personalizada,
          etiqueta: examDate.getDate()+' '+MESES[examDate.getMonth()].slice(0,3).toLowerCase()+' '+examDate.getFullYear()};
}
/* Panel superior: cuenta atrás, racha y resumen del día de hoy. */
function renderHomeDash(){
  const el = document.getElementById('homeDash');
  if(!el) return;
  const plan = computePlan();
  const now = new Date();
  const todayKey = now.getFullYear()+'-'+pad2(now.getMonth()+1);
  const todayInfo = (plan[todayKey] && plan[todayKey][now.getDate()]) || null;

  const exam = nextExamInfo();
  const racha = computeRacha(plan);

  let resumenHtml;
  let entrenoHoy = false;
  if(todayInfo && todayInfo.status === 'ESTUDIO'){
    const temasTxt = todayInfo.temasDelDia.map(t=> t.clase ? t.clase : t.nombre).join(', ');
    const parts = [
      'Bloque '+todayInfo.bloque+' ('+todayInfo.color+'): '+temasTxt,
      'Leve '+todayInfo.leveNum+': '+todayInfo.leveInfo.nombre,
      'Inglés tema '+todayInfo.inglesNum
    ];
    if(todayInfo.entreno){ parts.push('Entreno físico'); entrenoHoy = true; }
    if(todayInfo.psico) parts.push('Psicotécnico: '+todayInfo.psico);
    parts.push('Orto-grama');
    const comp = dayCompletionInfo(todayInfo);
    const doneTxt = comp ? (comp.pending===0 ? 'Día completo ✓' : comp.pending+' tarea'+(comp.pending>1?'s':'')+' pendiente'+(comp.pending>1?'s':'')) : '';
    resumenHtml = '<ul class="home-today-list">'+parts.map(p=>'<li>'+p.replace(/</g,'&lt;')+'</li>').join('')+'</ul>'+
      (doneTxt ? '<div class="home-today-status">'+doneTxt+'</div>' : '')+
      (entrenoHoy ? '<button class="btn small ghost" id="homeEntrenoBtn" style="margin-top:8px;">Ver entreno sugerido →</button>' : '');
  } else if(todayInfo){
    const lbl = todayInfo.status==='DESCANSO' ? 'Descanso' : todayInfo.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    resumenHtml = '<div class="home-today-status">Hoy: '+lbl+'</div>';
  } else {
    resumenHtml = '<div class="home-today-status">Sin plan para hoy todavía.</div>';
  }

  // La racha va a día vencido: hoy no suma hasta que el día termine.
  let rachaNota = '';
  if(todayInfo && todayInfo.status === 'ESTUDIO'){
    const compHoy = dayCompletionInfo(todayInfo);
    rachaNota = (compHoy && compHoy.pending === 0)
      ? '<div class="home-card-note">Hoy ya está completo · sumará mañana.</div>'
      : '<div class="home-card-note">Lo de hoy suma mañana, cuando el día termine.</div>';
  }

  const arrastrePools = computeArrastreData();
  const arrastreTotal = arrastreItemsCount(arrastrePools);
  // Aviso: el arrastre cuenta a día vencido, así que lo de hoy todavía no está en la lista.
  const arrastreNota = (todayInfo && todayInfo.status==='ESTUDIO')
    ? '<div class="home-card-note">Lo de hoy se suma mañana, cuando el día termine.</div>'
    : '';
  const arrastreEstado = (todayInfo && todayInfo.status==='ESTUDIO')
    ? (arrastreTestHechoDe(todayISO())
        ? '<div class="home-arrastre-status ok">✓ Test de hoy hecho</div>'
        : '<div class="home-arrastre-status pend">● Test de hoy pendiente</div>')
    : '';
  const arrastreHtml = arrastreEstado + (arrastreTotal
    ? '<div class="home-card-value" style="font-size:22px;">'+arrastreTotal+' tema'+(arrastreTotal!==1?'s':'')+'</div>'+
      '<div class="home-card-sub">para meter hoy en tu test de arrastre</div>'+
      arrastreNota+
      '<button class="btn small ghost" id="homeArrastreBtn" style="margin-top:8px;">Ver qué temas son →</button>'
    : '<div class="home-card-sub">Todavía no hay temas acumulados en ninguna vuelta abierta.</div>'+
      arrastreNota+
      '<button class="btn small ghost" id="homeArrastreBtn" style="margin-top:8px;">Abrir Arrastre →</button>');

  // Clases (academia) que tocan hoy, según el Calendario de clases.
  const todayMonthKey = now.getFullYear()+'-'+pad2(now.getMonth()+1);
  const todayDay = now.getDate();
  const claseEntry = (state.claseCal[todayMonthKey] && state.claseCal[todayMonthKey][todayDay]) || {};
  const todaySyncPend = (state.clasesSyncPendiente||[]).filter(x=> x.fecha === (todayMonthKey+'-'+pad2(todayDay))).length;
  const clasesHoyHtml = '<div class="home-clases-pills">'+buildClasePillsHTML(claseEntry, 40)+'</div>'+
    (todaySyncPend ? '<div class="home-card-note">Se marcará'+(todaySyncPend!==1?'n':'')+' como vista'+(todaySyncPend!==1?'s':'')+' en la pestaña Clases cuando termine hoy.</div>' : '')+
    '<button class="btn small ghost" id="homeClasesBtn" style="margin-top:8px;">Ir a Clases →</button>';

  // Simulacro (calendario de simulacros) de hoy, si lo hay, más aviso de pendientes por colocar.
  const todayFecha = todayMonthKey+'-'+pad2(todayDay);
  const simHoy = typeof buscarSimulacroPorFecha==='function' ? buscarSimulacroPorFecha(todayFecha) : null;
  const simPendCount = (state.simulacrosPendientes||[]).length;
  let simHoyHtml;
  if(simHoy){
    simHoyHtml = '<div class="home-clases-pills">'+simCalPillsHTML(simHoy)+'</div>'+
      '<button class="btn small ghost" id="homeSimBtn" style="margin-top:8px;">Ir al calendario de simulacros →</button>';
  } else {
    simHoyHtml = '<div class="home-today-status">Hoy no toca simulacro.</div>'+
      (simPendCount ? '<div class="home-card-note">'+simPendCount+' simulacro'+(simPendCount!==1?'s':'')+' pendiente'+(simPendCount!==1?'s':'')+' de colocar en el calendario.</div>' : '')+
      '<button class="btn small ghost" id="homeSimBtn" style="margin-top:8px;">Ir al calendario de simulacros →</button>';
  }

  el.innerHTML =
    '<div class="home-card"><div class="home-card-label">Cuenta atrás</div>'+
      (exam.daysLeft >= 0
        ? '<div class="home-card-value">'+exam.daysLeft+'</div>'+
          '<div class="home-card-sub">'+(exam.daysLeft===1?'día':'días')+' para el examen ('+exam.etiqueta+')</div>'
        : '<div class="home-card-value">—</div>'+
          '<div class="home-card-sub">La fecha del examen ('+exam.etiqueta+') ya pasó</div>')+
      '<button type="button" class="home-exam-edit" id="homeExamEditBtn">✏️ Cambiar fecha</button></div>'+
    '<div class="home-card home-card-compact"><div class="home-card-label">Racha</div>'+
      '<div class="home-card-value">'+racha+'</div>'+
      '<div class="home-card-sub">'+(racha===1?'día seguido':'días seguidos')+'</div></div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">Hoy</div>'+resumenHtml+'</div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">🏫 Clases de hoy</div>'+clasesHoyHtml+'</div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">🎯 Simulacro de hoy</div>'+simHoyHtml+'</div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">📋 Test de arrastre de hoy</div>'+arrastreHtml+'</div>';

  const examEditBtn = document.getElementById('homeExamEditBtn');
  if(examEditBtn) examEditBtn.onclick = openExamDateModal;

  const arrastreBtn = document.getElementById('homeArrastreBtn');
  if(arrastreBtn) arrastreBtn.onclick = ()=>{
    const tabBtn = document.querySelector('.tab-btn[data-tab="arrastre"]');
    if(tabBtn) tabBtn.click();
  };

  const clasesBtn = document.getElementById('homeClasesBtn');
  if(clasesBtn) clasesBtn.onclick = ()=>{
    const tabBtn = document.querySelector('.tab-btn[data-tab="clases"]');
    if(tabBtn) tabBtn.click();
  };

  const simBtn = document.getElementById('homeSimBtn');
  if(simBtn) simBtn.onclick = ()=>{
    const tabBtn = document.querySelector('.tab-btn[data-tab="calendario"]');
    if(tabBtn) tabBtn.click();
    if(typeof setCalSelectorMode==='function') setCalSelectorMode('simulacros');
  };

  const entrenoBtn = document.getElementById('homeEntrenoBtn');
  if(entrenoBtn) entrenoBtn.onclick = ()=>{
    const tabBtn = document.querySelector('.tab-btn[data-tab="entrenos"]');
    if(tabBtn) tabBtn.click();
    entrenoAyudaOpen = true;
    renderEntrenos();
  };
}
/* Indicador visual: ✓ verde si el día está 100% completo, o un número en rojo
   con la cantidad de tareas pendientes, para verlo de un vistazo sin abrir el día. */
function dayCompletionBadge(info){
  const comp = dayCompletionInfo(info);
  if(!comp) return null;
  const badge = document.createElement('span');
  if(comp.pending===0){
    badge.className = 'day-status-badge complete';
    badge.textContent = '✓';
    badge.title = 'Día completo: todas las tareas hechas';
  } else {
    badge.className = 'day-status-badge pending';
    badge.textContent = String(comp.pending);
    badge.title = comp.pending+' tarea'+(comp.pending>1?'s':'')+' pendiente'+(comp.pending>1?'s':'');
  }
  badge.setAttribute('aria-label', badge.title);
  return badge;
}
/* Firma corta y barata de calcular que identifica el contenido visible de un día.
   Se usa para saber si hace falta reconstruir su nodo DOM o si podemos dejarlo tal
   cual estaba (evita repintar los ~28-31 días del mes por cada tick que se marca). */
function dayRenderSig(info, dayStatusRaw, isToday, noteTxt){
  return JSON.stringify(info) + '|' + dayStatusRaw + '|' + (isToday?1:0) + '|' + (noteTxt||'').length + ':' + (noteTxt||'').slice(0,20);
}
function buildCalGridCell(y, m, d, info, daysData, isToday){
  const cell = document.createElement('div');
  cell.className = 'cal-cell status-'+info.status;
  if(isToday){ cell.classList.add('today'); cell.id = 'todayCell'; }

  const numRow = document.createElement('div');
  numRow.className = 'cal-daynum';
  const wdName = DOW_SHORT[(info.dow===0?6:info.dow-1)];
  const leftWrap = document.createElement('span'); leftWrap.className='cal-daynum-left';
  const dnSpan = document.createElement('span'); dnSpan.textContent = d;
  leftWrap.appendChild(dnSpan);
  const badge = dayCompletionBadge(info);
  if(badge) leftWrap.appendChild(badge);
  numRow.appendChild(leftWrap);
  const wdSpan = document.createElement('span'); wdSpan.className='wd'; wdSpan.textContent = wdName;
  numRow.appendChild(wdSpan);
  cell.appendChild(numRow);

  const statusSel = document.createElement('select');
  statusSel.className = 'status-select';
  statusSel.setAttribute('aria-label','Estado del día '+d);
  ['ESTUDIO','DESCANSO','TRABAJO','DESCONOCIDO'].forEach(opt=>{
    const o = document.createElement('option'); o.value = opt;
    o.textContent = opt==='ESTUDIO' ? 'Estudio' : opt==='DESCANSO' ? 'Descanso' : opt==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    if((daysData[d]||'ESTUDIO')===opt) o.selected = true;
    statusSel.appendChild(o);
  });
  // El desplegable de estado no debe abrir el día al tocarlo.
  statusSel.onclick = (e)=> e.stopPropagation();
  statusSel.onchange = ()=>{
    if(statusSel.value==='ESTUDIO') delete daysData[d];
    else daysData[d] = statusSel.value;
    invalidatePlan(currentMonthKey);
    scheduleSave();
    renderCalendar();
  };
  cell.appendChild(statusSel);

  if(info.status === 'ESTUDIO'){
    const tasks = buildTasksBlock(d, info, true);
    cell.appendChild(tasks);
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'off-label';
    lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    cell.appendChild(lbl);
  }
  // Se abre el día entero, sea del tipo que sea: también en descanso, trabajo o sin
  // horario, para poder ponerles notas, clases o simulacro como a cualquier otro día.
  cell.style.cursor = 'pointer';
  cell.onclick = ()=> openDayModal(d, info);
  return cell;
}
/* Caché del último render de la vista rejilla, para poder diferenciar día a día
   en la siguiente llamada en vez de tirar y reconstruir todo el mes. */
let _calGridCache = null; // { monthKey, nDays, gridEl, cellEls:{d:node}, sigs:{d:sig} }
function renderCalendarGrid(){
  const host = document.getElementById('calendarHost');
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Pulsa «+ Añadir mes» para crear tu primer planning.</div>';
    _calGridCache = null;
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  if(!state.months[currentMonthKey]) state.months[currentMonthKey] = {days:{}};
  const daysData = state.months[currentMonthKey].days;
  const plan = computePlan();
  const monthPlan = plan[currentMonthKey] || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const reuse = !!(_calGridCache && _calGridCache.monthKey===currentMonthKey && _calGridCache.nDays===nDays && host.firstChild===_calGridCache.gridEl);
  let grid;
  if(reuse){
    grid = _calGridCache.gridEl;
  } else {
    host.innerHTML = '';
    grid = document.createElement('div');
    grid.className = 'cal-grid';
    DOW.forEach(dname=>{
      const dow = document.createElement('div'); dow.className='cal-dow'; dow.textContent = dname.slice(0,3);
      grid.appendChild(dow);
    });
    const firstDow = new Date(y, m-1, 1).getDay(); // 0 sun..6 sat
    const leadingBlanks = (firstDow === 0) ? 6 : firstDow - 1; // convert to Mon-first
    for(let i=0;i<leadingBlanks;i++){
      const b = document.createElement('div'); b.className='cal-cell blank'; grid.appendChild(b);
    }
    host.appendChild(grid);
    _calGridCache = {monthKey:currentMonthKey, nDays, gridEl:grid, cellEls:{}, sigs:{}};
  }

  for(let d=1; d<=nDays; d++){
    const info = monthPlan[d] || {status:'ESTUDIO'};
    const isToday = isCurrentMonth && d===now.getDate();
    const sig = dayRenderSig(info, daysData[d]||'ESTUDIO', isToday, state.notes[dayNoteKey(currentMonthKey,d)]);
    if(reuse && _calGridCache.sigs[d]===sig) continue; // sin cambios visibles: no tocamos su nodo DOM
    const cell = buildCalGridCell(y, m, d, info, daysData, isToday);
    const prevEl = _calGridCache.cellEls[d];
    if(prevEl && prevEl.parentNode===grid) grid.replaceChild(cell, prevEl);
    else grid.appendChild(cell);
    _calGridCache.cellEls[d] = cell;
    _calGridCache.sigs[d] = sig;
  }
}
function buildCalListItem(y, m, d, info, daysData, isToday){
  const item = document.createElement('div');
  item.className = 'cal-list-item status-'+info.status;
  if(isToday){ item.classList.add('today'); item.id = 'todayCell'; }

  const head = document.createElement('div'); head.className='cal-list-head';
  const dateWrap = document.createElement('div'); dateWrap.className='cal-list-date';
  const wdName = DOW[(info.dow===0?6:info.dow-1)];
  dateWrap.innerHTML = '<span class="cal-list-daynum">'+d+'</span><span class="cal-list-wd">'+wdName+'</span>';
  head.appendChild(dateWrap);

  const headRight = document.createElement('div'); headRight.className='cal-list-head-right';
  const badge = dayCompletionBadge(info);
  if(badge) headRight.appendChild(badge);

  const statusSel = document.createElement('select');
  statusSel.className = 'status-select cal-list-status-select';
  statusSel.setAttribute('aria-label','Estado del día '+d);
  ['ESTUDIO','DESCANSO','TRABAJO','DESCONOCIDO'].forEach(opt=>{
    const o = document.createElement('option'); o.value = opt;
    o.textContent = opt==='ESTUDIO' ? 'Estudio' : opt==='DESCANSO' ? 'Descanso' : opt==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    if((daysData[d]||'ESTUDIO')===opt) o.selected = true;
    statusSel.appendChild(o);
  });
  statusSel.onclick = (e)=> e.stopPropagation();
  statusSel.onchange = ()=>{
    if(statusSel.value==='ESTUDIO') delete daysData[d];
    else daysData[d] = statusSel.value;
    invalidatePlan(currentMonthKey);
    scheduleSave();
    renderCalendar();
  };
  headRight.appendChild(statusSel);
  head.appendChild(headRight);
  item.appendChild(head);

  if(info.status === 'ESTUDIO'){
    const tasks = buildTasksBlock(d, info);
    tasks.classList.add('cal-list-tasks');
    item.appendChild(tasks);
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'off-label';
    lbl.style.margin = '2px 0 0';
    lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    item.appendChild(lbl);
  }
  // Igual que en la rejilla: cualquier día se abre, sea de estudio o no.
  item.style.cursor = 'pointer';
  item.onclick = ()=> openDayModal(d, info);
  return item;
}
/* Vista alternativa tipo lista/agenda: una fila por día, apilada verticalmente,
   con más espacio táctil y texto más legible — pensada para móvil.
   Caché del último render, igual que en la vista rejilla, para diferenciar día a día. */
let _calListCache = null; // { monthKey, nDays, listEl, itemEls:{d:node}, sigs:{d:sig} }
function renderCalendarList(){
  const host = document.getElementById('calendarHost');
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Pulsa «+ Añadir mes» para crear tu primer planning.</div>';
    _calListCache = null;
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  if(!state.months[currentMonthKey]) state.months[currentMonthKey] = {days:{}};
  const daysData = state.months[currentMonthKey].days;
  const plan = computePlan();
  const monthPlan = plan[currentMonthKey] || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const reuse = !!(_calListCache && _calListCache.monthKey===currentMonthKey && _calListCache.nDays===nDays && host.firstChild===_calListCache.listEl);
  let list;
  if(reuse){
    list = _calListCache.listEl;
  } else {
    host.innerHTML = '';
    list = document.createElement('div');
    list.className = 'cal-list';
    host.appendChild(list);
    _calListCache = {monthKey:currentMonthKey, nDays, listEl:list, itemEls:{}, sigs:{}};
  }

  for(let d=1; d<=nDays; d++){
    const info = monthPlan[d] || {status:'ESTUDIO'};
    const isToday = isCurrentMonth && d===now.getDate();
    const sig = dayRenderSig(info, daysData[d]||'ESTUDIO', isToday, state.notes[dayNoteKey(currentMonthKey,d)]);
    if(reuse && _calListCache.sigs[d]===sig) continue; // sin cambios visibles: no tocamos su nodo DOM
    const item = buildCalListItem(y, m, d, info, daysData, isToday);
    const prevEl = _calListCache.itemEls[d];
    if(prevEl && prevEl.parentNode===list) list.replaceChild(item, prevEl);
    else list.appendChild(item);
    _calListCache.itemEls[d] = item;
    _calListCache.sigs[d] = sig;
  }
}
function taskRow(tag, txt, tagClass, tickInfo){
  const row = document.createElement('div'); row.className='task-row';
  row.innerHTML = '<span class="tag '+tagClass+'">'+tag+'</span><span class="task-txt">'+txt+'</span>';
  if(tickInfo){
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'day-tick';
    cb.checked = !!tickInfo.checked;
    cb.title = 'Marcar como NO completado (se repetirá el próximo día que toque)';
    cb.setAttribute('aria-label', 'Marcar "'+txt+'" como NO completado');
    cb.onclick = (e)=>{ e.stopPropagation(); };
    cb.onchange = ()=>{
      setDayTick(tickInfo.monthKey, tickInfo.day, tickInfo.stream, cb.checked);
      renderCalendar();
    };
    row.appendChild(cb);
    if(cb.checked) row.classList.add('tick-pending');
  }
  return row;
}

/* ===================== MODAL: DÍA ===================== */
/* Modal del día del calendario principal. Desde aquí se puede hacer TODO lo del día sin
   salir del calendario: cambiar el estado del día, escribir las notas, tirar del tablón de
   notas pendientes (o apuntar una nueva), meter y quitar clases, abrir el simulacro y
   marcar las tareas y sus vueltas. Se abre en CUALQUIER día, también en los de descanso,
   trabajo o sin horario (antes solo se abría en los de estudio, y por eso no había manera
   de ponerles una nota). */
function daySection(body, titulo){
  const sec = document.createElement('div'); sec.className='day-section';
  const t = document.createElement('div'); t.className='day-section-title';
  t.appendChild(document.createTextNode(titulo));
  sec.appendChild(t);
  const inner = document.createElement('div');
  sec.appendChild(inner);
  body.appendChild(sec);
  return {sec, title:t, body:inner};
}
function openDayModal(d, info){
  const [y,m] = currentMonthKey.split('-').map(Number);
  info = info || {};
  const jsDow = (info.dow===undefined || info.dow===null) ? new Date(y, m-1, d).getDay() : info.dow;
  const status = info.status || 'ESTUDIO';
  const fechaISO = currentMonthKey+'-'+pad2(d);
  const esHoy = (fechaISO === hoyLocalISO());

  document.getElementById('dayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  const statusTxt = status==='ESTUDIO' ? 'Día de estudio' : status==='DESCANSO' ? 'Descanso' : status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
  document.getElementById('dayModalSub').textContent = DOW[(jsDow===0?6:jsDow-1)] + ' · ' + statusTxt + (esHoy ? ' · HOY' : '');
  const body = document.getElementById('dayModalBody');
  body.innerHTML = '';

  /* ---------- 1. Tareas del día (solo días de estudio) ---------- */
  if(status === 'ESTUDIO'){
    try{
      const {body:sb} = daySection(body, 'Tareas del día');
      const dticks = info.ticks || {};
      // El test de arrastre es SIEMPRE lo primero del día: va antes que cualquier otra tarea.
      addArrastreTestRow(sb, fechaISO);
      const helpNote = document.createElement('div');
      helpNote.className = 'tick-help';
      helpNote.style.marginBottom = '12px';
      helpNote.innerHTML = '☑ Marca la casilla solo si <strong>NO</strong> has completado esa tarea (se repetirá el próximo día que toque).';
      sb.appendChild(helpNote);

      if(Array.isArray(info.temasDelDia)){
        const bRow = document.createElement('div'); bRow.className='modal-row'; bRow.style.flexWrap='wrap';
        const bLeft = document.createElement('div'); bLeft.style.cssText='flex:1;min-width:0;';
        const bHead = document.createElement('div');
        bHead.innerHTML = '<span class="tag '+(info.bloqueTipo==='grave'?'tag-grave':'tag-mgrave')+'">BLOQUE '+info.bloque+'</span>'+
          '<span class="colorpill '+info.color+'">'+info.color+'</span>';
        bLeft.appendChild(bHead);
        // Al lado de cada tema del bloque va su propio control de vuelta (Pendiente / Nota test /
        // No test / No tiempo / Solo lectura), igual que en «Temario y notas» — escribe en el mismo
        // sitio (state.ticks) así que se ve automáticamente en Progreso sin nada más que hacer aquí.
        info.temasDelDia.forEach(t=>{
          const line = document.createElement('div'); line.className='modal-tema-line';
          const txt = document.createElement('span'); txt.className='tema-line-txt';
          txt.innerHTML = '• '+(t.clase?t.clase:t.nombre)+(t.clase?' <span style="color:var(--muted);font-family:var(--font-mono);font-size:12px;">('+t.nombre+')</span>':'');
          line.appendChild(txt);
          line.appendChild(buildQuickVueltaControl(t.key, GROUP_MAX_NOTA.Bloques, fechaISO));
          bLeft.appendChild(line);
        });
        const bFoot = document.createElement('div');
        bFoot.style.cssText = 'margin-top:6px;font-family:var(--font-mono);font-size:12px;color:var(--muted);';
        bFoot.textContent = info.unify
          ? 'Modo repaso final: se estudia el bloque completo (azul + morado) en un solo día.'
          : 'El resto de temas de este bloque tocará la próxima vez que aparezca ('+(info.color==='azul'?'morado':'azul')+'). Si marcas que NO lo has completado, este mismo bloque se repetirá el próximo día que toque en vez de avanzar.';
        bLeft.appendChild(bFoot);
        bRow.appendChild(bLeft);
        const bCb = document.createElement('input'); bCb.type='checkbox'; bCb.className='day-tick';
        bCb.checked = !!dticks.bloque; bCb.title='Marcar bloque como NO completado';
        bCb.setAttribute('aria-label', bCb.title);
        bCb.onchange = ()=>{ setDayTick(currentMonthKey, d, 'bloque', bCb.checked); renderCalendar(); };
        bRow.appendChild(bCb);
        sb.appendChild(bRow);
      }

      if(info.leveInfo){
        addModalRow(sb, 'tag-leve', 'LEVE', 'Leve '+info.leveNum+' — '+(info.leveInfo.clase?info.leveInfo.clase:info.leveInfo.nombre)+(info.leveInfo.clase?' ('+info.leveInfo.nombre+')':''), {monthKey:currentMonthKey, day:d, stream:'leve', checked:dticks.leve}, {key:info.leveInfo.key, maxNota:GROUP_MAX_NOTA.Leves}, fechaISO);
      }
      if(info.inglesNum){
        addModalRow(sb, 'tag-ing', 'INGLÉS', 'Tema '+info.inglesNum+' / '+INGLES_TOTAL, {monthKey:currentMonthKey, day:d, stream:'ingles', checked:dticks.ingles}, {key:'ingles-'+info.inglesNum, maxNota:GROUP_MAX_NOTA['Inglés']}, fechaISO);
      }
      if(info.entreno) addModalRow(sb, 'tag-entreno', 'ENTRENO', 'Día de entreno físico', {monthKey:currentMonthKey, day:d, stream:'entreno', checked:dticks.entreno});
      if(info.psico) addModalRow(sb, 'tag-psico', 'PSICOTÉCNICO', info.psico, {monthKey:currentMonthKey, day:d, stream:'psico', checked:dticks.psico}, {key:'psico-'+info.psicoIdx, maxNota:GROUP_MAX_NOTA['Psicotécnicos']}, fechaISO);
      addOrtoGramRow(sb, {monthKey:currentMonthKey, day:d, stream:'orto', checked:dticks.orto});
    }catch(err){
      // Pase lo que pase con las tareas del día, las notas siguen funcionando: el aviso es
      // solo para saber que ahí ha fallado algo.
      const warn = document.createElement('div'); warn.className='day-warn';
      warn.textContent = 'No se han podido pintar las tareas de este día ('+(err && err.message ? err.message : 'error desconocido')+'). El resto del día sigue funcionando con normalidad.';
      body.appendChild(warn);
      try{ console.error('Error pintando las tareas del día', err); }catch(e){}
    }
  }

  /* ---------- 2. Clases de este día ---------- */
  {
    const {body:sb} = daySection(body, 'Clases de este día');
    const host = document.createElement('div');
    sb.appendChild(host);
    renderDayClasesEditor(host, d, jsDow);
  }

  /* ---------- 3. Simulacro ---------- */
  {
    const {body:sb} = daySection(body, 'Simulacro');
    const refreshSimEverything = ()=>{
      renderSimCalendar();
      renderSimulacrosList();
      renderSimulacrosPendientes();
      renderHomeDash();
    };

    const row = document.createElement('div'); row.className='clase-select-row';
    row.innerHTML = '<label>¿Hubo simulacro este día?</label>';
    const sel = document.createElement('select');
    sel.setAttribute('aria-label','Simulacro este día');
    sel.appendChild(new Option('— Ninguno —',''));
    sel.appendChild(new Option('Sí, hubo simulacro','SIMULACRO'));
    sel.value = buscarSimulacroPorFecha(fechaISO) ? 'SIMULACRO' : '';
    sel.onchange = ()=>{
      if(sel.value==='SIMULACRO'){
        if(!buscarSimulacroPorFecha(fechaISO)) crearSimulacroEnFecha(fechaISO, d, m, y);
        scheduleSave();
        refreshSimEverything();
        openDayModal(d, info); // repinta la ficha ya con los campos de edición del simulacro
      } else {
        const sim = buscarSimulacroPorFecha(fechaISO);
        if(sim){
          const label = sim.nombre || 'este simulacro';
          const tieneAlgo = !!(sim.nota || sim.conocimientos!=null || sim.ingles!=null || sim.psico!=null || sim.orto || sim.gram);
          if(tieneAlgo && !confirm('«'+label+'» se quitará de este día. No se pierde nada: pasa al tablón de «Simulacros pendientes», de donde podrás colocarlo en otro día más adelante. ¿Seguro?')){
            sel.value = 'SIMULACRO';
            return;
          }
          devolverSimulacroAPendientes(sim);
          refreshSimEverything();
          openDayModal(d, info);
        }
      }
    };
    row.appendChild(sel);
    sb.appendChild(row);

    const sim = buscarSimulacroPorFecha(fechaISO);
    if(sim){
      const nameRow = document.createElement('div'); nameRow.className='clase-note-row';
      nameRow.innerHTML = '<label for="dayModalSimNombreInp">Nombre del simulacro</label>';
      const nameInp = document.createElement('input');
      nameInp.type = 'text'; nameInp.id = 'dayModalSimNombreInp'; nameInp.className='sim-name-input';
      nameInp.value = sim.nombre || '';
      nameInp.setAttribute('aria-label','Nombre del simulacro');
      nameInp.oninput = ()=>{ sim.nombre = nameInp.value; scheduleSave(); };
      nameInp.onblur = refreshSimEverything;
      nameRow.appendChild(nameInp);
      sb.appendChild(nameRow);

      sb.appendChild(buildSimScoreFields(sim, {onChange: refreshSimEverything}));

      const notaRow = document.createElement('div'); notaRow.className='clase-note-row';
      notaRow.innerHTML = '<label for="dayModalSimNotaTa">Sensaciones / notas</label>';
      const notaTa = document.createElement('textarea');
      notaTa.id = 'dayModalSimNotaTa'; notaTa.className = 'note-inline';
      notaTa.placeholder = 'Sensaciones, aciertos, fallos a repasar…';
      notaTa.value = sim.nota || '';
      notaTa.oninput = ()=>{ sim.nota = notaTa.value; scheduleSave(); };
      notaTa.onblur = refreshSimEverything;
      notaRow.appendChild(notaTa);
      sb.appendChild(notaRow);

      const goBtn = document.createElement('button');
      goBtn.type = 'button'; goBtn.className = 'btn small ghost';
      goBtn.style.marginTop = '10px';
      goBtn.textContent = 'Ver todos los simulacros en su pestaña →';
      goBtn.onclick = ()=>{
        document.getElementById('dayModal').classList.remove('open');
        const tabBtn = document.querySelector('.tab-btn[data-tab="simulacros"]');
        if(tabBtn) tabBtn.click();
      };
      sb.appendChild(goBtn);
    } else {
      // Sin simulacro todavía en este día: si hay algo en el tablón de pendientes, se puede
      // colocar aquí directamente en vez de crear uno nuevo desde cero.
      const pendWrap = document.createElement('div'); pendWrap.style.marginTop = '10px';
      sb.appendChild(pendWrap);
      const list = ensureSimulacrosPendientes().slice().sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
      if(list.length){
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-family:var(--font-mono);font-size:12px;text-transform:uppercase;color:var(--cream-dim);letter-spacing:.05em;margin-bottom:6px;';
        lbl.textContent = 'O coloca aquí un simulacro pendiente';
        pendWrap.appendChild(lbl);
        const opts = document.createElement('div'); opts.className = 'clase-quiz-options';
        list.forEach(item=>{
          const isBlocked = !!(item.disponibleDesde && item.disponibleDesde > fechaISO);
          const b = document.createElement('button'); b.type='button'; b.className='clase-quiz-opt';
          b.textContent = (item.nombre||'Simulacro') + (isBlocked ? ' (disponible desde '+formatFechaEs(item.disponibleDesde)+')' : '');
          if(isBlocked){
            b.disabled = true;
            b.title = 'Este simulacro estará disponible a partir del '+formatFechaEs(item.disponibleDesde);
          } else {
            b.onclick = ()=>{
              colocarSimulacroPendienteEnFecha(item.id, fechaISO);
              refreshSimEverything();
              openDayModal(d, info);
            };
          }
          opts.appendChild(b);
        });
        pendWrap.appendChild(opts);
      }
    }
  }

  /* ---------- 4. Notas del día ---------- */
  {
    const {body:sb, title} = daySection(body, 'Notas del día');
    const flash = document.createElement('span'); flash.className='day-saved-flash'; flash.textContent='guardado';
    title.appendChild(flash);
    let flashTimer = null;
    const marcarGuardado = ()=>{
      flash.classList.add('on');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(()=> flash.classList.remove('on'), 1200);
    };

    const noteKey = dayNoteKey(currentMonthKey, d);
    const notaTa = document.createElement('textarea');
    notaTa.className = 'note-inline'; notaTa.id = 'dayNotaTa';
    notaTa.placeholder = 'Apuntes, dudas, recordatorios de este día…';
    notaTa.value = state.notes[noteKey] || '';
    notaTa.setAttribute('aria-label','Notas del día '+d);
    notaTa.oninput = ()=>{ state.notes[noteKey] = notaTa.value; scheduleSave(); marcarGuardado(); };
    notaTa.onblur = ()=> renderCalendar();
    sb.appendChild(notaTa);

    // Tablón de notas pendientes: desplegable para traer una nota apuntada a este día, y
    // un formulario plegable para apuntar una nota nueva sin salir del calendario.
    const pendWrap = document.createElement('div');
    sb.appendChild(pendWrap);

    function renderPendingNotes(){
      pendWrap.innerHTML = '';
      if(!Array.isArray(state.notasPendientes)) state.notasPendientes = [];
      const lista = state.notasPendientes.slice().sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
      const row = document.createElement('div'); row.className='day-pend-row';

      const sel = document.createElement('select');
      sel.setAttribute('aria-label','Elegir una nota pendiente para añadirla a este día');
      const addBtn = document.createElement('button');
      addBtn.type='button'; addBtn.className='day-mini-btn primary'; addBtn.textContent='➕ Añadir al día';

      if(!lista.length){
        sel.appendChild(new Option('No tienes notas pendientes apuntadas',''));
        sel.disabled = true;
        addBtn.disabled = true;
      } else {
        sel.appendChild(new Option('Traer una nota pendiente…',''));
        lista.forEach(item=>{
          const bloqueada = !!(item.disponibleDesde && item.disponibleDesde > fechaISO);
          const o = new Option(item.texto + (bloqueada ? ' (disponible desde '+formatFechaEs(item.disponibleDesde)+')' : ''), item.id);
          o.disabled = bloqueada;
          sel.appendChild(o);
        });
        addBtn.disabled = true;
        sel.onchange = ()=>{ addBtn.disabled = (sel.value===''); };
        addBtn.onclick = ()=>{
          const item = state.notasPendientes.find(x=>x.id===sel.value);
          if(!item) return;
          const actual = state.notes[noteKey] || '';
          state.notes[noteKey] = (actual && actual.trim()) ? (actual+'\n'+item.texto) : item.texto;
          const i = state.notasPendientes.findIndex(x=>x.id===item.id);
          if(i>-1) state.notasPendientes.splice(i,1);
          notaTa.value = state.notes[noteKey];
          scheduleSave();
          marcarGuardado();
          renderCalendar();
          renderNotasPendientes();
          renderPendingNotes();
        };
      }
      row.appendChild(sel);
      row.appendChild(addBtn);

      const newBtn = document.createElement('button');
      newBtn.type='button'; newBtn.className='day-mini-btn'; newBtn.textContent='✎ Apuntar nota nueva';
      row.appendChild(newBtn);
      pendWrap.appendChild(row);

      // Formulario plegable para crear una nota pendiente desde aquí mismo.
      const nuevo = document.createElement('div'); nuevo.className='day-newnote';
      const txtInp = document.createElement('input');
      txtInp.type='text'; txtInp.placeholder='¿Qué quieres apuntar?';
      txtInp.setAttribute('aria-label','Texto de la nota pendiente');
      const fechaInp = document.createElement('input');
      fechaInp.type='date';
      fechaInp.setAttribute('aria-label','Disponible a partir de (opcional)');
      const acciones = document.createElement('div'); acciones.className='day-pend-row';
      const guardarBtn = document.createElement('button'); guardarBtn.type='button'; guardarBtn.className='day-mini-btn primary';
      guardarBtn.textContent = '💾 Guardar en pendientes';
      const aquiBtn = document.createElement('button'); aquiBtn.type='button'; aquiBtn.className='day-mini-btn';
      aquiBtn.textContent = '⤵ Añadir directamente a este día';
      acciones.appendChild(guardarBtn); acciones.appendChild(aquiBtn);
      nuevo.appendChild(txtInp); nuevo.appendChild(fechaInp); nuevo.appendChild(acciones);
      pendWrap.appendChild(nuevo);

      newBtn.onclick = ()=>{
        nuevo.classList.toggle('open');
        if(nuevo.classList.contains('open')) txtInp.focus();
      };
      guardarBtn.onclick = ()=>{
        const t = txtInp.value.trim();
        if(!t) return;
        state.notasPendientes.push({id: Date.now()+'-'+Math.random(), texto:t, disponibleDesde: fechaInp.value || null});
        txtInp.value=''; fechaInp.value='';
        scheduleSave();
        marcarGuardado();
        renderNotasPendientes();
        renderPendingNotes();
      };
      aquiBtn.onclick = ()=>{
        const t = txtInp.value.trim();
        if(!t) return;
        const actual = state.notes[noteKey] || '';
        state.notes[noteKey] = (actual && actual.trim()) ? (actual+'\n'+t) : t;
        notaTa.value = state.notes[noteKey];
        txtInp.value=''; fechaInp.value='';
        scheduleSave();
        marcarGuardado();
        renderCalendar();
        renderPendingNotes();
      };
    }
    renderPendingNotes();
  }

  document.getElementById('dayModal').classList.add('open');
  const modalBox = document.querySelector('#dayModal .modal');
  if(modalBox) modalBox.scrollTop = 0;
}

/* Editor de clases del día, embebido en el modal del calendario principal: enseña las
   clases ya registradas (con "×" para quitarlas) y un formulario corto para añadir otra,
   sin tener que ir al calendario de clases. Escribe exactamente en el mismo sitio
   (state.claseCal), así que se ve igual en los dos calendarios y en la pestaña Clases. */
function renderDayClasesEditor(host, d, jsDow){
  host.innerHTML = '';
  const entry = ensureClaseCalDay(currentMonthKey, d);
  const MATERIAS = getClaseMateriasDef();
  const fecha = currentMonthKey+'-'+pad2(d);

  const repintar = ()=>{
    scheduleSave();
    renderClaseCalendar();
    renderClasesPendientes();
    renderDayClasesEditor(host, d, jsDow);
  };

  /* --- Clases ya registradas --- */
  const chips = document.createElement('div'); chips.className='cclase-pills';
  const addPill = (cls, text, onRemove, esParcial)=>{
    const pill = document.createElement('span'); pill.className='cclase-pill p-'+cls;
    pill.appendChild(document.createTextNode(text + (esParcial ? ' · parte' : '')));
    const del = document.createElement('button');
    del.type='button'; del.className='cclase-pill-del'; del.textContent='×';
    del.title = 'Quitar esta clase'; del.setAttribute('aria-label','Quitar '+text);
    del.onclick = ()=>{ onRemove(); repintar(); };
    pill.appendChild(del);
    chips.appendChild(pill);
  };
  const esParcial = (cat, v)=> (entry.parciales||[]).indexOf(claseParcialKey(cat, v)) > -1;

  (entry.conocimientos||[]).slice().sort((a,b)=>a-b).forEach(t=>{
    addPill('con', 'CON · Tema '+t, ()=>{
      const i = entry.conocimientos.indexOf(t); if(i>-1) entry.conocimientos.splice(i,1);
      quitarClaseParcial(entry,'conocimientos',t);
      removeClaseNotaTag(entry, 'Conocimientos', 'Tema '+t);
      devolverClaseAPendientes('conocimientos', t, 'Tema '+t, false);
    }, esParcial('conocimientos', t));
  });
  (entry.ingles||[]).slice().sort((a,b)=>a-b).forEach(l=>{
    addPill('ing', 'ING · Lesson '+l, ()=>{
      const i = entry.ingles.indexOf(l); if(i>-1) entry.ingles.splice(i,1);
      quitarClaseParcial(entry,'ingles',l);
      removeClaseNotaTag(entry, 'Inglés', 'Lesson '+l);
      devolverClaseAPendientes('ingles', l, 'Lesson '+l, false);
    }, esParcial('ingles', l));
  });
  (entry.psico||[]).slice().sort((a,b)=>a-b).forEach(idx=>{
    addPill('psi', 'PSI · '+PSICO_ITEMS[idx], ()=>{
      const i = entry.psico.indexOf(idx); if(i>-1) entry.psico.splice(i,1);
      quitarClaseParcial(entry,'psico',idx);
      removeClaseNotaTag(entry, 'Psicotécnicos', PSICO_ITEMS[idx]);
      devolverClaseAPendientes('psico', idx, PSICO_ITEMS[idx], false);
    }, esParcial('psico', idx));
  });
  (entry.psicoExtra||[]).forEach((n,i)=>{
    if(!n || !n.trim()) return;
    addPill('psi', 'PSI · '+n, ()=>{
      entry.psicoExtra.splice(i,1);
      removeClaseNotaTag(entry, 'Psicotécnicos', n);
      devolverClaseAPendientes('psico', null, n, true);
    }, false);
  });
  [['orto','ORT','Ortografía'], ['gram','GRAM','Gramática']].forEach(([arrKey, tag, label])=>{
    (entry[arrKey]||[]).forEach((n,i)=>{
      const visible = (n && n.trim()) ? n : 'Clase '+(i+1);
      addPill(arrKey, tag+' · '+visible, ()=>{
        entry[arrKey].splice(i,1);
        removeClaseNotaTag(entry, label, n || '');
        devolverClaseAPendientes(arrKey, n || '', n || '', false);
      }, false);
    });
  });

  if(!chips.children.length){
    const empty = document.createElement('span'); empty.className='cclase-empty';
    empty.textContent = 'Sin clases registradas este día.';
    chips.appendChild(empty);
  }
  host.appendChild(chips);

  /* --- Añadir una clase --- */
  const form = document.createElement('div'); form.style.marginTop='10px';

  const matSel = document.createElement('select'); matSel.className='day-status-select';
  matSel.setAttribute('aria-label','Materia de la clase');
  matSel.appendChild(new Option('➕ Añadir una clase…',''));
  // Del tablón de pendientes también se puede tirar directamente desde aquí.
  const pendientes = (state.clasesPendientes||[]).filter(p=> !(p.disponibleDesde && p.disponibleDesde > fecha));
  if(pendientes.length) matSel.appendChild(new Option('— De las clases pendientes —','__pend__'));
  MATERIAS.forEach(mat=> matSel.appendChild(new Option(mat.label, mat.key)));
  form.appendChild(matSel);

  const detalle = document.createElement('div'); detalle.style.marginTop='8px';
  form.appendChild(detalle);

  matSel.onchange = ()=>{
    detalle.innerHTML = '';
    if(matSel.value === '') return;

    if(matSel.value === '__pend__'){
      const row = document.createElement('div'); row.className='day-pend-row';
      const sel = document.createElement('select');
      sel.setAttribute('aria-label','Elegir una clase pendiente');
      sel.appendChild(new Option('Elegir…',''));
      pendientes.forEach(p=>{
        const mat = MATERIAS.find(mm=>mm.key===p.materiaKey);
        sel.appendChild(new Option((mat?mat.label:p.materiaKey)+' — '+p.temaLabel, p.id));
      });
      const btn = document.createElement('button'); btn.type='button'; btn.className='day-mini-btn primary';
      btn.textContent = 'Añadir'; btn.disabled = true;
      sel.onchange = ()=>{ btn.disabled = (sel.value===''); };
      btn.onclick = ()=>{
        const p = state.clasesPendientes.find(x=>x.id===sel.value);
        if(!p) return;
        const mat = MATERIAS.find(mm=>mm.key===p.materiaKey);
        if(!mat) return;
        if(mat.kind==='text'){
          if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
          entry[mat.arrKey].push(p.temaLabel || '');
        } else if(p.useExtra){
          if(!Array.isArray(entry[mat.extraArrKey])) entry[mat.extraArrKey] = [];
          entry[mat.extraArrKey].push(p.temaLabel);
        } else {
          if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
          if(entry[mat.arrKey].indexOf(p.temaValue) === -1) entry[mat.arrKey].push(p.temaValue);
        }
        const i = state.clasesPendientes.findIndex(x=>x.id===p.id);
        if(i>-1) state.clasesPendientes.splice(i,1);
        repintar();
      };
      row.appendChild(sel); row.appendChild(btn);
      detalle.appendChild(row);
      return;
    }

    const mat = MATERIAS.find(mm=>mm.key===matSel.value);
    if(!mat) return;
    const row = document.createElement('div'); row.className='day-pend-row';
    const btn = document.createElement('button'); btn.type='button'; btn.className='day-mini-btn primary';
    btn.textContent = 'Añadir';

    // Checkbox "¿esta clase cierra el tema?" — solo para materias con temas numerados.
    const completaWrap = document.createElement('label');
    completaWrap.className = 'clase-check-row';
    completaWrap.style.marginTop = '8px';
    const completaCb = document.createElement('input'); completaCb.type='checkbox'; completaCb.checked = true;
    completaWrap.appendChild(completaCb);
    completaWrap.appendChild(document.createTextNode('Con esta clase queda completo el tema (si quedan más partes, desmárcalo)'));

    if(mat.kind === 'text'){
      const inp = document.createElement('input'); inp.type='text';
      inp.className='clase-quiz-text-input'; inp.placeholder='Nombre de la clase (p. ej. «Acentuación»)';
      row.appendChild(inp); row.appendChild(btn);
      detalle.appendChild(row);
      btn.onclick = ()=>{
        if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
        entry[mat.arrKey].push(inp.value.trim());
        repintar();
      };
      return;
    }

    const ya = Array.isArray(entry[mat.arrKey]) ? entry[mat.arrKey] : [];
    const disponibles = mat.options.filter(o=> ya.indexOf(o.value) === -1);
    const sel = document.createElement('select');
    sel.setAttribute('aria-label','Elegir tema de '+mat.label);
    sel.appendChild(new Option('Elegir…',''));
    disponibles.forEach(o=> sel.appendChild(new Option(o.label, o.value)));
    btn.disabled = true;
    sel.onchange = ()=>{ btn.disabled = (sel.value===''); };
    btn.onclick = ()=>{
      if(sel.value==='') return;
      const opt = disponibles.find(o=> String(o.value)===String(sel.value));
      if(!opt) return;
      if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
      entry[mat.arrKey].push(opt.value);
      setClaseParcial(entry, mat.key, opt.value, !completaCb.checked);
      repintar();
    };
    row.appendChild(sel); row.appendChild(btn);
    detalle.appendChild(row);
    detalle.appendChild(completaWrap);

    // Psicotécnicos admite además un nombre libre que no esté en la lista de pruebas.
    if(mat.kind === 'select-or-text'){
      const or = document.createElement('div'); or.className='clase-quiz-or'; or.textContent='O si no está en la lista, escríbelo:';
      detalle.appendChild(or);
      const row2 = document.createElement('div'); row2.className='day-pend-row';
      const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input'; inp.placeholder='Escribe la prueba';
      const btn2 = document.createElement('button'); btn2.type='button'; btn2.className='day-mini-btn'; btn2.textContent='Añadir';
      btn2.onclick = ()=>{
        if(!inp.value.trim()) return;
        if(!Array.isArray(entry[mat.extraArrKey])) entry[mat.extraArrKey] = [];
        entry[mat.extraArrKey].push(inp.value.trim());
        repintar();
      };
      row2.appendChild(inp); row2.appendChild(btn2);
      detalle.appendChild(row2);
    }
  };

  host.appendChild(form);

  /* --- Notas de la clase de ese día (las del calendario de clases) --- */
  const notaWrap = document.createElement('div'); notaWrap.className='clase-note-row'; notaWrap.style.marginTop='10px';
  notaWrap.innerHTML = '<label for="dayClaseNotaTa">Notas de las clases de este día</label>';
  const ta = document.createElement('textarea'); ta.className='note-inline'; ta.id='dayClaseNotaTa';
  ta.placeholder = 'Dudas, deberes, lo que te dijeron en clase…';
  ta.value = entry.nota || '';
  ta.oninput = ()=>{ entry.nota = ta.value; scheduleSave(); };
  ta.onblur = ()=> renderClaseCalendar();
  notaWrap.appendChild(ta);
  host.appendChild(notaWrap);
}
function addModalRow(body, tagClass, tag, txt, tickInfo, vueltaInfo, fechaISO){
  const row = document.createElement('div'); row.className='modal-row';
  if(vueltaInfo) row.style.flexWrap = 'wrap';
  const headWrap = document.createElement('div');
  headWrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;min-width:0;';
  const tagEl = document.createElement('span'); tagEl.className='tag '+tagClass; tagEl.style.marginTop='2px'; tagEl.textContent = tag;
  headWrap.appendChild(tagEl);
  const txtEl = document.createElement('span'); txtEl.style.cssText = 'font-size:13px;flex:1;'; txtEl.textContent = txt;
  headWrap.appendChild(txtEl);
  row.appendChild(headWrap);
  if(tickInfo){
    const cb = document.createElement('input'); cb.type='checkbox'; cb.className='day-tick';
    cb.checked = !!tickInfo.checked; cb.title='Marcar como NO completado';
    cb.setAttribute('aria-label', 'Marcar "'+txt+'" como NO completado');
    cb.onchange = ()=>{ setDayTick(tickInfo.monthKey, tickInfo.day, tickInfo.stream, cb.checked); renderCalendar(); };
    row.appendChild(cb);
  }
  // Igual que en el bloque: control de vuelta al lado del tema (Leve, Inglés, Psicotécnico),
  // escribiendo directamente en state.ticks para que Progreso lo recoja sin nada manual.
  // Un desplegable deja elegir directamente qué vuelta quieres ver/editar (Vuelta 1,
  // Vuelta 2...) y muestra al momento su nota/comentario, esté pendiente o ya guardada.
  if(vueltaInfo){
    const quick = buildQuickVueltaControl(vueltaInfo.key, vueltaInfo.maxNota, fechaISO);
    quick.style.width = '100%';
    row.appendChild(quick);
  }
  body.appendChild(row);
}
/* Caja de notas de un tema/leve/inglés/psicotécnico, para usar dentro del modal del día.
   Empieza plegada (mostrando solo un botón) si todavía no hay nada escrito, y abierta si ya
   hay una nota guardada, para no alargar el modal de más en los temas sin comentarios. */
/* Ortografía y gramática no tienen "vueltas" numeradas como el resto del temario — cada
   test es simplemente Apto/No apto (igual que en la pestaña Temario y notas). Aquí se puede
   añadir un test de cada uno directamente desde el día, sin ir a esa pestaña; escribe en el
   mismo sitio (state.ortoTests), así que la cuenta de aptos/no aptos ya sale actualizada
   también en «Ortografía y gramática». */
function addOrtoGramRow(body, tickInfo){
  const row = document.createElement('div'); row.className='modal-row'; row.style.flexWrap='wrap';
  const headWrap = document.createElement('div');
  headWrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;min-width:0;';
  const tagEl = document.createElement('span'); tagEl.className='tag tag-orto'; tagEl.style.marginTop='2px'; tagEl.textContent='ORTO-GRAMA';
  headWrap.appendChild(tagEl);
  const txtEl = document.createElement('span'); txtEl.style.cssText='font-size:13px;flex:1;'; txtEl.textContent='Ortografía y gramática diaria';
  headWrap.appendChild(txtEl);
  row.appendChild(headWrap);
  const cb = document.createElement('input'); cb.type='checkbox'; cb.className='day-tick';
  cb.checked = !!tickInfo.checked; cb.title='Marcar como NO completado';
  cb.setAttribute('aria-label', 'Marcar "Ortografía y gramática diaria" como NO completado');
  cb.onchange = ()=>{ setDayTick(tickInfo.monthKey, tickInfo.day, tickInfo.stream, cb.checked); renderCalendar(); };
  row.appendChild(cb);

  [['ortografia','Ortografía'], ['gramatica','Gramática']].forEach(([field,label])=>{
    const q = document.createElement('div'); q.className='modal-quick-orto'; q.style.width='100%';
    function paint(){
      q.innerHTML = '';
      const lbl = document.createElement('span'); lbl.className='oq-lbl'; lbl.textContent = label+':';
      q.appendChild(lbl);
      const addTest = (resultado)=>{
        if(!state.ortoTests[field]) state.ortoTests[field] = [];
        state.ortoTests[field].push({resultado});
        scheduleSave();
        renderAll();
        paint();
      };
      const aptoBtn = document.createElement('button'); aptoBtn.type='button'; aptoBtn.className='oq-btn oq-apto';
      aptoBtn.textContent = '✅ Apto'; aptoBtn.title = 'Añadir un test de '+label+' como Apto';
      aptoBtn.onclick = ()=> addTest('APTO');
      q.appendChild(aptoBtn);
      const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='oq-btn oq-noapto';
      noBtn.textContent = '❌ No apto'; noBtn.title = 'Añadir un test de '+label+' como No apto';
      noBtn.onclick = ()=> addTest('NO_APTO');
      q.appendChild(noBtn);
      const tests = state.ortoTests[field] || [];
      const noAptos = tests.filter(t=>t.resultado==='NO_APTO').length;
      const count = document.createElement('span'); count.className='oq-count';
      count.textContent = tests.length
        ? (tests.length+' test'+(tests.length!==1?'s':'')+(noAptos?' · '+noAptos+' no apto'+(noAptos!==1?'s':''):''))
        : 'Sin tests todavía';
      q.appendChild(count);
    }
    paint();
    row.appendChild(q);
  });

  body.appendChild(row);
}
/* Test de arrastre diario: NO sigue el sistema de vueltas de los demás temas — es un test que
   se hace cada día con lo que se va arrastrando, así que aquí solo hace falta guardar, por
   fecha, la nota que se saque. Se guarda en state.arrastreTestNotas (fechaISO -> nota) y se lee
   tal cual desde Progreso para dibujar su evolución en el tiempo. */
/* ¿Se ha hecho el test de arrastre de esta fecha? Cuenta como hecho si lo has marcado
   («Ya lo he hecho» / «Sí» en el aviso) o si ya has metido una nota para ese día. */
function arrastreTestHechoDe(fechaISO){
  const flag = state.arrastreTestHecho && state.arrastreTestHecho[fechaISO];
  const nota = state.arrastreTestNotas ? state.arrastreTestNotas[fechaISO] : undefined;
  return !!flag || (nota !== undefined && nota !== null && nota !== '');
}
function setArrastreTestHecho(fechaISO, hecho){
  if(!state.arrastreTestHecho || typeof state.arrastreTestHecho !== 'object') state.arrastreTestHecho = {};
  if(hecho) state.arrastreTestHecho[fechaISO] = true;
  else delete state.arrastreTestHecho[fechaISO];
  scheduleSave();
}
/* Tarjeta destacada del test de arrastre: primera tarea del día en la ficha del calendario. */
function addArrastreTestRow(body, fechaISO){
  const card = document.createElement('div'); card.className = 'arrastre-hero';
  card.setAttribute('role','group'); card.setAttribute('aria-label','Test de arrastre del día');

  const kicker = document.createElement('div'); kicker.className = 'arrastre-hero-kicker';
  kicker.textContent = '★ Lo primero del día';
  card.appendChild(kicker);

  const head = document.createElement('div'); head.className = 'arrastre-hero-head';
  const title = document.createElement('span'); title.className = 'arrastre-hero-title'; title.textContent = 'Test de arrastre';
  const status = document.createElement('span'); status.className = 'arrastre-hero-status';
  head.appendChild(title); head.appendChild(status);
  card.appendChild(head);

  const desc = document.createElement('div'); desc.className = 'arrastre-hero-desc';
  desc.textContent = 'Hazlo antes que nada: test diario con los temas que se van arrastrando.';
  card.appendChild(desc);

  const actions = document.createElement('div'); actions.className = 'arrastre-hero-actions';
  const seg = document.createElement('div'); seg.className = 'arrastre-seg';
  const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='seg-yes'; yesBtn.textContent='✓ Ya lo he hecho';
  const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='seg-no'; noBtn.textContent='Aún no';
  seg.appendChild(yesBtn); seg.appendChild(noBtn);
  actions.appendChild(seg);

  const notaLbl = document.createElement('label'); notaLbl.className = 'arrastre-nota-lbl';
  notaLbl.appendChild(document.createTextNode('Nota'));
  const inp = document.createElement('input');
  inp.type = 'number'; inp.step = '0.1'; inp.min = '0'; inp.max = '10';
  inp.placeholder = '0-10';
  const actual = state.arrastreTestNotas ? state.arrastreTestNotas[fechaISO] : undefined;
  inp.value = (actual===undefined || actual===null) ? '' : actual;
  inp.setAttribute('aria-label', 'Nota del test de arrastre de este día, sobre 10');
  notaLbl.appendChild(inp);
  notaLbl.appendChild(document.createTextNode('/10'));
  actions.appendChild(notaLbl);
  card.appendChild(actions);

  const hint = document.createElement('div'); hint.className = 'arrastre-hero-hint';
  hint.textContent = 'Si pones nota, cuenta como hecho. La nota se guarda por fecha: en Progreso verás su evolución día a día.';
  card.appendChild(hint);

  const goBtn = document.createElement('button');
  goBtn.type='button'; goBtn.className='btn small ghost'; goBtn.style.marginTop='10px';
  goBtn.textContent = 'Ver qué temas son →';
  goBtn.onclick = ()=>{
    document.getElementById('dayModal').classList.remove('open');
    const tabBtn = document.querySelector('.tab-btn[data-tab="arrastre"]');
    if(tabBtn) tabBtn.click();
  };
  card.appendChild(goBtn);

  const paintState = ()=>{
    const hecho = arrastreTestHechoDe(fechaISO);
    const tieneNota = inp.value !== '';
    card.classList.toggle('done', hecho);
    status.textContent = hecho ? 'Hecho ✓' : 'Pendiente';
    yesBtn.setAttribute('aria-pressed', hecho ? 'true' : 'false');
    noBtn.setAttribute('aria-pressed', hecho ? 'false' : 'true');
    noBtn.disabled = tieneNota; // con nota puesta ya cuenta como hecho
    noBtn.title = tieneNota ? 'Ya has puesto nota, así que cuenta como hecho. Borra la nota para desmarcarlo.' : '';
  };
  yesBtn.onclick = ()=>{ setArrastreTestHecho(fechaISO, true); paintState(); renderCalendar(); };
  noBtn.onclick = ()=>{ setArrastreTestHecho(fechaISO, false); paintState(); renderCalendar(); };
  inp.oninput = ()=>{
    if(!state.arrastreTestNotas) state.arrastreTestNotas = {};
    if(inp.value === '') delete state.arrastreTestNotas[fechaISO];
    else state.arrastreTestNotas[fechaISO] = Number(inp.value);
    scheduleSave();
    paintState();
    renderCalendar();
  };
  paintState();
  body.appendChild(card);
}

/* ===================== AVISO: «¿has hecho el test de arrastre de hoy?» ===================== */
/* Al abrir la app (y, si la dejas abierta, cada cierto rato) se pregunta SOLO en días de estudio
   y SOLO si el test de hoy no está hecho. «Sí» lo apunta y ya no vuelve a preguntar ese día;
   «No» (o cerrar el aviso) hace que se repita más tarde. */
const ARRASTRE_ASK_REPEAT_MS = 30*60*1000; // si dices «No» y dejas la app abierta, se repite pasados 30 min
let _appStarted = false;
let _arrastreAskLastShown = 0;
function hoyEsDiaDeEstudio(){
  try{
    const now = new Date();
    const mk = now.getFullYear()+'-'+pad2(now.getMonth()+1);
    const plan = computePlan();
    const info = plan[mk] && plan[mk][now.getDate()];
    return !!(info && info.status === 'ESTUDIO');
  }catch(e){ return false; }
}
function cerrarAvisoArrastre(){ document.getElementById('arrastreAskModal').classList.remove('open'); }
function maybeAskArrastreTest(esArranque){
  if(!_appStarted || document.hidden) return;
  if(document.querySelector('.modal-backdrop.open')) return; // no apilar sobre otro modal abierto
  if(!hoyEsDiaDeEstudio()) return;                            // solo días de estudio
  if(arrastreTestHechoDe(todayISO())) return;                 // ya hecho → no se repite
  if(!esArranque && Date.now() - _arrastreAskLastShown < ARRASTRE_ASK_REPEAT_MS) return;
  _arrastreAskLastShown = Date.now();
  document.getElementById('arrastreAskModal').classList.add('open');
}
document.getElementById('arrastreAskYes').onclick = ()=>{
  setArrastreTestHecho(todayISO(), true);
  cerrarAvisoArrastre();
  renderCalendar();
  showToast('Test de arrastre de hoy hecho ✓');
};
document.getElementById('arrastreAskNo').onclick = cerrarAvisoArrastre; // sin marcar: se volverá a preguntar
document.getElementById('arrastreAskGo').onclick = ()=>{
  cerrarAvisoArrastre();
  const tabBtn = document.querySelector('.tab-btn[data-tab="arrastre"]');
  if(tabBtn) tabBtn.click();
};
document.getElementById('arrastreAskModal').addEventListener('click', e=>{ if(e.target.id==='arrastreAskModal') cerrarAvisoArrastre(); });
// Si la app se queda abierta (o vuelve a primer plano), se revisa cada minuto / al volver.
setInterval(()=>{ maybeAskArrastreTest(false); }, 60000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) maybeAskArrastreTest(false); });

/* ===================== MODAL: FECHA DEL EXAMEN ===================== */
function openExamDateModal(){
  const exam = nextExamInfo();
  document.getElementById('examDateInput').value = exam.iso;
  document.getElementById('resetExamDate').style.display = exam.personalizada ? '' : 'none';
  document.getElementById('examDateModal').classList.add('open');
}
document.getElementById('closeExamDate').onclick = ()=> document.getElementById('examDateModal').classList.remove('open');
document.getElementById('examDateModal').addEventListener('click', e=>{ if(e.target.id==='examDateModal') e.currentTarget.classList.remove('open'); });
document.getElementById('confirmExamDate').onclick = ()=>{
  const v = document.getElementById('examDateInput').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){ showToast('Elige una fecha válida'); return; }
  if(!state.settings) state.settings = {};
  state.settings.examDate = v;
  scheduleSave();
  renderHomeDash();
  document.getElementById('examDateModal').classList.remove('open');
  showToast('Fecha del examen actualizada');
};
document.getElementById('resetExamDate').onclick = ()=>{
  if(!state.settings) state.settings = {};
  state.settings.examDate = null;
  scheduleSave();
  renderHomeDash();
  document.getElementById('examDateModal').classList.remove('open');
  showToast('Vuelve la fecha estimada (10 de julio)');
};
document.getElementById('closeDayModal').onclick = ()=> document.getElementById('dayModal').classList.remove('open');
document.getElementById('dayModal').addEventListener('click', e=>{ if(e.target.id==='dayModal') e.currentTarget.classList.remove('open'); });

/* ===================== MODAL: AÑADIR MES ===================== */
function openAddMonthModal(){
  const monthSel = document.getElementById('newMonthSelect');
  const yearSel = document.getElementById('newYearSelect');
  monthSel.innerHTML = '';
  MESES.forEach((name,idx)=>{
    const o = document.createElement('option'); o.value = idx+1; o.textContent = name;
    monthSel.appendChild(o);
  });
  yearSel.innerHTML = '';
  const now = new Date();
  for(let y = now.getFullYear()-1; y <= now.getFullYear()+3; y++){
    const o = document.createElement('option'); o.value = y; o.textContent = y;
    if(y===now.getFullYear()) o.selected = true;
    yearSel.appendChild(o);
  }
  // default: mes siguiente al último guardado
  const keys = sortedMonthKeys();
  if(keys.length){
    const [ly, lm] = keys[keys.length-1].split('-').map(Number);
    let ny = ly, nm = lm+1;
    if(nm>12){ nm=1; ny++; }
    monthSel.value = nm; yearSel.value = ny;
  } else {
    monthSel.value = now.getMonth()+1;
  }
  document.getElementById('addMonthModal').classList.add('open');
}
document.getElementById('closeAddMonth').onclick = ()=> document.getElementById('addMonthModal').classList.remove('open');
document.getElementById('addMonthModal').addEventListener('click', e=>{ if(e.target.id==='addMonthModal') e.currentTarget.classList.remove('open'); });
document.getElementById('confirmAddMonth').onclick = ()=>{
  const m = Number(document.getElementById('newMonthSelect').value);
  const y = Number(document.getElementById('newYearSelect').value);
  const k = monthKey(y,m);
  if(!state.months[k]) state.months[k] = {days:{}};
  invalidatePlan();
  currentMonthKey = k;
  scheduleSave();
  document.getElementById('addMonthModal').classList.remove('open');
  renderAll();
};

/* ===================== MODAL: EDITAR MES ===================== */
function addMonthsToKey(key, delta){
  const [y,m] = key.split('-').map(Number);
  const total = y*12 + (m-1) + delta;
  const ny = Math.floor(total/12);
  const nm = (total%12) + 1;
  return monthKey(ny, nm);
}
function openEditMonthModal(){
  if(!currentMonthKey) return;
  const monthSel = document.getElementById('editMonthSelect');
  const yearSel = document.getElementById('editYearSelect');
  monthSel.innerHTML = '';
  MESES.forEach((name,idx)=>{
    const o = document.createElement('option'); o.value = idx+1; o.textContent = name;
    monthSel.appendChild(o);
  });
  yearSel.innerHTML = '';
  const [cy,cm] = currentMonthKey.split('-').map(Number);
  for(let y = cy-3; y <= cy+3; y++){
    const o = document.createElement('option'); o.value = y; o.textContent = y;
    yearSel.appendChild(o);
  }
  monthSel.value = cm; yearSel.value = cy;
  document.getElementById('editShiftFollowing').checked = true;
  document.getElementById('editMonthModal').classList.add('open');
}
document.getElementById('closeEditMonth').onclick = ()=> document.getElementById('editMonthModal').classList.remove('open');
document.getElementById('editMonthModal').addEventListener('click', e=>{ if(e.target.id==='editMonthModal') e.currentTarget.classList.remove('open'); });
document.getElementById('confirmEditMonth').onclick = ()=>{
  const newM = Number(document.getElementById('editMonthSelect').value);
  const newY = Number(document.getElementById('editYearSelect').value);
  const shiftFollowing = document.getElementById('editShiftFollowing').checked;
  const oldKey = currentMonthKey;
  const newKey = monthKey(newY, newM);
  if(newKey === oldKey){
    document.getElementById('editMonthModal').classList.remove('open');
    return;
  }
  const [oy,om] = oldKey.split('-').map(Number);
  const delta = (newY*12+(newM-1)) - (oy*12+(om-1));
  const keys = sortedMonthKeys();

  if(!shiftFollowing){
    if(state.months[newKey]){
      if(!confirm('Ya existe un mes guardado en '+MESES[newM-1]+' '+newY+'. ¿Sustituir sus datos por los de este mes?')) return;
    }
    state.months[newKey] = state.months[oldKey];
    delete state.months[oldKey];
    currentMonthKey = newKey;
  } else {
    // Desplaza este mes y todos los que van después (en orden cronológico) la misma cantidad de meses
    const idx = keys.indexOf(oldKey);
    const toShift = keys.slice(idx); // oldKey y todos los posteriores
    const untouched = keys.slice(0, idx);
    const newMonths = {};
    untouched.forEach(k=>{ newMonths[k] = state.months[k]; });
    // orden de reasignación seguro: si delta>0 recorrer de atrás hacia delante, si delta<0 de delante hacia atrás
    const ordered = delta > 0 ? [...toShift].reverse() : toShift;
    ordered.forEach(k=>{
      const shiftedKey = addMonthsToKey(k, delta);
      newMonths[shiftedKey] = state.months[k];
    });
    state.months = newMonths;
    currentMonthKey = newKey;
  }
  invalidatePlan();
  scheduleSave();
  document.getElementById('editMonthModal').classList.remove('open');
  renderAll();
};

/* ===================== TICKS (vueltas vistas + notas de test) ===================== */
const VUELTA_MODES = [
  ['pendiente','Pendiente'],
  ['nota','Nota test'],
  ['no_test','No test'],
  ['no_tiempo','No tiempo'],
  ['solo_lectura','Solo lectura'],
];
// Nota máxima según el grupo de temario: bloques y leves se puntúan sobre 10,
// inglés sobre 20 y psicotécnicos sobre 30.
const GROUP_MAX_NOTA = { Bloques:10, Leves:10, 'Inglés':20, 'Psicotécnicos':30 };
// Registro global: key de vuelta -> {grupo, label}. Lo rellenan renderBlocks/renderLeves/
// renderIngles/renderPsico cada vez que se pintan, y lo lee la pestaña «Progreso».
const KEY_LABELS = {};
function migrateTickEntry(v){
  if(v && typeof v === 'object'){
    if(v.mode===undefined || v.mode===null) v.mode = 'pendiente';
    if(v.nota===undefined) v.nota = null;
    if(v.comentario===undefined) v.comentario = '';
    if(v.fecha===undefined) v.fecha = null;
    if(!Array.isArray(v.extras)) v.extras = []; // notas adicionales (2ª, 3ª…) de la vuelta
    if(!Array.isArray(v.notasExtra)) v.notasExtra = []; // calificaciones adicionales (2º test, 3º…) de la vuelta
    // Inglés: cada vuelta puede llevar además el resultado de cada uno de los 4 tests del tema.
    if(v.textos !== undefined){
      if(v.textos && typeof v.textos === 'object' && !Array.isArray(v.textos)){
        Object.keys(v.textos).forEach(k=>{ v.textos[k] = migrateSlot(v.textos[k]); });
      } else { delete v.textos; }
    }
    return v;
  }
  return v ? {mode:'solo_lectura', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null} : {mode:'pendiente', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null};
}
/* ---- Inglés: cada tema (lección) tiene 4 tests ----
   Dentro de cada vuelta se puede elegir sobre qué se apunta el resultado: «Test general» (lo de
   siempre: los campos de la propia vuelta, entry.mode / entry.nota…) o «Test 1…4» (los 4 tests de cada tema), que se guardan
   en entry.textos = {'1':{mode,nota,notasExtra,comentario,extras}, …}. Cada uno tiene su propio
   estado (Pendiente / Nota test / No test / No tiempo / Solo lectura), sus notas de test y sus
   comentarios. Solo se crean cuando se usan; lo que ya tenías guardado no cambia. */
const INGLES_TEXTOS = ['1','2','3','4'];
function esKeyIngles(key){ return /^ingles-\d+$/.test(String(key)); }
function slotEtiqueta(id, corta){
  if(id === 'general') return corta ? 'G' : 'Test general';
  return (corta ? 'T' : 'Test ') + id;
}
function migrateSlot(v){
  if(!v || typeof v !== 'object') v = {};
  if(v.mode === undefined || v.mode === null) v.mode = 'pendiente';
  if(v.nota === undefined) v.nota = null;
  if(v.comentario === undefined) v.comentario = '';
  if(!Array.isArray(v.extras)) v.extras = [];
  if(!Array.isArray(v.notasExtra)) v.notasExtra = [];
  return v;
}
// Objeto sobre el que se edita: la propia vuelta (test general) o uno de sus 4 tests (se crea al usarlo).
function slotDe(entry, id){
  if(!id || id === 'general') return entry;
  if(!entry.textos || typeof entry.textos !== 'object' || Array.isArray(entry.textos)) entry.textos = {};
  entry.textos[id] = migrateSlot(entry.textos[id]);
  return entry.textos[id];
}
// Lista de lo que hay apuntado en la vuelta: el test general y los textos que existan (solo lectura).
function slotsDeVuelta(entry){
  const out = [{id:'general', s:entry}];
  INGLES_TEXTOS.forEach(id=>{ if(entry.textos && entry.textos[id]) out.push({id, s:entry.textos[id]}); });
  return out;
}
function slotVacio(s){
  return !s || (s.mode === 'pendiente' && !testsDeVuelta(s).length && !notasDeVuelta(s).length);
}
function podarTextos(entry){
  if(!entry.textos) return;
  Object.keys(entry.textos).forEach(k=>{ if(slotVacio(entry.textos[k])) delete entry.textos[k]; });
  if(!Object.keys(entry.textos).length) delete entry.textos;
}
// Una vuelta de inglés está «cerrada» si el test general ya no está pendiente o si los 4 tests tienen ya algo.
function vueltaInglesCerrada(entry){
  if(entry.mode !== 'pendiente') return true;
  return INGLES_TEXTOS.every(id=> entry.textos && entry.textos[id] && entry.textos[id].mode !== 'pendiente');
}
const _slotSel = {}; // «ingles-3#0» -> 'general' | '1'…'4': qué test/texto se está viendo (solo mientras la app está abierta)
function slotElegido(key, i){ return _slotSel[key+'#'+i] || 'general'; }
function marcaNotasSlotTxt(s){
  const n = notasDeVuelta(s).length;
  return n ? ' 📝'+(n>1 ? n : '') : '';
}
// Desplegable «¿Qué test?»: Test general / Test 1 / … / Test 4, con el resumen de cada uno.
function buildTextoPicker(entry, key, i, alCambiar){
  const sel = document.createElement('select'); sel.className = 'vuelta-select vuelta-texto-select';
  sel.setAttribute('aria-label', 'Elegir el test general o uno de los 4 tests de la vuelta '+(i+1));
  const actual = slotElegido(key, i);
  ['general'].concat(INGLES_TEXTOS).forEach(id=>{
    const sl = id === 'general' ? entry : (entry.textos && entry.textos[id]);
    const o = document.createElement('option'); o.value = id;
    o.textContent = slotEtiqueta(id)+' ('+(sl ? vueltaResumenTxt(sl) : 'pendiente')+')'+(sl ? marcaNotasSlotTxt(sl) : '');
    if(id === actual) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = ()=>{
    _slotSel[key+'#'+i] = sel.value;
    podarTextos(entry);   // el test que dejas atrás, si está vacío, no se guarda
    scheduleSave();
    alCambiar();
  };
  return sel;
}
// Vuelve a escribir las etiquetas de los desplegables (vuelta y texto) sin reconstruir el control.
function refrescarEtiquetasIngles(numSel, textoSel, arr, key, idx){
  if(numSel){
    const opt = numSel.options[idx];
    if(opt) opt.textContent = 'Vuelta '+(idx+1)+' ('+vueltaResumenTxt(arr[idx], key)+')'+marcaNotasTxt(arr[idx]);
  }
  if(textoSel){
    const entry = arr[idx];
    Array.from(textoSel.options).forEach(o=>{
      const sl = o.value === 'general' ? entry : (entry.textos && entry.textos[o.value]);
      o.textContent = slotEtiqueta(o.value)+' ('+(sl ? vueltaResumenTxt(sl) : 'pendiente')+')'+(sl ? marcaNotasSlotTxt(sl) : '');
    });
  }
}
/* Calificaciones de los tests de una vuelta. Puede haber varias si haces más de un test en la
   misma vuelta: la primera sigue guardándose en entry.nota, como siempre, y las demás en
   entry.notasExtra. Progreso cuenta cada test como una nota más (media y gráfico). */
function testsDeVuelta(entry){
  const out = [];
  [entry.nota].concat(Array.isArray(entry.notasExtra) ? entry.notasExtra : []).forEach(n=>{
    if(n!=null && n!=='' && !isNaN(n)) out.push(Number(n));
  });
  return out;
}
/* Campos de nota de una vuelta (uno por test) + botón «+ Otro test». Si dejas un test vacío y
   sales de él, se quita solo. callbacks.onChange se llama en cada cambio (para refrescar
   etiquetas) y callbacks.onCommit al terminar de editar (para repintar el resto de la app). */
function buildTestsVuelta(entry, maxNota, ariaBase, callbacks){
  callbacks = callbacks || {};
  const cont = document.createElement('span'); cont.className = 'vuelta-tests';
  const items = testsDeVuelta(entry).map(v=>({v}));
  if(!items.length) items.push({v:null});
  const guardar = ()=>{
    entry.nota = items[0].v;
    entry.notasExtra = items.slice(1).map(x=>x.v);
    scheduleSave();
    if(callbacks.onChange) callbacks.onChange();
  };
  const commit = ()=>{
    if(cont.contains(document.activeElement)) return; // sigue editando otro test de esta vuelta
    const antes = items.length;
    for(let i=items.length-1;i>=0;i--){ if(items[i].v==null && items.length>1) items.splice(i,1); }
    if(items.length !== antes){ pintar(); guardar(); }
    if(callbacks.onCommit) callbacks.onCommit();
  };
  const pintar = (enfocar)=>{
    const act = document.activeElement;
    const activo = enfocar || (act && act._test) || null; // no perder el cursor al repintar
    cont.innerHTML = '';
    items.forEach((it,i)=>{
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className = 'vuelta-nota'; inp.step = '0.1'; inp.min = '0'; inp.max = String(maxNota);
      inp.placeholder = items.length > 1 ? 'Test '+(i+1) : 'Nota';
      inp.setAttribute('aria-label', ariaBase+(items.length>1 ? ' — test '+(i+1) : ''));
      inp.value = it.v==null ? '' : it.v;
      inp._test = it;
      inp.oninput = ()=>{ it.v = inp.value==='' ? null : Number(inp.value); guardar(); };
      inp.onblur = ()=>{ setTimeout(commit, 200); };
      cont.appendChild(inp);
      if(activo === it) inp.focus();
    });
    const maxLbl = document.createElement('span'); maxLbl.className = 'vuelta-nota-max'; maxLbl.textContent = '/ '+maxNota;
    cont.appendChild(maxLbl);
    const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'tick-add tick-add-test';
    addBtn.textContent = '+ Otro test';
    addBtn.setAttribute('aria-label', 'Añadir la nota de otro test en esta vuelta');
    addBtn.onclick = (e)=>{
      e.preventDefault();
      const vacio = items.find(x=>x.v==null);
      if(vacio){ pintar(vacio); return; }
      const it = {v:null};
      items.push(it);
      pintar(it);
    };
    cont.appendChild(addBtn);
  };
  pintar();
  return cont;
}
/* Notas de una vuelta. Puede haber varias (por ejemplo, una por cada test que hagas en esa
   vuelta). La primera sigue guardándose en entry.comentario, como siempre, y las demás en
   entry.extras, así que lo que ya tenías escrito no cambia. Devuelve {boxes, addBtn}: el botón
   va donde quieras (junto a los desplegables) y las cajas debajo. Si dejas una nota vacía y
   sales de ella, se quita sola. */
function notasDeVuelta(entry){
  const out = [];
  if(entry.comentario && entry.comentario.trim()) out.push(entry.comentario);
  (Array.isArray(entry.extras) ? entry.extras : []).forEach(t=>{ if(t && t.trim()) out.push(t); });
  return out;
}
function marcaNotasTxt(entry){
  let n = notasDeVuelta(entry).length;
  if(entry.textos) INGLES_TEXTOS.forEach(id=>{ if(entry.textos[id]) n += notasDeVuelta(entry.textos[id]).length; });
  return n ? ' 📝'+(n>1 ? n : '') : '';
}
function buildNotasVuelta(entry, ariaBase, onChange){
  const boxes = document.createElement('div'); boxes.className = 'vuelta-notas';
  const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'tick-add tick-add-nota';
  const items = notasDeVuelta(entry).map(t=>({t}));
  const guardar = ()=>{
    const vals = items.map(it=>it.t);
    entry.comentario = vals.length ? vals[0] : '';
    entry.extras = vals.slice(1);
    scheduleSave();
    if(onChange) onChange();
  };
  const pintar = (enfocar)=>{
    const act = document.activeElement;
    const activo = enfocar || (act && act._nota) || null; // no perder el cursor al repintar
    boxes.innerHTML = '';
    items.forEach((it,i)=>{
      const box = document.createElement('div'); box.className = 'vuelta-nota-box';
      if(items.length > 1){
        const etq = document.createElement('div'); etq.className = 'vuelta-nota-etq'; etq.textContent = 'Nota '+(i+1);
        box.appendChild(etq);
      }
      const ta = document.createElement('textarea'); ta.className = 'note-inline vuelta-comentario';
      ta.placeholder = i===0 ? 'Notas de esta vuelta / de este test…' : 'Nota '+(i+1)+' (por ejemplo, otro test de esta vuelta)…';
      ta.setAttribute('aria-label', ariaBase+(items.length>1 ? ' — nota '+(i+1) : ''));
      ta.value = it.t;
      ta._nota = it;
      ta.oninput = ()=>{ it.t = ta.value; guardar(); };
      // Si al salir de la caja no hay nada escrito, se quita (con un pequeño margen para no
      // "comerse" el clic si justo pulsabas otro botón).
      ta.onblur = ()=>{
        setTimeout(()=>{
          const pos = items.indexOf(it);
          if(pos !== -1 && !it.t.trim()){ items.splice(pos,1); pintar(); guardar(); }
        }, 180);
      };
      box.appendChild(ta);
      boxes.appendChild(box);
      if(activo === it) ta.focus();
    });
    addBtn.textContent = items.length ? '📝 Otra nota' : '📝 Añadir nota';
    addBtn.setAttribute('aria-label', items.length ? 'Añadir otra nota a esta vuelta' : 'Añadir una nota a esta vuelta');
  };
  addBtn.onclick = (e)=>{
    e.preventDefault();
    const vacia = items.find(x=>!x.t.trim());
    if(vacia){ pintar(vacia); return; }
    const it = {t:''};
    items.push(it);
    pintar(it);
  };
  pintar();
  return {boxes, addBtn};
}
function buildTicksRow(key, maxNota){
  maxNota = maxNota || 10;
  if(!state.ticks[key]) state.ticks[key] = new Array(6).fill(null).map(()=>({mode:'pendiente', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null}));
  state.ticks[key] = state.ticks[key].map(migrateTickEntry);
  const arr = state.ticks[key];
  const esIng = esKeyIngles(key);
  const wrap = document.createElement('div'); wrap.className='ticks-row';
  const rehacer = ()=> wrap.replaceWith(buildTicksRow(key, maxNota));
  arr.forEach((entry,i)=>{
    // Inglés: se edita el «Test general» (la propia vuelta) o uno de los 4 tests, según el desplegable.
    const selId = esIng ? slotElegido(key, i) : 'general';
    const target = esIng ? slotDe(entry, selId) : entry;
    const etqTarget = esIng ? ' — '+slotEtiqueta(selId) : '';
    const row = document.createElement('div'); row.className='vuelta-row mode-'+target.mode;
    const headline = document.createElement('div'); headline.className='quick-vuelta-headline';
    const lbl = document.createElement('span'); lbl.className='vuelta-lbl'; lbl.textContent = 'Vuelta '+(i+1);
    headline.appendChild(lbl);
    if(entry.fecha){
      const pin = document.createElement('span'); pin.className='vuelta-pin';
      pin.textContent = '📌 '+formatFechaEs(entry.fecha);
      pin.title = 'Esta vuelta quedó anclada al día '+formatFechaEs(entry.fecha)+' del calendario.';
      headline.appendChild(pin);
    }
    if(esIng) headline.appendChild(buildTextoPicker(entry, key, i, rehacer));
    row.appendChild(headline);

    const sel = document.createElement('select'); sel.className='vuelta-select';
    sel.setAttribute('aria-label', 'Estado de la vuelta '+(i+1)+etqTarget);
    VUELTA_MODES.forEach(([val,txt])=>{
      const o = document.createElement('option'); o.value=val; o.textContent=txt;
      if(target.mode===val) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = ()=>{
      target.mode = sel.value;
      if(target.mode !== 'nota'){ target.nota = null; target.notasExtra = []; }
      if(target.mode === 'pendiente' && target === entry) entry.fecha = null; // libera el anclaje si se vuelve a dejar pendiente
      scheduleSave();
      rehacer();
    };
    row.appendChild(sel);

    if(target.mode === 'nota'){
      row.appendChild(buildTestsVuelta(target, maxNota, 'Nota del test de la vuelta '+(i+1)+etqTarget));
    }

    // Notas de esta vuelta en concreto (no la general del tema): dudas, fallos del test, lo que
    // quieras recordar de este pase por el tema. Puedes poner varias (una por test, por ejemplo).
    // En inglés van ligadas al test/texto elegido.
    const notas = buildNotasVuelta(target, 'Notas de la vuelta '+(i+1)+etqTarget);
    row.appendChild(notas.addBtn);

    if(arr.length > 1){
      const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.className='vuelta-del';
      delBtn.textContent='✕'; delBtn.title='Eliminar esta vuelta';
      delBtn.onclick = ()=>{ arr.splice(i,1); scheduleSave(); rehacer(); };
      row.appendChild(delBtn);
    }
    row.appendChild(notas.boxes);

    wrap.appendChild(row);
  });
  const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='tick-add'; addBtn.textContent='+ Añadir vuelta';
  addBtn.onclick = (e)=>{ e.preventDefault(); arr.push({mode:'pendiente', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null}); scheduleSave(); rehacer(); };
  wrap.appendChild(addBtn);
  return wrap;
}
/* Control compacto para marcar el estado de un tema (nota test / no test / no tiempo /
   solo lectura) desde fuera de la pestaña Temario — se usa en el modal del día del
   calendario, al lado de cada tema concreto que toque ese día. Escribe en el MISMO sitio
   que lee la pestaña Temario y notas (state.ticks[key]), así que todo queda sincronizado
   automáticamente: no hay que "pasarlo" a ningún otro sitio a mano.
   Sencillo y directo: un desplegable arriba deja elegir QUÉ vuelta quieres ver (Vuelta 1,
   Vuelta 2...), y debajo aparece al momento su estado real (Pendiente / Nota test / No
   test / No tiempo / Solo lectura), su nota si la tiene y su comentario — tal cual esté
   guardado. Elegir una vuelta en el desplegable solo la muestra; no guarda ni ancla nada
   por sí sola, ni salta nunca sola a otra vuelta distinta de la que tú elijas. */
function ensureTicksArray(key){
  if(!state.ticks[key]) state.ticks[key] = new Array(6).fill(null).map(()=>({mode:'pendiente', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null}));
  state.ticks[key] = state.ticks[key].map(migrateTickEntry);
  return state.ticks[key];
}
function vueltaResumenTxt(entry, key){
  // Inglés: resumen de todo lo apuntado en la vuelta (test general y textos), p. ej. «G 16 · T1 15 · T3 no tiempo».
  if(key !== undefined && esKeyIngles(key)){
    const partes = slotsDeVuelta(entry).filter(x=> x.s.mode !== 'pendiente').map(x=>{
      let txt;
      if(x.s.mode === 'nota'){ const t = testsDeVuelta(x.s); txt = t.length ? t.join('/') : 'nota test'; }
      else { const f = VUELTA_MODES.find(m=>m[0]===x.s.mode); txt = f ? f[1].toLowerCase() : x.s.mode; }
      return slotEtiqueta(x.id, true)+' '+txt;
    });
    return partes.length ? partes.join(' · ') : 'pendiente';
  }
  if(entry.mode==='pendiente') return 'pendiente';
  if(entry.mode==='nota'){ const t = testsDeVuelta(entry); return t.length ? 'nota test: '+t.join(' · ') : 'nota test'; }
  const found = VUELTA_MODES.find(m=>m[0]===entry.mode);
  return found ? found[1].toLowerCase() : entry.mode;
}
function buildQuickVueltaControl(key, maxNota, fechaISO, onChanged, selectedIdx){
  maxNota = maxNota || 10;
  const arr = ensureTicksArray(key);
  const esIng = esKeyIngles(key);
  // Vuelta que se muestra por defecto: la primera sin cerrar (en inglés, «cerrada» = test general
  // ya apuntado o los 4 tests ya apuntados).
  let idx = (typeof selectedIdx === 'number' && arr[selectedIdx]) ? selectedIdx
    : arr.findIndex(e=> esIng ? !vueltaInglesCerrada(e) : e.mode==='pendiente');
  if(idx===-1) idx = arr.length-1;
  const entry = arr[idx];
  const selId = esIng ? slotElegido(key, idx) : 'general';
  const target = esIng ? slotDe(entry, selId) : entry;
  const etqTarget = esIng ? ' — '+slotEtiqueta(selId) : '';
  const wrap = document.createElement('div'); wrap.className = 'vuelta-row quick-vuelta mode-'+target.mode;

  const refrescar = (nuevoIdx)=>{
    const fresh = buildQuickVueltaControl(key, maxNota, fechaISO, onChanged, nuevoIdx===undefined?idx:nuevoIdx);
    wrap.replaceWith(fresh);
    if(onChanged) onChanged(fresh);
    return fresh;
  };

  // Desplegable para elegir directamente qué vuelta quieres ver/editar, con un resumen de
  // cada una para no tener que ir cambiando a ciegas.
  const headline = document.createElement('div'); headline.className='quick-vuelta-headline';
  const numSel = document.createElement('select'); numSel.className='vuelta-select vuelta-num-select';
  numSel.setAttribute('aria-label','Elegir vuelta de este tema');
  arr.forEach((e,i)=>{
    const o = document.createElement('option'); o.value=String(i);
    o.textContent = 'Vuelta '+(i+1)+' ('+vueltaResumenTxt(e, key)+')'+marcaNotasTxt(e);
    if(i===idx) o.selected = true;
    numSel.appendChild(o);
  });
  numSel.onchange = ()=>{ podarTextos(entry); refrescar(Number(numSel.value)); };
  headline.appendChild(numSel);
  // Inglés: dentro de la vuelta, qué test has hecho (Test general o Test 1-4).
  let textoSel = null;
  if(esIng){
    textoSel = buildTextoPicker(entry, key, idx, ()=> refrescar());
    headline.appendChild(textoSel);
  }
  wrap.appendChild(headline);

  const sel = document.createElement('select'); sel.className='vuelta-select';
  sel.setAttribute('aria-label', 'Estado de la vuelta '+(idx+1)+' de este tema'+etqTarget);
  VUELTA_MODES.forEach(([val,txt])=>{
    const o = document.createElement('option'); o.value=val; o.textContent=txt;
    if(target.mode===val) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = ()=>{
    target.mode = sel.value;
    if(target.mode !== 'nota'){ target.nota = null; target.notasExtra = []; }
    scheduleSave();
    // Primero se actualiza este control (para que el desplegable no se quede "colgado"
    // aunque falle algo más adelante), y solo después se repinta el resto de la app.
    refrescar();
    try{ renderAll(); }catch(err){ try{ console.error('Error al repintar tras cambiar una vuelta', err); }catch(e){} }
  };
  wrap.appendChild(sel);

  if(target.mode === 'nota'){
    const actualizaOpcion = ()=>{ refrescarEtiquetasIngles(numSel, textoSel, arr, key, idx); if(!esIng){ const opt = numSel.options[idx]; if(opt) opt.textContent = 'Vuelta '+(idx+1)+' ('+vueltaResumenTxt(entry)+')'+marcaNotasTxt(entry); } };
    wrap.appendChild(buildTestsVuelta(target, maxNota, 'Nota del test de la vuelta '+(idx+1)+etqTarget, {
      onChange: actualizaOpcion,
      // No repintamos en cada pulsación (perderíamos el foco mientras escribes el número); al
      // terminar de editar sí actualizamos Progreso y demás pestañas con la nota ya puesta.
      onCommit: ()=>{ try{ renderAll(); }catch(err){ try{ console.error('Error al repintar tras guardar una nota', err); }catch(e){} } }
    }));
  }

  // Notas de esta vuelta (en inglés, del test/texto elegido). Para no llenar el día de cajas
  // vacías, solo se ven las que ya tienen algo escrito; el botón «Añadir nota» abre una nueva (y
  // con «Otra nota» puedes poner más de una). Se guardan en el mismo sitio que las de la pestaña Temario.
  const notas = buildNotasVuelta(target, 'Notas de la vuelta '+(idx+1)+' de este tema'+etqTarget, ()=>{
    // Pone/quita la marca 📝 de esta vuelta en los desplegables sin reconstruir el control.
    if(esIng) refrescarEtiquetasIngles(numSel, textoSel, arr, key, idx);
    else { const opt = numSel.options[idx]; if(opt) opt.textContent = 'Vuelta '+(idx+1)+' ('+vueltaResumenTxt(entry)+')'+marcaNotasTxt(entry); }
  });
  wrap.appendChild(notas.addBtn);

  // Por si ya has usado todas las vueltas que había y necesitas una más.
  const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='tick-add tick-add-vuelta';
  addBtn.textContent = '+ Añadir vuelta';
  addBtn.onclick = (e)=>{
    e.preventDefault();
    podarTextos(entry);
    arr.push({mode:'pendiente', nota:null, comentario:'', extras:[], notasExtra:[], fecha:null});
    scheduleSave();
    refrescar(arr.length-1);
  };
  wrap.appendChild(addBtn);
  wrap.appendChild(notas.boxes);

  return wrap;
}
function buildNoteBox(key, placeholder){
  const ta = document.createElement('textarea');
  ta.className='note-inline'; ta.placeholder = placeholder || 'Notas de este tema…';
  ta.value = state.notes[key] || '';
  ta.oninput = ()=>{ state.notes[key] = ta.value; scheduleSave(); };
  return ta;
}

/* ===================== RENDER: TEMARIO ===================== */
// Recuerda qué secciones están desplegadas entre renderizados (por defecto, todas cerradas).
const temarioOpen = {bloques:false, leves:false, ingles:false, psico:false, orto:false};
function renderAccordionSection(host, key, titleText, buildFn){
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.id = 'temario-section-'+key;
  wrap.className = 'temario-section' + (temarioOpen[key] ? ' open' : '');
  const head = document.createElement('div'); head.className = 'temario-section-head';
  head.innerHTML = `<h3>${titleText}</h3><div class="chev">${temarioOpen[key] ? '▴' : '▾'}</div>`;
  const body = document.createElement('div'); body.className = 'temario-section-body';
  head.onclick = ()=>{
    temarioOpen[key] = !temarioOpen[key];
    wrap.classList.toggle('open', temarioOpen[key]);
    head.querySelector('.chev').textContent = temarioOpen[key] ? '▴' : '▾';
  };
  wrap.appendChild(head); wrap.appendChild(body);
  host.appendChild(wrap);
  buildFn(body);
}
/* ---- Helpers genéricos compartidos por Bloques / Leves / Inglés / Psicotécnicos ----
   Los cuatro apartados repetían el mismo patrón: registrar la entrada en KEY_LABELS
   y montar una caja de notas + una fila de vueltas (buildTicksRow). Estas dos funciones
   concentran esa lógica común; el HTML/CSS resultante es idéntico al de antes. */
function buildTemaControls(key, grupo, label, notePlaceholder){
  KEY_LABELS[key] = {grupo, label, max:GROUP_MAX_NOTA[grupo]};
  const frag = document.createDocumentFragment();
  frag.appendChild(buildNoteBox(key, notePlaceholder));
  frag.appendChild(buildTicksRow(key, GROUP_MAX_NOTA[grupo]));
  return frag;
}
function buildFlatItem(key, grupo, label, headHTML, notePlaceholder){
  const item = document.createElement('div'); item.className='flat-item'; item.id='temarow-'+key;
  item.innerHTML = '<div class="fi-head">'+headHTML+'</div>';
  item.appendChild(buildTemaControls(key, grupo, label, notePlaceholder));
  return item;
}
function renderFlatSection(hostId, sectionKey, title, grupo, buildItems){
  const host = document.getElementById(hostId);
  renderAccordionSection(host, sectionKey, title, (body)=>{
    const grid = document.createElement('div'); grid.className='flat-grid';
    buildItems(grid, grupo);
    body.appendChild(grid);
  });
}
const _bloquesAbiertos = new Set(); // bloques desplegados en «Temario y notas»: se recuerdan al repintar
function renderBlocks(){
  const host = document.getElementById('blocksHost');
  renderAccordionSection(host, 'bloques', 'Bloques', (body)=>{
    Object.keys(BLOCKS).map(Number).sort((a,b)=>a-b).forEach(num=>{
      const b = BLOCKS[num];
      const card = document.createElement('div'); card.className='block-card'; card.id='blockcard-'+num;
      const head = document.createElement('div'); head.className='block-head';
      head.innerHTML = `
        <div class="block-title">
          <div class="block-num ${b.graves?'':'mg'}">${num}</div>
          <div><h4>Bloque ${num}</h4><div class="kind">${b.graves?'Grave · días impares':'Menos grave · días pares'}</div></div>
        </div>
        <div class="chev">▾</div>`;
      const bbody = document.createElement('div'); bbody.className='block-body';
      if(_bloquesAbiertos.has(num)){ bbody.classList.add('open'); head.querySelector('.chev').textContent = '▴'; }
      // Reordenamos visualmente por color (azul primero, morado después) sin tocar el
      // índice original de cada tema: las notas ya guardadas siguen ligadas a su mismo
      // noteKey ('b'+num+'-'+idx), calculado siempre sobre la posición original en b.temas.
      const temasOrdenados = b.temas
        .map((t,idx)=>({t, idx}))
        .sort((a,c)=>{
          const rank = (color)=> color==='azul' ? 0 : (color==='morado' ? 1 : 2);
          return rank(a.t.color) - rank(c.t.color);
        });
      let colorGrupoActual = null;
      temasOrdenados.forEach(({t, idx})=>{
        if(t.color && t.color!==colorGrupoActual){
          colorGrupoActual = t.color;
          const label = document.createElement('div'); label.className='tema-group-label';
          label.innerHTML = '<span class="colorpill '+t.color+'">'+t.color+'</span><span>Grupo '+t.color+'</span>';
          bbody.appendChild(label);
        }
        if(t.type==='armas_explosivos'){
          [['armas', t.armas, 'ARM'], ['explosivos', t.explosivos, 'EXP']].forEach(([sub,label,tag])=>{
            const noteKey = 'b'+num+'-'+idx+'-'+sub;
            const row = document.createElement('div'); row.className='tema-row'; row.id='temarow-'+noteKey;
            row.innerHTML = `<div class="tema-head"><span class="tema-name">${t.clase||label}<span class="rot-pill">${tag} · alterna cada vuelta</span></span><span class="tema-clase">${t.clase?label:''}</span></div>`;
            row.appendChild(buildTemaControls(noteKey, 'Bloques', 'B'+num+' · '+(t.clase||label)));
            bbody.appendChild(row);
          });
          return;
        }
        const noteKey = 'b'+num+'-'+idx;
        const row = document.createElement('div'); row.className='tema-row'; row.id='temarow-'+noteKey;
        row.innerHTML = `<div class="tema-head"><span class="tema-name">${t.clase||t.nombre}<span class="colorpill ${t.color}">${t.color}</span></span><span class="tema-clase">${t.clase?t.nombre:''}</span></div>`;
        row.appendChild(buildTemaControls(noteKey, 'Bloques', 'B'+num+' · '+(t.clase||t.nombre)));
        bbody.appendChild(row);
      });
      head.onclick = ()=>{
        bbody.classList.toggle('open');
        head.querySelector('.chev').textContent = bbody.classList.contains('open')?'▴':'▾';
        if(bbody.classList.contains('open')) _bloquesAbiertos.add(num); else _bloquesAbiertos.delete(num);
      };
      card.appendChild(head); card.appendChild(bbody);
      body.appendChild(card);
    });
  });
}
function temaNumFromClase(clase){
  if(!clase) return '';
  const m = String(clase).match(/^(\d+)/);
  return m ? 'TEMA '+m[1] : '';
}
function renderLeves(){
  renderFlatSection('levesHost', 'leves', 'Leves (ciclo 1–17)', 'Leves', (grid)=>{
    LEVES.forEach((t,idx)=>{
      if(t.type==='l39_l40'){
        [['l39', t.l39], ['l40', t.l40]].forEach(([sub,label])=>{
          const key = 'leve-'+idx+'-'+sub;
          const headHTML = `<span class="fi-name">LEVE Nº${idx+1}: ${label}<span class="rot-pill">alterna cada vuelta</span></span><span class="fi-clase">${temaNumFromClase(t.clase)}</span>`;
          grid.appendChild(buildFlatItem(key, 'Leves', (idx+1)+'. '+(t.clase||label), headHTML));
        });
        return;
      }
      const key = 'leve-'+idx;
      const headHTML = `<span class="fi-name">LEVE Nº${idx+1}: ${t.nombre}</span><span class="fi-clase">${temaNumFromClase(t.clase)}</span>`;
      grid.appendChild(buildFlatItem(key, 'Leves', (idx+1)+'. '+(t.clase||t.nombre), headHTML));
    });
  });
}
function renderIngles(){
  renderFlatSection('inglesHost', 'ingles', 'Inglés (ciclo 1–32) · notas sobre 20', 'Inglés', (grid)=>{
    for(let i=1;i<=INGLES_TOTAL;i++){
      const key = 'ingles-'+i;
      grid.appendChild(buildFlatItem(key, 'Inglés', 'Tema '+i, `<span class="fi-name">Tema ${i}</span>`));
    }
  });
}
function renderPsico(){
  renderFlatSection('psicoHost', 'psico', 'Psicotécnicos (ciclo 1–23 + controles) · notas sobre 30', 'Psicotécnicos', (grid)=>{
    PSICO_ITEMS.forEach((name,idx)=>{
      const key = 'psico-'+idx;
      grid.appendChild(buildFlatItem(key, 'Psicotécnicos', name, `<span class="fi-name">${name}</span>`));
    });
  });
}
function renderOrto(){
  const host = document.getElementById('ortoHost');
  renderAccordionSection(host, 'orto', 'Ortografía y gramática', (body)=>{
  const grid = document.createElement('div'); grid.className='flat-grid orto-grid';

  const mk = (label, field) => {
    if(!state.ortoTests[field]) state.ortoTests[field] = [];
    const tests = state.ortoTests[field];
    const item = document.createElement('div'); item.className='flat-item orto-block';

    const head = document.createElement('div'); head.className='fi-head';
    head.innerHTML = `<span class="fi-name">${label}</span>`;
    item.appendChild(head);

    const countWrap = document.createElement('div'); countWrap.className='orto-count';
    item.appendChild(countWrap);

    const list = document.createElement('div'); list.className='orto-test-list';
    item.appendChild(list);

    const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='tick-add'; addBtn.textContent='+ Añadir test';
    addBtn.onclick = ()=>{ tests.push({resultado:'APTO'}); scheduleSave(); paint(); };
    item.appendChild(addBtn);

    function paint(){
      const noAptos = tests.filter(t=>t.resultado==='NO_APTO').length;
      countWrap.innerHTML = tests.length
        ? `<span class="nota-pill ${noAptos?'bad':'good'}">${noAptos} NO APTO${noAptos!==1?'S':''} de ${tests.length}</span>`
        : '<span style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">Sin tests todavía</span>';
      list.innerHTML = '';
      tests.forEach((t,i)=>{
        const row = document.createElement('div'); row.className='orto-test-row';
        const lbl = document.createElement('span'); lbl.textContent = 'Test '+(i+1);
        row.appendChild(lbl);
        const sel = document.createElement('select'); sel.className='vuelta-select';
        sel.setAttribute('aria-label', 'Resultado del test '+(i+1));
        [['APTO','Apto'],['NO_APTO','No apto']].forEach(([val,txt])=>{
          const o = document.createElement('option'); o.value=val; o.textContent=txt;
          if(t.resultado===val) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = ()=>{ t.resultado = sel.value; scheduleSave(); paint(); };
        row.appendChild(sel);
        const del = document.createElement('button'); del.type='button'; del.className='vuelta-del'; del.title='Eliminar este test';
        del.textContent='✕';
        del.onclick = ()=>{ tests.splice(i,1); scheduleSave(); paint(); };
        row.appendChild(del);
        list.appendChild(row);
      });
    }
    paint();
    grid.appendChild(item);
  };
  mk('Ortografía','ortografia'); mk('Gramática','gramatica');
  body.appendChild(grid);
  });
}

/* ===================== ARRASTRE (repaso acumulado por vuelta) ===================== */
// Recorre el calendario real, desde el primer día guardado hasta AYER (a día vencido: el día
// de hoy no cuenta todavía, aunque ya hayas marcado sus tareas, hasta que empiece el día
// siguiente), para saber qué temas ya se han estudiado en la vuelta que está abierta ahora
// mismo en cada grupo: bloques graves (1-5), bloques menos graves (6-12), leves, inglés y
// psicotécnicos. Cada grupo tiene su propia "vuelta" independiente (una vuelta = pasar una vez
// por todo el ciclo de ese grupo). Un día cuenta como completado con el mismo criterio que ya
// usa el resto de la app para avanzar el planning: si no lo has marcado como NO completado, se
// da por hecho.
const ARRASTRE_POOL_META = {
  graves:  {shortTitle:'Graves',        title:'Bloques graves (1–5)',         sub:'Días impares · una vuelta = pasar una vez por los bloques 1 a 5 (azul y morado)'},
  mgraves: {shortTitle:'Menos graves',  title:'Bloques menos graves (6–12)',  sub:'Días pares · una vuelta = pasar una vez por los bloques 6 a 12 (azul y morado)'},
  leves:   {shortTitle:'Leves',         title:'Leves',                         sub:'Una vuelta = pasar una vez por los 17 leves del ciclo'},
  ingles:  {shortTitle:'Inglés',        title:'Inglés',                        sub:'Una vuelta = pasar una vez por los 32 temas del ciclo'},
  psico:   {shortTitle:'Psicotécnicos', title:'Psicotécnicos',                 sub:'Una vuelta = pasar una vez por las 23 pruebas + los 2 controles'}
};
// Etiqueta visual (mismos colores que ya usa el Calendario) para distinguir de un vistazo
// grave/menos grave/leve cuando van mezclados dentro de "Conocimientos".
const ARRASTRE_POOL_TAG = {
  graves:'tag-grave', mgraves:'tag-mgrave', leves:'tag-leve', ingles:'tag-ing', psico:'tag-psico'
};
const ARRASTRE_POOL_LABEL = {
  graves:'GRAVE', mgraves:'MENOS GRAVE', leves:'LEVE', ingles:'INGLÉS', psico:'PSICO'
};
// Marcas de "ya repasado hoy" dentro de la pestaña Arrastre: es solo para ir tachando durante
// una sesión de repaso en vivo, NO se guarda en Firebase ni en localStorage — vive únicamente
// en memoria, así que se reinicia sola en cuanto se recarga o se vuelve a abrir la app.
let arrastreChecked = {};

// Agrupación para la pestaña Arrastre: graves + menos graves + leves se enseñan juntos bajo
// "Conocimientos" (aunque cada uno sigue llevando su propia vuelta por dentro), e inglés y
// psicotécnicos se quedan cada uno en su propio bloque. Así el test de arrastre queda en solo
// 3 apartados en vez de 5.
const ARRASTRE_GROUPS = [
  {key:'conocimientos', title:'Conocimientos', pools:['graves','mgraves','leves'], manualPools:['conocimientos']},
  {key:'ingles', title:'Inglés', pools:['ingles'], manualPools:['ingles']},
  {key:'psico', title:'Psicotécnicos', pools:['psico'], manualPools:['psico']}
];
// Catálogo de temas "elegibles" para añadir a mano en Arrastre, por pool: el mismo
// contenido que ya usa la automatización (bloques/leves/inglés/psicotécnicos), para
// poder añadir manualmente un tema concreto sin escribirlo a mano.
function arrastreManualCatalog(poolKey){
  const out = [];
  if(poolKey==='graves' || poolKey==='mgraves'){
    const nums = poolKey==='graves' ? GRAVES_ORDER : MGRAVES_ORDER;
    nums.forEach(num=>{
      const b = BLOCKS[num];
      if(!b) return;
      b.temas.forEach(t=>{
        if(t.type==='armas_explosivos'){
          out.push({value:'b'+num+'-arm-'+(t.clase||t.armas), nombre:t.armas, clase:t.clase, grupo:'B'+num, color:t.color});
          out.push({value:'b'+num+'-exp-'+(t.clase||t.explosivos), nombre:t.explosivos, clase:t.clase, grupo:'B'+num, color:t.color});
        } else {
          out.push({value:'b'+num+'-'+(t.clase||t.nombre), nombre:t.nombre, clase:t.clase, grupo:'B'+num, color:t.color});
        }
      });
    });
  } else if(poolKey==='leves'){
    LEVES.forEach((it,idx)=>{
      if(it.type==='l39_l40'){
        out.push({value:'leve-'+idx+'-l39', nombre:it.l39, clase:it.clase, grupo:'LEVE Nº'+(idx+1)});
        out.push({value:'leve-'+idx+'-l40', nombre:it.l40, clase:it.clase, grupo:'LEVE Nº'+(idx+1)});
      } else {
        out.push({value:'leve-'+idx, nombre:it.nombre, clase:it.clase, grupo:'LEVE Nº'+(idx+1)});
      }
    });
  } else if(poolKey==='ingles'){
    for(let i=1;i<=INGLES_TOTAL;i++) out.push({value:'ingles-'+i, nombre:'Tema '+i, clase:'', grupo:''});
  } else if(poolKey==='psico'){
    PSICO_ITEMS.forEach((name,idx)=> out.push({value:'psico-'+idx, nombre:name, clase:'', grupo:''}));
  } else if(poolKey==='conocimientos'){
    // Temario real de Teoría (el mismo que usas para elegir temas en los test), no los
    // bloques de esta app: es el catálogo que pediste para el desplegable de Conocimientos.
    TEMARIO_GENERAL.forEach(tema=>{
      const grupoLabel = tema.num+'. '+tema.titulo;
      if(tema.subtemas && tema.subtemas.length){
        tema.subtemas.forEach((sub,i)=>{
          out.push({value:'tg-'+tema.num+'-'+i, nombre:sub, clase:tema.num, grupo:grupoLabel});
        });
      } else {
        out.push({value:'tg-'+tema.num, nombre:tema.titulo, clase:tema.num, grupo:grupoLabel});
      }
    });
  }
  return out;
}
function computeArrastreData(asOfDayKey){
  const pools = {};
  Object.keys(ARRASTRE_POOL_META).forEach(k=>{ pools[k] = {lap:1, items:{}, seenKeys:{}}; });

  const keys = sortedMonthKeys();
  if(!keys.length) return pools;

  let todayKey = asOfDayKey;
  if(!todayKey){
    const now = new Date();
    todayKey = now.getFullYear()+'-'+pad2(now.getMonth()+1)+'-'+pad2(now.getDate());
  }

  let gIdx=0, mgIdx=0, lIdx=0, iIdx=0, pIdx=0;
  const azulCount = {}; Object.keys(BLOCKS).forEach(k=>{ azulCount[k]=0; });
  const blockTurn = {}; Object.keys(BLOCKS).forEach(k=>{ blockTurn[k]=0; });
  const leveAppear = {}; LEVES.forEach((_,i)=>{ leveAppear[i]=0; });

  function pushItem(poolKey, lap, item){
    const p = pools[poolKey];
    p.lap = lap;
    if(!p.items[lap]) p.items[lap] = [];
    if(!p.seenKeys[lap]) p.seenKeys[lap] = {};
    if(p.seenKeys[lap][item.key]) return;
    p.seenKeys[lap][item.key] = true;
    p.items[lap].push(item);
  }

  outer:
  for(let ki=0; ki<keys.length; ki++){
    const k = keys[ki];
    const [y,m] = k.split('-').map(Number);
    const nDays = daysInMonth(y,m);
    const days = (state.months[k] && state.months[k].days) || {};
    const monthTicks = (state.dayTicks && state.dayTicks[k]) || {};
    for(let d=1; d<=nDays; d++){
      const dayKey = k+'-'+pad2(d);
      // A día vencido: hasta que hoy no termina, no cuenta para el arrastre (solo días
      // ya cerrados, es decir, estrictamente anteriores a hoy).
      if(dayKey >= todayKey) break outer;
      const status = days[d] || 'ESTUDIO';
      if(status !== 'ESTUDIO') continue;
      const ticks = monthTicks[d] || {};
      const dateObj = new Date(y, m-1, d);
      const jsDow = dateObj.getDay();
      const isMonWed = (jsDow===1 || jsDow===3);
      const dayOfMonthParity = d % 2;

      // ---- Bloque (grave en días impares, menos grave en días pares) ----
      const poolKey = dayOfMonthParity===1 ? 'graves' : 'mgraves';
      const order = dayOfMonthParity===1 ? GRAVES_ORDER : MGRAVES_ORDER;
      const curIdx = dayOfMonthParity===1 ? gIdx : mgIdx;
      const bloqueNum = order[curIdx % order.length];
      const lap = Math.floor(curIdx / order.length) + 1;
      const unifyThisMonth = !!(state.settings.unifyFromDate && dayKey >= state.settings.unifyFromDate);
      let rawTemas, colorHoy;
      if(unifyThisMonth){
        rawTemas = BLOCKS[bloqueNum].temas;
        colorHoy = 'unificado';
      } else {
        colorHoy = (blockTurn[bloqueNum] % 2 === 0) ? 'azul' : 'morado';
        rawTemas = BLOCKS[bloqueNum].temas.filter(t=>t.color===colorHoy);
      }
      const resolvedTemas = rawTemas.map(t=>{
        if(t.type==='armas_explosivos'){
          const turn = azulCount[bloqueNum];
          return {nombre:(turn%2===0)?t.armas:t.explosivos, clase:t.clase};
        }
        return {nombre:t.nombre, clase:t.clase};
      });
      if(!ticks.bloque){
        resolvedTemas.forEach(t=>{
          pushItem(poolKey, lap, {
            key: 'b'+bloqueNum+'-'+t.nombre,
            clase: t.clase,
            nombre: t.nombre,
            grupo: 'B'+bloqueNum,
            color: colorHoy,
            pool: poolKey,
            numTema: temaNumFromClase(t.clase)
          });
        });
        if(dayOfMonthParity===1) gIdx++; else mgIdx++;
        if(unifyThisMonth || colorHoy==='azul') azulCount[bloqueNum]++;
        blockTurn[bloqueNum]++;
      }

      // ---- Leve ----
      const leveIdx = lIdx % LEVES.length;
      const leveLap = Math.floor(lIdx / LEVES.length) + 1;
      const leveItemRaw = LEVES[leveIdx];
      let leveResolved;
      if(leveItemRaw.type==='l39_l40'){
        const turn = leveAppear[leveIdx];
        leveResolved = {nombre:(turn%2===0)?leveItemRaw.l39:leveItemRaw.l40, clase:leveItemRaw.clase};
      } else {
        leveResolved = {nombre:leveItemRaw.nombre, clase:leveItemRaw.clase};
      }
      if(!ticks.leve){
        pushItem('leves', leveLap, {
          key: 'leve-'+leveIdx+'-'+leveResolved.nombre,
          clase: leveResolved.clase,
          nombre: leveResolved.nombre,
          grupo: 'LEVE Nº'+(leveIdx+1),
          pool: 'leves',
          numTema: temaNumFromClase(leveResolved.clase)
        });
        leveAppear[leveIdx]++;
        lIdx++;
      }

      // ---- Inglés ----
      const inglesNum = (iIdx % INGLES_TOTAL) + 1;
      const inglesLap = Math.floor(iIdx / INGLES_TOTAL) + 1;
      if(!ticks.ingles){
        pushItem('ingles', inglesLap, {
          key: 'ingles-'+inglesNum,
          clase: '',
          nombre: 'Tema '+inglesNum,
          pool: 'ingles',
          numTema: ''
        });
        iIdx++;
      }

      // ---- Psicotécnico (solo lunes/miércoles) ----
      if(isMonWed){
        const psicoIdx = pIdx % PSICO_ITEMS.length;
        const psicoLap = Math.floor(pIdx / PSICO_ITEMS.length) + 1;
        if(!ticks.psico){
          pushItem('psico', psicoLap, {
            key: 'psico-'+psicoIdx,
            clase: '',
            nombre: PSICO_ITEMS[psicoIdx],
            pool: 'psico',
            numTema: ''
          });
          pIdx++;
        }
      }
    }
  }
  return pools;
}
function arrastreItemsCount(pools){
  let total = 0;
  Object.keys(pools).forEach(k=>{
    const p = pools[k];
    total += ((p.items && p.items[p.lap]) || []).length;
  });
  return total;
}
function renderArrastre(){
  const host = document.getElementById('arrastreHost');
  if(!host) return;
  host.innerHTML = '';

  const keys = sortedMonthKeys();
  if(!keys.length){
    const empty = document.createElement('div'); empty.className='empty-state';
    empty.textContent = 'Todavía no tienes ningún mes creado en el Calendario, así que no hay nada que arrastrar.';
    host.appendChild(empty);
    return;
  }

  const pools = computeArrastreData();

  // Construye la línea de meta-datos (bloque/leve + grave-menos grave-leve + azul/morado)
  // que va debajo del nombre de cada tema.
  function metaHtml(it, showPoolTag){
    const bits = [];
    if(showPoolTag && it.pool && ARRASTRE_POOL_TAG[it.pool]){
      bits.push('<span class="mini-tag '+ARRASTRE_POOL_TAG[it.pool]+'">'+ARRASTRE_POOL_LABEL[it.pool]+'</span>');
    }
    if(it.manual) bits.push('<span class="mini-tag tag-manual">AÑADIDO A MANO</span>');
    if(it.grupo) bits.push('<span class="grupo-txt">'+it.grupo.replace(/</g,'&lt;')+'</span>');
    if(it.color) bits.push('<span class="colorpill '+it.color+'">'+it.color+'</span>');
    return bits.length ? '<div class="arrastre-meta">'+bits.join('')+'</div>' : '';
  }

  // Fila individual, clicable, para marcar "ya repasado" (efímero, solo en memoria). Los
  // temas añadidos a mano llevan además un botón "✕" para quitarlos (eso sí se guarda).
  function buildCheckRow(it, titleHtml, showPoolTag, extraClass, onToggle){
    const row = document.createElement('div');
    row.className = 'arrastre-item'+(extraClass?(' '+extraClass):'')+(arrastreChecked[it.key]?' done':'');
    row.innerHTML =
      '<div class="arrastre-head-row">'+
        '<input type="checkbox" class="arrastre-check"'+(arrastreChecked[it.key]?' checked':'')+'>'+
        '<div style="flex:1;min-width:0;">'+
          '<div class="fi-head"><span class="fi-name">'+titleHtml+'</span></div>'+
          metaHtml(it, showPoolTag)+
        '</div>'+
        (it.manual ? '<button type="button" class="arrastre-manual-remove" title="Quitar este tema añadido a mano">✕</button>' : '')+
      '</div>';
    const toggle = ()=>{
      arrastreChecked[it.key] = !arrastreChecked[it.key];
      row.classList.toggle('done', !!arrastreChecked[it.key]);
      row.querySelector('.arrastre-check').checked = !!arrastreChecked[it.key];
      if(onToggle) onToggle();
    };
    row.addEventListener('click', (e)=>{
      if(e.target.tagName==='INPUT') return; // el propio checkbox ya dispara 'change'
      if(e.target.classList.contains('arrastre-manual-remove')) return; // se gestiona aparte
      toggle();
    });
    row.querySelector('.arrastre-check').addEventListener('change', toggle);
    if(it.manual){
      row.querySelector('.arrastre-manual-remove').addEventListener('click', (e)=>{
        e.stopPropagation();
        const arr = state.arrastreManual[it.manualPool] || [];
        const i = arr.findIndex(m=>m.id===it.manualId);
        if(i>-1) arr.splice(i,1);
        delete arrastreChecked[it.key];
        scheduleSave();
        renderArrastre();
      });
    }
    return row;
  }

  ARRASTRE_GROUPS.forEach(group=>{
    const section = document.createElement('section');
    section.className = 'temario-group';

    // Cabecera: si el grupo junta varios subgrupos (Conocimientos = graves+menos graves+leves),
    // cada uno sigue llevando su propia vuelta por dentro, así que se listan todas aquí.
    const vueltaTxt = group.pools.map(pk=>ARRASTRE_POOL_META[pk].shortTitle+' · vuelta '+pools[pk].lap).join('  —  ');

    const headRow = document.createElement('div'); headRow.className = 'arrastre-group-head';
    const h3 = document.createElement('h3'); h3.innerHTML = group.title;
    headRow.appendChild(h3);
    const btnGroup = document.createElement('div'); btnGroup.style.cssText='display:flex;gap:6px;flex-wrap:wrap;';
    const addToggleBtn = document.createElement('button');
    addToggleBtn.type = 'button'; addToggleBtn.className = 'arrastre-copy-btn';
    addToggleBtn.textContent = '➕ Añadir tema';
    btnGroup.appendChild(addToggleBtn);
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'arrastre-copy-btn';
    copyBtn.textContent = '📋 Copiar lista';
    btnGroup.appendChild(copyBtn);
    headRow.appendChild(btnGroup);
    section.appendChild(headRow);

    const vueltaLine = document.createElement('div');
    vueltaLine.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin:8px 0 8px;';
    vueltaLine.textContent = vueltaTxt;
    section.appendChild(vueltaLine);

    const sub = document.createElement('div'); sub.className='sub'; sub.style.marginBottom='10px';
    sub.textContent = group.pools.map(pk=>ARRASTRE_POOL_META[pk].sub).join(' · ');
    section.appendChild(sub);

    // ---- Formulario "Añadir tema a mano": mismo catálogo que usa la automatización
    // (bloques/leves/inglés/psicotécnicos), para añadir manualmente uno sin escribirlo.
    // Es independiente de la vuelta automática: no la adelanta ni la altera.
    // Añadir a mano puede usar un catálogo distinto al de la automatización (p.ej. en
    // Conocimientos: el temario real de Teoría, no los bloques 1-12 de esta app).
    const manualPools = group.manualPools || group.pools;
    const addForm = document.createElement('div'); addForm.className = 'arrastre-add-form';
    let poolSelect = null;
    if(manualPools.length > 1){
      poolSelect = document.createElement('select');
      poolSelect.setAttribute('aria-label','Tipo de tema a añadir');
      manualPools.forEach(pk=>{
        const opt = document.createElement('option'); opt.value = pk; opt.textContent = (ARRASTRE_POOL_META[pk]||{}).shortTitle || pk;
        poolSelect.appendChild(opt);
      });
      addForm.appendChild(poolSelect);
    }
    const temaSelect = document.createElement('select');
    temaSelect.setAttribute('aria-label','Tema a añadir');
    function fillTemaSelect(){
      const pk = poolSelect ? poolSelect.value : manualPools[0];
      const catalog = arrastreManualCatalog(pk);
      temaSelect.innerHTML = '';
      let currentGrupo = null, optgroup = null;
      catalog.forEach(c=>{
        if(c.grupo !== currentGrupo){
          currentGrupo = c.grupo;
          optgroup = c.grupo ? document.createElement('optgroup') : null;
          if(optgroup){ optgroup.label = c.grupo; temaSelect.appendChild(optgroup); }
        }
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = (c.clase ? c.clase+' · ' : '') + c.nombre;
        (optgroup || temaSelect).appendChild(opt);
      });
    }
    fillTemaSelect();
    if(poolSelect) poolSelect.onchange = fillTemaSelect;
    addForm.appendChild(temaSelect);
    const addConfirmBtn = document.createElement('button');
    addConfirmBtn.type = 'button'; addConfirmBtn.className = 'arrastre-add-confirm'; addConfirmBtn.textContent = 'Añadir';
    addConfirmBtn.onclick = ()=>{
      const pk = poolSelect ? poolSelect.value : manualPools[0];
      const catalog = arrastreManualCatalog(pk);
      const chosen = catalog.find(c=>c.value===temaSelect.value);
      if(!chosen) return;
      if(!state.arrastreManual[pk]) state.arrastreManual[pk] = [];
      state.arrastreManual[pk].push({
        id: 'm'+Date.now()+Math.random().toString(36).slice(2,7),
        value: chosen.value, nombre: chosen.nombre, clase: chosen.clase, grupo: chosen.grupo, color: chosen.color
      });
      scheduleSave();
      renderArrastre();
    };
    addForm.appendChild(addConfirmBtn);
    const addHint = document.createElement('div'); addHint.className = 'arrastre-add-hint';
    addHint.textContent = 'Se suma a los que ya van saliendo solos con el calendario, sin afectar a la vuelta automática.';
    addForm.appendChild(addHint);
    section.appendChild(addForm);
    addToggleBtn.onclick = ()=> addForm.classList.toggle('open');

    // Combina los temas de la vuelta actual de cada subgrupo (automatización) con los
    // añadidos a mano (que pueden vivir en un pool propio, ver manualPools arriba).
    let items = [];
    group.pools.forEach(pk=>{
      const p = pools[pk];
      items = items.concat((p.items && p.items[p.lap]) || []);
    });
    manualPools.forEach(pk=>{
      ((state.arrastreManual && state.arrastreManual[pk]) || []).forEach(m=>{
        items.push({
          key: 'manual-'+pk+'-'+m.id,
          clase: m.clase,
          nombre: m.nombre,
          grupo: m.grupo,
          color: m.color,
          pool: pk,
          numTema: temaNumFromClase(m.clase),
          manual: true,
          manualId: m.id,
          manualPool: pk
        });
      });
    });

    if(!items.length){
      const empty = document.createElement('div'); empty.className='empty-state';
      empty.textContent = 'Todavía no has completado ningún tema de este grupo en la vuelta actual. Puedes añadir uno a mano con «➕ Añadir tema».';
      section.appendChild(empty);
      copyBtn.disabled = true; copyBtn.style.opacity = '.4'; copyBtn.style.cursor = 'default';
    } else {
      const showPoolTag = group.pools.length > 1;

      // Orden por número de tema ascendente (los que no tienen número de tema, como
      // Inglés o Psicotécnicos, se quedan al final en su orden original).
      const sorted = items.slice().sort((a,b)=>{
        const na = parseInt((a.numTema||'').match(/\d+/), 10);
        const nb = parseInt((b.numTema||'').match(/\d+/), 10);
        const va = isNaN(na) ? Infinity : na;
        const vb = isNaN(nb) ? Infinity : nb;
        return va - vb;
      });

      // Agrupa entradas consecutivas que comparten el mismo número de tema (p.ej. un leve
      // que resulta ser el mismo tema que un bloque) bajo una sola tarjeta "TEMA X".
      const clusters = [];
      sorted.forEach(it=>{
        const last = clusters[clusters.length-1];
        if(it.numTema && last && last.numTema===it.numTema){
          last.items.push(it);
        } else {
          clusters.push({numTema: it.numTema, items:[it]});
        }
      });

      const grid = document.createElement('div'); grid.className='flat-grid';
      const countEl = document.createElement('div'); countEl.className = 'arrastre-counts';

      function refreshCount(){
        const checkedN = items.filter(it=>arrastreChecked[it.key]).length;
        const base = group.pools.length>1
          ? group.pools.map(pk=>{
              const n = ((pools[pk].items && pools[pk].items[pools[pk].lap]) || []).length;
              return ARRASTRE_POOL_META[pk].shortTitle+': '+n;
            }).join(' · ')
          : items.length+' tema'+(items.length!==1?'s':'')+' para arrastrar en este bloque';
        countEl.textContent = base+(checkedN ? ' — repasados '+checkedN+'/'+items.length : '');
      }

      clusters.forEach(cluster=>{
        if(cluster.items.length === 1){
          const it = cluster.items[0];
          const titleHtml = (it.numTema ? (it.numTema+' · ') : '') + it.nombre.replace(/</g,'&lt;');
          const row = buildCheckRow(it, titleHtml, showPoolTag, 'flat-item', refreshCount);
          grid.appendChild(row);
        } else {
          const card = document.createElement('div'); card.className = 'flat-item';
          card.innerHTML = '<div class="fi-head"><span class="fi-name">'+cluster.numTema.replace(/</g,'&lt;')+'</span></div>';
          cluster.items.forEach(it=>{
            const subRow = buildCheckRow(it, it.nombre.replace(/</g,'&lt;'), showPoolTag, 'arrastre-sub', refreshCount);
            card.appendChild(subRow);
          });
          grid.appendChild(card);
        }
      });
      section.appendChild(grid);

      refreshCount();
      section.appendChild(countEl);

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button'; resetBtn.className = 'arrastre-reset-btn';
      resetBtn.textContent = 'Reiniciar marcas de repaso de este bloque';
      resetBtn.onclick = ()=>{
        items.forEach(it=>{ delete arrastreChecked[it.key]; });
        grid.querySelectorAll('.arrastre-item.done').forEach(row=>{
          row.classList.remove('done');
          const chk = row.querySelector('.arrastre-check');
          if(chk) chk.checked = false;
        });
        refreshCount();
      };
      section.appendChild(resetBtn);

      copyBtn.onclick = ()=>{
        const lines = [group.title.replace(/<[^>]+>/g,'')+' — '+vueltaTxt];
        clusters.forEach(cluster=>{
          if(cluster.items.length === 1){
            const it = cluster.items[0];
            const parts = [it.grupo, it.color].filter(Boolean).join(', ');
            lines.push((it.numTema?(it.numTema+' · '):'')+it.nombre+(parts?' ('+parts+')':''));
          } else {
            const detalle = cluster.items.map(it=>{
              const parts = [it.grupo, it.color].filter(Boolean).join(', ');
              return it.nombre+(parts?' ('+parts+')':'');
            }).join(' / ');
            lines.push(cluster.numTema+' · '+detalle);
          }
        });
        const text = lines.join('\n');
        const done = ()=>{ const old = copyBtn.textContent; copyBtn.textContent = '✅ Copiado'; setTimeout(()=>{ copyBtn.textContent = old; }, 1500); };
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(text).then(done).catch(()=>{ copyBtn.textContent = '⚠️ No se pudo copiar'; setTimeout(()=>{ copyBtn.textContent='📋 Copiar lista'; },1500); });
        } else {
          copyBtn.textContent = '⚠️ No disponible';
          setTimeout(()=>{ copyBtn.textContent='📋 Copiar lista'; },1500);
        }
      };
    }

    host.appendChild(section);
  });
}

/* ===================== RENDER: CLASES (visualización de clases) ===================== */
// Fecha 'YYYY-MM-DD' -> "D de Mes de AAAA", para mostrar la fecha de disponibilidad de una
// clase pendiente de forma legible.
function formatFechaEs(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-').map(Number);
  return d+' de '+MESES[m-1]+' de '+y;
}
// Definición compartida de las 5 materias de clase (usada tanto por el modo quiz del
// calendario de clases como por el tablón de clases pendientes), para no repetirla dos veces.
function getClaseMateriasDef(){
  const conOptions = []; for(let i=1;i<=23;i++) conOptions.push({value:i, label:'Tema '+i});
  const ingOptions = []; for(let i=1;i<=INGLES_TOTAL;i++) ingOptions.push({value:i, label:'Lesson '+i});
  const psiOptions = PSICO_ITEMS.map((name, idx)=>({value:idx, label:name}));
  return [
    {key:'conocimientos', label:'Conocimientos', kind:'select',        options:conOptions, arrKey:'conocimientos'},
    {key:'ingles',        label:'Inglés',        kind:'select',        options:ingOptions, arrKey:'ingles'},
    {key:'psico',         label:'Psicotécnicos', kind:'select-or-text', options:psiOptions, arrKey:'psico', extraArrKey:'psicoExtra'},
    {key:'orto',          label:'Ortografía',    kind:'text', arrKey:'orto'},
    {key:'gram',          label:'Gramática',     kind:'text', arrKey:'gram'}
  ];
}
/* ============================================================================
   CLASES VISTAS = LO QUE HAYA EN EL CALENDARIO DE CLASES (cálculo derivado)
   ----------------------------------------------------------------------------
   La pestaña "Clases" ya no guarda checks propios: se limita a *mostrar* lo que
   hay registrado en el calendario de clases. Es decir:
     · metes una clase en un día del calendario → su check aparece marcado solo
       (en cuanto ese día haya terminado; si es de hoy o futuro sale como
       "programada", con el check a medias);
     · metes una clase de un día que ya pasó (retroactivo) → se marca al instante;
     · quitas esa clase del calendario → el check se desmarca solo.
   Así no hay dos sitios que puedan contradecirse: manda siempre el calendario.
   ========================================================================== */
let _claseOccCache = null;
function invalidarClasesDerivadas(){ _claseOccCache = null; }
// Recorre todo el calendario de clases una sola vez y devuelve, por materia y tema,
// la lista de días en los que hay clase registrada de ese tema.
function computeClasesDesdeCalendario(){
  if(_claseOccCache) return _claseOccCache;
  const res = {conocimientos:{}, ingles:{}, psico:{}, ortoGram:{}, psicoExtra:{}};
  Object.keys(state.claseCal||{}).forEach(mk=>{
    const mes = state.claseCal[mk] || {};
    Object.keys(mes).forEach(dayStr=>{
      const e = mes[dayStr];
      if(!e) return;
      const dNum = Number(dayStr);
      if(!dNum) return;
      const fecha = mk+'-'+pad2(dNum);
      const parciales = new Set(Array.isArray(e.parciales) ? e.parciales : []);
      ['conocimientos','ingles','psico'].forEach(cat=>{
        (Array.isArray(e[cat]) ? e[cat] : []).forEach(v=>{
          const id = String(v);
          if(!res[cat][id]) res[cat][id] = [];
          res[cat][id].push({fecha, parcial: parciales.has(claseParcialKey(cat, id))});
        });
      });
      (Array.isArray(e.psicoExtra) ? e.psicoExtra : []).forEach(n=>{
        const nombre = (n||'').trim(); if(!nombre) return;
        const key = nombre.toLowerCase();
        if(!res.psicoExtra[key]) res.psicoExtra[key] = {nombre, fechas:[]};
        res.psicoExtra[key].fechas.push(fecha);
      });
      [['orto','Ortografía'], ['gram','Gramática']].forEach(([arrKey, tipoLabel])=>{
        (Array.isArray(e[arrKey]) ? e[arrKey] : []).forEach(n=>{
          const nombre = (n||'').trim();
          const visible = nombre || ('Clase de '+tipoLabel.toLowerCase()+' sin nombre');
          const key = arrKey+'|'+visible.toLowerCase();
          if(!res.ortoGram[key]) res.ortoGram[key] = {tipo:arrKey, tipoLabel, nombre:visible, fechas:[]};
          res.ortoGram[key].fechas.push(fecha);
        });
      });
    });
  });
  const ordena = (a,b)=> a.localeCompare(b);
  ['conocimientos','ingles','psico'].forEach(cat=>{
    Object.keys(res[cat]).forEach(id=> res[cat][id].sort((a,b)=> ordena(a.fecha, b.fecha)));
  });
  Object.keys(res.ortoGram).forEach(k=> res.ortoGram[k].fechas.sort(ordena));
  Object.keys(res.psicoExtra).forEach(k=> res.psicoExtra[k].fechas.sort(ordena));
  _claseOccCache = res;
  return res;
}
// Resume el estado de un tema concreto: cuántas vueltas están ya vistas (días que
// ya han terminado), cuántas están programadas (hoy o más adelante) y qué clases
// son solo una parte del tema.
function resumenClaseTema(cat, id){
  const occ = (computeClasesDesdeCalendario()[cat] || {})[String(id)] || [];
  const hoy = hoyLocalISO();
  const vistas = occ.filter(o=> !o.parcial && o.fecha < hoy);
  const programadas = occ.filter(o=> !o.parcial && o.fecha >= hoy);
  const partes = occ.filter(o=> o.parcial);
  return {occ, vistas, programadas, partes};
}
/* Pinta la fila informativa de un tema: una pastilla por vuelta (vista / programada /
   libre) y, debajo, las fechas concretas. No se puede marcar ni desmarcar a mano: se
   cambia metiendo o quitando la clase en el calendario. */
function buildClaseInfoRow(cat, id){
  const {vistas, programadas, partes} = resumenClaseTema(cat, id);
  const wrap = document.createElement('div'); wrap.className = 'clase-info';

  const row = document.createElement('div'); row.className='simple-ticks-row';
  const total = Math.max(3, vistas.length + programadas.length);
  for(let i=0;i<total;i++){
    const pill = document.createElement('span');
    let cls = 'simple-tick clase-info-tick', txt = '○';
    let title = 'Vuelta '+(i+1)+': todavía no hay ninguna clase de este tema en el calendario.';
    if(i < vistas.length){
      cls += ' done'; txt = '✓';
      title = 'Vuelta '+(i+1)+': clase del '+formatFechaEs(vistas[i].fecha)+' (día ya terminado).';
    } else if(i < vistas.length + programadas.length){
      const p = programadas[i - vistas.length];
      cls += ' programada'; txt = '◔';
      title = 'Vuelta '+(i+1)+': clase programada para el '+formatFechaEs(p.fecha)+'. Se marcará sola cuando ese día termine.';
    }
    pill.className = cls;
    pill.title = title;
    pill.appendChild(document.createTextNode(txt+' Vuelta '+(i+1)));
    row.appendChild(pill);
  }
  wrap.appendChild(row);

  const detalle = document.createElement('div'); detalle.className='clase-info-dates';
  const trozos = [];
  if(vistas.length) trozos.push('Vista: '+vistas.map(o=>formatFechaEs(o.fecha)).join(' · '));
  if(programadas.length) trozos.push('Programada: '+programadas.map(o=>formatFechaEs(o.fecha)).join(' · '));
  if(partes.length) trozos.push('Parte suelta (tema aún sin cerrar): '+partes.map(o=>formatFechaEs(o.fecha)).join(' · '));
  detalle.textContent = trozos.length ? trozos.join(' | ') : 'Sin clases en el calendario.';
  wrap.appendChild(detalle);
  return wrap;
}
/* Cabecera común de las secciones de la pestaña Clases, explicando que esto es un
   resumen de solo lectura y con un botón para ir al calendario de clases. */
function buildClasesInfoIntro(){
  const box = document.createElement('div'); box.className='clase-info-intro';
  const txt = document.createElement('div');
  txt.innerHTML = 'Este apartado es <strong>informativo</strong>: se rellena solo a partir del <strong>Calendario de clases</strong>. '+
    'Cada clase que metas en un día marca su vuelta automáticamente (en cuanto ese día termina; si es de hoy o futuro sale como <em>programada</em> ◔), '+
    'y si quitas esa clase del calendario, la vuelta se desmarca sola. Para cambiar algo, cámbialo en el calendario.';
  box.appendChild(txt);
  const btn = document.createElement('button'); btn.type='button'; btn.className='tick-add'; btn.style.marginTop='8px';
  btn.textContent = '📅 Ir al calendario de clases';
  btn.onclick = ()=>{
    activateTab('calendario');
    if(typeof setCalSelectorMode === 'function') setCalSelectorMode('clases');
    window.scrollTo({top:0, behavior:'smooth'});
  };
  box.appendChild(btn);
  return box;
}
/* Las tres secciones de temas numerados (Conocimientos, Inglés, Psicotécnicos) se pintan
   exactamente igual: rejilla de temas, cada uno con su fila de vueltas calculada a partir
   del calendario de clases. Nada de esto se puede tocar a mano: es solo información. */
function renderClasesSeccionInfo(hostId, sectionKey, titulo, cat, items){
  const host = document.getElementById(hostId);
  if(!host) return;
  const hoy = hoyLocalISO();
  renderAccordionSection(host, sectionKey, titulo, (body)=>{
    body.appendChild(buildClasesInfoIntro());

    let conAlgo = 0;
    const grid = document.createElement('div'); grid.className='flat-grid';
    items.forEach(({id, label})=>{
      const resumen = resumenClaseTema(cat, id);
      if(resumen.occ.length) conAlgo++;
      const item = document.createElement('div');
      item.className = 'flat-item' + (resumen.vistas.length ? ' clase-info-hecha' : '');
      const head = document.createElement('div'); head.className='fi-head';
      const nombre = document.createElement('span'); nombre.className='fi-name'; nombre.textContent = label;
      head.appendChild(nombre);
      const cuenta = document.createElement('span'); cuenta.className='fi-clase';
      cuenta.textContent = resumen.vistas.length ? ('×'+resumen.vistas.length) : '';
      head.appendChild(cuenta);
      item.appendChild(head);
      item.appendChild(buildClaseInfoRow(cat, id));
      grid.appendChild(item);
    });

    const resumenTotal = document.createElement('div'); resumenTotal.className='clase-info-total';
    resumenTotal.textContent = conAlgo
      ? (conAlgo+' de '+items.length+' con alguna clase registrada en el calendario.')
      : 'Todavía no hay ninguna clase de esta materia en el calendario de clases.';
    body.appendChild(resumenTotal);

    body.appendChild(grid);
  });
}
function renderClasesConocimientos(){
  const items = [];
  for(let i=1;i<=23;i++) items.push({id:String(i), label:'Tema '+i});
  renderClasesSeccionInfo('clasesConocimientosHost', 'clasesConocimientos', 'Clase de conocimientos (temas 1–23)', 'conocimientos', items);
}
function renderClasesIngles(){
  const items = [];
  for(let i=1;i<=INGLES_TOTAL;i++) items.push({id:String(i), label:'Lesson '+i});
  renderClasesSeccionInfo('clasesInglesHost', 'clasesIngles', 'Clase de inglés (lesson 1–32)', 'ingles', items);
}
function renderClasesPsico(){
  const items = PSICO_ITEMS.map((name, idx)=> ({id:String(idx), label:name}));
  renderClasesSeccionInfo('clasesPsicoHost', 'clasesPsico', 'Clase de psicotécnicos (prueba 1–23 + control 1 y 2)', 'psico', items);
}
/* Ortografía y gramática no tienen temas numerados: cada clase es una entrada suelta con
   su propio nombre. Aquí se listan, agrupadas por nombre, todas las que haya registradas
   en el calendario de clases, con las fechas en las que las diste. Igual que el resto de
   la pestaña, es solo información: se añade y se quita desde el calendario. */
function renderClasesOrtoGram(){
  const host = document.getElementById('clasesOrtoGramHost');
  if(!host) return;
  renderAccordionSection(host, 'clasesOrtoGram', 'Ortografía y gramática (clases)', (body)=>{
    body.appendChild(buildClasesInfoIntro());

    const hoy = hoyLocalISO();
    const derivadas = computeClasesDesdeCalendario().ortoGram;
    const keys = Object.keys(derivadas).sort((a,b)=>{
      const A = derivadas[a], B = derivadas[b];
      if(A.tipo !== B.tipo) return A.tipo==='orto' ? -1 : 1;
      return (A.fechas[0]||'').localeCompare(B.fechas[0]||'');
    });

    if(!keys.length){
      const empty = document.createElement('div'); empty.className='empty-state';
      empty.textContent = 'Todavía no hay ninguna clase de ortografía o gramática en el calendario de clases.';
      body.appendChild(empty);
    } else {
      const grid = document.createElement('div'); grid.className='flat-grid';
      keys.forEach(k=>{
        const item = derivadas[k];
        const vistas = item.fechas.filter(f=> f < hoy);
        const programadas = item.fechas.filter(f=> f >= hoy);
        const card = document.createElement('div');
        card.className = 'flat-item' + (vistas.length ? ' clase-info-hecha' : '');
        const head = document.createElement('div'); head.className='fi-head';
        const nombre = document.createElement('span'); nombre.className='fi-name'; nombre.textContent = item.nombre;
        head.appendChild(nombre);
        const tipo = document.createElement('span'); tipo.className='fi-clase'; tipo.textContent = item.tipoLabel;
        head.appendChild(tipo);
        card.appendChild(head);

        const info = document.createElement('div'); info.className='clase-info';
        const row = document.createElement('div'); row.className='simple-ticks-row';
        vistas.forEach((f,i)=>{
          const pill = document.createElement('span'); pill.className='simple-tick clase-info-tick done';
          pill.title = 'Clase del '+formatFechaEs(f)+' (día ya terminado).';
          pill.textContent = '✓ Vez '+(i+1);
          row.appendChild(pill);
        });
        programadas.forEach((f,i)=>{
          const pill = document.createElement('span'); pill.className='simple-tick clase-info-tick programada';
          pill.title = 'Programada para el '+formatFechaEs(f)+'. Se marcará sola cuando ese día termine.';
          pill.textContent = '◔ Vez '+(vistas.length+i+1);
          row.appendChild(pill);
        });
        info.appendChild(row);
        const fechas = document.createElement('div'); fechas.className='clase-info-dates';
        fechas.textContent = item.fechas.map(f=>formatFechaEs(f)).join(' · ');
        info.appendChild(fechas);
        card.appendChild(info);
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }

    // Psicotécnicos escritos a mano en el calendario (fuera de la lista de pruebas):
    // no encajan en ninguna prueba numerada, así que se listan aquí como información.
    const extra = computeClasesDesdeCalendario().psicoExtra;
    const extraKeys = Object.keys(extra);
    if(extraKeys.length){
      const t = document.createElement('div'); t.className='clase-info-total'; t.style.marginTop='18px';
      t.textContent = 'Psicotécnicos escritos a mano en el calendario (fuera de la lista de pruebas):';
      body.appendChild(t);
      const chips = document.createElement('div'); chips.className='clase-multi-chips';
      extraKeys.forEach(k=>{
        const it = extra[k];
        const chip = document.createElement('span'); chip.className='clase-multi-chip';
        chip.textContent = it.nombre+' · '+it.fechas.map(f=>formatFechaEs(f)).join(' · ');
        chips.appendChild(chip);
      });
      body.appendChild(chips);
    }

    // Entradas antiguas creadas a mano (o copiadas automáticamente) antes de que este
    // apartado pasara a calcularse solo desde el calendario. Ya no se usan para nada:
    // se enseñan por si quieres consultarlas o borrarlas.
    const viejas = Array.isArray(state.clases.ortoGram) ? state.clases.ortoGram : [];
    if(viejas.length){
      const legacy = document.createElement('div'); legacy.className='clase-info-legacy';
      const head = document.createElement('div'); head.className='clase-info-total';
      head.textContent = 'Fichas antiguas de este apartado ('+viejas.length+'), del sistema anterior de marcar a mano. Ya no cuentan para nada.';
      legacy.appendChild(head);
      const chips = document.createElement('div'); chips.className='clase-multi-chips';
      viejas.forEach(e=>{
        const chip = document.createElement('span'); chip.className='clase-multi-chip';
        chip.appendChild(document.createTextNode((e.nombre||'(sin nombre)')+(e.descripcion?' · '+e.descripcion:'')));
        const del = document.createElement('button'); del.type='button'; del.textContent='×';
        del.title = 'Borrar esta ficha antigua';
        del.onclick = ()=>{
          const i = state.clases.ortoGram.findIndex(x=>x.id===e.id);
          if(i>-1) state.clases.ortoGram.splice(i,1);
          scheduleSave();
          renderClasesOrtoGram();
        };
        chip.appendChild(del);
        chips.appendChild(chip);
      });
      legacy.appendChild(chips);
      const delAll = document.createElement('button'); delAll.type='button'; delAll.className='vuelta-del'; delAll.style.marginTop='8px';
      delAll.textContent = '✕ Borrar todas las fichas antiguas';
      delAll.onclick = ()=>{
        if(!confirm('¿Borrar las '+viejas.length+' fichas antiguas de ortografía/gramática? Las clases del calendario no se tocan.')) return;
        state.clases.ortoGram = [];
        scheduleSave();
        renderClasesOrtoGram();
      };
      legacy.appendChild(delAll);
      body.appendChild(legacy);
    }
  });
}
// Tablón de clases pendientes: aquí se cargan de antemano las clases que ya se sabe que
// tocarán más adelante (p. ej. todo el temario de conocimientos del mes) sin saber todavía
// en qué día exacto caerá cada una. Desde el modo quiz del calendario de clases se pueden
// elegir directamente de esta lista en vez de escribirlas de nuevo, y al usarlas desaparecen
// de aquí (se "mueven" al día del calendario en el que se han colocado).
function renderClasesPendientes(){
  const host = document.getElementById('clasesPendientesHost');
  if(!host) return;
  if(!Array.isArray(state.clasesPendientes)) state.clasesPendientes = [];
  const MATERIAS = getClaseMateriasDef();
  renderAccordionSection(host, 'clasesPendientes', 'Clases pendientes (tablón)', (body)=>{
    const intro = document.createElement('div'); intro.className='sub'; intro.style.marginBottom='12px';
    intro.textContent = 'Apunta aquí por adelantado las clases que ya sabes que tienes por delante (por ejemplo, todo el temario de conocimientos del mes) sin saber todavía qué día caerá cada una. Cuando la des de verdad, en el "Calendario de clases" podrás elegirla de esta lista en vez de escribirla de nuevo, y desaparecerá de aquí.';
    body.appendChild(intro);

    const formHost = document.createElement('div');
    body.appendChild(formHost);

    const listHost = document.createElement('div'); listHost.style.marginTop = '16px';
    body.appendChild(listHost);

    // Agrupadas por materia (Ortografía, Conocimientos, Inglés...) y, dentro de cada
    // materia, ordenadas por fecha de disponibilidad, para poder ver de un vistazo cuántas
    // quedan de cada tipo en vez de una lista larga mezclada.
    function refreshList(){
      listHost.innerHTML = '';
      if(!state.clasesPendientes.length){
        const empty = document.createElement('div'); empty.className='clase-multi-empty';
        empty.textContent = 'No tienes ninguna clase pendiente apuntada.';
        listHost.appendChild(empty);
        return;
      }
      const todayISO = hoyLocalISO();
      const porMateria = new Map();
      state.clasesPendientes.forEach(p=>{
        if(!porMateria.has(p.materiaKey)) porMateria.set(p.materiaKey, []);
        porMateria.get(p.materiaKey).push(p);
      });
      MATERIAS.filter(mat=> porMateria.has(mat.key)).forEach(mat=>{
        const group = porMateria.get(mat.key).sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
        const groupBox = document.createElement('div'); groupBox.style.marginBottom = '14px';
        const groupTitle = document.createElement('div'); groupTitle.className='sub';
        groupTitle.style.color = 'var(--amber)'; groupTitle.style.marginBottom = '6px';
        groupTitle.textContent = mat.label+' ('+group.length+')';
        groupBox.appendChild(groupTitle);
        const chips = document.createElement('div'); chips.className='clase-multi-chips';
        group.forEach(p=>{
          const isFuture = !!(p.disponibleDesde && p.disponibleDesde > todayISO);
          const chip = document.createElement('span'); chip.className='clase-multi-chip'+(isFuture?' future':'');
          let txt = p.temaLabel;
          if(p.disponibleDesde) txt += ' · '+(isFuture ? 'disponible desde ' : 'desde ')+formatFechaEs(p.disponibleDesde);
          if(p.nota && p.nota.trim()) txt += ' · 📝 '+p.nota.trim();
          chip.appendChild(document.createTextNode(txt));
          const del = document.createElement('button'); del.type='button'; del.textContent='×';
          del.title = 'Quitar de pendientes'; del.setAttribute('aria-label','Quitar de pendientes: '+txt);
          del.onclick = ()=>{
            const i = state.clasesPendientes.findIndex(x=>x.id===p.id);
            if(i>-1) state.clasesPendientes.splice(i,1);
            scheduleSave();
            refreshList();
          };
          chip.appendChild(del);
          chips.appendChild(chip);
        });
        groupBox.appendChild(chips);
        listHost.appendChild(groupBox);
      });
    }
    refreshList();

    renderClasePendienteForm(formHost, MATERIAS, refreshList);
  });
}
// Formulario para añadir una nueva clase al tablón de pendientes: el mismo formulario paso a
// paso (materia → tema → comentario) que se usa para añadir una clase a un día del calendario,
// con un paso final para decir a partir de qué fecha estará disponible. Al terminar, vuelve a
// empezar por si se quieren cargar varias clases seguidas.
function renderClasePendienteForm(container, MATERIAS, onSaved){
  const sel = {materia:null, temaValue:null, temaLabel:null, useExtra:false};

  function clearC(){ container.innerHTML = ''; }
  function addBackBtn(wrap, label, fn){
    const back = document.createElement('button');
    back.type='button'; back.className='clase-quiz-back'; back.textContent = label || '← Atrás';
    back.onclick = fn;
    wrap.appendChild(back);
  }

  function stepMateria(){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Nueva clase pendiente';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿De qué materia?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    MATERIAS.forEach(mat=>{
      const b = document.createElement('button'); b.type='button'; b.className='clase-quiz-opt'; b.textContent=mat.label;
      b.onclick = ()=>{ sel.materia=mat; sel.temaValue=null; sel.temaLabel=null; sel.useExtra=false; stepTema(); };
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    container.appendChild(wrap);
  }

  function stepTema(){
    clearC();
    const mat = sel.materia;
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent=mat.label;
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿De qué tema?';
    wrap.appendChild(q);

    if(mat.kind==='text'){
      const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input';
      inp.placeholder = 'Escribe el tema (opcional)';
      wrap.appendChild(inp);
      const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='4px';
      nextBtn.textContent='Continuar';
      nextBtn.onclick = ()=>{ sel.temaValue = inp.value.trim(); sel.temaLabel = inp.value.trim(); stepComentario(); };
      wrap.appendChild(nextBtn);
    } else {
      const selEl = document.createElement('select'); selEl.className='clase-quiz-select';
      selEl.setAttribute('aria-label','Elegir tema de '+mat.label);
      selEl.appendChild(new Option('Elegir…',''));
      mat.options.forEach(o=> selEl.appendChild(new Option(o.label, o.value)));
      wrap.appendChild(selEl);
      const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='10px';
      nextBtn.textContent='Continuar'; nextBtn.disabled = true;
      selEl.onchange = ()=>{ nextBtn.disabled = (selEl.value===''); };
      nextBtn.onclick = ()=>{
        if(selEl.value==='') return;
        const opt = mat.options.find(o=>String(o.value)===String(selEl.value));
        sel.temaValue = opt.value; sel.temaLabel = opt.label; sel.useExtra=false;
        stepComentario();
      };
      wrap.appendChild(nextBtn);
      if(mat.kind==='select-or-text'){
        const or = document.createElement('div'); or.className='clase-quiz-or'; or.textContent='O si no está en la lista, escríbelo:';
        wrap.appendChild(or);
        const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input';
        inp.placeholder='Escribe el tema';
        wrap.appendChild(inp);
        const writeBtn = document.createElement('button'); writeBtn.type='button'; writeBtn.className='btn ghost'; writeBtn.style.marginTop='10px';
        writeBtn.textContent='Continuar con esto';
        writeBtn.onclick = ()=>{
          if(!inp.value.trim()) return;
          sel.temaValue = null; sel.temaLabel = inp.value.trim(); sel.useExtra = true;
          stepComentario();
        };
        wrap.appendChild(writeBtn);
      }
    }
    addBackBtn(wrap, '← Atrás', stepMateria);
    container.appendChild(wrap);
  }

  function stepComentario(){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow';
    eyebrow.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Quieres añadir alguna nota a esta clase pendiente?';
    wrap.appendChild(q);
    const ta = document.createElement('textarea'); ta.className='note-inline';
    ta.placeholder = 'Dudas, deberes, lo que quieras recordar… (opcional)';
    wrap.appendChild(ta);
    const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='10px';
    nextBtn.textContent = 'Continuar';
    nextBtn.onclick = ()=> stepDisponible(ta.value.trim());
    wrap.appendChild(nextBtn);
    addBackBtn(wrap, '← Atrás', stepTema);
    container.appendChild(wrap);
  }

  // Paso explícito de disponibilidad: antes esto era un único campo de fecha opcional
  // ("déjalo en blanco si ya está disponible"), y si por lo que sea el campo de fecha no
  // llegaba a registrar el valor (algunos selectores de fecha en móvil no confirman bien
  // el valor hasta que el campo pierde el foco), se guardaba con disponibleDesde=null y la
  // clase quedaba disponible desde ya sin querer, sin ningún aviso. Ahora se elige primero
  // una de las dos opciones a propósito, y si se elige "a partir de una fecha" no se puede
  // guardar hasta que el campo de fecha tenga de verdad un valor.
  function stepDisponible(nota){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow';
    eyebrow.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Cuándo estará disponible esta clase?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const nowBtn = document.createElement('button'); nowBtn.type='button'; nowBtn.className='clase-quiz-opt'; nowBtn.textContent='Ya está disponible ahora';
    nowBtn.onclick = ()=> guardar(nota, null);
    const laterBtn = document.createElement('button'); laterBtn.type='button'; laterBtn.className='clase-quiz-opt'; laterBtn.textContent='A partir de una fecha concreta';
    opts.appendChild(nowBtn); opts.appendChild(laterBtn);
    wrap.appendChild(opts);

    const dateBox = document.createElement('div'); dateBox.style.display='none'; dateBox.style.marginTop='10px';
    const dateHint = document.createElement('div'); dateHint.className='clase-quiz-or'; dateHint.textContent='Elige la fecha a partir de la cual quieres poder usar esta clase:';
    dateBox.appendChild(dateHint);
    const dateInp = document.createElement('input'); dateInp.type='date'; dateInp.className='clase-quiz-text-input';
    dateBox.appendChild(dateInp);
    const saveBtn = document.createElement('button'); saveBtn.type='button'; saveBtn.className='btn'; saveBtn.style.marginTop='10px';
    saveBtn.textContent = 'Guardar en pendientes'; saveBtn.disabled = true;
    dateInp.addEventListener('input', ()=>{ saveBtn.disabled = !dateInp.value; });
    dateInp.addEventListener('change', ()=>{ saveBtn.disabled = !dateInp.value; });
    saveBtn.onclick = ()=>{
      if(!dateInp.value) return; // por si acaso: nunca se guarda "en blanco" desde esta rama
      guardar(nota, dateInp.value);
    };
    dateBox.appendChild(saveBtn);
    wrap.appendChild(dateBox);

    laterBtn.onclick = ()=>{ dateBox.style.display='block'; dateInp.focus(); };

    addBackBtn(wrap, '← Atrás', ()=> stepComentario());
    container.appendChild(wrap);
  }

  function guardar(nota, disponibleDesde){
    const mat = sel.materia;
    state.clasesPendientes.push({
      id: Date.now()+'-'+Math.random(),
      materiaKey: mat.key,
      temaValue: sel.temaValue,
      temaLabel: sel.temaLabel,
      useExtra: sel.useExtra,
      nota: nota || '',
      disponibleDesde: disponibleDesde || null
    });
    scheduleSave();
    onSaved();
    stepConfirm();
  }

  function stepConfirm(){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const confirmBox = document.createElement('div'); confirmBox.className='clase-quiz-confirm';
    const okQ = document.createElement('div'); okQ.className='clase-quiz-question'; okQ.textContent='✓ Añadida a pendientes';
    confirmBox.appendChild(okQ);
    const detail = document.createElement('div'); detail.className='clase-quiz-progress';
    detail.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    confirmBox.appendChild(detail);
    wrap.appendChild(confirmBox);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Añadir otra clase pendiente?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí, añadir otra';
    yesBtn.onclick = ()=> stepMateria();
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt'; noBtn.textContent='No, he terminado';
    noBtn.onclick = ()=> stepMateria();
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);
    container.appendChild(wrap);
  }

  stepMateria();
}

/* ===================== RENDER: CALENDARIO DE CLASES ===================== */
function renderClasesCalMonthBar(){
  const bar = document.getElementById('clasesCalMonthBar');
  if(!bar) return;
  bar.innerHTML = '';
  const keys = sortedMonthKeys();
  if(!keys.length){
    bar.innerHTML = '<span style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">Añade un mes desde la pestaña Calendario para empezar.</span>';
    return;
  }
  if(!currentMonthKey || !keys.includes(currentMonthKey)) currentMonthKey = keys[keys.length-1];
  const controls = document.createElement('div'); controls.className='month-controls';
  const prevBtn = document.createElement('button'); prevBtn.className='icon-btn'; prevBtn.textContent = '‹'; prevBtn.setAttribute('aria-label','Anterior'); prevBtn.title = 'Anterior';
  prevBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i>0){ currentMonthKey=keys[i-1]; renderAll(); } };
  controls.appendChild(prevBtn);
  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Cambiar de mes');
  keys.forEach(k=>{
    const [y,m] = k.split('-').map(Number);
    const opt = document.createElement('option'); opt.value=k; opt.textContent = MESES[m-1]+' '+y;
    if(k===currentMonthKey) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ currentMonthKey = sel.value; renderAll(); };
  controls.appendChild(sel);
  const nextBtn = document.createElement('button'); nextBtn.className='icon-btn'; nextBtn.textContent = '›'; nextBtn.setAttribute('aria-label','Siguiente'); nextBtn.title = 'Siguiente';
  nextBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey=keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);
  bar.appendChild(controls);
  const info = document.createElement('span');
  info.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--muted);margin-left:auto;';
  info.textContent = 'Estado del día sincronizado con el Calendario de estudio';
  bar.appendChild(info);
}
function ensureClaseCalDay(monthKey, day){
  if(!state.claseCal[monthKey]) state.claseCal[monthKey] = {};
  if(!state.claseCal[monthKey][day]) state.claseCal[monthKey][day] = {conocimientos:[], ingles:[], psico:[], psicoExtra:[], orto:[], gram:[], nota:''};
  const e = state.claseCal[monthKey][day];
  if(e.nota === undefined) e.nota = '';
  const normArr = (v)=> Array.isArray(v) ? v : (v===null || v===undefined || v==='' ? [] : [Number(v)]);
  e.conocimientos = normArr(e.conocimientos);
  e.ingles = normArr(e.ingles);
  e.psico = normArr(e.psico);
  e.orto = Array.isArray(e.orto) ? e.orto.map(v=> (v && typeof v==='object') ? (v.nombre||'') : (typeof v==='string' ? v : '')) : (e.orto ? [''] : []);
  e.gram = Array.isArray(e.gram) ? e.gram.map(v=> (v && typeof v==='object') ? (v.nombre||'') : (typeof v==='string' ? v : '')) : (e.gram ? [''] : []);
  e.psicoExtra = Array.isArray(e.psicoExtra) ? e.psicoExtra.map(v=> typeof v==='string' ? v : '') : [];
  // Lista de clases de este día que son solo "una parte" del tema (respondiste "No, quedan
  // más partes" al añadirlas). Se guardan como 'materia:tema' (p. ej. 'conocimientos:5') y
  // sirven para que la pestaña Clases no dé por vista una vuelta entera con media clase.
  e.parciales = Array.isArray(e.parciales) ? e.parciales.filter(v=> typeof v==='string') : [];
  return e;
}
/* Marca/desmarca una clase concreta de un día como "parte suelta" del tema. */
function claseParcialKey(cat, value){ return cat+':'+String(value); }
function setClaseParcial(entry, cat, value, esParcial){
  if(!Array.isArray(entry.parciales)) entry.parciales = [];
  const k = claseParcialKey(cat, value);
  const i = entry.parciales.indexOf(k);
  if(esParcial && i===-1) entry.parciales.push(k);
  if(!esParcial && i>-1) entry.parciales.splice(i,1);
}
function quitarClaseParcial(entry, cat, value){ setClaseParcial(entry, cat, value, false); }
function buildClasePillsHTML(entry, notePreviewLen){
  let html = '';
  let any = false;
  if(entry.conocimientos && entry.conocimientos.length){ html += '<span class="cclase-pill p-con">CON · Tema'+(entry.conocimientos.length>1?'s ':' ')+entry.conocimientos.slice().sort((a,b)=>a-b).join(', ')+'</span>'; any=true; }
  if(entry.ingles && entry.ingles.length){ html += '<span class="cclase-pill p-ing">ING · Lesson'+(entry.ingles.length>1?'s ':' ')+entry.ingles.slice().sort((a,b)=>a-b).join(', ')+'</span>'; any=true; }
  if(entry.psico && entry.psico.length){ html += '<span class="cclase-pill p-psi">PSI · '+entry.psico.slice().sort((a,b)=>a-b).map(idx=>PSICO_ITEMS[idx]).join(', ')+'</span>'; any=true; }
  if(entry.psicoExtra && entry.psicoExtra.filter(n=>n&&n.trim()).length){ html += '<span class="cclase-pill p-psi">PSI · '+entry.psicoExtra.filter(n=>n&&n.trim()).join(', ').replace(/</g,'&lt;')+'</span>'; any=true; }
  if(entry.orto && entry.orto.length){
    const label = entry.orto.filter(n=>n && n.trim()).join(', ') || ('ORTOGRAFÍA'+(entry.orto.length>1?' ×'+entry.orto.length:''));
    html += '<span class="cclase-pill p-orto">'+(entry.orto.some(n=>n&&n.trim())?'ORT · ':'')+label.replace(/</g,'&lt;')+'</span>'; any=true;
  }
  if(entry.gram && entry.gram.length){
    const label = entry.gram.filter(n=>n && n.trim()).join(', ') || ('GRAMÁTICA'+(entry.gram.length>1?' ×'+entry.gram.length:''));
    html += '<span class="cclase-pill p-gram">'+(entry.gram.some(n=>n&&n.trim())?'GRAM · ':'')+label.replace(/</g,'&lt;')+'</span>'; any=true;
  }
  if(entry.nota){
    const maxLen = notePreviewLen || 28;
    const preview = entry.nota.length>maxLen ? entry.nota.slice(0,maxLen)+'…' : entry.nota;
    html += '<span class="cclase-pill p-nota">📝 '+preview.replace(/</g,'&lt;')+'</span>'; any=true;
  }
  if(!any){ html = '<span class="cclase-empty">Sin clase</span>'; }
  return html;
}
function renderClaseCalendar(){
  // Cualquier cambio en el calendario de clases pasa por aquí al repintarse, así que es el
  // sitio natural para tirar la caché del resumen de la pestaña Clases y repintarla: así,
  // metas o quites una clase donde la metas o la quites, la pestaña Clases ya está al día
  // cuando vayas a mirarla, sin recargar nada.
  invalidarClasesDerivadas();
  if(typeof claseCalViewMode !== 'undefined' && claseCalViewMode === 'list') renderClaseCalendarList();
  else renderClaseCalendarGrid();
  if(!_renderAllEnCurso){ refrescarPestanaClases(); renderTodoCalendar(); }
}
function renderClaseCalendarGrid(){
  const host = document.getElementById('clasesCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde la pestaña Calendario.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const daysData = (state.months[currentMonthKey] && state.months[currentMonthKey].days) || {};

  const grid = document.createElement('div'); grid.className='cal-grid cclase-grid';
  DOW.forEach(dname=>{
    const dow = document.createElement('div'); dow.className='cal-dow'; dow.textContent = dname.slice(0,3);
    grid.appendChild(dow);
  });
  const firstDow = new Date(y, m-1, 1).getDay();
  const leadingBlanks = (firstDow === 0) ? 6 : firstDow - 1;
  for(let i=0;i<leadingBlanks;i++){
    const b = document.createElement('div'); b.className='cclase-cell blank'; grid.appendChild(b);
  }

  for(let d=1; d<=nDays; d++){
    const status = daysData[d] || 'ESTUDIO';
    const jsDow = new Date(y, m-1, d).getDay();
    const cell = document.createElement('div');
    cell.className = 'cclase-cell status-'+status;
    const now = new Date();
    if(y===now.getFullYear() && m===(now.getMonth()+1) && d===now.getDate()){
      cell.classList.add('today');
      cell.id = 'todayClaseCell';
    }

    const numRow = document.createElement('div'); numRow.className='cal-daynum';
    const wdName = DOW_SHORT[(jsDow===0?6:jsDow-1)];
    numRow.innerHTML = '<span>'+d+'</span><span class="wd">'+wdName+'</span>';
    cell.appendChild(numRow);

    if(status !== 'ESTUDIO'){
      const lbl = document.createElement('div'); lbl.className='off-label'; lbl.style.fontSize='9px';
      lbl.textContent = status==='DESCANSO' ? 'Descanso' : status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      cell.appendChild(lbl);
    }

    const entry = (state.claseCal[currentMonthKey] && state.claseCal[currentMonthKey][d]) || {};
    const pills = document.createElement('div'); pills.className='cclase-pills';
    pills.innerHTML = buildClasePillsHTML(entry, 28);
    cell.appendChild(pills);

    cell.onclick = ()=> openClaseDayModal(d, jsDow);
    grid.appendChild(cell);
  }
  host.appendChild(grid);
}
/* Vista alternativa tipo lista/agenda para el calendario de clases: una fila grande por
   día, apilada verticalmente, con texto más legible — pensada sobre todo para el móvil. */
function renderClaseCalendarList(){
  const host = document.getElementById('clasesCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde la pestaña Calendario.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const daysData = (state.months[currentMonthKey] && state.months[currentMonthKey].days) || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const list = document.createElement('div'); list.className='cal-list';
  for(let d=1; d<=nDays; d++){
    const status = daysData[d] || 'ESTUDIO';
    const jsDow = new Date(y, m-1, d).getDay();
    const isToday = isCurrentMonth && d===now.getDate();

    const item = document.createElement('div');
    item.className = 'cal-list-item cclase-list-item status-'+status;
    if(isToday){ item.classList.add('today'); item.id = 'todayClaseListItem'; }

    const head = document.createElement('div'); head.className='cal-list-head';
    const dateWrap = document.createElement('div'); dateWrap.className='cal-list-date';
    const wdName = DOW[(jsDow===0?6:jsDow-1)];
    dateWrap.innerHTML = '<span class="cal-list-daynum">'+d+'</span><span class="cal-list-wd">'+wdName+'</span>';
    head.appendChild(dateWrap);
    if(status !== 'ESTUDIO'){
      const lbl = document.createElement('span'); lbl.className='off-label';
      lbl.textContent = status==='DESCANSO' ? 'Descanso' : status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      head.appendChild(lbl);
    }
    item.appendChild(head);

    const entry = (state.claseCal[currentMonthKey] && state.claseCal[currentMonthKey][d]) || {};
    const pills = document.createElement('div'); pills.className='cclase-pills cclase-list-pills';
    pills.innerHTML = buildClasePillsHTML(entry, 120);
    item.appendChild(pills);

    item.onclick = ()=> openClaseDayModal(d, jsDow);
    list.appendChild(item);
  }
  host.appendChild(list);
}
function openClaseDayModal(d, jsDow){
  const [y,m] = currentMonthKey.split('-').map(Number);
  document.getElementById('claseDayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  document.getElementById('claseDayModalSub').textContent = DOW[(jsDow===0?6:jsDow-1)];
  const entry = ensureClaseCalDay(currentMonthKey, d);
  renderClaseDayPreview(entry, d, jsDow);
  document.getElementById('claseDayModal').classList.add('open');
}
// Vista previa (solo lectura) de lo que hay guardado ese día, con un botón "Editar" debajo
// para pasar al formulario completo solo cuando de verdad quieras cambiar algo.
// Quita, si existe, el comentario (dentro de las notas del día) que se guardó junto con
// una clase concreta al añadirla desde el modo quiz (llevan una etiqueta tipo
// "[Materia — Tema] comentario..."). Si esa clase no tenía comentario, no hace nada.
function removeClaseNotaTag(entry, materiaLabel, temaLabel){
  if(!entry.nota) return;
  const tag = '['+materiaLabel + (temaLabel ? (' — '+temaLabel) : '') + ']';
  const lines = entry.nota.split('\n');
  let removed = false;
  const kept = lines.filter(line=>{
    if(!removed && line.indexOf(tag)===0){ removed = true; return false; }
    return true;
  });
  entry.nota = kept.join('\n');
}
// Cuando se quita una clase ya colocada en el calendario, la devolvemos automáticamente
// al tablón de "Clases pendientes" (el mismo tablón desde el que se colocan las clases),
// en vez de perderla sin más. Es el mecanismo simétrico al que ya existía al revés: al
// colocar una clase pendiente en un día del calendario, desaparecía del tablón.
function devolverClaseAPendientes(materiaKey, temaValue, temaLabel, useExtra){
  if(!Array.isArray(state.clasesPendientes)) state.clasesPendientes = [];
  state.clasesPendientes.push({
    id: Date.now()+'-'+Math.random(),
    materiaKey: materiaKey,
    temaValue: (temaValue===undefined ? null : temaValue),
    temaLabel: temaLabel || '',
    useExtra: !!useExtra,
    nota: '',
    disponibleDesde: null
  });
  renderClasesPendientes();
}
// --- Sincronización automática: pestaña Calendario de clases → pestaña Clases ---
// Ya no hay nada que "sincronizar" de verdad: la pestaña Clases se calcula entera a partir
// de este mismo calendario cada vez que se pinta (ver computeClasesDesdeCalendario). Estas
// funciones se mantienen porque las llaman varios sitios, pero ahora se limitan a tirar la
// caché del cálculo y repintar, que es lo único que hace falta para que se vea al instante.
function refrescarPestanaClases(){
  invalidarClasesDerivadas();
  renderClasesConocimientos();
  renderClasesIngles();
  renderClasesPsico();
  renderClasesOrtoGram();
}
function ensureClasesSyncPendiente(){ if(!Array.isArray(state.clasesSyncPendiente)) state.clasesSyncPendiente = []; return state.clasesSyncPendiente; }
function marcarSiguienteVueltaClase(){ return -1; }        // (obsoleta: ya no se marca nada a mano)
function anadirClaseOrtoGramAuto(){ return null; }          // (obsoleta: se lee del calendario)
function encolarSincronizacionClase(){ return null; }       // (obsoleta: ya no hace falta cola)
function cancelarSincronizacionClasePendiente(){ }          // (obsoleta)
function sincronizarProgresoClase(){ refrescarPestanaClases(); return null; }
function deshacerSincronizacionProgreso(){ refrescarPestanaClases(); }
// Antes esto vaciaba una cola de clases "a día vencido". Ahora basta con detectar que ha
// cambiado el día (la app puede quedarse abierta y cruzar la medianoche) para repintar: las
// clases de ayer pasan solas de "programadas ◔" a "vistas ✓" sin tocar nada.
let _ultimoDiaClases = null;
function procesarSincronizacionesClaseVencidas(){
  const hoy = hoyLocalISO();
  if(_ultimoDiaClases === hoy) return;
  _ultimoDiaClases = hoy;
  invalidarClasesDerivadas();
}
function renderClaseDayPreview(entry, d, jsDow){
  const body = document.getElementById('claseDayModalBody');
  body.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'clase-preview';

  const addRow = (label, buildFn)=>{
    const row = document.createElement('div'); row.className = 'clase-preview-row';
    const lbl = document.createElement('div'); lbl.className='clase-preview-label'; lbl.textContent = label;
    row.appendChild(lbl);
    const val = document.createElement('div'); val.className='clase-preview-value';
    buildFn(val);
    row.appendChild(val);
    wrap.appendChild(row);
  };
  // Cada pastilla lleva su propia "×" para quitar esa clase suelta sin tener que entrar
  // en el formulario completo: se guarda al momento y se refresca la vista.
  const buildPill = (cls, text, onRemove)=>{
    const pill = document.createElement('span'); pill.className = 'cclase-pill p-'+cls;
    pill.appendChild(document.createTextNode(text));
    if(onRemove){
      const del = document.createElement('button');
      del.type='button'; del.className='cclase-pill-del'; del.textContent='×';
      del.title = 'Quitar esta clase'; del.setAttribute('aria-label','Quitar '+text);
      del.onclick = (e)=>{
        e.stopPropagation();
        onRemove();
        scheduleSave();
        renderClaseCalendar();
        renderClaseDayPreview(entry, d, jsDow);
      };
      pill.appendChild(del);
    }
    return pill;
  };
  const fillRow = (val, items)=>{
    if(!items || !items.length){
      const empty = document.createElement('span'); empty.className='cclase-empty'; empty.textContent='Sin clase';
      val.appendChild(empty);
      return;
    }
    items.forEach(it=> val.appendChild(buildPill(it.cls, it.text, it.onRemove)));
  };

  addRow('Conocimientos', (val)=> fillRow(val, (entry.conocimientos||[]).slice().sort((a,b)=>a-b).map(t=>({
    cls:'con', text:'Tema '+t,
    onRemove: ()=>{ const i = entry.conocimientos.indexOf(t); if(i>-1) entry.conocimientos.splice(i,1); quitarClaseParcial(entry,'conocimientos',t); removeClaseNotaTag(entry, 'Conocimientos', 'Tema '+t); cancelarSincronizacionClasePendiente('conocimientos', t, null, currentMonthKey+'-'+pad2(d)); devolverClaseAPendientes('conocimientos', t, 'Tema '+t, false); }
  }))));
  addRow('Inglés', (val)=> fillRow(val, (entry.ingles||[]).slice().sort((a,b)=>a-b).map(l=>({
    cls:'ing', text:'Lesson '+l,
    onRemove: ()=>{ const i = entry.ingles.indexOf(l); if(i>-1) entry.ingles.splice(i,1); quitarClaseParcial(entry,'ingles',l); removeClaseNotaTag(entry, 'Inglés', 'Lesson '+l); cancelarSincronizacionClasePendiente('ingles', l, null, currentMonthKey+'-'+pad2(d)); devolverClaseAPendientes('ingles', l, 'Lesson '+l, false); }
  }))));
  addRow('Psicotécnicos', (val)=>{
    const psicoItems = [
      ...(entry.psico||[]).slice().sort((a,b)=>a-b).map(idx=>({
        cls:'psi', text:PSICO_ITEMS[idx],
        onRemove: ()=>{ const i = entry.psico.indexOf(idx); if(i>-1) entry.psico.splice(i,1); quitarClaseParcial(entry,'psico',idx); removeClaseNotaTag(entry, 'Psicotécnicos', PSICO_ITEMS[idx]); cancelarSincronizacionClasePendiente('psico', idx, null, currentMonthKey+'-'+pad2(d)); devolverClaseAPendientes('psico', idx, PSICO_ITEMS[idx], false); }
      })),
      ...(entry.psicoExtra||[]).map((n,i)=>({n,i})).filter(o=>o.n && o.n.trim()).map(o=>({
        cls:'psi', text:o.n,
        onRemove: ()=>{ entry.psicoExtra.splice(o.i,1); removeClaseNotaTag(entry, 'Psicotécnicos', o.n); devolverClaseAPendientes('psico', null, o.n, true); }
      }))
    ];
    fillRow(val, psicoItems);
  });
  addRow('Ortografía', (val)=> fillRow(val, (entry.orto||[]).map((n,i)=>({
    cls:'orto', text: n && n.trim() ? n : 'Clase '+(i+1),
    onRemove: ()=>{ const tag = n; entry.orto.splice(i,1); removeClaseNotaTag(entry, 'Ortografía', tag); cancelarSincronizacionClasePendiente('orto', null, n || '', currentMonthKey+'-'+pad2(d)); devolverClaseAPendientes('orto', n || '', n || '', false); }
  }))));
  addRow('Gramática', (val)=> fillRow(val, (entry.gram||[]).map((n,i)=>({
    cls:'gram', text: n && n.trim() ? n : 'Clase '+(i+1),
    onRemove: ()=>{ const tag = n; entry.gram.splice(i,1); removeClaseNotaTag(entry, 'Gramática', tag); cancelarSincronizacionClasePendiente('gram', null, n || '', currentMonthKey+'-'+pad2(d)); devolverClaseAPendientes('gram', n || '', n || '', false); }
  }))));
  addRow('Notas', (val)=>{
    if(entry.nota && entry.nota.trim()){
      const notaSpan = document.createElement('span'); notaSpan.className='clase-preview-nota';
      entry.nota.split('\n').forEach((line,i)=>{
        if(i>0) notaSpan.appendChild(document.createElement('br'));
        notaSpan.appendChild(document.createTextNode(line));
      });
      val.appendChild(notaSpan);
    } else {
      const empty = document.createElement('span'); empty.className='cclase-empty'; empty.textContent='Sin notas';
      val.appendChild(empty);
    }
  });

  body.appendChild(wrap);

  const editBtn = document.createElement('button');
  editBtn.type = 'button'; editBtn.className = 'btn clase-preview-edit-btn';
  editBtn.textContent = '✎ Editar';
  editBtn.onclick = ()=> renderClaseDayQuiz(entry, d, jsDow);
  body.appendChild(editBtn);
}
// Modo quiz: formulario guiado paso a paso para añadir clases al día ("¿Has visto una
// clase? → ¿De qué materia? → ¿De qué tema? → ¿Comentario?"), pudiendo repetirlo para
// añadir varias clases seguidas sin salir del modal. Usa los mismos campos que ya existía
// (entry.conocimientos, entry.ingles, entry.psico, entry.psicoExtra, entry.orto, entry.gram,
// entry.nota), así que es compatible con todo lo que ya había guardado. El formulario
// completo de siempre (con chips para quitar clases una a una) sigue disponible desde el
// enlace "Prefiero el formulario completo".
function renderClaseDayQuiz(entry, d, jsDow){
  const body = document.getElementById('claseDayModalBody');

  const MATERIAS = getClaseMateriasDef();

  const sel = {materia:null, temaValue:null, temaLabel:null, useExtra:false, pendienteId:null, nota:null, completaTema:null};
  let addedCount = 0;
  let lastAdd = null;

  function clearBody(){ body.innerHTML = ''; }

  function addBackBtn(wrap, label, fn){
    const back = document.createElement('button');
    back.type='button'; back.className='clase-quiz-back'; back.textContent = label || '← Atrás';
    back.onclick = fn;
    wrap.appendChild(back);
  }
  function addFormLink(wrap){
    const link = document.createElement('button');
    link.type='button'; link.className='clase-quiz-formlink';
    link.textContent = 'Prefiero el formulario completo (editar o quitar clases) →';
    link.onclick = ()=> renderClaseDayEdit(entry, d, jsDow);
    wrap.appendChild(link);
  }
  // Solo tiene sentido preguntar "¿completas el tema?" para materias con temas numerados
  // (Conocimientos, Inglés, Psicotécnicos de la lista): Ortografía/Gramática no tienen
  // "vueltas" (cada clase es su propia entrada) y el psico "fuera de lista" tampoco.
  function shouldPreguntarCompleta(){
    return !!(sel.materia && sel.materia.kind!=='text' && !sel.useExtra);
  }
  // Paso: si el tema puede necesitar varias clases (partes) para cubrirse entero,
  // preguntamos si con esta clase ya queda completo (y entonces se marca la vuelta
  // correspondiente en la pestaña Clases) o si aún quedan más partes pendientes de este
  // mismo tema (y entonces no se toca ninguna vuelta todavía). Para materias sin este
  // concepto (Ortografía, Gramática, psico fuera de lista) se salta directo al comentario.
  function stepCompletaTema(){
    if(!shouldPreguntarCompleta()){ stepComentario(); return; }
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow';
    eyebrow.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question';
    q.textContent = '¿Con esta clase completas «'+sel.temaLabel+'», o quedan más partes pendientes de este mismo tema?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí, ya está completo';
    yesBtn.onclick = ()=>{ sel.completaTema = true; stepComentario(); };
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt'; noBtn.textContent='No, quedan más partes';
    noBtn.onclick = ()=>{ sel.completaTema = false; stepComentario(); };
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);
    addBackBtn(wrap, '← Atrás', ()=> sel.pendienteId ? stepPendiente() : stepTema());
    body.appendChild(wrap);
  }

  function stepVisto(isFirst){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    if(addedCount>0){
      const prog = document.createElement('div'); prog.className='clase-quiz-progress';
      prog.textContent = addedCount===1 ? 'Ya has añadido 1 clase en esta sesión.' : 'Ya has añadido '+addedCount+' clases en esta sesión.';
      wrap.appendChild(prog);
    }
    const q = document.createElement('div'); q.className='clase-quiz-question';
    q.textContent = isFirst ? '¿Has visto una clase?' : '¿Has visto otra clase?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí';
    yesBtn.onclick = ()=> ((state.clasesPendientes||[]).length ? stepOrigen() : stepMateria());
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt';
    noBtn.textContent = isFirst ? 'No' : 'No, he terminado';
    noBtn.onclick = ()=> renderClaseDayPreview(entry, d, jsDow);
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);
    if(isFirst) addFormLink(wrap);
    body.appendChild(wrap);
  }

  function stepMateria(){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Has visto una clase';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿De qué materia?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    MATERIAS.forEach(mat=>{
      const b = document.createElement('button'); b.type='button'; b.className='clase-quiz-opt'; b.textContent=mat.label;
      b.onclick = ()=>{ sel.materia=mat; sel.temaValue=null; sel.temaLabel=null; sel.useExtra=false; sel.pendienteId=null; sel.nota=null; sel.completaTema=null; stepTema(); };
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    addBackBtn(wrap, '← Atrás', ()=> ((state.clasesPendientes||[]).length ? stepOrigen() : stepVisto(addedCount===0)));
    body.appendChild(wrap);
  }

  // Paso previo, solo si hay algo en el tablón de pendientes: preguntar si la clase vista
  // es una de las que ya tenías apuntadas de antemano o una completamente nueva.
  function stepOrigen(){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Has visto una clase';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Es una de las clases pendientes que ya tenías apuntadas, o una nueva?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const pendBtn = document.createElement('button'); pendBtn.type='button'; pendBtn.className='clase-quiz-opt'; pendBtn.textContent='De las pendientes';
    pendBtn.onclick = ()=> stepPendiente();
    const newBtn = document.createElement('button'); newBtn.type='button'; newBtn.className='clase-quiz-opt'; newBtn.textContent='Nueva';
    newBtn.onclick = ()=> stepMateria();
    opts.appendChild(pendBtn); opts.appendChild(newBtn);
    wrap.appendChild(opts);
    addBackBtn(wrap, '← Atrás', ()=> stepVisto(addedCount===0));
    body.appendChild(wrap);
  }

  // Lista las clases del tablón de pendientes para elegir una. Las que tengan una fecha de
  // "disponible a partir de" posterior a este día del calendario salen deshabilitadas, con
  // la fecha a partir de la cual se podrán usar.
  function stepPendiente(){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Clases pendientes';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Cuál de las pendientes has visto?';
    wrap.appendChild(q);

    const dayKeyStr = currentMonthKey+'-'+pad2(d);
    const pendList = (state.clasesPendientes||[]);

    if(!pendList.length){
      const info = document.createElement('div'); info.className='clase-multi-empty';
      info.textContent = 'Ya no te queda ninguna clase pendiente apuntada.';
      wrap.appendChild(info);
    } else {
      // Agrupadas por materia, igual que en el tablón de la pestaña Clases, para
      // encontrarlas rápido cuando hay muchas apuntadas.
      const porMateria = new Map();
      pendList.forEach(p=>{
        if(!porMateria.has(p.materiaKey)) porMateria.set(p.materiaKey, []);
        porMateria.get(p.materiaKey).push(p);
      });
      MATERIAS.filter(mat=> porMateria.has(mat.key)).forEach(mat=>{
        const group = porMateria.get(mat.key).sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
        const groupTitle = document.createElement('div'); groupTitle.className='sub';
        groupTitle.style.color = 'var(--amber)'; groupTitle.style.margin = '10px 0 4px';
        groupTitle.textContent = mat.label;
        wrap.appendChild(groupTitle);
        const opts = document.createElement('div'); opts.className='clase-quiz-options';
        group.forEach(p=>{
          const isBlocked = !!(p.disponibleDesde && p.disponibleDesde > dayKeyStr);
          const b = document.createElement('button'); b.type='button'; b.className='clase-quiz-opt';
          b.textContent = p.temaLabel + (isBlocked ? ' (disponible desde '+formatFechaEs(p.disponibleDesde)+')' : '');
          if(isBlocked){
            b.disabled = true;
            b.title = 'Esta clase estará disponible a partir del '+formatFechaEs(p.disponibleDesde);
          } else {
            b.onclick = ()=>{
              sel.materia = mat;
              sel.temaValue = p.temaValue;
              sel.temaLabel = p.temaLabel;
              sel.useExtra = p.useExtra;
              sel.pendienteId = p.id;
              sel.nota = p.nota || '';
              stepCompletaTema();
            };
          }
          opts.appendChild(b);
        });
        wrap.appendChild(opts);
      });
    }
    addBackBtn(wrap, '← Atrás', stepOrigen);
    body.appendChild(wrap);
  }

  function stepTema(){
    clearBody();
    const mat = sel.materia;
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent=mat.label;
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿De qué tema?';
    wrap.appendChild(q);

    if(mat.kind==='text'){
      const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input';
      inp.placeholder = 'Escribe el tema (opcional)';
      wrap.appendChild(inp);
      const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='4px';
      nextBtn.textContent='Continuar';
      nextBtn.onclick = ()=>{ sel.temaValue = inp.value.trim(); sel.temaLabel = inp.value.trim(); sel.pendienteId = null; stepCompletaTema(); };
      wrap.appendChild(nextBtn);
    } else {
      const already = Array.isArray(entry[mat.arrKey]) ? entry[mat.arrKey] : [];
      const available = mat.options.filter(o=>!already.includes(o.value));
      if(available.length){
        const selEl = document.createElement('select'); selEl.className='clase-quiz-select';
        selEl.setAttribute('aria-label','Elegir tema de '+mat.label);
        selEl.appendChild(new Option('Elegir…',''));
        available.forEach(o=> selEl.appendChild(new Option(o.label, o.value)));
        wrap.appendChild(selEl);
        const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='10px';
        nextBtn.textContent='Continuar'; nextBtn.disabled = true;
        selEl.onchange = ()=>{ nextBtn.disabled = (selEl.value===''); };
        nextBtn.onclick = ()=>{
          if(selEl.value==='') return;
          const opt = available.find(o=>String(o.value)===String(selEl.value));
          sel.temaValue = opt.value; sel.temaLabel = opt.label; sel.useExtra=false; sel.pendienteId=null;
          stepCompletaTema();
        };
        wrap.appendChild(nextBtn);
      } else {
        const info = document.createElement('div'); info.className='clase-multi-empty';
        info.textContent = 'Ya has añadido todos los temas de la lista.';
        wrap.appendChild(info);
      }
      if(mat.kind==='select-or-text'){
        const or = document.createElement('div'); or.className='clase-quiz-or'; or.textContent='O si no está en la lista, escríbelo:';
        wrap.appendChild(or);
        const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input';
        inp.placeholder='Escribe el tema';
        wrap.appendChild(inp);
        const writeBtn = document.createElement('button'); writeBtn.type='button'; writeBtn.className='btn ghost'; writeBtn.style.marginTop='10px';
        writeBtn.textContent='Continuar con esto';
        writeBtn.onclick = ()=>{
          if(!inp.value.trim()) return;
          sel.temaValue = null; sel.temaLabel = inp.value.trim(); sel.useExtra = true; sel.pendienteId = null;
          stepCompletaTema();
        };
        wrap.appendChild(writeBtn);
      }
    }
    addBackBtn(wrap, '← Atrás', stepMateria);
    body.appendChild(wrap);
  }

  function stepComentario(){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow';
    eyebrow.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Tienes algún comentario sobre la clase?';
    wrap.appendChild(q);
    const ta = document.createElement('textarea'); ta.className='note-inline';
    ta.placeholder = 'Dudas, deberes, lo que quieras recordar… (opcional)';
    ta.value = sel.nota || '';
    wrap.appendChild(ta);
    const saveBtn = document.createElement('button'); saveBtn.type='button'; saveBtn.className='btn'; saveBtn.style.marginTop='10px';
    saveBtn.textContent = 'Guardar clase';
    saveBtn.onclick = ()=> guardarSeleccion(ta.value.trim());
    wrap.appendChild(saveBtn);
    addBackBtn(wrap, '← Atrás', ()=> shouldPreguntarCompleta() ? stepCompletaTema() : (sel.pendienteId ? stepPendiente() : stepTema()));
    body.appendChild(wrap);
  }

  function guardarSeleccion(comentario){
    const mat = sel.materia;
    const notaBefore = entry.nota;
    let usedArrKey, usedValue;
    if(mat.kind==='text'){
      if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
      usedArrKey = mat.arrKey; usedValue = sel.temaLabel || '';
      entry[usedArrKey].push(usedValue);
    } else if(mat.kind==='select-or-text' && sel.useExtra){
      if(!Array.isArray(entry[mat.extraArrKey])) entry[mat.extraArrKey] = [];
      usedArrKey = mat.extraArrKey; usedValue = sel.temaLabel;
      entry[usedArrKey].push(usedValue);
    } else {
      if(!Array.isArray(entry[mat.arrKey])) entry[mat.arrKey] = [];
      usedArrKey = mat.arrKey; usedValue = sel.temaValue;
      entry[usedArrKey].push(usedValue);
    }
    if(comentario){
      const tag = '['+mat.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '') + ']';
      entry.nota = (entry.nota && entry.nota.trim()) ? (entry.nota+'\n'+tag+' '+comentario) : (tag+' '+comentario);
    }
    // Si has dicho que esta clase es solo una parte del tema (quedan más partes), lo
    // dejamos anotado en el propio día: así la pestaña Clases no da la vuelta por vista
    // hasta que registres la clase que cierra el tema.
    if(shouldPreguntarCompleta() && sel.completaTema === false){
      setClaseParcial(entry, mat.key, usedValue, true);
    } else if(shouldPreguntarCompleta()){
      setClaseParcial(entry, mat.key, usedValue, false);
    }
    // Mantiene la pestaña Clases al día automáticamente: siguiente vuelta libre para
    // Conocimientos/Inglés/Psicotécnicos, o entrada nueva para Ortografía/Gramática.
    const syncInfo = sincronizarProgresoClase(mat.key, sel.temaValue, sel.temaLabel, sel.useExtra, sel.completaTema, currentMonthKey+'-'+pad2(d));
    // Si la clase venía del tablón de pendientes, la quitamos de ahí: ya se ha "colocado"
    // en este día del calendario. Guardamos una copia por si luego se deshace el añadido.
    let removedPendiente = null;
    if(sel.pendienteId){
      const pi = state.clasesPendientes.findIndex(x=>x.id===sel.pendienteId);
      if(pi>-1){ removedPendiente = state.clasesPendientes[pi]; state.clasesPendientes.splice(pi,1); }
    }
    addedCount++;
    lastAdd = {arrKey:usedArrKey, value:usedValue, notaBefore, materiaLabel:mat.label, temaLabel:sel.temaLabel, removedPendiente, syncInfo};
    scheduleSave();
    renderClaseCalendar();
    renderClasesPendientes();
    stepConfirm();
  }

  // Deshace justo la última clase guardada (por si te has equivocado de tema o de
  // materia): quita el último valor añadido a su lista y devuelve la nota a como
  // estaba antes de este comentario. Si esa clase venía del tablón de pendientes,
  // la devuelve también al tablón.
  function deshacerUltima(){
    if(!lastAdd) return;
    const arr = entry[lastAdd.arrKey];
    if(Array.isArray(arr)){
      const i = arr.lastIndexOf(lastAdd.value);
      if(i>-1) arr.splice(i,1);
    }
    ['conocimientos','ingles','psico'].forEach(cat=> quitarClaseParcial(entry, cat, lastAdd.value));
    entry.nota = lastAdd.notaBefore;
    deshacerSincronizacionProgreso(lastAdd.syncInfo);
    if(lastAdd.removedPendiente){
      state.clasesPendientes.push(lastAdd.removedPendiente);
    }
    addedCount = Math.max(0, addedCount-1);
    lastAdd = null;
    scheduleSave();
    renderClaseCalendar();
    renderClasesPendientes();
    stepVisto(addedCount===0);
  }


  function stepConfirm(){
    clearBody();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';

    const confirmBox = document.createElement('div'); confirmBox.className='clase-quiz-confirm';
    const okQ = document.createElement('div'); okQ.className='clase-quiz-question'; okQ.textContent='✓ Clase añadida';
    confirmBox.appendChild(okQ);
    const detail = document.createElement('div'); detail.className='clase-quiz-progress';
    detail.textContent = sel.materia.label + (sel.temaLabel ? (' — '+sel.temaLabel) : '');
    confirmBox.appendChild(detail);
    const undoBtn = document.createElement('button');
    undoBtn.type='button'; undoBtn.className='clase-quiz-back'; undoBtn.style.marginTop='8px';
    undoBtn.textContent = '✕ Me he equivocado, deshacer';
    undoBtn.onclick = deshacerUltima;
    confirmBox.appendChild(undoBtn);
    wrap.appendChild(confirmBox);

    const prog = document.createElement('div'); prog.className='clase-quiz-progress';
    prog.textContent = addedCount===1 ? 'Ya has añadido 1 clase en esta sesión.' : 'Ya has añadido '+addedCount+' clases en esta sesión.';
    wrap.appendChild(prog);

    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Has visto otra clase?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí, añadir otra';
    yesBtn.onclick = ()=> ((state.clasesPendientes||[]).length ? stepOrigen() : stepMateria());
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt'; noBtn.textContent='No, he terminado';
    noBtn.onclick = ()=> renderClaseDayPreview(entry, d, jsDow);
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);

    body.appendChild(wrap);
  }

  stepVisto(true);
}
// Formulario completo de edición: aquí es donde se pueden añadir todas las clases que
// hagan falta de cada materia (temas, lessons, pruebas, ortografía, gramática y notas).
function renderClaseDayEdit(entry, d, jsDow){
  const body = document.getElementById('claseDayModalBody');
  body.innerHTML = '';

  // Fila "de varias veces": una materia donde puedes marcar más de una unidad (tema,
  // lesson, prueba...) el mismo día. Un desplegable para elegir + botón "Añadir", y
  // debajo, una etiqueta (chip) por cada unidad ya añadida con una "×" para quitarla.
  function buildMultiRow(labelText, ariaBase, arrKey, optionsList, addLabel, materiaLabel, materiaKey){
    const row = document.createElement('div'); row.className='clase-multi-row';
    const lbl = document.createElement('label'); lbl.textContent = labelText; row.appendChild(lbl);
    const chips = document.createElement('div'); chips.className='clase-multi-chips';
    const addWrap = document.createElement('div'); addWrap.className='clase-multi-add';
    const sel = document.createElement('select');
    sel.setAttribute('aria-label','Añadir '+ariaBase);
    const addBtn = document.createElement('button');
    addBtn.type='button'; addBtn.textContent = addLabel || '+ Añadir';
    const repaint = ()=>{
      if(!Array.isArray(entry[arrKey])) entry[arrKey] = [];
      const vals = entry[arrKey].slice().sort((a,b)=>a-b);
      chips.innerHTML = '';
      if(!vals.length){
        const empty = document.createElement('span'); empty.className='clase-multi-empty'; empty.textContent = 'Nada añadido todavía.';
        chips.appendChild(empty);
      } else {
        vals.forEach(v=>{
          const opt = optionsList.find(o=>o.value===v);
          const chip = document.createElement('span'); chip.className='clase-multi-chip';
          chip.appendChild(document.createTextNode(opt ? opt.label : String(v)));
          const rm = document.createElement('button');
          rm.type='button'; rm.textContent='×'; rm.setAttribute('aria-label','Quitar '+(opt?opt.label:v));
          rm.onclick = ()=>{
            const i = entry[arrKey].indexOf(v);
            if(i>-1) entry[arrKey].splice(i,1);
            removeClaseNotaTag(entry, materiaLabel, opt ? opt.label : String(v));
            cancelarSincronizacionClasePendiente(materiaKey, v, null, currentMonthKey+'-'+pad2(d));
            devolverClaseAPendientes(materiaKey, v, opt ? opt.label : String(v), false);
            scheduleSave(); renderClaseCalendar();
            renderClaseDayEdit(entry, d, jsDow); // re-pinta también las notas, por si se ha quitado un comentario
          };
          chip.appendChild(rm);
          chips.appendChild(chip);
        });
      }
      sel.innerHTML = '';
      sel.appendChild(new Option('Elegir…',''));
      optionsList.forEach(o=>{ if(!entry[arrKey].includes(o.value)) sel.appendChild(new Option(o.label, o.value)); });
      addBtn.disabled = sel.options.length<=1;
    };
    addBtn.onclick = ()=>{
      if(sel.value===''){ return; }
      if(!Array.isArray(entry[arrKey])) entry[arrKey] = [];
      const v = Number(sel.value);
      entry[arrKey].push(v);
      const opt = optionsList.find(o=>o.value===v);
      const label = opt ? opt.label : String(v);
      // Un tema puede necesitar varias clases (partes) dentro de la misma vuelta, así
      // que preguntamos si esta ya lo completa antes de marcar la vuelta en Clases.
      const completa = confirm('¿Con esta clase completas «'+label+'», o quedan más partes pendientes de este mismo tema?\n\nAceptar = sí, ya está completo (se marca la vuelta en la pestaña Clases)\nCancelar = no, quedan más partes (no se marca nada todavía)');
      sincronizarProgresoClase(materiaKey, v, label, false, completa, currentMonthKey+'-'+pad2(d));
      scheduleSave(); repaint(); renderClaseCalendar();
    };
    addWrap.appendChild(sel); addWrap.appendChild(addBtn);
    repaint();
    row.appendChild(chips); row.appendChild(addWrap);
    return row;
  }

  // Fila "de nombres": una materia sin unidades numeradas (ortografía, gramática), donde
  // cada pulsación de "+ Añadir" crea una fila nueva con un cuadro de texto para escribir
  // cómo se llama esa clase (por ejemplo "Tema 3 - Acentuación").
  function buildNamedListRow(labelText, arrKey, placeholder, materiaLabel, materiaKey){
    const row = document.createElement('div'); row.className='clase-multi-row';
    const lbl = document.createElement('label'); lbl.textContent = labelText; row.appendChild(lbl);
    const list = document.createElement('div'); list.className='clase-named-list';
    const addWrap = document.createElement('div'); addWrap.className='clase-multi-add';
    const addBtn = document.createElement('button');
    addBtn.type='button'; addBtn.textContent = '+ Añadir';
    const repaint = ()=>{
      if(!Array.isArray(entry[arrKey])) entry[arrKey] = [];
      list.innerHTML = '';
      if(!entry[arrKey].length){
        const empty = document.createElement('span'); empty.className='clase-multi-empty'; empty.textContent = 'Ninguna todavía.';
        list.appendChild(empty);
      } else {
        entry[arrKey].forEach((nombre,i)=>{
          const item = document.createElement('div'); item.className='clase-named-item';
          const inp = document.createElement('input');
          inp.type='text'; inp.placeholder = placeholder; inp.value = nombre || '';
          inp.setAttribute('aria-label', labelText+' #'+(i+1));
          inp.oninput = ()=>{ entry[arrKey][i] = inp.value; scheduleSave(); };
          inp.onblur = ()=>{
            // Al terminar de escribir el nombre de una clase de Ortografía/Gramática aquí,
            // la copiamos también a la pestaña Clases (como harías a mano), pero solo una
            // vez por fila para no duplicarla si solo entras y sales del campo sin cambiar nada.
            if((arrKey==='orto' || arrKey==='gram') && inp.value.trim()){
              const syncedKey = arrKey+'_synced';
              if(!Array.isArray(entry[syncedKey])) entry[syncedKey] = [];
              if(!entry[syncedKey][i]){
                sincronizarProgresoClase(materiaKey, null, inp.value.trim(), false, true, currentMonthKey+'-'+pad2(d));
                entry[syncedKey][i] = true;
                scheduleSave();
              }
            }
            renderClaseCalendar();
          };
          const rm = document.createElement('button');
          rm.type='button'; rm.textContent='×'; rm.setAttribute('aria-label','Quitar esta clase');
          rm.onclick = ()=>{
            const isExtra = (arrKey==='psicoExtra');
            removeClaseNotaTag(entry, materiaLabel, entry[arrKey][i]);
            cancelarSincronizacionClasePendiente(materiaKey, null, entry[arrKey][i] || '', currentMonthKey+'-'+pad2(d));
            devolverClaseAPendientes(materiaKey, isExtra ? null : (entry[arrKey][i] || ''), entry[arrKey][i] || '', isExtra);
            entry[arrKey].splice(i,1);
            scheduleSave(); renderClaseCalendar();
            renderClaseDayEdit(entry, d, jsDow); // re-pinta también las notas, por si se ha quitado un comentario
          };
          item.appendChild(inp); item.appendChild(rm);
          list.appendChild(item);
        });
      }
    };
    addBtn.onclick = ()=>{
      if(!Array.isArray(entry[arrKey])) entry[arrKey] = [];
      entry[arrKey].push('');
      scheduleSave(); repaint(); renderClaseCalendar();
    };
    addWrap.appendChild(addBtn);
    repaint();
    row.appendChild(list); row.appendChild(addWrap);
    return row;
  }

  const conOptions = []; for(let i=1;i<=23;i++) conOptions.push({value:i, label:'Tema '+i});
  body.appendChild(buildMultiRow('Clase de conocimientos (temas 1–23)', 'tema de conocimientos', 'conocimientos', conOptions, null, 'Conocimientos', 'conocimientos'));

  const ingOptions = []; for(let i=1;i<=INGLES_TOTAL;i++) ingOptions.push({value:i, label:'Lesson '+i});
  body.appendChild(buildMultiRow('Clase de inglés (lesson 1–32)', 'lesson de inglés', 'ingles', ingOptions, null, 'Inglés', 'ingles'));

  const psiOptions = PSICO_ITEMS.map((name, idx)=>({value:idx, label:name}));
  body.appendChild(buildMultiRow('Clase de psicotécnicos (prueba 1–23 + control 1 y 2)', 'prueba de psicotécnicos', 'psico', psiOptions, null, 'Psicotécnicos', 'psico'));
  body.appendChild(buildNamedListRow('Otra clase de psicotécnicos (fuera de la lista anterior)', 'psicoExtra', 'Nombre de la clase (opcional)', 'Psicotécnicos', 'psico'));

  body.appendChild(buildNamedListRow('Clase de ortografía', 'orto', 'Nombre de la clase (opcional)', 'Ortografía', 'orto'));
  body.appendChild(buildNamedListRow('Clase de gramática', 'gram', 'Nombre de la clase (opcional)', 'Gramática', 'gram'));

  const notaRow = document.createElement('div'); notaRow.className='clase-note-row';
  notaRow.innerHTML = '<label for="claseNotaTa">Notas del día</label>';
  const notaTa = document.createElement('textarea');
  notaTa.id = 'claseNotaTa'; notaTa.className='note-inline';
  notaTa.placeholder = 'Apuntes de la clase, dudas, deberes…';
  notaTa.value = entry.nota || '';
  notaTa.oninput = ()=>{ entry.nota = notaTa.value; scheduleSave(); };
  notaTa.onblur = ()=> renderClaseCalendar();
  notaRow.appendChild(notaTa);
  body.appendChild(notaRow);

  const backBtn = document.createElement('button');
  backBtn.type = 'button'; backBtn.className = 'btn clase-edit-back-btn';
  backBtn.textContent = '← Volver a la vista previa';
  backBtn.onclick = ()=> renderClaseDayPreview(entry, d, jsDow);
  body.appendChild(backBtn);
}
document.getElementById('closeClaseDayModal').onclick = ()=> document.getElementById('claseDayModal').classList.remove('open');
document.getElementById('claseDayModal').addEventListener('click', e=>{ if(e.target.id==='claseDayModal') e.currentTarget.classList.remove('open'); });

/* ===================== RENDER: SIMULACROS ===================== */
function renderSimulacrosList(){
  const host = document.getElementById('simulacrosListHost');
  if(!host) return;
  host.innerHTML = '';
  const list = state.simulacros;

  const topBar = document.createElement('div');
  topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;';
  topBar.innerHTML = '<h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-ink);font-size:17px;letter-spacing:.03em;">Simulacros</h3>';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+ Añadir simulacro';
  addBtn.onclick = ()=>{
    list.push({nombre:'', conocimientos:null, conAciertos:null, conFallos:null, conBlanco:null, ingles:null, psico:null, orto:null, gram:null, baremo:null, nota:''});
    scheduleSave();
    renderSimulacrosList();
  };
  topBar.appendChild(addBtn);
  host.appendChild(topBar);

  if(!list.length){
    const empty = document.createElement('div'); empty.className='empty-state';
    empty.textContent = 'Todavía no has añadido ningún simulacro. Pulsa «+ Añadir simulacro» para registrar el primero.';
    host.appendChild(empty);
    return;
  }

  list.forEach((sim,i)=>{
    const card = document.createElement('div'); card.className='sim-card';

    const head = document.createElement('div'); head.className='sim-card-head';
    const titleWrap = document.createElement('div'); titleWrap.style.cssText='flex:1;min-width:0;';
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.className='sim-name-input';
    nameInput.placeholder = 'Simulacro '+(i+1);
    nameInput.value = sim.nombre || '';
    nameInput.setAttribute('aria-label', 'Nombre del simulacro '+(i+1));
    nameInput.oninput = ()=>{ sim.nombre = nameInput.value; scheduleSave(); };
    nameInput.onblur = ()=> renderSimCalendar();
    titleWrap.appendChild(nameInput);
    if(sim.fecha){
      const [fy,fm,fd] = sim.fecha.split('-').map(Number);
      const fechaLbl = document.createElement('div');
      fechaLbl.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--muted);margin-top:3px;';
      fechaLbl.textContent = '📅 Día '+pad2(fd)+'/'+pad2(fm)+'/'+fy+' del calendario de simulacros';
      titleWrap.appendChild(fechaLbl);
    }
    head.appendChild(titleWrap);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger small';
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = ()=>{
      const label = sim.nombre ? sim.nombre : ('Simulacro '+(i+1));
      const aviso = sim.fecha ? ('¿Eliminar "'+label+'"?\n\nTambién se quitará del día correspondiente en el calendario de simulacros.') : ('¿Eliminar "'+label+'"?');
      if(confirm(aviso)){
        list.splice(i,1);
        scheduleSave();
        renderSimulacrosList();
        renderSimCalendar();
        renderHomeDash();
      }
    };
    head.appendChild(delBtn);
    card.appendChild(head);

    card.appendChild(buildSimScoreFields(sim, {onChange: ()=> renderSimCalendar()}));

    const notaWrap = document.createElement('div'); notaWrap.className='sim-note-row';
    notaWrap.innerHTML = '<label>Sensaciones / notas</label>';
    const notaTa = document.createElement('textarea');
    notaTa.className = 'note-inline'; notaTa.placeholder = 'Cómo te fue, qué repasar, sensaciones del examen…';
    notaTa.value = sim.nota || '';
    notaTa.oninput = ()=>{ sim.nota = notaTa.value; scheduleSave(); };
    notaTa.onblur = ()=> renderSimCalendar();
    notaWrap.appendChild(notaTa);
    card.appendChild(notaWrap);

    if(sim.fecha){
      const backBtn = document.createElement('button');
      backBtn.type = 'button'; backBtn.className = 'btn small ghost';
      backBtn.style.marginTop = '10px';
      backBtn.textContent = '📥 Quitar del calendario (pasa a pendientes)';
      backBtn.onclick = ()=>{
        const label = sim.nombre || 'este simulacro';
        if(confirm('«'+label+'» se quitará del día '+sim.fecha.split('-').reverse().join('/')+' del calendario y pasará al tablón de simulacros pendientes, sin perder nada de lo guardado. ¿Seguro?')){
          devolverSimulacroAPendientes(sim);
          renderSimulacrosList();
          renderSimCalendar();
          renderHomeDash();
        }
      };
      card.appendChild(backBtn);
    }

    host.appendChild(card);
  });
}
/* Bloque reutilizable de campos de notas (conocimientos/inglés/psicotécnico) y apto/no apto
   (ortografía/gramática) de un simulacro. Se usa tanto en la ficha completa de la pestaña
   Simulacros como directamente en el modal del día del calendario de simulacros, para poder
   editarlo todo sin tener que cambiar de pestaña. */
function computeConocimientosNota(sim){
  const ac = sim.conAciertos!=null ? Number(sim.conAciertos) : 0;
  const fa = sim.conFallos!=null ? Number(sim.conFallos) : 0;
  return Math.round((ac - fa*0.33)*100)/100;
}
/* Total del simulacro: suma de conocimientos (sobre 100), inglés (sobre 20), psicotécnico
   (sobre 30) y el baremo extra que se añada a mano. Si ortografía o gramática están marcadas
   como "No apto", el simulacro entero es NO APTO, da igual lo bien que vaya el resto. */
function computeSimTotal(sim){
  const noApto = sim.orto==='NO_APTO' || sim.gram==='NO_APTO';
  const con = sim.conocimientos!=null && !isNaN(sim.conocimientos) ? Number(sim.conocimientos) : null;
  const ing = sim.ingles!=null && !isNaN(sim.ingles) ? Number(sim.ingles) : null;
  const psi = sim.psico!=null && !isNaN(sim.psico) ? Number(sim.psico) : null;
  const bar = sim.baremo!=null && !isNaN(sim.baremo) ? Number(sim.baremo) : null;
  const hasAny = con!=null || ing!=null || psi!=null || bar!=null;
  const total = Math.round(((con||0)+(ing||0)+(psi||0)+(bar||0))*100)/100;
  return {noApto, total, hasAny, con, ing, psi, bar};
}
function buildSimScoreFields(sim, opts){
  opts = opts || {};
  const fields = document.createElement('div'); fields.className='sim-fields';
  let paintTotal = ()=>{};

  const mkNotaField = (label, prop, max)=>{
    const f = document.createElement('div'); f.className='sim-field';
    const lbl = document.createElement('label'); lbl.textContent = label+' (sobre '+max+')';
    f.appendChild(lbl);
    const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.alignItems='center';
    const inp = document.createElement('input'); inp.type='number'; inp.step='0.1'; inp.min='0'; inp.max=String(max);
    inp.value = sim[prop]==null ? '' : sim[prop];
    inp.placeholder = 'Nota';
    const pillHolder = document.createElement('span');
    const paintPill = ()=>{
      pillHolder.innerHTML = (sim[prop]!=null && !isNaN(sim[prop]))
        ? '<span class="nota-pill '+notaPillClass(sim[prop],max)+'">'+sim[prop]+'/'+max+'</span>' : '';
    };
    inp.oninput = ()=>{
      sim[prop] = inp.value===''? null : Number(inp.value);
      scheduleSave();
      paintPill();
      paintTotal();
      if(opts.onChange) opts.onChange();
    };
    paintPill();
    wrap.appendChild(inp); wrap.appendChild(pillHolder);
    f.appendChild(wrap);
    return f;
  };

  // Conocimientos ya no es una nota suelta: se calcula sola a partir de aciertos, fallos y
  // blancos (acierto +1, fallo -0,33, blanco 0), sobre 100, para poder ver de un vistazo
  // cuántas preguntas conviene arriesgar en el examen real.
  const mkConocimientosField = ()=>{
    const f = document.createElement('div'); f.className='sim-field'; f.style.gridColumn='1 / -1';
    const lbl = document.createElement('label'); lbl.textContent = 'Nota conocimientos (sobre 100)';
    f.appendChild(lbl);
    const row = document.createElement('div'); row.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;';
    const pillHolder = document.createElement('span');
    const paintPill = ()=>{
      const n = sim.conocimientos;
      pillHolder.innerHTML = (n!=null && !isNaN(n))
        ? '<span class="nota-pill '+notaPillClass(n,100)+'">'+n+'/100</span>' : '';
    };
    const mkSub = (subLabel, prop)=>{
      const wrap = document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:3px;';
      const l = document.createElement('span');
      l.style.cssText='font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);text-transform:uppercase;letter-spacing:.05em;';
      l.textContent = subLabel;
      const inp = document.createElement('input'); inp.type='number'; inp.step='1'; inp.min='0'; inp.style.width='76px';
      inp.value = sim[prop]==null ? '' : sim[prop];
      inp.placeholder='0';
      inp.setAttribute('aria-label', subLabel+' de conocimientos');
      inp.oninput = ()=>{
        sim[prop] = inp.value===''? null : Number(inp.value);
        sim.conocimientos = computeConocimientosNota(sim);
        scheduleSave();
        paintPill();
        paintTotal();
        if(opts.onChange) opts.onChange();
      };
      wrap.appendChild(l); wrap.appendChild(inp);
      return wrap;
    };
    row.appendChild(mkSub('Aciertos','conAciertos'));
    row.appendChild(mkSub('Fallos','conFallos'));
    row.appendChild(mkSub('En blanco','conBlanco'));
    row.appendChild(pillHolder);
    paintPill();
    f.appendChild(row);
    return f;
  };
  fields.appendChild(mkConocimientosField());
  fields.appendChild(mkNotaField('Nota inglés','ingles',20));
  fields.appendChild(mkNotaField('Nota psicotécnico','psico',30));

  const mkAptoField = (label, prop)=>{
    const f = document.createElement('div'); f.className='sim-field';
    const lbl = document.createElement('label'); lbl.textContent = label;
    f.appendChild(lbl);
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', label);
    sel.appendChild(new Option('— Sin marcar —',''));
    sel.appendChild(new Option('Apto','APTO'));
    sel.appendChild(new Option('No apto','NO_APTO'));
    sel.value = sim[prop] || '';
    sel.onchange = ()=>{ sim[prop] = sel.value || null; scheduleSave(); paintTotal(); if(opts.onChange) opts.onChange(); };
    f.appendChild(sel);
    return f;
  };
  fields.appendChild(mkAptoField('Ortografía','orto'));
  fields.appendChild(mkAptoField('Gramática','gram'));

  // Baremo: puntos externos (méritos, etc.) que se suman a la nota total del simulacro.
  const mkBaremoField = ()=>{
    const f = document.createElement('div'); f.className='sim-field';
    const lbl = document.createElement('label'); lbl.textContent = 'Baremo (puntos extra)';
    f.appendChild(lbl);
    const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.alignItems='center';
    const inp = document.createElement('input'); inp.type='number'; inp.step='0.01'; inp.min='0';
    inp.value = sim.baremo==null ? '' : sim.baremo;
    inp.placeholder = '0';
    inp.oninput = ()=>{
      sim.baremo = inp.value===''? null : Number(inp.value);
      scheduleSave();
      paintTotal();
      if(opts.onChange) opts.onChange();
    };
    wrap.appendChild(inp);
    f.appendChild(wrap);
    return f;
  };
  fields.appendChild(mkBaremoField());

  // Total: NO APTO manda sobre cualquier suma si ortografía o gramática han suspendido;
  // si no, es la suma de conocimientos + inglés + psicotécnico + baremo.
  const totalField = document.createElement('div'); totalField.className='sim-field sim-total-field'; totalField.style.gridColumn='1 / -1';
  const totalLbl = document.createElement('label'); totalLbl.textContent = 'Total simulacro';
  totalField.appendChild(totalLbl);
  const totalDisplay = document.createElement('div'); totalDisplay.style.cssText='font-family:var(--font-mono);font-size:13px;';
  totalField.appendChild(totalDisplay);
  paintTotal = ()=>{
    const r = computeSimTotal(sim);
    if(r.noApto){
      totalDisplay.innerHTML = '<span class="nota-pill bad">NO APTO</span> <span style="color:var(--muted);">— ortografía o gramática suspendidas</span>';
    } else if(!r.hasAny){
      totalDisplay.innerHTML = '<span style="color:var(--muted);">— añade alguna nota para ver el total —</span>';
    } else {
      totalDisplay.innerHTML = '<span class="nota-pill good">'+r.total+'</span> <span style="color:var(--muted);">= '+(r.con||0)+' con. + '+(r.ing||0)+' inglés + '+(r.psi||0)+' psico. + '+(r.bar||0)+' baremo</span>';
    }
  };
  paintTotal();
  fields.appendChild(totalField);

  return fields;
}
/* Tablón de "Simulacros pendientes": simulacros que ya sabes que tienes por delante (p. ej.
   "Simulacro completo mensual") sin saber todavía en qué día caerán. Vive justo debajo del
   Calendario de simulacros, y desde el modal de un día se pueden colocar directamente en
   ese día (desapareciendo de aquí). Si luego quitas un simulacro ya colocado, vuelve solo. */
function renderSimulacrosPendientes(){
  const host = document.getElementById('simulacrosPendientesHost');
  if(!host) return;
  ensureSimulacrosPendientes();
  renderAccordionSection(host, 'simulacrosPendientes', 'Simulacros pendientes (tablón)', (body)=>{
    const intro = document.createElement('div'); intro.className='sub'; intro.style.marginBottom='12px';
    intro.textContent = 'Apunta aquí por adelantado los simulacros que ya sabes que tienes por delante, sin saber todavía qué día exacto caerán. Cuando llegue el día, desde el Calendario de simulacros podrás colocarlos directamente en vez de crear uno nuevo, y desaparecerán de aquí. Si más adelante quitas un simulacro ya colocado del calendario, vuelve automáticamente a este tablón sin perder nada.';
    body.appendChild(intro);

    const formHost = document.createElement('div');
    body.appendChild(formHost);

    const listHost = document.createElement('div'); listHost.style.marginTop = '16px';
    body.appendChild(listHost);

    function refreshList(){
      listHost.innerHTML = '';
      const list = state.simulacrosPendientes.slice().sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
      if(!list.length){
        const empty = document.createElement('div'); empty.className='clase-multi-empty';
        empty.textContent = 'No tienes ningún simulacro pendiente apuntado.';
        listHost.appendChild(empty);
        return;
      }
      const todayISO = hoyLocalISO();
      const chips = document.createElement('div'); chips.className='clase-multi-chips';
      list.forEach(p=>{
        const isFuture = !!(p.disponibleDesde && p.disponibleDesde > todayISO);
        const chip = document.createElement('span'); chip.className='clase-multi-chip'+(isFuture?' future':'');
        let txt = p.nombre || 'Simulacro';
        if(p.disponibleDesde) txt += ' · '+(isFuture ? 'disponible desde ' : 'desde ')+formatFechaEs(p.disponibleDesde);
        if(p.nota && p.nota.trim()) txt += ' · 📝 '+p.nota.trim();
        chip.appendChild(document.createTextNode(txt));
        const del = document.createElement('button'); del.type='button'; del.textContent='×';
        del.title = 'Quitar de pendientes'; del.setAttribute('aria-label','Quitar de pendientes: '+txt);
        del.onclick = ()=>{
          const i = state.simulacrosPendientes.findIndex(x=>x.id===p.id);
          if(i>-1) state.simulacrosPendientes.splice(i,1);
          scheduleSave();
          refreshList();
        };
        chip.appendChild(del);
        chips.appendChild(chip);
      });
      listHost.appendChild(chips);
    }
    refreshList();

    renderSimulacroPendienteForm(formHost, refreshList);
  });
}
// Formulario paso a paso (igual que el de notas pendientes) para añadir un simulacro nuevo
// al tablón: nombre → fecha a partir de la cual está disponible → guardar, con opción de
// encadenar varios seguidos.
function renderSimulacroPendienteForm(container, onSaved){
  function clearC(){ container.innerHTML = ''; }
  function addBackBtn(wrap, label, fn){
    const back = document.createElement('button');
    back.type='button'; back.className='clase-quiz-back'; back.textContent = label || '← Atrás';
    back.onclick = fn;
    wrap.appendChild(back);
  }

  function stepNombre(){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent='Nuevo simulacro pendiente';
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Cómo se llama este simulacro?';
    wrap.appendChild(q);
    const inp = document.createElement('input'); inp.type='text'; inp.className='clase-quiz-text-input';
    inp.placeholder = 'p. ej. "Simulacro completo mensual"';
    wrap.appendChild(inp);
    const nextBtn = document.createElement('button'); nextBtn.type='button'; nextBtn.className='btn'; nextBtn.style.marginTop='10px';
    nextBtn.textContent = 'Continuar';
    nextBtn.onclick = ()=>{
      if(!inp.value.trim()) return;
      stepDisponible(inp.value.trim());
    };
    wrap.appendChild(nextBtn);
    container.appendChild(wrap);
  }

  function stepDisponible(nombre){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const eyebrow = document.createElement('div'); eyebrow.className='clase-quiz-eyebrow'; eyebrow.textContent=nombre;
    wrap.appendChild(eyebrow);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿A partir de qué fecha estará disponible para colocarlo en el calendario?';
    wrap.appendChild(q);
    const hint = document.createElement('div'); hint.className='clase-quiz-or'; hint.textContent='Déjalo en blanco si ya está disponible ahora mismo.';
    wrap.appendChild(hint);
    const dateInp = document.createElement('input'); dateInp.type='date'; dateInp.className='clase-quiz-text-input';
    wrap.appendChild(dateInp);
    const saveBtn = document.createElement('button'); saveBtn.type='button'; saveBtn.className='btn'; saveBtn.style.marginTop='10px';
    saveBtn.textContent = 'Guardar en pendientes';
    saveBtn.onclick = ()=> guardar(nombre, dateInp.value || null);
    wrap.appendChild(saveBtn);
    addBackBtn(wrap, '← Atrás', stepNombre);
    container.appendChild(wrap);
  }

  function guardar(nombre, disponibleDesde){
    ensureSimulacrosPendientes().push({
      id: Date.now()+'-'+Math.random(),
      nombre,
      disponibleDesde: disponibleDesde || null,
      conocimientos: null, conAciertos: null, conFallos: null, conBlanco: null, ingles: null, psico: null, orto: null, gram: null, baremo: null,
      nota: ''
    });
    scheduleSave();
    onSaved();
    stepConfirm(nombre);
  }

  function stepConfirm(nombre){
    clearC();
    const wrap = document.createElement('div'); wrap.className='clase-quiz-wrap';
    const confirmBox = document.createElement('div'); confirmBox.className='clase-quiz-confirm';
    const okQ = document.createElement('div'); okQ.className='clase-quiz-question'; okQ.textContent='✓ Añadido a pendientes';
    confirmBox.appendChild(okQ);
    const detail = document.createElement('div'); detail.className='clase-quiz-progress'; detail.textContent = nombre;
    confirmBox.appendChild(detail);
    wrap.appendChild(confirmBox);
    const q = document.createElement('div'); q.className='clase-quiz-question'; q.textContent='¿Añadir otro simulacro pendiente?';
    wrap.appendChild(q);
    const opts = document.createElement('div'); opts.className='clase-quiz-options';
    const yesBtn = document.createElement('button'); yesBtn.type='button'; yesBtn.className='clase-quiz-opt'; yesBtn.textContent='Sí, añadir otro';
    yesBtn.onclick = ()=> stepNombre();
    const noBtn = document.createElement('button'); noBtn.type='button'; noBtn.className='clase-quiz-opt'; noBtn.textContent='No, he terminado';
    noBtn.onclick = ()=> stepNombre();
    opts.appendChild(yesBtn); opts.appendChild(noBtn);
    wrap.appendChild(opts);
    container.appendChild(wrap);
  }

  stepNombre();
}
function renderSimCalMonthBar(){
  const bar = document.getElementById('simCalMonthBar');
  if(!bar) return;
  bar.innerHTML = '';
  const keys = sortedMonthKeys();
  if(!keys.length){
    bar.innerHTML = '<span style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">Añade un mes desde la pestaña Calendario para empezar.</span>';
    return;
  }
  if(!currentMonthKey || !keys.includes(currentMonthKey)) currentMonthKey = keys[keys.length-1];
  const controls = document.createElement('div'); controls.className='month-controls';
  const prevBtn = document.createElement('button'); prevBtn.className='icon-btn'; prevBtn.textContent = '‹'; prevBtn.setAttribute('aria-label','Anterior'); prevBtn.title = 'Anterior';
  prevBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i>0){ currentMonthKey=keys[i-1]; renderAll(); } };
  controls.appendChild(prevBtn);
  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Cambiar de mes');
  keys.forEach(k=>{
    const [y,m] = k.split('-').map(Number);
    const opt = document.createElement('option'); opt.value=k; opt.textContent = MESES[m-1]+' '+y;
    if(k===currentMonthKey) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ currentMonthKey = sel.value; renderAll(); };
  controls.appendChild(sel);
  const nextBtn = document.createElement('button'); nextBtn.className='icon-btn'; nextBtn.textContent = '›'; nextBtn.setAttribute('aria-label','Siguiente'); nextBtn.title = 'Siguiente';
  nextBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey=keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);
  bar.appendChild(controls);
  const info = document.createElement('span');
  info.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--muted);margin-left:auto;';
  info.textContent = 'Estado del día sincronizado con el Calendario de estudio';
  bar.appendChild(info);
}
/* ===================== CALENDARIO DE SIMULACROS: conectado con la pestaña Simulacros =====================
   Cada día marcado como simulacro queda enlazado, por fecha ("YYYY-MM-DD"), con una ficha de
   state.simulacros. Al marcar un día se crea (o reutiliza) esa ficha automáticamente y aparece
   en la pestaña Simulacros; al editar el nombre o las notas desde aquí se edita el mismo objeto
   que se ve allí, así que queda sincronizado en los dos sitios sin nada más que hacer. */
function simFechaDia(monthKey, d){ return monthKey+'-'+pad2(d); }
function buscarSimulacroPorFecha(fecha){ return (state.simulacros||[]).find(s=> s.fecha===fecha); }
function crearSimulacroEnFecha(fecha, d, m, y){
  if(!Array.isArray(state.simulacros)) state.simulacros = [];
  const sim = { nombre:'Simulacro '+pad2(d)+'/'+pad2(m)+'/'+y, fecha:fecha, conocimientos:null, ingles:null, psico:null, orto:null, gram:null, nota:'' };
  state.simulacros.push(sim);
  return sim;
}
function eliminarSimulacroPorFecha(fecha){
  const i = (state.simulacros||[]).findIndex(s=> s.fecha===fecha);
  if(i>-1) state.simulacros.splice(i,1);
}
/* ---- Simulacros pendientes: tablón de simulacros ya cargados de antemano (con o sin
   fecha "disponible desde") que todavía no están colocados en ningún día del calendario.
   Funciona igual que el tablón de "Clases pendientes": se cargan aquí, se colocan
   directamente en un día desde el modal del calendario de simulacros (desapareciendo de
   aquí), y si luego se quita un simulacro ya colocado, vuelve automáticamente a este
   tablón en vez de perderse, con todos sus datos (notas, puntuaciones) intactos. */
function ensureSimulacrosPendientes(){ if(!Array.isArray(state.simulacrosPendientes)) state.simulacrosPendientes = []; return state.simulacrosPendientes; }
function devolverSimulacroAPendientes(sim){
  const list = ensureSimulacrosPendientes();
  list.push({
    id: Date.now()+'-'+Math.random(),
    nombre: sim.nombre || '',
    disponibleDesde: null,
    conocimientos: sim.conocimientos!=null ? sim.conocimientos : null,
    conAciertos: sim.conAciertos!=null ? sim.conAciertos : null,
    conFallos: sim.conFallos!=null ? sim.conFallos : null,
    conBlanco: sim.conBlanco!=null ? sim.conBlanco : null,
    ingles: sim.ingles!=null ? sim.ingles : null,
    psico: sim.psico!=null ? sim.psico : null,
    orto: sim.orto || null,
    gram: sim.gram || null,
    baremo: sim.baremo!=null ? sim.baremo : null,
    nota: sim.nota || ''
  });
  if(sim.fecha) eliminarSimulacroPorFecha(sim.fecha);
  scheduleSave();
  renderSimulacrosPendientes();
}
/* Coloca un simulacro pendiente en un día concreto del calendario: se convierte en una
   ficha normal de state.simulacros (con esa fecha) conservando todo lo que tuviera
   apuntado, y desaparece del tablón de pendientes. */
function colocarSimulacroPendienteEnFecha(pendienteId, fecha){
  const list = ensureSimulacrosPendientes();
  const i = list.findIndex(x=> x.id===pendienteId);
  if(i<0) return null;
  const p = list[i];
  if(!Array.isArray(state.simulacros)) state.simulacros = [];
  const sim = {
    nombre: p.nombre || '',
    fecha: fecha,
    conocimientos: p.conocimientos!=null ? p.conocimientos : null,
    conAciertos: p.conAciertos!=null ? p.conAciertos : null,
    conFallos: p.conFallos!=null ? p.conFallos : null,
    conBlanco: p.conBlanco!=null ? p.conBlanco : null,
    ingles: p.ingles!=null ? p.ingles : null,
    psico: p.psico!=null ? p.psico : null,
    orto: p.orto || null,
    gram: p.gram || null,
    baremo: p.baremo!=null ? p.baremo : null,
    nota: p.nota || ''
  };
  state.simulacros.push(sim);
  list.splice(i,1);
  scheduleSave();
  return sim;
}
function simCalPillsHTML(sim){
  if(!sim) return '<span class="cclase-empty">Sin simulacro</span>';
  const nombre = sim.nombre ? sim.nombre : 'Simulacro';
  const nombrePreview = nombre.length>28 ? nombre.slice(0,28)+'…' : nombre;
  let html = '<span class="cclase-pill p-sim">'+nombrePreview.replace(/</g,'&lt;')+'</span>';
  if(sim.nota){
    const preview = sim.nota.length>28 ? sim.nota.slice(0,28)+'…' : sim.nota;
    html += '<span class="cclase-pill p-nota">📝 '+preview.replace(/</g,'&lt;')+'</span>';
  }
  return html;
}
function renderSimCalendar(){
  if(typeof simCalViewMode !== 'undefined' && simCalViewMode === 'list') renderSimCalendarList();
  else renderSimCalendarGrid();
  if(!_renderAllEnCurso) renderTodoCalendar();
}
function renderSimCalendarGrid(){
  const host = document.getElementById('simCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde la pestaña Calendario.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const daysData = (state.months[currentMonthKey] && state.months[currentMonthKey].days) || {};

  const grid = document.createElement('div'); grid.className='cal-grid';
  DOW.forEach(dname=>{
    const dow = document.createElement('div'); dow.className='cal-dow'; dow.textContent = dname.slice(0,3);
    grid.appendChild(dow);
  });
  const firstDow = new Date(y, m-1, 1).getDay();
  const leadingBlanks = (firstDow === 0) ? 6 : firstDow - 1;
  for(let i=0;i<leadingBlanks;i++){
    const b = document.createElement('div'); b.className='cclase-cell blank'; grid.appendChild(b);
  }

  for(let d=1; d<=nDays; d++){
    const status = daysData[d] || 'ESTUDIO';
    const jsDow = new Date(y, m-1, d).getDay();
    const cell = document.createElement('div');
    cell.className = 'cclase-cell status-'+status;
    const now = new Date();
    if(y===now.getFullYear() && m===(now.getMonth()+1) && d===now.getDate()){
      cell.classList.add('today');
      cell.id = 'todaySimCell';
    }

    const numRow = document.createElement('div'); numRow.className='cal-daynum';
    const wdName = DOW_SHORT[(jsDow===0?6:jsDow-1)];
    numRow.innerHTML = '<span>'+d+'</span><span class="wd">'+wdName+'</span>';
    cell.appendChild(numRow);

    if(status !== 'ESTUDIO'){
      const lbl = document.createElement('div'); lbl.className='off-label'; lbl.style.fontSize='9px';
      lbl.textContent = status==='DESCANSO' ? 'Descanso' : status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      cell.appendChild(lbl);
    }

    const sim = buscarSimulacroPorFecha(simFechaDia(currentMonthKey, d));
    const pills = document.createElement('div'); pills.className='cclase-pills';
    pills.innerHTML = simCalPillsHTML(sim);
    cell.appendChild(pills);

    cell.onclick = ()=> openSimDayModal(d, jsDow);
    grid.appendChild(cell);
  }
  host.appendChild(grid);
}
/* Vista alternativa tipo lista/agenda, igual que la del calendario de clases. */
function renderSimCalendarList(){
  const host = document.getElementById('simCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde la pestaña Calendario.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const daysData = (state.months[currentMonthKey] && state.months[currentMonthKey].days) || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const list = document.createElement('div'); list.className='cal-list';
  for(let d=1; d<=nDays; d++){
    const status = daysData[d] || 'ESTUDIO';
    const jsDow = new Date(y, m-1, d).getDay();
    const isToday = isCurrentMonth && d===now.getDate();

    const item = document.createElement('div');
    item.className = 'cal-list-item cclase-list-item status-'+status;
    if(isToday){ item.classList.add('today'); item.id = 'todaySimListItem'; }

    const head = document.createElement('div'); head.className='cal-list-head';
    const dateWrap = document.createElement('div'); dateWrap.className='cal-list-date';
    const wdName = DOW[(jsDow===0?6:jsDow-1)];
    dateWrap.innerHTML = '<span class="cal-list-daynum">'+d+'</span><span class="cal-list-wd">'+wdName+'</span>';
    head.appendChild(dateWrap);
    if(status !== 'ESTUDIO'){
      const lbl = document.createElement('span'); lbl.className='off-label';
      lbl.textContent = status==='DESCANSO' ? 'Descanso' : status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      head.appendChild(lbl);
    }
    item.appendChild(head);

    const sim = buscarSimulacroPorFecha(simFechaDia(currentMonthKey, d));
    const pills = document.createElement('div'); pills.className='cclase-pills cclase-list-pills';
    pills.innerHTML = simCalPillsHTML(sim);
    item.appendChild(pills);

    item.onclick = ()=> openSimDayModal(d, jsDow);
    list.appendChild(item);
  }
  host.appendChild(list);
}
/* ===================== CALENDARIO "TODO INCLUIDO" =====================
   Cuarta vista de la pestaña Calendario: junta en la misma rejilla lo que hay repartido
   en los otros tres calendarios (tareas de estudio del día + clases + simulacro + notas).
   No guarda nada propio ni sustituye a ninguno: lee de los mismos sitios, y al pulsar un
   día abre la ficha completa del día (openDayModal), desde donde se edita todo. */
function renderTodoCalLegend(){
  const el = document.getElementById('todoCalLegend');
  if(!el) return;
  el.innerHTML = `
    <span><i style="background:var(--red)"></i>Bloque grave</span>
    <span><i style="background:var(--amber)"></i>Bloque menos grave</span>
    <span><i style="background:var(--green)"></i>Leve</span>
    <span><i style="background:var(--blue)"></i>Inglés</span>
    <span><i style="background:#7a5c9c"></i>Psicotécnico</span>
    <span><i style="background:#a9531d"></i>Entreno</span>
    <span><i style="background:#6b7368"></i>Orto-grama</span>
    <span><i style="background:#7a9bb5"></i>Clases</span>
    <span><i style="background:#b6543f"></i>Simulacro</span>
  `;
}
function renderTodoCalMonthBar(){
  const bar = document.getElementById('todoCalMonthBar');
  if(!bar) return;
  bar.innerHTML = '';
  const keys = sortedMonthKeys();
  if(!keys.length){
    bar.innerHTML = '<span style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">Añade un mes desde el Calendario de estudio para empezar.</span>';
    return;
  }
  if(!currentMonthKey || !keys.includes(currentMonthKey)) currentMonthKey = keys[keys.length-1];
  const controls = document.createElement('div'); controls.className='month-controls';
  const prevBtn = document.createElement('button'); prevBtn.className='icon-btn'; prevBtn.textContent = '‹'; prevBtn.setAttribute('aria-label','Anterior'); prevBtn.title = 'Anterior';
  prevBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i>0){ currentMonthKey=keys[i-1]; renderAll(); } };
  controls.appendChild(prevBtn);
  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Cambiar de mes');
  keys.forEach(k=>{
    const [y,m] = k.split('-').map(Number);
    const opt = document.createElement('option'); opt.value=k; opt.textContent = MESES[m-1]+' '+y;
    if(k===currentMonthKey) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{ currentMonthKey = sel.value; renderAll(); };
  controls.appendChild(sel);
  const nextBtn = document.createElement('button'); nextBtn.className='icon-btn'; nextBtn.textContent = '›'; nextBtn.setAttribute('aria-label','Siguiente'); nextBtn.title = 'Siguiente';
  nextBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey=keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);
  bar.appendChild(controls);
  const info = document.createElement('span');
  info.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--muted);margin-left:auto;';
  info.textContent = 'Estudio + clases + simulacros';
  bar.appendChild(info);
}
/* Bloque de contenido de un día en la vista "todo incluido": las tres capas, cada una con
   su etiqueta, y solo las que tengan algo (las clases y el simulacro solo salen si existen,
   para que un día normal no se llene de "sin nada"). */
function buildTodoDayContent(d, info, compact){
  const frag = document.createDocumentFragment();
  const addSub = (label, node)=>{
    const sec = document.createElement('div'); sec.className='todo-sec';
    const lbl = document.createElement('div'); lbl.className='todo-sec-label'; lbl.textContent = label;
    sec.appendChild(lbl);
    sec.appendChild(node);
    frag.appendChild(sec);
  };

  if(info.status === 'ESTUDIO' && Array.isArray(info.temasDelDia)){
    addSub('Estudio', buildTasksBlock(d, info, compact));
  } else {
    // En los días que no son de estudio, la nota del día la pintamos aquí (en los de
    // estudio ya la incluye buildTasksBlock al final de las tareas).
    const noteTxt = state.notes[dayNoteKey(currentMonthKey, d)];
    if(noteTxt){
      const noteRow = document.createElement('div');
      noteRow.className = 'task-row day-note-preview';
      const maxLen = compact ? 34 : 140;
      const preview = noteTxt.length>maxLen ? noteTxt.slice(0,maxLen)+'…' : noteTxt;
      noteRow.innerHTML = '<span class="tag tag-nota">NOTA</span><span class="task-txt">'+preview.replace(/</g,'&lt;')+'</span>';
      addSub('Notas', noteRow);
    }
  }

  const claseEntry = (state.claseCal[currentMonthKey] && state.claseCal[currentMonthKey][d]) || {};
  const tieneClase = ['conocimientos','ingles','psico','psicoExtra','orto','gram'].some(k=> Array.isArray(claseEntry[k]) && claseEntry[k].length) || !!claseEntry.nota;
  if(tieneClase){
    const pills = document.createElement('div'); pills.className='cclase-pills';
    pills.innerHTML = buildClasePillsHTML(claseEntry, compact ? 24 : 120);
    addSub('Clases', pills);
  }

  const sim = buscarSimulacroPorFecha(simFechaDia(currentMonthKey, d));
  if(sim){
    const pills = document.createElement('div'); pills.className='cclase-pills';
    pills.innerHTML = simCalPillsHTML(sim);
    addSub('Simulacro', pills);
  }

  return frag;
}
function renderTodoCalendar(){
  if(typeof todoCalViewMode !== 'undefined' && todoCalViewMode === 'list') renderTodoCalendarList();
  else renderTodoCalendarGrid();
}
function renderTodoCalendarGrid(){
  const host = document.getElementById('todoCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde el Calendario de estudio.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const plan = computePlan();
  const monthPlan = plan[currentMonthKey] || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const grid = document.createElement('div'); grid.className='cal-grid todo-grid';
  DOW.forEach(dname=>{
    const dow = document.createElement('div'); dow.className='cal-dow'; dow.textContent = dname.slice(0,3);
    grid.appendChild(dow);
  });
  const firstDow = new Date(y, m-1, 1).getDay();
  const leadingBlanks = (firstDow === 0) ? 6 : firstDow - 1;
  for(let i=0;i<leadingBlanks;i++){
    const b = document.createElement('div'); b.className='cal-cell blank'; grid.appendChild(b);
  }

  for(let d=1; d<=nDays; d++){
    const info = monthPlan[d] || {status:'ESTUDIO'};
    const cell = document.createElement('div');
    cell.className = 'cal-cell todo-cell status-'+info.status;
    if(isCurrentMonth && d===now.getDate()){ cell.classList.add('today'); cell.id = 'todayTodoCell'; }

    const numRow = document.createElement('div'); numRow.className='cal-daynum';
    const jsDow = (info.dow===undefined || info.dow===null) ? new Date(y, m-1, d).getDay() : info.dow;
    const leftWrap = document.createElement('span'); leftWrap.className='cal-daynum-left';
    const dnSpan = document.createElement('span'); dnSpan.textContent = d;
    leftWrap.appendChild(dnSpan);
    const badge = dayCompletionBadge(info);
    if(badge) leftWrap.appendChild(badge);
    numRow.appendChild(leftWrap);
    const wdSpan = document.createElement('span'); wdSpan.className='wd'; wdSpan.textContent = DOW_SHORT[(jsDow===0?6:jsDow-1)];
    numRow.appendChild(wdSpan);
    cell.appendChild(numRow);

    if(info.status !== 'ESTUDIO'){
      const lbl = document.createElement('div'); lbl.className='off-label'; lbl.style.fontSize='9px';
      lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      cell.appendChild(lbl);
    }
    cell.appendChild(buildTodoDayContent(d, info, true));

    cell.style.cursor = 'pointer';
    cell.onclick = ()=> openDayModal(d, info);
    grid.appendChild(cell);
  }
  host.appendChild(grid);
}
function renderTodoCalendarList(){
  const host = document.getElementById('todoCalHost');
  if(!host) return;
  host.innerHTML = '';
  if(!currentMonthKey){
    host.innerHTML = '<div class="empty-state">Todavía no has añadido ningún mes.<br>Añádelo desde el Calendario de estudio.</div>';
    return;
  }
  const [y,m] = currentMonthKey.split('-').map(Number);
  const nDays = daysInMonth(y,m);
  const plan = computePlan();
  const monthPlan = plan[currentMonthKey] || {};
  const now = new Date();
  const isCurrentMonth = (y===now.getFullYear() && m===(now.getMonth()+1));

  const list = document.createElement('div'); list.className='cal-list';
  for(let d=1; d<=nDays; d++){
    const info = monthPlan[d] || {status:'ESTUDIO'};
    const jsDow = (info.dow===undefined || info.dow===null) ? new Date(y, m-1, d).getDay() : info.dow;
    const item = document.createElement('div');
    item.className = 'cal-list-item todo-list-item status-'+info.status;
    if(isCurrentMonth && d===now.getDate()){ item.classList.add('today'); item.id = 'todayTodoListItem'; }

    const head = document.createElement('div'); head.className='cal-list-head';
    const dateWrap = document.createElement('div'); dateWrap.className='cal-list-date';
    dateWrap.innerHTML = '<span class="cal-list-daynum">'+d+'</span><span class="cal-list-wd">'+DOW[(jsDow===0?6:jsDow-1)]+'</span>';
    head.appendChild(dateWrap);
    const headRight = document.createElement('div'); headRight.className='cal-list-head-right';
    const badge = dayCompletionBadge(info);
    if(badge) headRight.appendChild(badge);
    if(info.status !== 'ESTUDIO'){
      const lbl = document.createElement('span'); lbl.className='off-label';
      lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
      headRight.appendChild(lbl);
    }
    head.appendChild(headRight);
    item.appendChild(head);

    item.appendChild(buildTodoDayContent(d, info, false));

    item.style.cursor = 'pointer';
    item.onclick = ()=> openDayModal(d, info);
    list.appendChild(item);
  }
  host.appendChild(list);
}
function openSimDayModal(d, jsDow){
  const [y,m] = currentMonthKey.split('-').map(Number);
  document.getElementById('simDayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  document.getElementById('simDayModalSub').textContent = DOW[(jsDow===0?6:jsDow-1)];
  const fecha = simFechaDia(currentMonthKey, d);
  const body = document.getElementById('simDayModalBody');
  body.innerHTML = '';

  const refreshEverything = ()=>{
    renderSimCalendar();
    renderSimulacrosList();
    renderSimulacrosPendientes();
    renderHomeDash();
  };

  const row = document.createElement('div'); row.className='clase-select-row';
  row.innerHTML = '<label>Simulacro</label>';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Simulacro');
  sel.appendChild(new Option('— Ninguno —',''));
  sel.appendChild(new Option('Sí, hubo simulacro','SIMULACRO'));
  sel.value = buscarSimulacroPorFecha(fecha) ? 'SIMULACRO' : '';
  sel.onchange = ()=>{
    if(sel.value==='SIMULACRO'){
      if(!buscarSimulacroPorFecha(fecha)) crearSimulacroEnFecha(fecha, d, m, y);
      scheduleSave();
      refreshEverything();
      openSimDayModal(d, jsDow); // repinta el modal ya con los campos de edición
    } else {
      const sim = buscarSimulacroPorFecha(fecha);
      if(sim){
        const label = sim.nombre || 'este simulacro';
        const tieneAlgo = !!(sim.nota || sim.conocimientos!=null || sim.ingles!=null || sim.psico!=null || sim.orto || sim.gram);
        if(tieneAlgo && !confirm('«'+label+'» se quitará de este día. No se pierde nada: pasa al tablón de «Simulacros pendientes», de donde podrás colocarlo en otro día más adelante. ¿Seguro?')){
          sel.value = 'SIMULACRO';
          return;
        }
        devolverSimulacroAPendientes(sim);
        refreshEverything();
        openSimDayModal(d, jsDow);
      }
    }
  };
  row.appendChild(sel);
  body.appendChild(row);

  const sim = buscarSimulacroPorFecha(fecha);
  if(sim){
    const nameRow = document.createElement('div'); nameRow.className='clase-note-row';
    nameRow.innerHTML = '<label for="simNombreInp">Nombre del simulacro</label>';
    const nameInp = document.createElement('input');
    nameInp.type = 'text'; nameInp.id = 'simNombreInp'; nameInp.className='sim-name-input';
    nameInp.value = sim.nombre || '';
    nameInp.setAttribute('aria-label','Nombre del simulacro');
    nameInp.oninput = ()=>{ sim.nombre = nameInp.value; scheduleSave(); };
    nameInp.onblur = refreshEverything;
    nameRow.appendChild(nameInp);
    body.appendChild(nameRow);

    // Notas y puntuaciones (conocimientos, inglés, psicotécnico, ortografía, gramática)
    // editables aquí mismo, sin tener que ir a la pestaña Simulacros.
    body.appendChild(buildSimScoreFields(sim, {onChange: refreshEverything}));

    const notaRow = document.createElement('div'); notaRow.className='clase-note-row';
    notaRow.innerHTML = '<label for="simNotaTa">Sensaciones / notas</label>';
    const notaTa = document.createElement('textarea');
    notaTa.id = 'simNotaTa'; notaTa.className = 'note-inline';
    notaTa.placeholder = 'Sensaciones, aciertos, fallos a repasar…';
    notaTa.value = sim.nota || '';
    notaTa.oninput = ()=>{ sim.nota = notaTa.value; scheduleSave(); };
    notaTa.onblur = refreshEverything;
    notaRow.appendChild(notaTa);
    body.appendChild(notaRow);

    const goBtn = document.createElement('button');
    goBtn.type = 'button'; goBtn.className = 'btn small ghost';
    goBtn.style.marginTop = '10px';
    goBtn.textContent = 'Ver todos los simulacros en su pestaña →';
    goBtn.onclick = ()=>{
      document.getElementById('simDayModal').classList.remove('open');
      const tabBtn = document.querySelector('.tab-btn[data-tab="simulacros"]');
      if(tabBtn) tabBtn.click();
    };
    body.appendChild(goBtn);
  } else {
    // Sin simulacro todavía en este día: si hay algo en el tablón de pendientes, se puede
    // colocar aquí directamente en vez de crear uno nuevo desde cero.
    const pendWrap = document.createElement('div'); pendWrap.style.marginTop = '16px';
    body.appendChild(pendWrap);
    const list = ensureSimulacrosPendientes().slice().sort((a,b)=> (a.disponibleDesde||'').localeCompare(b.disponibleDesde||''));
    if(list.length){
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-family:var(--font-mono);font-size:12px;text-transform:uppercase;color:var(--cream-dim);letter-spacing:.05em;margin-bottom:6px;';
      lbl.textContent = 'O coloca aquí un simulacro pendiente';
      pendWrap.appendChild(lbl);
      const opts = document.createElement('div'); opts.className = 'clase-quiz-options';
      list.forEach(item=>{
        const isBlocked = !!(item.disponibleDesde && item.disponibleDesde > fecha);
        const b = document.createElement('button'); b.type='button'; b.className='clase-quiz-opt';
        b.textContent = (item.nombre||'Simulacro') + (isBlocked ? ' (disponible desde '+formatFechaEs(item.disponibleDesde)+')' : '');
        if(isBlocked){
          b.disabled = true;
          b.title = 'Este simulacro estará disponible a partir del '+formatFechaEs(item.disponibleDesde);
        } else {
          b.onclick = ()=>{
            colocarSimulacroPendienteEnFecha(item.id, fecha);
            refreshEverything();
            openSimDayModal(d, jsDow);
          };
        }
        opts.appendChild(b);
      });
      pendWrap.appendChild(opts);
    }
  }

  document.getElementById('simDayModal').classList.add('open');
}
document.getElementById('closeSimDayModal').onclick = ()=> document.getElementById('simDayModal').classList.remove('open');
document.getElementById('simDayModal').addEventListener('click', e=>{ if(e.target.id==='simDayModal') e.currentTarget.classList.remove('open'); });

/* ===================== RENDER: PROGRESO (comparativa de notas de test) ===================== */
function collectNotaData(){
  const porGrupo = {}; // grupo -> [{key,label,notas:[..],seq:[..],max}]
  Object.keys(state.ticks).forEach(key=>{
    const meta = KEY_LABELS[key];
    if(!meta) return; // key de un tema que ya no existe en el temario actual
    const entries = (state.ticks[key]||[]).map(migrateTickEntry);
    const notas = []; // solo las vueltas con nota numérica (para media/gráfico)
    const seq = [];   // notas + "no test" + "no tiempo" + "solo lectura", en el orden real de las vueltas
    const esIng = esKeyIngles(key);
    entries.forEach((e,vueltaIdx)=>{
      // vuelta: número de vuelta (1-based) al que pertenece esta entrada, tal cual aparece
      // en «Temario y notas». Varios tests de una misma vuelta comparten el mismo número.
      const vuelta = vueltaIdx+1;
      // Inglés: además del test general (la propia vuelta) se recogen los 4 tests, cada uno con su
      // etiqueta (slot) para poder mostrarlo y compararlo con el mismo texto de otras vueltas.
      const slots = esIng ? slotsDeVuelta(e) : [{id:null, s:e}];
      slots.forEach(({id, s:sl})=>{
        const tag = esIng ? {slot:id} : {};
        if(sl.mode==='nota'){
          // Una vuelta puede tener varios tests: cada uno es una nota más (extra = 2º test o posterior
          // de la misma vuelta).
          testsDeVuelta(sl).forEach((n,k)=>{
            notas.push(n);
            seq.push(Object.assign({mode:'nota', nota:n, extra:k>0, vuelta}, tag));
          });
        } else if(sl.mode==='no_test' || sl.mode==='no_tiempo' || sl.mode==='solo_lectura'){
          seq.push(Object.assign({mode:sl.mode, vuelta}, tag));
        }
      });
    });
    if(seq.length){
      if(!porGrupo[meta.grupo]) porGrupo[meta.grupo] = [];
      porGrupo[meta.grupo].push({key, label:meta.label, notas, seq, max: meta.max || GROUP_MAX_NOTA[meta.grupo] || 10});
    }
  });
  return {porGrupo};
}
function notaPillClass(n, max){
  max = max || 10;
  return n >= max*0.7 ? 'good' : (n >= max*0.5 ? 'mid' : 'bad');
}
/* Dibuja un mini-gráfico de líneas (sparkline) con la evolución de las notas de un tema a
   través de sus vueltas. Se usa en la pestaña «Progreso» en vez del texto ▲/▼ de antes. */
function drawSparkline(canvas, notas, max, color){
  const T = chartTheme();
  color = chartColor(color);
  const cssW = canvas.width, cssH = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW+'px';
  canvas.style.height = cssH+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const padX = 5, padY = 4;
  const w = cssW - padX*2, h = cssH - padY*2;
  const n = notas.length;
  const xAt = i => n>1 ? padX + (w*i/(n-1)) : padX + w/2;
  const yAt = v => padY + h*(1 - Math.max(0, Math.min(1, v/max)));

  // Línea de referencia en el 70% (umbral que la propia app usa como nota "buena").
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  const goodY = yAt(max*0.7);
  ctx.beginPath(); ctx.moveTo(padX, goodY); ctx.lineTo(padX+w, goodY); ctx.stroke();

  // Línea de la evolución.
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  notas.forEach((v,i)=>{ const x=xAt(i), y=yAt(v); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
  ctx.stroke();

  // Puntos: el último resaltado en el color del grupo, el resto en tono neutro.
  notas.forEach((v,i)=>{
    const x = xAt(i), y = yAt(v);
    const isLast = i === n-1;
    ctx.beginPath();
    ctx.fillStyle = isLast ? color : T.dot;
    ctx.arc(x, y, isLast ? 2.6 : 1.7, 0, Math.PI*2);
    ctx.fill();
  });
}
/* Colores de los gráficos según el tema activo. Los <canvas> no leen el CSS solos, así que se los
   pedimos al tema en el momento de dibujar (y se repintan al cambiar de tema, ver initChartRedraw). */
const CHART_FONT = "12px system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
function chartTheme(){
  const root = document.documentElement;
  const light = root.getAttribute('data-theme') === 'light';
  const cs = getComputedStyle(root);
  const text = (cs.getPropertyValue('--cream-dim') || '').trim() || (light ? '#55524a' : '#c3bda3');
  return {
    light, text,
    grid: light ? 'rgba(30,42,34,0.18)' : 'rgba(236,228,211,0.16)',
    dot:  light ? 'rgba(30,42,34,0.55)' : 'rgba(236,228,211,0.55)'
  };
}
/* Los colores de serie están pensados para fondo oscuro; en claro los oscurecemos un 30% para que se vean. */
function chartColor(hex){
  if(!chartTheme().light) return hex;
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if(!m) return hex;
  const n = parseInt(m[1], 16);
  return '#' + [(n>>16)&255, (n>>8)&255, n&255].map(c=>Math.round(c*0.7).toString(16).padStart(2,'0')).join('');
}
/* opts.cap: tope del eje Y (p. ej. 10 en notas). El eje se ajusta al rango real de los datos para que los
   cambios pequeños se vean; si los datos están cerca de 0 se mantiene el 0 como base. */
function drawTrendChart(canvas, points, colorIn, opts){
  opts = opts || {};
  const T = chartTheme();
  const color = chartColor(colorIn);
  const parent = canvas.parentElement;
  const parentW = parent && parent.clientWidth;
  const cssW = Math.max(260, parentW || (window.innerWidth - 60));
  const cssH = cssW > 720 ? 220 : 170;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW+'px';
  canvas.style.height = cssH+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const values = points.map(p=>p.value);
  const lo = Math.min(...values), hi = Math.max(...values);
  const isInt = values.every(Number.isInteger);
  let minV, maxV;
  if(lo <= hi*0.5){ minV = 0; maxV = Math.max(1, Math.ceil(hi)); }
  else {
    const span = Math.max(hi-lo, 0.5);
    minV = Math.max(0, Math.floor((lo - span*0.5)*2)/2);
    maxV = Math.ceil((hi + span*0.5)*2)/2;
  }
  if(opts.cap !== undefined && maxV > opts.cap) maxV = opts.cap;
  if(maxV - minV < 1) maxV = minV + 1;
  const fmt = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
  let ticks = [minV, maxV];
  // Marca intermedia solo si cae en un valor "redondo" (entero, o múltiplo de 0,5 si hay decimales).
  const midV = isInt ? Math.round((minV+maxV)/2) : (minV+maxV)/2;
  if(midV > minV && midV < maxV && (isInt || (midV*2) % 1 === 0)) ticks = [minV, midV, maxV];

  ctx.font = CHART_FONT;
  const labelW = Math.max(...ticks.map(v=>ctx.measureText(fmt(v)).width));
  const padL = Math.max(30, Math.ceil(labelW) + 12), padR = 14, padT = 12, padB = 26;
  const w = cssW-padL-padR, h = cssH-padT-padB;
  const n = points.length;
  const xAt = i => n>1 ? padL + w*i/(n-1) : padL + w/2;
  const yAt = v => padT + h*(1 - (Math.max(minV, Math.min(maxV, v)) - minV)/(maxV - minV));

  // Rejilla y etiquetas del eje Y.
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ticks.forEach(v=>{
    const y = yAt(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL+w, y); ctx.stroke();
    ctx.fillText(fmt(v), padL-6, y);
  });

  // Relleno bajo la línea.
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xAt(i), y=yAt(p.value); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
  ctx.lineTo(xAt(n-1), yAt(minV)); ctx.lineTo(xAt(0), yAt(minV)); ctx.closePath();
  ctx.fillStyle = color+'26';
  ctx.fill();

  // Línea de la evolución.
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xAt(i), y=yAt(p.value); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();

  // Puntos (si no son demasiados) y último punto resaltado.
  if(n <= 60){
    ctx.fillStyle = color;
    points.forEach((p,i)=>{ if(i===n-1) return; ctx.beginPath(); ctx.arc(xAt(i), yAt(p.value), 2.5, 0, Math.PI*2); ctx.fill(); });
  }
  ctx.beginPath(); ctx.fillStyle = color; ctx.arc(xAt(n-1), yAt(points[n-1].value), 4, 0, Math.PI*2); ctx.fill();

  // Etiquetas de fecha: primera (alineada a la izquierda), del medio y última (alineada a la derecha, para que no se corte).
  ctx.fillStyle = T.text; ctx.textBaseline = 'top';
  const yr = d => d.split('-')[0];
  const conAnio = yr(points[0].date) !== yr(points[n-1].date);
  const labelIdxs = n>1 ? (n>2 ? [0, Math.floor((n-1)/2), n-1] : [0, n-1]) : [0];
  labelIdxs.forEach(i=>{
    const parts = points[i].date.split('-');
    ctx.textAlign = n===1 ? 'center' : (i===0 ? 'left' : (i===n-1 ? 'right' : 'center'));
    ctx.fillText(parts[2]+'/'+parts[1]+(conAnio ? '/'+parts[0].slice(2) : ''), xAt(i), padT+h+7);
  });
}
// Muestrea, día a día, cuántos temas había acumulados en el arrastre total (a día vencido)
// en cada uno de los últimos `numPoints` días. Sirve para ver si el arrastre crece sin
// parar (mal síntoma) o se mantiene bajo control.
function buildArrastreTrend(numPoints){
  const keys = sortedMonthKeys();
  if(!keys.length) return [];
  const now = new Date();
  const points = [];
  for(let i=numPoints-1; i>=0; i--){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
    const cutoff = d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
    const total = arrastreItemsCount(computeArrastreData(cutoff));
    points.push({date:cutoff, value:total});
  }
  return points;
}
function renderProgreso(){
  const host = document.getElementById('progresoHost');
  if(!host) return;
  host.innerHTML = '';

  // Se calcula aquí arriba (antes de las demás secciones) porque el resumen general lo
  // necesita ya, y así "Detalle por tema" más abajo reutiliza el mismo cálculo sin repetirlo.
  const data = collectNotaData();
  const grupos = Object.keys(data.porGrupo);

  // Resumen general: media global (normalizada sobre 10, para poder comparar grupos que usan
  // escalas distintas, ej. /10 vs /20) y qué grupo va mejor y cuál flojea más ahora mismo.
  // Siempre visible arriba del todo, sin acordeón, porque es el primer vistazo que se quiere
  // tener al entrar en Progreso.
  const resumenPorGrupo = [];
  let totalNotas = 0, sumaNormGlobal = 0;
  grupos.forEach(grupo=>{
    let notasGrupo = [], maxGrupo = null;
    data.porGrupo[grupo].forEach(item=>{
      if(item.notas.length){
        notasGrupo = notasGrupo.concat(item.notas);
        maxGrupo = item.max;
      }
    });
    if(notasGrupo.length){
      const avgReal = notasGrupo.reduce((a,b)=>a+b,0)/notasGrupo.length;
      const sumaNorm = notasGrupo.reduce((a,b)=>a+(b/maxGrupo),0);
      resumenPorGrupo.push({grupo, count:notasGrupo.length, avgReal, max:maxGrupo, avgNorm: sumaNorm/notasGrupo.length});
      totalNotas += notasGrupo.length;
      sumaNormGlobal += sumaNorm;
    }
  });
  if(resumenPorGrupo.length){
    const box = document.createElement('div');
    box.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin-bottom:16px;line-height:1.8;background:var(--bg-panel-2);border:1px solid var(--amber);border-radius:8px;padding:12px 14px;';
    const ordenado = resumenPorGrupo.slice().sort((a,b)=> b.avgNorm - a.avgNorm);
    const mejor = ordenado[0], peor = ordenado[ordenado.length-1];
    const mediaGlobal = (sumaNormGlobal/totalNotas)*10;
    let txt = '📊 Media global (todos los grupos, sobre 10 para poder compararlos): <strong>'+mediaGlobal.toFixed(1)+'/10</strong> ('+totalNotas+' nota'+(totalNotas!==1?'s':'')+' en total).';
    if(ordenado.length>1){
      txt += '<br>🥇 Grupo más fuerte ahora mismo: <strong>'+mejor.grupo+'</strong> ('+mejor.avgReal.toFixed(1)+'/'+mejor.max+', '+mejor.count+' nota'+(mejor.count!==1?'s':'')+').';
      txt += '<br>🎯 Grupo que más floja: <strong>'+peor.grupo+'</strong> ('+peor.avgReal.toFixed(1)+'/'+peor.max+', '+peor.count+' nota'+(peor.count!==1?'s':'')+') — el que más te conviene reforzar.';
    } else {
      txt += '<br>Todavía solo tienes notas en <strong>'+ordenado[0].grupo+'</strong>. En cuanto tengas notas en más grupos, aquí verás cuál flojea más.';
    }
    box.innerHTML = txt;
    host.appendChild(box);
  }

  // Tendencia del arrastre: no depende de tener notas de tests, así que se muestra siempre
  // que haya algo de historial en el calendario.
  const trendPoints = buildArrastreTrend(21);
  if(trendPoints.length && trendPoints.some(p=>p.value>0)){
    const sTrend = document.createElement('div');
    appendAccordionSection(sTrend, 'tendenciaArrastre', progresoOpen, 'Tendencia del arrastre', (body)=>{
      const sub = document.createElement('div'); sub.className='sub'; sub.style.marginBottom='10px';
      sub.textContent = 'Cuántos temas tenías acumulados en el arrastre total (a día vencido) cada día, en las últimas '+trendPoints.length+' fechas. Si sube sin parar, el ritmo de estudio no está dando abasto para repasar todo lo acumulado.';
      body.appendChild(sub);

      const canvasWrap = document.createElement('div'); canvasWrap.style.width='100%';
      const canvas = document.createElement('canvas'); canvas.className='arrastre-trend-canvas';
      canvas.setAttribute('role','img');
      canvasWrap.appendChild(canvas);
      body.appendChild(canvasWrap);

      const first = trendPoints[0].value, last = trendPoints[trendPoints.length-1].value;
      const diff = last - first;
      let veredicto;
      if(diff > 0) veredicto = 'Ha subido en '+diff+' tema'+(diff!==1?'s':'')+' en este periodo — puede que te esté costando dar abasto.';
      else if(diff < 0) veredicto = 'Ha bajado en '+Math.abs(diff)+' tema'+(Math.abs(diff)!==1?'s':'')+' en este periodo — vas aligerando el arrastre.';
      else veredicto = 'Se ha mantenido estable en este periodo.';
      canvas.setAttribute('aria-label', veredicto);
      const verdictEl = document.createElement('div');
      verdictEl.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin-top:8px;';
      verdictEl.textContent = veredicto;
      body.appendChild(verdictEl);

      drawTrendChart(canvas, trendPoints, '#c9a227');
    });
    host.appendChild(sTrend);
  }

  // Comparativa de simulacros: de mejor a peor resultado, según el total (conocimientos +
  // inglés + psicotécnico + baremo), con los NO APTO siempre al final. Se muestra en cuanto
  // haya algún simulacro con datos, independientemente de si hay notas de temario o no.
  const simsConDatos = (state.simulacros||[])
    .map((sim,i)=>({sim, i, ...computeSimTotal(sim)}))
    .filter(x=> x.hasAny || x.noApto);
  if(simsConDatos.length){
    const sSim = document.createElement('div');
    appendAccordionSection(sSim, 'comparativaSimulacros', progresoOpen, 'Comparativa de simulacros', (body)=>{
      const sub = document.createElement('div'); sub.className='sub'; sub.style.marginBottom='10px';
      sub.textContent = 'Tus simulacros ordenados de mejor a peor resultado (conocimientos + inglés + psicotécnico + baremo; NO APTO manda sobre cualquier nota si ortografía o gramática han suspendido).';
      body.appendChild(sub);

      const ranked = simsConDatos.slice().sort((a,b)=>{
        if(a.noApto && !b.noApto) return 1;
        if(!a.noApto && b.noApto) return -1;
        return b.total - a.total;
      });
      const aptos = ranked.filter(x=> !x.noApto);
      const bestEntry = aptos.length ? aptos[0] : null;
      const worstEntry = aptos.length>1 ? aptos[aptos.length-1] : null;
      const noAptoCount = ranked.length - aptos.length;

      if(bestEntry || worstEntry || noAptoCount){
        const verdict = document.createElement('div');
        verdict.style.cssText='font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin-bottom:12px;line-height:1.7;';
        const nombreDe = (e)=> e.sim.nombre || ('Simulacro '+(e.i+1));
        let txt = '';
        if(bestEntry) txt += '🏆 Mejor resultado: '+nombreDe(bestEntry)+' ('+bestEntry.total+' puntos).<br>';
        if(worstEntry) txt += '📉 El más complicado (entre los aptos): '+nombreDe(worstEntry)+' ('+worstEntry.total+' puntos).<br>';
        if(noAptoCount) txt += '⚠️ '+noAptoCount+' simulacro'+(noAptoCount!==1?'s':'')+' quedaron NO APTO por ortografía o gramática.';
        verdict.innerHTML = txt;
        body.appendChild(verdict);
      }

      const table = document.createElement('table'); table.className='nota-table';
      table.innerHTML = '<thead><tr><th>Simulacro</th><th>Conocimientos</th><th>Inglés</th><th>Psicotécnico</th><th>Baremo</th><th>Total</th></tr></thead>';
      const tbody = document.createElement('tbody');
      ranked.forEach((entry)=>{
        const {sim, i, noApto, total} = entry;
        const nombre = sim.nombre || ('Simulacro '+(i+1));
        const isBest = bestEntry===entry;
        const isWorst = worstEntry===entry;
        const totalCell = noApto
          ? '<span class="nota-pill bad">NO APTO</span>'
          : '<span class="nota-pill '+(isBest?'good':(isWorst?'bad':'mid'))+'">'+total+'</span>';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="Simulacro">${nombre}${isBest?' 🏆':''}${isWorst?' 📉':''}</td>`+
          `<td data-label="Conocimientos">${sim.conocimientos!=null?sim.conocimientos+'/100':'—'}</td>`+
          `<td data-label="Inglés">${sim.ingles!=null?sim.ingles+'/20':'—'}</td>`+
          `<td data-label="Psicotécnico">${sim.psico!=null?sim.psico+'/30':'—'}</td>`+
          `<td data-label="Baremo">${sim.baremo!=null?sim.baremo:'—'}</td>`+
          `<td data-label="Total">${totalCell}</td>`;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      const tableWrap = document.createElement('div'); tableWrap.style.overflowX='auto';
      tableWrap.appendChild(table);
      body.appendChild(tableWrap);
    });
    host.appendChild(sSim);
  }

  if(!grupos.length){
    const empty = document.createElement('div'); empty.className='empty-state';
    empty.innerHTML = 'Todavía no hay ninguna vuelta registrada como «Nota test», «No test», «No tiempo» o «Solo lectura».<br>Cambia el estado de una vuelta desde «Temario y notas» y aquí aparecerá la comparativa.';
    host.appendChild(empty);
    return;
  }

  const s4 = document.createElement('div');
  appendAccordionSection(s4, 'detalleTema', progresoOpen, 'Detalle por tema', (body)=>{
    const table = document.createElement('table'); table.className='nota-table';
    table.innerHTML = '<thead><tr><th>Grupo</th><th>Tema</th><th>Notas (por vuelta)</th><th>Media</th><th>Evolución</th></tr></thead>';
    const tbody = document.createElement('tbody');
    const grupoTagClass = {
      'Bloques':'g-bloques',
      'Leves':'g-leves',
      'Inglés':'g-ingles',
      'Psicotécnicos':'g-psico'
    };
    const GRUPO_BORDER_COLOR = {
      'Bloques':'var(--amber)',
      'Leves':'var(--green)',
      'Inglés':'var(--blue)',
      'Psicotécnicos':'#7a5c9c'
    };
    // Mismos colores que arriba pero en hex literal: el contexto 2D del <canvas> no resuelve
    // variables CSS (var(--amber)) como sí hace el resto de la app, así que para dibujar el
    // sparkline necesitamos el valor final.
    const GRUPO_HEX_COLOR = {
      'Bloques':'#c9a227',
      'Leves':'#6f9a6a',
      'Inglés':'#5c8a99',
      'Psicotécnicos':'#7a5c9c'
    };
    grupos.forEach(grupo=>{
      const tagClass = grupoTagClass[grupo] || 'g-bloques';
      // Dentro de "Bloques", separamos Graves (1-5) de Menos graves (6-12) con su propio
      // subtítulo y orden numérico, para poder comparar cada familia entre sí de un vistazo
      // en vez de tenerlas mezcladas en el mismo orden en que se fueron creando las notas.
      const renderItemRow = (item)=>{
        const notas = item.notas;
        const max = item.max;
        const hasNotas = notas.length>0;
        const avg = hasNotas ? notas.reduce((a,b)=>a+b,0)/notas.length : null;

        // Recorremos la secuencia real de vueltas (notas + "no test" intercalados), agrupando
        // por número de vuelta para poder etiquetar «Vuelta 1», «Vuelta 2», etc. El delta ▲/▼
        // solo se calcula al pasar de una vuelta a otra (contra la última nota numérica vista);
        // si una misma vuelta tiene varios tests, se muestran como notas independientes, sin
        // flecha entre ellos, porque no tiene sentido decir que uno "mejora" al otro.
        const lastPorSlot = {}; // en inglés, cada test/texto se compara con el mismo de la vuelta anterior
        const NON_NOTA_PILL = {
          no_test:      {label:'No test',      color:'var(--muted)'},
          no_tiempo:    {label:'No tiempo',     color:'#a9531d'},
          solo_lectura: {label:'Solo lectura',  color:'#5c8a99'}
        };
        const vueltaGroups = [];
        item.seq.forEach(entry=>{
          let group = vueltaGroups.length && vueltaGroups[vueltaGroups.length-1].vuelta===entry.vuelta
            ? vueltaGroups[vueltaGroups.length-1] : null;
          if(!group){ group = {vuelta: entry.vuelta, parts: []}; vueltaGroups.push(group); }

          const slotKey = entry.slot || 'g';
          const slotTxt = entry.slot ? '<span class="slot-lbl">'+slotEtiqueta(entry.slot)+'</span>' : '';
          if(entry.mode!=='nota'){
            const pillMeta = NON_NOTA_PILL[entry.mode] || {label:entry.mode, color:'var(--muted)'};
            group.parts.push(slotTxt+'<span class="nota-pill" style="background:transparent;color:'+pillMeta.color+';border:1px dashed '+pillMeta.color+';">'+pillMeta.label+'</span>');
            return;
          }
          const n = entry.nota;
          let deltaTxt = '';
          const lastNota = lastPorSlot[slotKey];
          if(!entry.extra && lastNota!=null){
            const diff = Math.round((n - lastNota)*10)/10;
            if(diff > 0) deltaTxt = ' <span style="color:var(--green-ink);">▲+'+diff+'</span>';
            else if(diff < 0) deltaTxt = ' <span style="color:var(--red-text);">▼'+diff+'</span>';
            else deltaTxt = ' <span style="color:var(--muted);">=</span>';
          }
          lastPorSlot[slotKey] = n;
          group.parts.push(slotTxt+'<span class="nota-pill '+notaPillClass(n, max)+'">'+n+'/'+max+'</span>'+deltaTxt);
        });
        // Cada vuelta va en su propia línea, con su etiqueta «Vuelta N»; los tests de una
        // misma vuelta van unidos entre sí con «+».
        const notasHtml = vueltaGroups.map(g=>{
          const label = '<span style="font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--cream-dim);margin-right:6px;">Vuelta '+g.vuelta+'</span>';
          // Inglés: cada test/texto de la vuelta va separado con « · »; el resto, unido con «+» como siempre.
          return label + g.parts.join(item.seq.some(x=>x.slot) ? ' <span style="color:var(--muted);">·</span> ' : ' <span style="color:var(--muted);">+</span> ');
        }).join('<br>');

        // Inglés: media de cada test/texto a lo largo de las vueltas, para ver de un vistazo cuál flojea.
        let mediasSlotsHtml = '';
        if(item.seq.some(x=>x.slot)){
          const acum = {};
          item.seq.forEach(x=>{ if(x.mode==='nota'){ const k = x.slot; (acum[k] = acum[k] || []).push(x.nota); } });
          const orden = ['general'].concat(INGLES_TEXTOS).filter(k=> acum[k] && acum[k].length);
          if(orden.length){
            mediasSlotsHtml = '<div class="nota-slots-media">Media por test: '+orden.map(k=>{
              const a = acum[k]; const m = a.reduce((p,c)=>p+c,0)/a.length;
              return '<strong>'+slotEtiqueta(k)+'</strong> '+m.toFixed(1);
            }).join(' · ')+'</div>';
          }
        }

        // Tendencia general: última nota frente a la anterior (se usa como texto accesible
        // del gráfico, para quien use lector de pantalla o quiera el dato exacto).
        let tendenciaTxt = hasNotas ? 'Sin datos suficientes para ver tendencia' : 'Todavía no hay ninguna nota numérica para este tema';
        if(notas.length>1){
          const diff = Math.round((notas[notas.length-1]-notas[notas.length-2])*10)/10;
          if(diff>0) tendenciaTxt = 'Mejorando, +'+diff+' respecto a la nota anterior';
          else if(diff<0) tendenciaTxt = 'Empeorando, '+diff+' respecto a la nota anterior';
          else tendenciaTxt = 'Igual que la nota anterior';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="Grupo" style="border-left:3px solid ${GRUPO_BORDER_COLOR[grupo]};"><span class="grupo-tag ${tagClass}">${grupo}</span></td><td data-label="Tema">${item.label}</td>`+
          `<td data-label="Notas (por vuelta)">${notasHtml}${mediasSlotsHtml}</td>`+
          `<td data-label="Media">${hasNotas ? '<span class="nota-pill '+notaPillClass(avg, max)+'">'+avg.toFixed(1)+'/'+max+'</span>' : '<span style="color:var(--muted);font-size:12px;">— sin notas —</span>'}</td>`+
          `<td data-label="Evolución"></td>`;
        const sparkTd = tr.lastElementChild;
        sparkTd.title = tendenciaTxt;
        if(notas.length>1){
          const canvas = document.createElement('canvas');
          canvas.className = 'nota-sparkline';
          canvas.width = 90; canvas.height = 28;
          canvas.setAttribute('aria-label', tendenciaTxt);
          canvas.setAttribute('role', 'img');
          sparkTd.appendChild(canvas);
          drawSparkline(canvas, notas, max, GRUPO_HEX_COLOR[grupo] || '#d99a3c');
        } else if(hasNotas){
          sparkTd.innerHTML = '<span style="color:var(--muted);font-size:12px;">— hace falta otra nota —</span>';
        } else {
          sparkTd.innerHTML = '<span style="color:var(--muted);font-size:12px;">— sin notas —</span>';
        }
        tbody.appendChild(tr);
      };

      if(grupo === 'Bloques'){
        const bloqueNum = (label)=>{ const m = /^B(\d+)/.exec(label); return m ? Number(m[1]) : 999; };
        const items = data.porGrupo[grupo].slice().sort((a,b)=> bloqueNum(a.label) - bloqueNum(b.label) || a.label.localeCompare(b.label));
        const graves = items.filter(it=> bloqueNum(it.label) <= 5);
        const menosGraves = items.filter(it=> bloqueNum(it.label) >= 6);
        const addSubHeader = (texto, colorVar)=>{
          const trh = document.createElement('tr');
          trh.innerHTML = '<td colspan="5" style="border-left:3px solid '+colorVar+';background:var(--bg-panel-2);'+
            'font-family:var(--font-mono);font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--cream-dim);padding:6px 8px;">'+texto+'</td>';
          tbody.appendChild(trh);
        };
        if(graves.length){ addSubHeader('Graves (bloques 1–5)', 'var(--red)'); graves.forEach(renderItemRow); }
        if(menosGraves.length){ addSubHeader('Menos graves (bloques 6–12)', 'var(--amber)'); menosGraves.forEach(renderItemRow); }
      } else {
        data.porGrupo[grupo].forEach(renderItemRow);
      }
    });
    table.appendChild(tbody);
    // Con la columna del gráfico, la tabla puede quedarse justa en pantallas muy estrechas;
    // este envoltorio permite hacer scroll horizontal ahí en vez de que se rompa el diseño.
    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);
  });
  host.appendChild(s4);

  // Evolución del test de arrastre: notas sueltas por fecha real (sin sistema de vueltas),
  // para ver cómo va cambiando el test que se hace a diario con los temas que se arrastran.
  const arrastreTestEntries = Object.keys(state.arrastreTestNotas || {})
    .map(fecha => ({fecha, valor: Number(state.arrastreTestNotas[fecha])}))
    .filter(e => !isNaN(e.valor))
    .sort((a,b)=> a.fecha.localeCompare(b.fecha));

  if(arrastreTestEntries.length){
    const sArr = document.createElement('div');
    appendAccordionSection(sArr, 'testArrastre', progresoOpen, 'Evolución del test de arrastre', (body)=>{
      const sub = document.createElement('div'); sub.className='sub'; sub.style.marginBottom='10px';
      sub.textContent = 'Notas del test de arrastre diario, por fecha real — este test no sigue el sistema de vueltas de los demás temas, así que aquí se compara pura evolución en el tiempo. El eje se ajusta a tus notas para que se vean bien los cambios pequeños.';
      body.appendChild(sub);

      const avg = arrastreTestEntries.reduce((a,e)=>a+e.valor,0)/arrastreTestEntries.length;
      const best = arrastreTestEntries.reduce((a,e)=> e.valor>a.valor?e:a);
      const worst = arrastreTestEntries.reduce((a,e)=> e.valor<a.valor?e:a);
      const statsBox = document.createElement('div');
      statsBox.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin-bottom:14px;line-height:1.8;background:var(--bg-panel-2);border:1px solid var(--amber);border-radius:8px;padding:12px 14px;';
      statsBox.innerHTML = '📈 Media: <strong>'+avg.toFixed(1)+'/10</strong> ('+arrastreTestEntries.length+' test'+(arrastreTestEntries.length!==1?'s':'')+' registrado'+(arrastreTestEntries.length!==1?'s':'')+').'+
        '<br>🏆 Mejor: <strong>'+best.valor+'/10</strong> ('+fechaCorta(best.fecha)+').'+
        '<br>📉 Peor: <strong>'+worst.valor+'/10</strong> ('+fechaCorta(worst.fecha)+').';
      body.appendChild(statsBox);

      // Gráfico de tendencia: mismo motor que "Tendencia del arrastre" de más arriba, con un
      // color distinto para no confundirlo con esa otra gráfica.
      if(arrastreTestEntries.length >= 2){
        const canvasWrap = document.createElement('div'); canvasWrap.style.width='100%';
        const canvas = document.createElement('canvas'); canvas.className='arrastre-trend-canvas';
        canvas.setAttribute('role','img');
        const tendTxt = 'Evolución del test de arrastre desde '+fechaCorta(arrastreTestEntries[0].fecha)+' hasta '+fechaCorta(arrastreTestEntries[arrastreTestEntries.length-1].fecha);
        canvas.setAttribute('aria-label', tendTxt);
        canvasWrap.appendChild(canvas);
        body.appendChild(canvasWrap);
        const points = arrastreTestEntries.map(e=>({date:e.fecha, value:e.valor}));
        drawTrendChart(canvas, points, '#6f9a6a', {cap:10});
      }

      // Notas agrupadas por mes: con el tiempo una lista diaria se haría interminable, así que
      // cada mes es un bloque plegable con su media, su nº de tests y cómo va respecto al mes
      // anterior. Por defecto solo está abierto el mes más reciente; el resto se despliega al
      // pulsar. Dentro de cada mes, cada día sigue mostrando su flecha de mejora respecto a la
      // nota anterior (aunque esa nota fuera del mes pasado).
      const listTitle = document.createElement('div');
      listTitle.style.cssText = 'font-family:var(--font-mono);font-size:12px;text-transform:uppercase;color:var(--cream-dim);letter-spacing:.03em;margin:14px 0 6px;';
      listTitle.textContent = 'Notas por mes';
      body.appendChild(listTitle);

      const deltaHtml = (diff)=>{
        if(diff>0) return ' <span style="color:var(--green-ink);">▲+'+diff+'</span>';
        if(diff<0) return ' <span style="color:var(--red-text);">▼'+diff+'</span>';
        return ' <span style="color:var(--muted);">=</span>';
      };

      const porMes = {};
      arrastreTestEntries.forEach((e, idx)=>{
        const k = e.fecha.slice(0,7);
        if(!porMes[k]) porMes[k] = [];
        porMes[k].push({e, idx});
      });
      const mesesAsc = Object.keys(porMes).sort();
      const mediaDeMes = {};
      mesesAsc.forEach(k=>{
        mediaDeMes[k] = porMes[k].reduce((a,x)=>a+x.e.valor,0) / porMes[k].length;
      });

      const mesesWrap = document.createElement('div'); mesesWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      mesesAsc.slice().reverse().forEach((k, posDesc)=>{
        const items = porMes[k];
        const [yy, mm] = k.split('-');
        const nombreMes = MESES[parseInt(mm,10)-1]+' '+yy;
        const media = mediaDeMes[k];
        const kAnt = mesesAsc[mesesAsc.indexOf(k)-1];
        let deltaMes = '';
        if(kAnt !== undefined){
          const diffMes = Math.round((media - mediaDeMes[kAnt])*10)/10;
          deltaMes = '<span title="Media respecto al mes anterior">'+deltaHtml(diffMes)+'</span>';
        }

        let abierto = arrastreMesesOpen[k] !== undefined ? arrastreMesesOpen[k] : (posDesc===0);

        const mesEl = document.createElement('div');
        mesEl.style.cssText = 'border:1px solid var(--line);border-radius:8px;overflow:hidden;';

        const head = document.createElement('button'); head.type = 'button';
        head.style.cssText = 'width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;background:var(--bg-panel-2);color:var(--cream);border:none;cursor:pointer;padding:8px 10px;font-family:var(--font-mono);font-size:12px;text-align:left;';
        head.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        head.innerHTML = '<span style="font-weight:700;"><span class="mes-chev">'+(abierto?'▴':'▾')+'</span> '+nombreMes+'</span>'+
          '<span><span class="nota-pill '+notaPillClass(media, 10)+'">'+media.toFixed(1)+'/10</span>'+
          '<span style="color:var(--muted);">'+items.length+' test'+(items.length!==1?'s':'')+'</span>'+deltaMes+'</span>';
        mesEl.appendChild(head);

        const cuerpo = document.createElement('div');
        cuerpo.style.cssText = 'padding:4px 10px 8px;display:'+(abierto?'block':'none')+';';

        if(items.length > 1){
          const mejorMes = items.reduce((a,x)=> x.e.valor>a.e.valor?x:a);
          const peorMes = items.reduce((a,x)=> x.e.valor<a.e.valor?x:a);
          const resumen = document.createElement('div');
          resumen.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--muted);padding:4px 2px 6px;';
          resumen.textContent = 'Mejor: '+mejorMes.e.valor+'/10 ('+fechaCorta(mejorMes.e.fecha)+') · Peor: '+peorMes.e.valor+'/10 ('+fechaCorta(peorMes.e.fecha)+')';
          cuerpo.appendChild(resumen);
        }

        const lista = document.createElement('div'); lista.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
        items.slice().reverse().forEach(({e, idx})=>{
          const anterior = arrastreTestEntries[idx-1];
          const dTxt = anterior ? deltaHtml(Math.round((e.valor - anterior.valor)*10)/10) : '';
          const rowEl = document.createElement('div');
          rowEl.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:12px;border-bottom:1px solid var(--line);padding:5px 2px;';
          rowEl.innerHTML = '<span style="color:var(--cream-dim);">'+fechaCorta(e.fecha)+'</span>'+
            '<span><span class="nota-pill '+notaPillClass(e.valor, 10)+'">'+e.valor+'/10</span>'+dTxt+'</span>';
          lista.appendChild(rowEl);
        });
        cuerpo.appendChild(lista);
        mesEl.appendChild(cuerpo);

        head.onclick = ()=>{
          abierto = !abierto;
          arrastreMesesOpen[k] = abierto;
          cuerpo.style.display = abierto ? 'block' : 'none';
          head.setAttribute('aria-expanded', abierto ? 'true' : 'false');
          head.querySelector('.mes-chev').textContent = abierto ? '▴' : '▾';
        };
        mesesWrap.appendChild(mesEl);
      });
      body.appendChild(mesesWrap);
    });
    host.appendChild(sArr);
  }
}
const progresoOpen = {detalleTema:false, tendenciaArrastre:true, comparativaSimulacros:true, testArrastre:true};
// Meses del test de arrastre que el usuario ha abierto/cerrado a mano (clave 'YYYY-MM'). Si un mes no está
// aquí, se abre solo el más reciente. Vive en memoria: sobrevive a repintar Progreso, no a recargar.
const arrastreMesesOpen = {};

/* Los gráficos son <canvas>: no se adaptan solos. Los repintamos si cambia el tema (claro/oscuro, a mano o
   automático por hora) o el ancho de la ventana, siempre que Progreso esté a la vista. */
(function initChartRedraw(){
  function progresoVisible(){ const v = document.getElementById('view-progreso'); return !!(v && v.classList.contains('active')); }
  function repaint(){ if(progresoVisible() && typeof renderProgreso === 'function'){ try{ renderProgreso(); }catch(e){} } }
  new MutationObserver(repaint).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  let lastW = window.innerWidth, timer;
  window.addEventListener('resize', ()=>{
    clearTimeout(timer);
    timer = setTimeout(()=>{ if(window.innerWidth !== lastW){ lastW = window.innerWidth; repaint(); } }, 250);
  });
})();
/* ===================== MARCAS FÍSICAS MÍNIMAS (oposición Guardia Civil) ===================== */
function parseTiempoASegundos(v){
  if(v==null || v==='') return NaN;
  const s = String(v).trim();
  if(s.includes(':')){
    const [m, sec] = s.split(':');
    const mm = parseFloat(m), ss = parseFloat(sec);
    if(isNaN(mm) || isNaN(ss)) return NaN;
    return mm*60 + ss;
  }
  return parseFloat(s.replace(',','.'));
}
const PRUEBAS_FISICAS = [
  { id:'flexiones', nombre:'Flexiones', tipo:'min', objetivo:16, unidad:'reps',
    minText:'Mínimo exigido: 16 repeticiones', placeholder:'Ej. 18',
    parse:v=>parseFloat(String(v).replace(',','.')), formatActual:v=>v+' reps' },
  { id:'circuito', nombre:'Circuito de agilidad', tipo:'max', objetivo:14, unidad:'seg',
    minText:'Máximo exigido: 14,00 segundos', placeholder:'Ej. 13.50',
    parse:v=>parseFloat(String(v).replace(',','.')), formatActual:v=>v+' s' },
  { id:'carrera', nombre:'Carrera 2.000 m', tipo:'max', objetivo:9*60+25, unidad:'mm:ss',
    minText:'Máximo exigido: 9:25 minutos', placeholder:'Ej. 9:10',
    parse:parseTiempoASegundos, formatActual:v=>v },
  { id:'natacion', nombre:'Natación', tipo:'max', objetivo:70, unidad:'seg',
    minText:'Máximo exigido: 70 segundos', placeholder:'Ej. 65',
    parse:v=>parseFloat(String(v).replace(',','.')), formatActual:v=>v+' s' },
];
/* Guarda (o actualiza si ya hay una entrada en esa fecha) un punto en el historial de una
   prueba física, en la fecha que se le indique. registrarMarcaHistorial (más abajo) es el caso
   de siempre: hoy. registrarMarcaHistorialEnFecha existe aparte para que "Entrenos" pueda
   apuntar una marca en el día real del entreno (que puede no ser hoy) sin duplicar esta lógica. */
function registrarMarcaHistorialEnFecha(pruebaId, raw, fecha){
  if(raw==='' || !fecha) return;
  if(!state.marcasHistory) state.marcasHistory = {};
  if(!state.marcasHistory[pruebaId]) state.marcasHistory[pruebaId] = [];
  const hist = state.marcasHistory[pruebaId];
  const existing = hist.find(h=>h.date===fecha);
  if(existing) existing.valor = raw;
  else hist.push({date:fecha, valor:raw});
  scheduleSave();
}
function registrarMarcaHistorial(pruebaId, raw){
  registrarMarcaHistorialEnFecha(pruebaId, raw, todayISO());
}
function fechaCorta(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return d+'/'+m+'/'+y.slice(2);
}
/* Flecha de tendencia entre dos marcas consecutivas, teniendo en cuenta si en esta
   prueba "mejor" es un número más alto (tipo min, ej. flexiones) o más bajo (tipo max, ej. tiempos). */
function marcaDeltaHtml(p, prevRaw, curRaw){
  const prevVal = p.parse(prevRaw), curVal = p.parse(curRaw);
  if(isNaN(prevVal) || isNaN(curVal)) return '';
  const diff = curVal - prevVal;
  if(diff===0) return '<span style="color:var(--muted);">=</span>';
  const mejora = p.tipo==='min' ? diff>0 : diff<0;
  const color = mejora ? 'var(--green)' : 'var(--red-text)';
  const flecha = diff>0 ? '▲' : '▼';
  return '<span style="color:'+color+';">'+flecha+'</span>';
}
function renderMarcaHistorial(card, p){
  const hist = (state.marcasHistory && state.marcasHistory[p.id]) || [];
  if(hist.length < 1) return;
  const sorted = [...hist].sort((a,b)=> a.date.localeCompare(b.date));
  const toggle = document.createElement('button'); toggle.className='marca-hist-toggle';
  toggle.textContent = 'Ver historial ('+sorted.length+') ▾';
  const list = document.createElement('div'); list.className='marca-hist-list';
  const rows = [...sorted].reverse().map((entry,i)=>{
    const idxAsc = sorted.length-1-i;
    const prev = idxAsc>0 ? sorted[idxAsc-1].valor : null;
    const delta = prev!=null ? marcaDeltaHtml(p, prev, entry.valor) : '';
    return '<div class="marca-hist-row"><span class="mh-date">'+fechaCorta(entry.date)+'</span><span>'+p.formatActual(entry.valor)+' '+delta+'</span></div>';
  }).join('');
  list.innerHTML = rows;
  toggle.onclick = ()=>{
    const open = list.classList.toggle('open');
    toggle.textContent = 'Ver historial ('+sorted.length+') '+(open?'▴':'▾');
  };
  card.appendChild(toggle);
  card.appendChild(list);
}
function renderMarcas(){
  const host = document.getElementById('marcasHost');
  if(!host) return;
  host.innerHTML = '';
  const topBar = document.createElement('div');
  topBar.innerHTML = '<h3 style="margin:0 0 4px;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-ink);font-size:17px;letter-spacing:.03em;">Marcas físicas mínimas</h3>'
    + '<div class="sub" style="font-family:var(--font-mono);font-size:12px;color:var(--muted);">Apunta tu mejor marca en cada prueba para ver si ya cumples el mínimo de la oposición.</div>';
  host.appendChild(topBar);

  const grid = document.createElement('div'); grid.className = 'marcas-grid';
  PRUEBAS_FISICAS.forEach(p=>{
    const raw = state.marcas[p.id] || '';
    const val = p.parse(raw);
    const tieneValor = raw!=='' && !isNaN(val);
    let apto = null, pct = 0;
    if(tieneValor){
      apto = (p.tipo==='min') ? (val >= p.objetivo) : (val <= p.objetivo);
      if(p.tipo==='min'){ pct = Math.max(0, Math.min(100, (val/p.objetivo)*100)); }
      else { pct = val<=p.objetivo ? 100 : Math.max(0, Math.min(100, (p.objetivo/val)*100)); }
    }
    const card = document.createElement('div'); card.className = 'marca-card';
    card.innerHTML = `
      <div class="marca-nombre">${p.nombre}</div>
      <div class="marca-min">${p.minText}</div>
      <div class="marca-input-row">
        <label>Tu marca</label>
        <input type="text" class="marca-valor" placeholder="${p.placeholder}" value="${raw}">
      </div>
      <div class="marca-bar-track"><div class="marca-bar-fill ${tieneValor ? (apto?'ok':'no') : ''}" style="width:${tieneValor?pct:0}%;"></div></div>
      <div class="marca-status-row">
        <span class="marca-actual">${tieneValor ? p.formatActual(raw) : 'Sin registrar'}</span>
        ${tieneValor ? `<span class="nota-pill ${apto?'good':'bad'}">${apto?'APTO':'NO APTO'}</span>` : ''}
      </div>
    `;
    const input = card.querySelector('.marca-valor');
    const barFill = card.querySelector('.marca-bar-fill');
    const actualSpan = card.querySelector('.marca-actual');
    const statusRow = card.querySelector('.marca-status-row');
    input.oninput = ()=>{
      state.marcas[p.id] = input.value;
      scheduleSave();
      const rawNow = input.value;
      const valNow = p.parse(rawNow);
      const tieneValorNow = rawNow!=='' && !isNaN(valNow);
      let aptoNow = null, pctNow = 0;
      if(tieneValorNow){
        aptoNow = (p.tipo==='min') ? (valNow >= p.objetivo) : (valNow <= p.objetivo);
        if(p.tipo==='min'){ pctNow = Math.max(0, Math.min(100, (valNow/p.objetivo)*100)); }
        else { pctNow = valNow<=p.objetivo ? 100 : Math.max(0, Math.min(100, (p.objetivo/valNow)*100)); }
      }
      barFill.style.width = (tieneValorNow?pctNow:0)+'%';
      barFill.className = 'marca-bar-fill' + (tieneValorNow ? (aptoNow?' ok':' no') : '');
      actualSpan.textContent = tieneValorNow ? p.formatActual(rawNow) : 'Sin registrar';
      const existingPill = statusRow.querySelector('.nota-pill');
      if(tieneValorNow){
        if(existingPill){
          existingPill.className = 'nota-pill ' + (aptoNow?'good':'bad');
          existingPill.textContent = aptoNow?'APTO':'NO APTO';
        } else {
          const pill = document.createElement('span');
          pill.className = 'nota-pill ' + (aptoNow?'good':'bad');
          pill.textContent = aptoNow?'APTO':'NO APTO';
          statusRow.appendChild(pill);
        }
      } else if(existingPill){
        existingPill.remove();
      }
    };
    input.onchange = ()=>{
      registrarMarcaHistorial(p.id, input.value);
      renderMarcas();
    };
    renderMarcaHistorial(card, p);
    grid.appendChild(card);
  });
  host.appendChild(grid);
}

/* ===================== BIBLIOTECA DE ENTRENOS SUGERIDOS ===================== */
/* Entrenos orientados a cada prueba física de la oposición, en 3 niveles según
   lo lejos o cerca que estés del mínimo exigido (ver PRUEBAS_FISICAS). */
const ENTRENOS_LIBRARY = {
  flexiones: { nombre:'Flexiones', niveles:{
    inicial:[
      {titulo:'Base de fuerza (rodillas/negativas)', detalle:'4 x 8-10 flexiones de rodillas o negativas de 4" bajando\nDescanso 90"\nTerminar con 3 x 20" plancha frontal'},
      {titulo:'Empuje asistido', detalle:'5 x 6-8 flexiones con manos elevadas (banco/escalón)\nDescanso 90"\n2 x 10 fondos de tríceps en silla'}
    ],
    medio:[
      {titulo:'Volumen progresivo', detalle:'5 x 12-14 flexiones estándar\nDescanso 75"\n3 x 15 flexiones diamante (tríceps)\n3 x 20" plancha'},
      {titulo:'Piramidal', detalle:'Series ascendentes-descendentes: 6-8-10-12-10-8-6 flexiones\nDescanso 60" entre series\n2 x máx fondos de tríceps'}
    ],
    avanzado:[
      {titulo:'Máximo + explosividad', detalle:'Test: 1 serie al fallo (anota el número)\nDescanso 3\'\n4 x 8 flexiones explosivas (con palmada si controlas la técnica)\n3 x 15 diamante'},
      {titulo:'Densidad (EMOM)', detalle:'EMOM 10\': 8 flexiones estrictas al inicio de cada minuto\nSi fallas, baja a 6 el resto de rondas\nCierra con 3 x 20 fondos'}
    ]
  }},
  circuito: { nombre:'Circuito de agilidad', niveles:{
    inicial:[
      {titulo:'Técnica de cambios de dirección', detalle:'6 x recorrido del circuito a ritmo controlado (70% velocidad), foco en la técnica de giro\nDescanso completo 90" entre repeticiones\nEscalera de agilidad 4 x 2 pasadas'},
      {titulo:'Base de velocidad', detalle:'8 x 20m sprint progresivo (60-80-100%)\nDescanso 60"\n4 x skipping + talón-glúteo 15m'}
    ],
    medio:[
      {titulo:'Repeticiones cronometradas', detalle:'6 x circuito completo a intensidad alta, cronometrando cada intento\nDescanso 2\' entre repeticiones\nAnota tu mejor tiempo en «Marcas»'},
      {titulo:'Agilidad + reacción', detalle:'5 x circuito con salida a la señal (silbato/palmada)\nDescanso 2\'\n3 x escalera de agilidad a máxima velocidad'}
    ],
    avanzado:[
      {titulo:'Series al límite', detalle:'8 x circuito completo a máxima intensidad, buscando bajar tu marca\nDescanso 2-3\' (recuperación completa)\nRegistra el mejor tiempo en «Marcas»'},
      {titulo:'Fatiga controlada', detalle:'4 x circuito nada más terminar 20 burpees (simula llegar cansado)\nDescanso 2\'\nObjetivo: que el tiempo no se dispare respecto a tu marca en fresco'}
    ]
  }},
  carrera: { nombre:'Carrera 2.000 m', niveles:{
    inicial:[
      {titulo:'Rodaje base', detalle:'20-25\' carrera continua a ritmo cómodo (puedes hablar mientras corres)\n2x por semana para construir base aeróbica'},
      {titulo:'Series suaves', detalle:'6 x 400m a ritmo moderado\nRecuperación: 2\' trote suave o caminando\nEnfriamiento 10\' trote suave'}
    ],
    medio:[
      {titulo:'Series a ritmo objetivo', detalle:'5 x 500m al ritmo que necesitas para bajar de 9:25 en 2.000m\nRecuperación 90" trote suave\nCalentamiento 10\' + enfriamiento 10\''},
      {titulo:'Fartlek', detalle:'25\' alternando 2\' fuerte / 2\' suave\nMantén el tramo fuerte cerca de tu ritmo objetivo de carrera'}
    ],
    avanzado:[
      {titulo:'Test de 2.000 m', detalle:'Calentamiento 10\'\n1 x 2.000m a máxima intensidad, cronometrado\nAnota el resultado en «Marcas»\nEnfriamiento 10\''},
      {titulo:'Series largas a ritmo', detalle:'4 x 800m justo por debajo de tu ritmo objetivo\nRecuperación 2\' trote suave\nÚltima serie: intenta bajar el tiempo de las anteriores'}
    ]
  }},
  natacion: { nombre:'Natación', niveles:{
    inicial:[
      {titulo:'Técnica y respiración', detalle:'8 x 25m suave, foco en técnica y respiración\nDescanso 30-40" entre largos\n5\' de flotación/patada con tabla'},
      {titulo:'Resistencia suave', detalle:'400-600m continuos a ritmo cómodo, parando si hace falta\nEjercicios de patada 4 x 25m con tabla'}
    ],
    medio:[
      {titulo:'Series a ritmo', detalle:'8 x 50m a un ritmo cercano al objetivo, descanso 30"\n200m suave de vuelta a la calma'},
      {titulo:'Progresivo', detalle:'6 x 50m progresivos (cada uno un poco más rápido que el anterior)\nDescanso 40" entre series'}
    ],
    avanzado:[
      {titulo:'Test cronometrado', detalle:'Calentamiento 200m suave\n1-2 intentos cronometrados de la distancia de la prueba, descanso completo entre intentos\nAnota tu mejor marca'},
      {titulo:'Series rápidas', detalle:'10 x 25m a máxima velocidad, descanso 45-60" (recuperación casi completa)\n200m suave de vuelta a la calma'}
    ]
  }},
  general: { nombre:'General / combinado', niveles:{
    inicial:[
      {titulo:'Circuito full-body suave', detalle:'3 rondas: 10 flexiones (rodillas si hace falta) + 15 sentadillas + 20" plancha + 10\' de carrera suave\nDescanso 90" entre rondas'}
    ],
    medio:[
      {titulo:'Circuito combinado', detalle:'4 rondas: 12 flexiones + 15 burpees + 20 sentadillas + 400m carrera moderada\nDescanso 2\' entre rondas'}
    ],
    avanzado:[
      {titulo:'Circuito tipo oposición', detalle:'Simula el orden de la prueba: circuito de agilidad + flexiones al fallo + 800m a ritmo fuerte\nDescanso completo entre cada bloque\nÚtil como ensayo general antes de un simulacro físico'}
    ]
  }}
};
let entrenoLibFiltro = 'flexiones';
let entrenoSugerenciaActual = null;
let entrenoAyudaOpen = false;

/* Calcula, para una prueba física, qué tan cerca está la marca registrada del
   objetivo (0-100+) y si ya es apta, reutilizando la misma lógica que renderMarcas. */
function evaluarPrueba(p){
  const raw = state.marcas[p.id] || '';
  const val = p.parse(raw);
  const tieneValor = raw!=='' && !isNaN(val);
  if(!tieneValor) return { tieneValor:false, apto:false, pct:0 };
  const apto = (p.tipo==='min') ? (val >= p.objetivo) : (val <= p.objetivo);
  let pct;
  if(p.tipo==='min'){ pct = Math.max(0, Math.min(100, (val/p.objetivo)*100)); }
  else { pct = val<=p.objetivo ? 100 : Math.max(0, Math.min(100, (p.objetivo/val)*100)); }
  return { tieneValor, apto, pct };
}

/* Para el resumen del día: de las pruebas registradas y aún no aptas, la que está
   más cerca de cumplir el mínimo, junto con cuánto le falta exactamente. */
function objetivoMasCercano(){
  const candidatos = PRUEBAS_FISICAS
    .map(p=>({p, ev:evaluarPrueba(p)}))
    .filter(x=>x.ev.tieneValor && !x.ev.apto);
  if(!candidatos.length) return null;
  candidatos.sort((a,b)=> b.ev.pct - a.ev.pct);
  const {p} = candidatos[0];
  const val = p.parse(state.marcas[p.id]);
  const diff = p.tipo==='min' ? (p.objetivo - val) : (val - p.objetivo);
  let diffTxt;
  if(p.id==='carrera'){
    const mm = Math.floor(diff/60), ss = Math.round(diff%60);
    diffTxt = (mm>0 ? mm+'m ' : '')+ss+'s';
  } else if(p.unidad==='seg'){
    diffTxt = (Math.round(diff*100)/100)+'s';
  } else {
    diffTxt = Math.ceil(diff)+' '+p.unidad;
  }
  return { nombre:p.nombre, diffTxt };
}

/* Decide un nivel de entreno (inicial/medio/avanzado) para una prueba según su marca actual. */
function nivelParaPrueba(p){
  const ev = evaluarPrueba(p);
  if(!ev.tieneValor) return 'inicial';
  if(ev.apto) return 'avanzado';
  if(ev.pct >= 70) return 'medio';
  return 'inicial';
}

/* Elige qué prueba conviene entrenar hoy: la que esté más lejos de su objetivo
   (o, si todas están aptas, una aleatoria para mantenimiento). */
function elegirPruebaFoco(){
  const evals = PRUEBAS_FISICAS.map(p=>({p, ev:evaluarPrueba(p)}));
  const noAptas = evals.filter(x=>!x.ev.apto);
  let elegido;
  if(noAptas.length){
    elegido = noAptas.reduce((peor, actual)=> (actual.ev.tieneValor?actual.ev.pct:0) < (peor.ev.tieneValor?peor.ev.pct:0) ? actual : peor);
  } else {
    elegido = evals[Math.floor(Math.random()*evals.length)];
  }
  return elegido.p;
}

function generarSugerenciaEntreno(){
  const prueba = elegirPruebaFoco();
  const nivel = nivelParaPrueba(prueba);
  const opciones = ENTRENOS_LIBRARY[prueba.id].niveles[nivel];
  const entreno = opciones[Math.floor(Math.random()*opciones.length)];
  entrenoSugerenciaActual = { pruebaId:prueba.id, pruebaNombre:ENTRENOS_LIBRARY[prueba.id].nombre, nivel, entreno };
  return entrenoSugerenciaActual;
}

function nivelLabel(nivel){
  return nivel==='inicial' ? 'Nivel inicial' : nivel==='medio' ? 'Nivel medio' : 'Nivel avanzado';
}
function nivelPillClass(nivel){
  return nivel==='inicial' ? 'bad' : nivel==='medio' ? 'mid' : 'good';
}

function anadirEntrenoALog(titulo, detalle){
  state.entrenosLog.unshift({id:Date.now(), date:todayISO(), tipo:titulo, notas:detalle});
  scheduleSave();
  renderEntrenos();
}

function renderSugerenciaEntreno(container){
  const box = document.createElement('div'); box.className = 'entreno-sugerencia';
  if(!entrenoSugerenciaActual) generarSugerenciaEntreno();
  const s = entrenoSugerenciaActual;
  box.innerHTML = `
    <div class="sug-head">
      <div>
        <span class="nota-pill ${nivelPillClass(s.nivel)}">${nivelLabel(s.nivel)}</span>
        <span class="sug-titulo">${s.pruebaNombre}: ${s.entreno.titulo}</span>
      </div>
    </div>
    <div class="sug-detalle">${s.entreno.detalle}</div>
    <div class="sug-actions">
      <button class="btn small" id="sugAnadirBtn">+ Añadir a mi registro</button>
      <button class="btn small ghost" id="sugOtraBtn">Sugerir otro</button>
    </div>
  `;
  box.querySelector('#sugAnadirBtn').onclick = ()=> anadirEntrenoALog(s.pruebaNombre+': '+s.entreno.titulo, s.entreno.detalle);
  box.querySelector('#sugOtraBtn').onclick = ()=>{ generarSugerenciaEntreno(); renderEntrenos(); };
  container.appendChild(box);
}

function renderBibliotecaEntrenos(container){
  const wrap = document.createElement('div');
  const filtros = document.createElement('div'); filtros.className = 'entreno-lib-filtros';
  Object.keys(ENTRENOS_LIBRARY).forEach(key=>{
    const b = document.createElement('button');
    b.textContent = ENTRENOS_LIBRARY[key].nombre;
    if(key===entrenoLibFiltro) b.classList.add('active');
    b.onclick = ()=>{ entrenoLibFiltro = key; renderEntrenos(); };
    filtros.appendChild(b);
  });
  wrap.appendChild(filtros);

  const grid = document.createElement('div'); grid.className = 'entreno-lib-grid';
  const lib = ENTRENOS_LIBRARY[entrenoLibFiltro];
  ['inicial','medio','avanzado'].forEach(nivel=>{
    lib.niveles[nivel].forEach(entreno=>{
      const card = document.createElement('div'); card.className = 'entreno-lib-card';
      card.innerHTML = `
        <span class="nota-pill elc-nivel ${nivelPillClass(nivel)}">${nivelLabel(nivel)}</span>
        <div class="elc-titulo">${entreno.titulo}</div>
        <div class="elc-detalle">${entreno.detalle}</div>
      `;
      const addBtn = document.createElement('button'); addBtn.className='btn small ghost'; addBtn.textContent='+ Usar este entreno';
      addBtn.onclick = ()=> anadirEntrenoALog(lib.nombre+': '+entreno.titulo, entreno.detalle);
      card.appendChild(addBtn);
      grid.appendChild(card);
    });
  });
  wrap.appendChild(grid);
  container.appendChild(wrap);
}

/* ===================== RENDER: ENTRENOS (registro manual) ===================== */
function todayISO(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
/* Fechas en HORA LOCAL (la de tu dispositivo). No usar toISOString() para «hoy»: da la fecha en UTC y,
   en España, entre las 00:00 y las 02:00 devuelve todavía el día anterior. */
function fechaLocalISO(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function hoyLocalISO(){ return fechaLocalISO(new Date()); }
/* Estadísticas rápidas del registro de entrenos: cuántos llevas esta semana y qué tipo de
   entreno repites más. Puramente derivado de state.entrenosLog, no guarda nada nuevo. */
function computeEntrenosStats(){
  const log = state.entrenosLog||[];
  const today = todayISO();
  const d = new Date(); d.setDate(d.getDate()-6); // ventana de 7 días, hoy incluido
  const desde = fechaLocalISO(d);
  const ultimos7 = log.filter(e=> e.date && e.date>=desde && e.date<=today);
  const tipoCount = {};
  log.forEach(e=>{
    const t = (e.tipo||'').trim();
    if(!t) return;
    const key = t.toLowerCase();
    if(!tipoCount[key]) tipoCount[key] = {label:t, count:0};
    tipoCount[key].count++;
  });
  let tipoTop = null;
  Object.values(tipoCount).forEach(v=>{ if(!tipoTop || v.count>tipoTop.count) tipoTop = v; });
  const enlazados = log.filter(e=> e.pruebaId).length;
  return {total: log.length, totalUltimos7: ultimos7.length, tipoTop, enlazados};
}
function renderEntrenos(){
  const host = document.getElementById('entrenosHost');
  if(!host) return;
  host.innerHTML = '';
  const topBar = document.createElement('div');
  topBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
  topBar.innerHTML = '<h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-ink);font-size:17px;letter-spacing:.03em;">Entrenos físicos</h3>';
  const addBtn = document.createElement('button'); addBtn.className='btn small'; addBtn.textContent='+ Añadir entreno';
  addBtn.onclick = ()=>{
    state.entrenosLog.unshift({id:Date.now(), date:todayISO(), tipo:'', notas:'', pruebaId:'', marcaValor:''});
    scheduleSave();
    renderEntrenos();
  };
  topBar.appendChild(addBtn);
  host.appendChild(topBar);

  let entrenoAyudaOpenLocal = entrenoAyudaOpen;
  const helpCard = document.createElement('div'); helpCard.className = 'collapse-card';
  const helpHead = document.createElement('div'); helpHead.className = 'collapse-head';
  helpHead.innerHTML = '<div><h3>¿No sabes qué entreno hacer hoy?</h3><div class="collapse-sub">Sugerencia automática + biblioteca por prueba</div></div><div class="chev">'+(entrenoAyudaOpenLocal?'▴':'▾')+'</div>';
  const helpBody = document.createElement('div'); helpBody.className = 'collapse-body'+(entrenoAyudaOpenLocal?' open':'');
  renderSugerenciaEntreno(helpBody);
  renderBibliotecaEntrenos(helpBody);
  helpHead.onclick = ()=>{
    entrenoAyudaOpen = !entrenoAyudaOpen;
    helpBody.classList.toggle('open', entrenoAyudaOpen);
    helpHead.querySelector('.chev').textContent = entrenoAyudaOpen ? '▴' : '▾';
  };
  helpCard.appendChild(helpHead); helpCard.appendChild(helpBody);
  host.appendChild(helpCard);

  if(state.entrenosLog.length){
    const stats = computeEntrenosStats();
    const statsBox = document.createElement('div');
    statsBox.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);margin-top:16px;line-height:1.8;background:var(--bg-panel-2);border:1px solid var(--amber);border-radius:8px;padding:12px 14px;';
    let txt = '📅 Esta semana: <strong>'+stats.totalUltimos7+'</strong> entreno'+(stats.totalUltimos7!==1?'s':'')+' registrado'+(stats.totalUltimos7!==1?'s':'')+' (últimos 7 días).';
    if(stats.tipoTop) txt += '<br>🔁 Tipo más repetido: <strong>'+stats.tipoTop.label+'</strong> ('+stats.tipoTop.count+' vez'+(stats.tipoTop.count!==1?'es':'')+').';
    if(stats.enlazados) txt += '<br>🔗 '+stats.enlazados+' entreno'+(stats.enlazados!==1?'s':'')+' con una marca enlazada a «Marcas físicas» (arriba).';
    statsBox.innerHTML = txt;
    host.appendChild(statsBox);
  }

  const logTitle = document.createElement('h3');
  logTitle.style.cssText = "margin:22px 0 0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber-ink);font-size:15px;letter-spacing:.03em;";
  logTitle.textContent = 'Tu registro';
  host.appendChild(logTitle);

  if(!state.entrenosLog.length){
    const empty = document.createElement('div'); empty.className='empty-state'; empty.style.marginTop='14px';
    empty.textContent = 'Todavía no has apuntado ningún entreno. Usa el botón «+ Añadir entreno» para registrar el primero.';
    host.appendChild(empty);
    return;
  }

  const list = document.createElement('div'); list.className='entreno-list';
  const sorted = [...state.entrenosLog].sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  sorted.forEach(item=>{
    const row = document.createElement('div'); row.className='entreno-item';
    const dateIn = document.createElement('input'); dateIn.type='date'; dateIn.value = item.date||'';
    dateIn.onchange = ()=>{
      item.date = dateIn.value;
      if(item.pruebaId && item.marcaValor) registrarMarcaHistorialEnFecha(item.pruebaId, item.marcaValor, item.date||todayISO());
      scheduleSave(); renderEntrenos();
    };
    row.appendChild(dateIn);
    const tipoIn = document.createElement('input'); tipoIn.type='text'; tipoIn.className='entreno-tipo';
    tipoIn.placeholder='Tipo de entreno (ej. Piernas, Carrera 5km, Circuito...)'; tipoIn.value = item.tipo||'';
    tipoIn.oninput = ()=>{ item.tipo = tipoIn.value; scheduleSave(); };
    row.appendChild(tipoIn);

    // Enlace opcional con una prueba física concreta: al elegirla aparece un campo para la
    // marca de ese día, que se guarda directamente en el mismo historial que usa la sección
    // «Marcas físicas» de arriba — así no hay que apuntar el número dos veces por separado.
    const pruebaSel = document.createElement('select'); pruebaSel.className='entreno-prueba';
    pruebaSel.innerHTML = '<option value="">Sin prueba concreta</option>'+
      PRUEBAS_FISICAS.map(p=>'<option value="'+p.id+'"'+(item.pruebaId===p.id?' selected':'')+'>'+p.nombre+'</option>').join('');
    row.appendChild(pruebaSel);

    const marcaIn = document.createElement('input'); marcaIn.type='text'; marcaIn.className='entreno-marca';
    const pruebaActual = PRUEBAS_FISICAS.find(p=>p.id===item.pruebaId);
    marcaIn.placeholder = pruebaActual ? pruebaActual.placeholder : '';
    marcaIn.value = item.marcaValor||'';
    marcaIn.style.display = item.pruebaId ? '' : 'none';
    marcaIn.oninput = ()=>{
      item.marcaValor = marcaIn.value;
      if(item.pruebaId) registrarMarcaHistorialEnFecha(item.pruebaId, item.marcaValor, item.date||todayISO());
      scheduleSave();
    };
    row.appendChild(marcaIn);

    pruebaSel.onchange = ()=>{
      item.pruebaId = pruebaSel.value;
      const p = PRUEBAS_FISICAS.find(x=>x.id===item.pruebaId);
      marcaIn.style.display = item.pruebaId ? '' : 'none';
      marcaIn.placeholder = p ? p.placeholder : '';
      if(item.pruebaId && item.marcaValor) registrarMarcaHistorialEnFecha(item.pruebaId, item.marcaValor, item.date||todayISO());
      scheduleSave();
    };

    const delBtn = document.createElement('button'); delBtn.className='entreno-del'; delBtn.textContent='Eliminar';
    delBtn.onclick = ()=>{ if(confirm('¿Eliminar este entreno?')){ state.entrenosLog = state.entrenosLog.filter(e=>e.id!==item.id); scheduleSave(); renderEntrenos(); } };
    row.appendChild(delBtn);
    const notasTa = document.createElement('textarea'); notasTa.className='entreno-notas';
    notasTa.placeholder='Notas (series, peso, sensaciones, tiempo...)'; notasTa.value = item.notas||'';
    notasTa.oninput = ()=>{ item.notas = notasTa.value; scheduleSave(); };
    row.appendChild(notasTa);
    list.appendChild(row);
  });
  host.appendChild(list);
}
function renderAjustes(){
  const host = document.getElementById('statGrid');
  const keys = sortedMonthKeys();
  let studyDays=0, restDays=0, workDays=0, unknownDays=0;
  const plan = computePlan();
  keys.forEach(k=>{
    Object.values(plan[k]).forEach(v=>{
      if(v.status==='ESTUDIO') studyDays++;
      else if(v.status==='DESCANSO') restDays++;
      else if(v.status==='TRABAJO') workDays++;
      else unknownDays++;
    });
  });
  const stats = [
    ['Meses guardados', keys.length],
    ['Días de estudio', studyDays],
    ['Días de descanso', restDays],
    ['Días de trabajo', workDays],
    ['Días sin horario', unknownDays],
  ];
  host.innerHTML = '';
  stats.forEach(([lbl,num])=>{
    const c = document.createElement('div'); c.className='stat-card';
    c.innerHTML = `<div class="num">${num}</div><div class="lbl">${lbl}</div>`;
    host.appendChild(c);
  });
}
/* ===================== RENDER: ¿CUÁNTO TIEMPO TARDO EN DAR UNA VUELTA? ===================== */
function cicloSectionTitle(text){
  const h = document.createElement('h3');
  h.textContent = text;
  h.style.cssText = "font-family:var(--font-display);text-transform:uppercase;color:var(--amber-ink);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:8px;font-size:17px;letter-spacing:.03em;";
  return h;
}
function cicloIntro(text){
  const p = document.createElement('p');
  p.style.cssText = "font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);line-height:1.6;max-width:680px;margin:0 0 18px;";
  p.textContent = text;
  return p;
}
const CICLO_DOW3 = ['dom','lun','mar','mié','jue','vie','sáb'];
const CICLO_MES3 = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function cicloFechaCorta(ms){
  const d = new Date(ms);
  return CICLO_DOW3[d.getDay()]+' '+d.getDate()+' '+CICLO_MES3[d.getMonth()]+' '+d.getFullYear();
}
/* Una fila por vuelta: día exacto en que se terminó y, a la derecha, los días que pasaron desde
   la vuelta anterior. Las fechas que aún no han llegado son previstas según el calendario. */
function cicloFilasHtml(etq, fechasMs){
  const n = new Date();
  const hoyMs = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return fechasMs.map((ms,i)=>{
    const estado = ms < hoyMs ? '' : (ms === hoyMs ? 'hoy' : 'prevista');
    const dias = i>0 ? Math.round((ms - fechasMs[i-1])/86400000) : null;
    return '<div class="ciclo-fila'+(estado==='prevista' ? ' prevista' : '')+'"'+(estado==='prevista' ? ' title="Fecha prevista según tu calendario"' : '')+'>'+
      '<span class="cf-n">'+etq+' '+(i+1)+'</span>'+
      '<span class="cf-fecha">'+cicloFechaCorta(ms)+'</span>'+
      (estado==='hoy' ? '<span class="cf-tag">(hoy)</span>' : '')+
      '<span class="cf-dias">'+(dias===null ? '—' : dias+' día'+(dias!==1 ? 's' : ''))+'</span>'+
    '</div>';
  }).join('');
}
function simpleGapsBody(datesMs){
  if(datesMs.length < 1){
    return '<div class="ciclo-empty">Todavía sin datos: este tema aún no aparece en tu calendario guardado.</div>';
  }
  let html = '';
  if(datesMs.length >= 2){
    const gaps = [];
    for(let i=1;i<datesMs.length;i++){
      gaps.push(Math.round((datesMs[i]-datesMs[i-1])/86400000));
    }
    const avg = gaps.reduce((a,b)=>a+b,0) / gaps.length;
    html += '<div class="ciclo-line">Media real: <strong>'+avg.toFixed(1)+' días</strong> · '+datesMs.length+' apariciones registradas</div>';
  } else {
    html += '<div class="ciclo-line">1 vuelta registrada (hace falta otra para sacar la media)</div>';
  }
  html += '<div class="ciclo-gaps">'+cicloFilasHtml('Vuelta', datesMs)+'</div>';
  return html;
}
const cicloOpen = {bloques:false, leves:false, ingles:false, psico:false};
function appendAccordionSection(host, key, openMap, titleText, buildFn){
  const wrap = document.createElement('div');
  wrap.className = 'temario-section' + (openMap[key] ? ' open' : '');
  const head = document.createElement('div'); head.className = 'temario-section-head';
  head.innerHTML = `<h3>${titleText}</h3><div class="chev">${openMap[key] ? '▴' : '▾'}</div>`;
  const body = document.createElement('div'); body.className = 'temario-section-body';
  head.onclick = ()=>{
    openMap[key] = !openMap[key];
    wrap.classList.toggle('open', openMap[key]);
    head.querySelector('.chev').textContent = openMap[key] ? '▴' : '▾';
  };
  wrap.appendChild(head); wrap.appendChild(body);
  host.appendChild(wrap);
  buildFn(body);
}
/* ===================== RITMO HASTA EL EXAMEN =====================
   ¿Cuántas vueltas completas de cada parte del temario te da tiempo a dar antes del examen?
   Se calcula con las MISMAS reglas que el calendario (computePlan):
     · Bloques: los días impares tocan un bloque grave (1-5) y los pares uno menos grave (6-12). Cada
       bloque se ve dos veces por vuelta (azul y morado), así que una vuelta = 2 × nº de bloques de la
       familia. En «repaso final» (unificado) cada visita cubre azul+morado, y cuenta doble.
     · Leves: uno por día de estudio; una vuelta = LEVES.length.   · Inglés: uno por día; una vuelta = 32.
     · Psicotécnicos: solo lunes y miércoles de estudio; una vuelta = PSICO_ITEMS.length.
   Se cuenta como hecho todo día que no has marcado «NO completado». Lo que queda hasta el examen se
   cuenta con los días de estudio de tu calendario; los meses que aún no has creado se estiman con tu
   proporción de días de estudio. El ritmo real reciente (% de días completados en los últimos 30 días de
   estudio de cada parte) reduce la proyección si sueles dejar días sin completar. */
function fmtVueltas(n){ return (Math.round(n*10)/10).toFixed(1).replace('.', ','); }
function computeRitmoExamen(){
  const exam = nextExamInfo();
  const plan = computePlan();
  const keys = sortedMonthKeys();
  const unify = (state.settings && state.settings.unifyFromDate) || null;
  const pesoBloque = iso => (unify && iso >= unify) ? 2 : 1;
  const now = new Date();
  const hoyISO = hoyLocalISO();
  const STREAMS = ['graves','mgraves','leves','ingles','psico'];
  const hechas = {graves:0, mgraves:0, leves:0, ingles:0, psico:0};   // visitas (ponderadas) hasta ayer
  const recientes = {graves:[], mgraves:[], leves:[], ingles:[], psico:[]}; // 1 = completado, 0 = «NO completado»

  // 1) Lo hecho hasta ayer, y cuántos días se completaron de verdad.
  let estudioTotal = 0, diasTotal = 0, estudioDesdeHoy = 0, diasDesdeHoy = 0;
  keys.forEach(k=>{
    const [y,m] = k.split('-').map(Number);
    const md = plan[k] || {};
    Object.keys(md).map(Number).sort((a,b)=>a-b).forEach(d=>{
      const e = md[d];
      const iso = k + '-' + pad2(d);
      diasTotal++; if(e.status === 'ESTUDIO') estudioTotal++;
      if(iso >= hoyISO){ diasDesdeHoy++; if(e.status === 'ESTUDIO') estudioDesdeHoy++; }
      if(e.status !== 'ESTUDIO' || iso >= hoyISO) return;
      const t = e.ticks || {};
      const bl = (d % 2 === 1) ? 'graves' : 'mgraves';
      recientes[bl].push({iso, ok: !t.bloque});
      if(!t.bloque) hechas[bl] += pesoBloque(iso);
      recientes.leves.push({iso, ok: !t.leve});   if(!t.leve) hechas.leves++;
      recientes.ingles.push({iso, ok: !t.ingles}); if(!t.ingles) hechas.ingles++;
      if(e.psico){ recientes.psico.push({iso, ok: !t.psico}); if(!t.psico) hechas.psico++; }
    });
  });

  // Ritmo real: % completado en los últimos 30 días de estudio de cada parte.
  const ritmo = {};
  STREAMS.forEach(st=>{
    const arr = recientes[st].sort((a,b)=> a.iso < b.iso ? -1 : 1).slice(-30);
    ritmo[st] = arr.length ? arr.filter(x=>x.ok).length / arr.length : 1;
  });

  // 2) Lo que queda hasta el examen (hoy incluido): días de estudio del calendario; meses sin crear = estimación.
  const pEstudio = diasDesdeHoy ? estudioDesdeHoy/diasDesdeHoy : (diasTotal ? estudioTotal/diasTotal : 1);
  const restantes = {graves:0, mgraves:0, leves:0, ingles:0, psico:0};
  let diasEstudio = 0;
  const diasNaturales = Math.max(0, exam.daysLeft + 1);
  for(let i=0; i<diasNaturales; i++){
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const k = dt.getFullYear()+'-'+pad2(dt.getMonth()+1);
    const d = dt.getDate();
    const iso = k + '-' + pad2(d);
    let sEst;
    if(plan[k] && plan[k][d]) sEst = plan[k][d].status === 'ESTUDIO' ? 1 : 0;
    else sEst = pEstudio;
    if(!sEst) continue;
    diasEstudio += sEst;
    restantes[(d % 2 === 1) ? 'graves' : 'mgraves'] += sEst * pesoBloque(iso);
    restantes.leves += sEst;
    restantes.ingles += sEst;
    const dow = dt.getDay();
    if(dow === 1 || dow === 3) restantes.psico += sEst;
  }

  // 3) Vueltas por área.
  const G = GRAVES_ORDER.length, M = MGRAVES_ORDER.length;
  const defs = [
    {id:'graves',  label:'Bloques graves (1-'+G+')',            lap:2*G},
    {id:'mgraves', label:'Bloques menos graves ('+(G+1)+'-'+(G+M)+')', lap:2*M},
    {id:'leves',   label:'Leves',                                lap:LEVES.length},
    {id:'ingles',  label:'Inglés',                               lap:INGLES_TOTAL},
    {id:'psico',   label:'Psicotécnicos',                        lap:PSICO_ITEMS.length}
  ];
  const objetivo = Number(state.settings && state.settings.objetivoVueltas) || 6;
  const areas = defs.map(df=>{
    const hechasV = hechas[df.id] / df.lap;
    const futurasV = restantes[df.id] * ritmo[df.id] / df.lap;
    const total = hechasV + futurasV;
    return {
      id: df.id, label: df.label, lap: df.lap,
      hechasV, futurasV, total, ritmo: ritmo[df.id],
      diasPorVuelta: futurasV > 0 ? diasNaturales / futurasV : null,
      faltan: Math.max(0, objetivo - total),
      factor: total > 0 ? objetivo / total : null
    };
  });
  return {exam, diasNaturales, diasEstudio, pEstudio, objetivo, areas, ritmo};
}
/* ===================== REPASO DE FLOJOS =====================
   Dos listas para saber qué reforzar:
   · «Notas bajas»: temas (en inglés, cada test por separado) cuya ÚLTIMA nota está por debajo del umbral.
     Muestra la nota anterior (para ver si mejora o empeora), cuándo lo viste por última vez según tu
     calendario y cuándo te vuelve a tocar. Si te toca dentro de más de 21 días (o no hay fecha), sale
     marcado «adelántalo».
   · «Sin repasar»: temas que llevan N días o más sin tocarte y que no tienen una nota buena (≥ 70 %),
     o ni siquiera tienen nota.
   La «última vez» y la «próxima vez» salen del calendario (computePlan): cuenta cada día de estudio hasta
   hoy que no marcaste «NO completado»; la próxima, el primer día futuro que trae ese tema. */
function flojosAparicionesPlan(){
  const plan = computePlan();
  const hoy = hoyLocalISO();
  const ult = {}, prox = {};
  sortedMonthKeys().forEach(k=>{
    const md = plan[k] || {};
    Object.keys(md).map(Number).sort((a,b)=>a-b).forEach(d=>{
      const e = md[d];
      if(e.status !== 'ESTUDIO') return;
      const iso = k + '-' + pad2(d);
      const t = e.ticks || {};
      const items = [];
      (e.temasDelDia || []).forEach(x=> items.push([x.key, 'bloque']));
      if(e.leveInfo) items.push([e.leveInfo.key, 'leve']);
      if(e.inglesNum) items.push(['ingles-'+e.inglesNum, 'ingles']);
      if(e.psico) items.push(['psico-'+e.psicoIdx, 'psico']);
      items.forEach(([key, stream])=>{
        if(iso <= hoy){ if(!t[stream]) ult[key] = iso; }
        else if(!prox[key]) prox[key] = iso;
      });
    });
  });
  return {ult, prox, hoy};
}
function fechaCortaEs(iso){ // «3 sep» (con el año si no es el actual)
  const [y,m,d] = iso.split('-').map(Number);
  return d+' '+MESES[m-1].slice(0,3).toLowerCase()+(y !== new Date().getFullYear() ? ' '+y : '');
}
function diasEntre(isoA, isoB){
  const [ya,ma,da] = isoA.split('-').map(Number), [yb,mb,db] = isoB.split('-').map(Number);
  return Math.round((new Date(yb,mb-1,db) - new Date(ya,ma-1,da)) / 86400000);
}
function computeFlojos(){
  const umbral = (Number(state.settings.flojosUmbral) || 60) / 100;
  const dias = Number(state.settings.flojosDias) || 30;
  const data = collectNotaData();
  const {ult, prox, hoy} = flojosAparicionesPlan();
  const info = key => ({
    ultima: ult[key] || null,
    hace: ult[key] ? diasEntre(ult[key], hoy) : null,
    proxima: prox[key] || null,
    enDias: prox[key] ? diasEntre(hoy, prox[key]) : null
  });
  const bajas = [];
  const conNotaBuenaOBaja = new Set(); // claves con alguna nota (para no repetirlas en «sin repasar» si son buenas)
  const todasLasClaves = [];
  Object.keys(data.porGrupo).forEach(grupo=>{
    data.porGrupo[grupo].forEach(item=>{
      todasLasClaves.push(item);
      // Unidades: en inglés, cada test (general / 1-4) por separado; en el resto, el tema entero.
      const unidades = {};
      item.seq.forEach(x=>{
        if(x.mode !== 'nota') return;
        const id = x.slot || '_';
        (unidades[id] = unidades[id] || []).push(x.nota);
      });
      Object.keys(unidades).forEach(id=>{
        const arr = unidades[id];
        const ultimaNota = arr[arr.length-1];
        const previa = arr.length > 1 ? arr[arr.length-2] : null;
        const pct = ultimaNota / item.max;
        if(pct >= 0.7) conNotaBuenaOBaja.add(item.key);
        if(pct < umbral){
          bajas.push(Object.assign({
            key: item.key, grupo, label: item.label + (id !== '_' ? ' · ' + slotEtiqueta(id) : ''),
            nota: ultimaNota, previa, max: item.max, pct
          }, info(item.key)));
        }
      });
    });
  });
  bajas.sort((a,b)=> a.pct - b.pct || (b.hace||0) - (a.hace||0));
  const yaEnBajas = new Set(bajas.map(b=>b.key));
  // «Sin repasar»: llevan ≥ N días sin tocarte y sin nota buena (o sin nota); no se repiten los que ya están en «bajas».
  const viejos = [];
  Object.keys(ult).forEach(key=>{
    const meta = KEY_LABELS[key];
    if(!meta) return;
    if(yaEnBajas.has(key) || conNotaBuenaOBaja.has(key)) return;
    const inf = info(key);
    if(inf.hace === null || inf.hace < dias) return;
    if(inf.enDias !== null && inf.enDias <= 7) return; // te toca ya mismo: no hace falta avisar
    const it = todasLasClaves.find(x=>x.key === key);
    const ultimaNota = it ? (it.notas.length ? it.notas[it.notas.length-1] : null) : null;
    viejos.push(Object.assign({key, grupo: meta.grupo, label: meta.label, max: meta.max, nota: ultimaNota}, inf));
  });
  viejos.sort((a,b)=> b.hace - a.hace);
  return {umbral, dias, bajas, viejos};
}
function claveAEntradaTema(key){
  const mB = /^b(\d+)-/.exec(key);
  if(mB) return {tab:'temario', accordion:'bloques', block:Number(mB[1]), elId:'temarow-'+key};
  if(key.indexOf('leve-') === 0) return {tab:'temario', accordion:'leves', elId:'temarow-'+key};
  if(key.indexOf('ingles-') === 0) return {tab:'temario', accordion:'ingles', elId:'temarow-'+key};
  return {tab:'temario', accordion:'psico', elId:'temarow-'+key};
}
const flojosOpen = {flojos:true};
let _flojosVerTodo = false;
function renderFlojos(){
  const host = document.getElementById('flojosHost');
  if(!host) return;
  host.innerHTML = '';
  appendAccordionSection(host, 'flojos', flojosOpen, 'Repaso de flojos', (body)=>{
    const r = computeFlojos();
    // Controles
    const ctl = document.createElement('div'); ctl.className = 'flojos-ctl';
    const mkSel = (id, etiqueta, valores, actual, formato, onSet)=>{
      const lab = document.createElement('label'); lab.setAttribute('for', id); lab.textContent = etiqueta;
      const sel = document.createElement('select'); sel.id = id;
      valores.forEach(v=>{ const o = document.createElement('option'); o.value = String(v); o.textContent = formato(v); if(v === actual) o.selected = true; sel.appendChild(o); });
      sel.onchange = ()=>{ onSet(Number(sel.value)); scheduleSave(); renderFlojos(); };
      ctl.appendChild(lab); ctl.appendChild(sel);
    };
    mkSel('flojosUmbralSel', 'Nota baja: por debajo de', [40,50,60,70,80], Math.round(r.umbral*100), v=>v+' %', v=>{ state.settings.flojosUmbral = v; });
    mkSel('flojosDiasSel', 'Sin repasar desde hace', [15,30,45,60,90], r.dias, v=>v+' días', v=>{ state.settings.flojosDias = v; });
    body.appendChild(ctl);

    const LIM = 8;
    const fila = (x, viejo)=>{
      const div = document.createElement('div');
      const urgente = !viejo && (x.enDias === null || x.enDias > 21);
      div.className = 'flojo-item' + (viejo ? ' viejo' : '') + (urgente ? ' urgente' : '');
      const main = document.createElement('div'); main.className = 'flojo-main';
      const nom = document.createElement('div'); nom.className = 'flojo-nom';
      nom.textContent = x.grupo + ' · ' + x.label;
      const sub = document.createElement('div'); sub.className = 'flojo-sub';
      const partes = [];
      if(x.previa !== null && x.previa !== undefined && !viejo){
        const dif = Math.round((x.nota - x.previa)*10)/10;
        partes.push('antes ' + x.previa + '/' + x.max + (dif > 0 ? ' · ▲ mejora' : dif < 0 ? ' · ▼ empeora' : ' · = igual'));
      }
      partes.push(x.ultima ? 'visto por última vez hace ' + x.hace + ' ' + (x.hace === 1 ? 'día' : 'días') + ' (' + fechaCortaEs(x.ultima) + ')' : 'aún no te ha tocado en el calendario');
      if(x.proxima) partes.push('te vuelve a tocar el ' + fechaCortaEs(x.proxima) + ' (en ' + x.enDias + ' ' + (x.enDias === 1 ? 'día' : 'días') + ')');
      else partes.push('sin fecha en tu calendario');
      sub.textContent = partes.join(' · ');
      main.appendChild(nom); main.appendChild(sub);
      if(urgente){
        const ad = document.createElement('div'); ad.className = 'flojo-sub flojo-adelanta';
        ad.textContent = '⚡ Adelántalo: ' + (x.enDias === null ? 'no tiene fecha próxima en tu calendario' : 'no te toca hasta dentro de ' + x.enDias + ' días');
        main.appendChild(ad);
      }
      div.appendChild(main);
      const nota = document.createElement('div'); nota.className = 'flojo-nota';
      if(x.nota !== null && x.nota !== undefined){
        nota.textContent = x.nota + '/' + x.max + ' (' + Math.round(x.nota / x.max * 100) + ' %)';
        nota.style.color = 'var(--red-text)';
      } else { nota.textContent = 'sin nota'; nota.style.color = 'var(--muted)'; }
      div.appendChild(nota);
      const go = document.createElement('button'); go.type = 'button'; go.className = 'btn small ghost'; go.textContent = 'Ir al tema →';
      go.onclick = ()=> goToSearchResult(claveAEntradaTema(x.key));
      div.appendChild(go);
      return div;
    };
    const lista = (titulo, arr, viejo, vacio)=>{
      const t = document.createElement('div'); t.className = 'flojos-titulo'; t.textContent = titulo + ' (' + arr.length + ')';
      body.appendChild(t);
      if(!arr.length){ body.appendChild(cicloIntro(vacio)); return; }
      (_flojosVerTodo ? arr : arr.slice(0, LIM)).forEach(x=> body.appendChild(fila(x, viejo)));
    };
    lista('🔻 Notas bajas', r.bajas, false, 'Ningún tema tiene su última nota por debajo del ' + Math.round(r.umbral*100) + ' %. ¡Bien!');
    lista('⏳ Sin repasar hace tiempo', r.viejos, true, 'No hay temas sin nota buena que lleven ' + r.dias + ' días o más sin tocarte.');
    const total = Math.max(r.bajas.length, r.viejos.length);
    if(total > LIM){
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn small ghost'; btn.style.marginTop = '6px';
      btn.textContent = _flojosVerTodo ? 'Ver solo los ' + LIM + ' primeros' : 'Ver todos';
      btn.onclick = ()=>{ _flojosVerTodo = !_flojosVerTodo; renderFlojos(); };
      body.appendChild(btn);
    }
    const nota = document.createElement('div'); nota.className = 'ritmo-nota';
    nota.textContent = 'Se basa en la última nota de test de cada tema (en inglés, de cada test por separado) y en las fechas de tu calendario. '
      + 'Las notas «No test», «No tiempo» y «Solo lectura» no cuentan como nota. Cambia los umbrales arriba para afinar la lista.';
    body.appendChild(nota);
  });
}

const ritmoOpen = {ritmo:true};
function renderRitmo(){
  const host = document.getElementById('ritmoHost');
  if(!host) return;
  host.innerHTML = '';
  appendAccordionSection(host, 'ritmo', ritmoOpen, 'Ritmo hasta el examen', (body)=>{
    const r = computeRitmoExamen();
    const exam = r.exam;
    if(exam.daysLeft < 0){
      body.appendChild(cicloIntro('La fecha del examen ('+exam.etiqueta+') ya pasó. Cámbiala en la tarjeta «Cuenta atrás» de arriba para ver tu ritmo.'));
      return;
    }
    const resumen = document.createElement('p'); resumen.className = 'ritmo-resumen';
    const lenta = r.areas.filter(a=>a.total > 0).sort((a,b)=>a.total-b.total)[0];
    resumen.innerHTML = 'Examen: <strong>'+exam.etiqueta+'</strong> · faltan <strong>'+exam.daysLeft+'</strong> días (≈ <strong>'+Math.round(r.diasEstudio)+'</strong> de estudio).'
      + (lenta ? ' Al ritmo actual, tu parte más lenta (<strong>'+lenta.label+'</strong>) llegará a <strong>'+fmtVueltas(lenta.total)+'</strong> vueltas completas.' : '');
    body.appendChild(resumen);

    const obj = document.createElement('div'); obj.className = 'ritmo-obj';
    const lbl = document.createElement('label'); lbl.textContent = 'Objetivo: vueltas completas antes del examen'; lbl.setAttribute('for', 'ritmoObjetivoSel');
    const sel = document.createElement('select'); sel.id = 'ritmoObjetivoSel';
    for(let n=1; n<=15; n++){
      const o = document.createElement('option'); o.value = String(n); o.textContent = String(n);
      if(n === r.objetivo) o.selected = true;
      sel.appendChild(o);
    }
    sel.onchange = ()=>{
      state.settings.objetivoVueltas = Number(sel.value);
      scheduleSave();
      renderRitmo();
    };
    obj.appendChild(lbl); obj.appendChild(sel);
    body.appendChild(obj);

    const wrap = document.createElement('div'); wrap.className = 'nota-table-wrap';
    const tbl = document.createElement('table'); tbl.className = 'nota-table';
    tbl.innerHTML = '<thead><tr><th>Parte</th><th>Vueltas hechas</th><th>Hasta el examen</th><th>Total al llegar</th><th>1 vuelta cada</th><th>Objetivo ('+r.objetivo+')</th></tr></thead>';
    const tb = document.createElement('tbody');
    r.areas.forEach(a=>{
      const tr = document.createElement('tr');
      const ok = a.total >= r.objetivo;
      const veredicto = ok
        ? '<span class="ritmo-ok">✓ Llegas · margen de '+fmtVueltas(a.total - r.objetivo)+'</span>'
        : '<span class="ritmo-warn">⚠ Te faltan '+fmtVueltas(a.faltan)+' vueltas'+(a.factor ? ' · ritmo ×'+fmtVueltas(a.factor) : '')+'</span>';
      const ritmoTxt = a.ritmo < 0.995 ? '<div style="font-size:11px;color:var(--muted);">completas el '+Math.round(a.ritmo*100)+' %</div>' : '';
      tr.innerHTML =
        '<td data-label="Parte"><strong>'+a.label+'</strong><div style="font-size:11px;color:var(--muted);">'+a.lap+' visitas por vuelta</div></td>'+
        '<td data-label="Vueltas hechas">'+fmtVueltas(a.hechasV)+'</td>'+
        '<td data-label="Hasta el examen">+'+fmtVueltas(a.futurasV)+ritmoTxt+'</td>'+
        '<td data-label="Total al llegar"><strong>'+fmtVueltas(a.total)+'</strong></td>'+
        '<td data-label="1 vuelta cada">'+(a.diasPorVuelta ? '≈ '+Math.round(a.diasPorVuelta)+' días' : '—')+'</td>'+
        '<td data-label="Objetivo">'+veredicto+'</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); wrap.appendChild(tbl); body.appendChild(wrap);

    const nota = document.createElement('div'); nota.className = 'ritmo-nota';
    nota.textContent = 'Cómo se calcula: con las reglas de tu calendario. Cuenta como hecho todo día que no marcas «NO completado». '
      + 'Los meses que aún no has creado se estiman con tu proporción de días de estudio ('+Math.round(r.pEstudio*100)+' %). '
      + '«Ritmo ×1,4» significa que necesitarías ir un 40 % más rápido que ahora en esa parte. En «repaso final» (unificado) cada visita a un bloque cuenta doble.';
    body.appendChild(nota);
  });
}

function renderCiclo(){
  const host = document.getElementById('cicloHost');
  if(!host) return;
  host.innerHTML = '';

  const plan = computePlan();
  const keys = sortedMonthKeys();

  // Lista cronológica de todos los días de estudio, con su entrada completa del plan.
  const studyDays = [];
  keys.forEach(k=>{
    const md = plan[k] || {};
    const [y,m] = k.split('-').map(Number);
    Object.keys(md).map(Number).sort((a,b)=>a-b).forEach(d=>{
      const e = md[d];
      if(e.status === 'ESTUDIO') studyDays.push({dateMs:new Date(y,m-1,d).getTime(), e});
    });
  });

  /* ---------- BLOQUES ---------- */
  appendAccordionSection(host, 'bloques', cicloOpen, 'Vuelta completa por bloque', (body)=>{
    body.appendChild(cicloIntro('Una "vuelta completa" no es ver los dos colores de este bloque en concreto, sino dar la vuelta a toda su familia de bloques (graves 1-5 o menos graves 6-12): empezando en este bloque en azul, pasando por el resto de la familia en azul, luego toda la familia en morado, hasta volver a tocar este mismo bloque otra vez en azul. En cada línea ves el día exacto en que terminaste esa vuelta (el último día que diste ese bloque en ese color antes de pasar al siguiente; si un día lo dejaste sin completar y se repitió, cuenta el día en que por fin lo terminaste) y, a la derecha, los días que pasaron desde la vuelta anterior. Las fechas en cursiva todavía no han llegado: son previstas según tu calendario real (con tus descansos y días de trabajo ya metidos). Debajo se muestra, por separado y por color, lo mismo para cada color de ese bloque (p.ej. bloque 7 azul → próxima vez bloque 7 azul).'));

    const blockAppearances = {};
    for(let b=1;b<=12;b++) blockAppearances[b]=[];
    studyDays.forEach(({dateMs,e})=>{
      const arr = blockAppearances[e.bloque];
      // Colapsamos días consecutivos con el mismo color (repetidos por no completarse):
      // solo cuenta la fecha en la que realmente cambia de color, es decir, cuando se
      // completa esa vuelta.
      if(arr.length === 0 || arr[arr.length-1].color !== e.color){
        arr.push({dateMs, lastMs:dateMs, color:e.color});
      } else {
        arr[arr.length-1].lastMs = dateMs; // repetido por no completarse: el día de fin es el último
      }
    });
    // Una VUELTA COMPLETA no es "ver los dos colores de este bloque": es dar la vuelta a
    // toda la familia de bloques (graves 1-5 o menos graves 6-12) — empezando en este bloque
    // en azul, pasando por el resto de la familia en azul, luego toda la familia en morado,
    // hasta volver a tocar ESTE MISMO bloque otra vez en azul. Eso equivale exactamente a
    // medir de "azul" a "siguiente azul" de este bloque (el mismo cálculo que ya hace el
    // desglose "Azul" de más abajo), así que anclamos ahí en vez de marcar la vuelta como
    // completa en cuanto aparecen los dos colores de este bloque en concreto (lo cual puede
    // ocurrir mucho antes de que la familia entera haya dado la vuelta). En modo repaso
    // final, cada aparición "unificada" ya cubre azul+morado en un solo día, así que cada
    // una es una vuelta completa por sí misma.
    function buildFullCycles(arr){
      const unificados = arr.filter(a=>a.color==='unificado');
      if(unificados.length){
        return unificados.map(a=>({completeMs:a.lastMs}));
      }
      // Anclamos en azul (el color con el que arranca cada bloque); si un bloque no
      // tuviera azul, usamos el único color que tenga.
      const anchorColor = arr.some(a=>a.color==='azul') ? 'azul' : 'morado';
      return arr.filter(a=>a.color===anchorColor).map(a=>({completeMs:a.lastMs}));
    }

    const blockGrid = document.createElement('div');
    blockGrid.className = 'ciclo-grid';
    blockGrid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(290px,1fr))'; // que quepan fecha y días en una línea
    Object.keys(BLOCKS).map(Number).sort((a,b)=>a-b).forEach(num=>{
      const graves = BLOCKS[num].graves;
      const arr = blockAppearances[num];
      const cycles = buildFullCycles(arr);
      let bodyHtml;
      if(cycles.length < 1){
        bodyHtml = '<div class="ciclo-empty">Todavía sin datos: este bloque aún no aparece en tu calendario guardado.</div>';
      } else {
        const fechas = cycles.map(c=>c.completeMs);
        let html = '';
        if(fechas.length >= 2){
          const gaps = [];
          for(let i=1;i<fechas.length;i++) gaps.push(Math.round((fechas[i] - fechas[i-1])/86400000));
          const avg = gaps.reduce((a,b)=>a+b,0) / gaps.length;
          html += '<div class="ciclo-line">Media real: <strong>'+avg.toFixed(1)+' días</strong> · '+fechas.length+' vueltas completas registradas</div>';
        } else {
          html += '<div class="ciclo-line">1 vuelta registrada (hace falta otra para sacar la media)</div>';
        }
        html += '<div class="ciclo-gaps">'+cicloFilasHtml('Vuelta', fechas)+'</div>';

        // Desglose por color: día exacto en que se terminó cada pasada de ESE color y días desde la
        // anterior del mismo color (p.ej. bloque 7 azul -> próxima vez bloque 7 azul).
        const COLOR_LABEL = {azul:'Azul', morado:'Morado', unificado:'Unificado'};
        let colorHtml = '';
        ['azul','morado','unificado'].forEach(col=>{
          const list = arr.filter(a=>a.color===col);
          if(list.length < 1) return;
          const mss = list.map(a=>a.lastMs);
          const lbl = COLOR_LABEL[col];
          let titulo;
          if(mss.length >= 2){
            const cgaps = [];
            for(let i=1;i<mss.length;i++) cgaps.push(Math.round((mss[i] - mss[i-1])/86400000));
            const cavg = cgaps.reduce((a,b)=>a+b,0) / cgaps.length;
            titulo = 'media hasta volver a tocar '+lbl.toLowerCase()+': <strong>'+cavg.toFixed(1)+' días</strong>';
          } else {
            titulo = '1 pasada registrada';
          }
          colorHtml += '<div class="ciclo-color-block">'+
            '<div class="ciclo-color-title"><span class="colorpill '+col+'">'+col+'</span> '+titulo+'</div>'+
            '<div class="ciclo-gaps">'+cicloFilasHtml(lbl, mss)+'</div>'+
          '</div>';
        });
        if(colorHtml) html += '<div class="ciclo-color-section">'+colorHtml+'</div>';

        bodyHtml = html;
      }
      const card = document.createElement('div');
      card.className = 'ciclo-card';
      card.innerHTML = `
        <div class="ch-row">
          <div class="block-num ${graves?'':'mg'}">${num}</div>
          <div><h4>Bloque ${num}</h4><div class="kind">${graves?'Grave · días impares':'Menos grave · días pares'}</div></div>
        </div>
        ${bodyHtml}
      `;
      blockGrid.appendChild(card);
    });
    body.appendChild(blockGrid);
  });

  /* ---------- LEVES ---------- */
  appendAccordionSection(host, 'leves', cicloOpen, 'Vuelta completa por leve', (body)=>{
    body.appendChild(cicloIntro('Cada leve entra todos los días de estudio, así que una "vuelta" es simplemente el tiempo que tarda en volver a tocar ese mismo leve (ciclo de 17). Si un día no lo das por completado, ese mismo leve se repite al día siguiente de estudio y esa repetición no cuenta como una vuelta nueva. En cada línea ves el día exacto en que terminaste esa vuelta (si un día lo dejaste sin completar y se repitió, cuenta el día en que por fin lo terminaste) y, a la derecha, los días desde la vuelta anterior; las fechas en cursiva son previstas según tu calendario.'));

    const leveAppearances = LEVES.map(()=>[]);
    let lastLeveNum = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.leveNum !== lastLeveNum){
        leveAppearances[e.leveNum-1].push(dateMs);
      } else {
        const arr = leveAppearances[e.leveNum-1]; arr[arr.length-1] = dateMs; // repetido: cuenta el día en que se terminó
      }
      lastLeveNum = e.leveNum;
    });

    const leveGrid = document.createElement('div');
    leveGrid.className = 'ciclo-grid';
    leveGrid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(290px,1fr))';
    LEVES.forEach((t,idx)=>{
      const nombre = t.type==='l39_l40' ? (t.l39+' / '+t.l40) : t.nombre;
      const temaNum = temaNumFromClase(t.clase);
      const card = document.createElement('div');
      card.className = 'ciclo-card';
      card.innerHTML = `
        <div class="ch-row">
          <div class="block-num">${idx+1}</div>
          <div><h4>LEVE Nº${idx+1}: ${nombre}</h4><div class="kind">${temaNum}</div></div>
        </div>
        ${simpleGapsBody(leveAppearances[idx])}
      `;
      leveGrid.appendChild(card);
    });
    body.appendChild(leveGrid);
  });

  /* ---------- INGLÉS ---------- */
  appendAccordionSection(host, 'ingles', cicloOpen, 'Vuelta completa por tema de Inglés', (body)=>{
    body.appendChild(cicloIntro('Igual que con los leves: el inglés entra cada día de estudio, así que la vuelta mide cuánto tarda en volver a tocar exactamente el mismo tema (ciclo de 32). En cada línea ves el día exacto en que terminaste esa vuelta (si un día lo dejaste sin completar y se repitió, cuenta el día en que por fin lo terminaste) y, a la derecha, los días desde la vuelta anterior; las fechas en cursiva son previstas según tu calendario.'));

    const inglesAppearances = Array.from({length:INGLES_TOTAL}, ()=>[]);
    let lastInglesNum = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.inglesNum !== lastInglesNum){
        inglesAppearances[e.inglesNum-1].push(dateMs);
      } else {
        const arr = inglesAppearances[e.inglesNum-1]; arr[arr.length-1] = dateMs; // repetido: cuenta el día en que se terminó
      }
      lastInglesNum = e.inglesNum;
    });

    const inglesGrid = document.createElement('div');
    inglesGrid.className = 'ciclo-grid';
    inglesGrid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(290px,1fr))';
    for(let i=1;i<=INGLES_TOTAL;i++){
      const card = document.createElement('div');
      card.className = 'ciclo-card';
      card.innerHTML = `
        <div class="ch-row">
          <div class="block-num">${i}</div>
          <div><h4>Inglés · Tema ${i}</h4></div>
        </div>
        ${simpleGapsBody(inglesAppearances[i-1])}
      `;
      inglesGrid.appendChild(card);
    }
    body.appendChild(inglesGrid);
  });

  /* ---------- PSICOTÉCNICOS ---------- */
  appendAccordionSection(host, 'psico', cicloOpen, 'Vuelta completa por psicotécnico', (body)=>{
    body.appendChild(cicloIntro('Los psicotécnicos solo entran lunes y miércoles de estudio (cuando no hay entreno), así que la vuelta se mide contando solo esos días, no el calendario completo (ciclo de 23 pruebas + 2 controles). En cada línea ves el día exacto en que terminaste esa vuelta (si un día lo dejaste sin completar y se repitió, cuenta el día en que por fin lo terminaste) y, a la derecha, los días desde la vuelta anterior; las fechas en cursiva son previstas según tu calendario.'));

    const psicoAppearances = PSICO_ITEMS.map(()=>[]);
    let lastPsicoIdx = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.psicoIdx === undefined) return;
      if(e.psicoIdx !== lastPsicoIdx){
        psicoAppearances[e.psicoIdx].push(dateMs);
      } else {
        const arr = psicoAppearances[e.psicoIdx]; arr[arr.length-1] = dateMs; // repetido: cuenta el día en que se terminó
      }
      lastPsicoIdx = e.psicoIdx;
    });

    const psicoGrid = document.createElement('div');
    psicoGrid.className = 'ciclo-grid';
    psicoGrid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(290px,1fr))';
    PSICO_ITEMS.forEach((name,idx)=>{
      const card = document.createElement('div');
      card.className = 'ciclo-card';
      card.innerHTML = `
        <div class="ch-row">
          <div class="block-num">${idx+1}</div>
          <div><h4>${name}</h4></div>
        </div>
        ${simpleGapsBody(psicoAppearances[idx])}
      `;
      psicoGrid.appendChild(card);
    });
    body.appendChild(psicoGrid);
  });
}
/* ===================== RENDER: SINCRONIZACIÓN ===================== */
function renderSyncBox(){
  const host = document.getElementById('syncBox');
  if(!host) return;
  const email = firebaseUser && firebaseUser.email ? firebaseUser.email : '';
  host.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:12px;color:var(--amber-ink);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Sincronización</div>
    <div style="font-size:13px;">Tu planning es privado y está ligado a tu cuenta<strong>${email ? ' ('+email+')' : ''}</strong>.
    Para verlo en otro dispositivo (móvil, tablet, ordenador), simplemente abre la app e inicia sesión ahí con
    el mismo correo y contraseña: no hace falta ningún código ni enlace especial.</div>
  `;
}

document.getElementById('resetBtn').onclick = ()=>{
  // Borrar todo es irreversible desde la app (aparte de las copias automáticas/manuales), así
  // que pedimos escribir una palabra exacta en vez de un simple aceptar/cancelar, para evitar
  // un borrado accidental por pulsar demasiado rápido.
  const val = prompt('Esto borrará TODOS los meses y notas guardados. Esta acción no se puede deshacer desde la app '+
    '(aunque puedes restaurar una copia automática o manual después, si tienes). Para confirmar, escribe BORRAR en mayúsculas:');
  if(val === null) return; // canceló
  if(val.trim() !== 'BORRAR'){ showToast('No se ha borrado nada (el texto no coincidía con BORRAR)'); return; }
  // El PIN de acceso (si lo tienes activado) se conserva a propósito: borrar los datos
  // no debería dejar el planning sin protección.
  const keepPin = state.settings ? state.settings.pinHash : null;
  state = { months:{}, notes:{}, ticks:{}, dayTicks:{}, ortoTests:{ortografia:[], gramatica:[]}, entrenosLog:[], marcas:{}, marcasHistory:{}, settings:{unifyFromDate:null, pinHash:keepPin}, clases:{conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]}, claseCal:{}, clasesPendientes:[], notasPendientes:[], clasesSyncPendiente:[], simulacros:[], simulacrosPendientes:[], simulacroCal:{}, arrastreManual:{graves:[], mgraves:[], leves:[], ingles:[], psico:[], conocimientos:[]}, arrastreTestNotas:{} };
  currentMonthKey = null;
  invalidatePlan();
  scheduleSave();
  renderAll();
  showToast('Datos borrados');
};

/* ===================== TABS ===================== */
const tabsNavEl = document.getElementById('tabsNav');
const tabsMobileTriggerEl = document.getElementById('tabsMobileTrigger');
const tabsMobileTriggerLabelEl = document.getElementById('tabsMobileTriggerLabel');
function activateTab(tabName){
  const btn = document.querySelector('.tab-btn[data-tab="'+tabName+'"]');
  if(!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('view-'+tabName).classList.add('active');
  if(tabsMobileTriggerLabelEl) tabsMobileTriggerLabelEl.textContent = btn.textContent;
  if(tabsNavEl) tabsNavEl.classList.remove('open');
  // Progreso solo se pintaba al cargar la app, así que las notas nuevas no aparecían hasta recargar.
  // Lo repintamos cada vez que se entra en la pestaña (ya visible, así los gráficos toman bien el ancho).
  if(tabName === 'progreso' && typeof renderProgreso === 'function'){ renderProgreso(); if(typeof renderRitmo === 'function') renderRitmo(); if(typeof renderFlojos === 'function') renderFlojos(); }
  else if(typeof alEntrarEnPestana === 'function') alEntrarEnPestana(tabName);
}
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.onclick = ()=> activateTab(btn.dataset.tab);
});
if(tabsMobileTriggerEl){
  tabsMobileTriggerEl.onclick = ()=>{
    const isOpen = tabsNavEl.classList.toggle('open');
    tabsMobileTriggerEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };
  document.addEventListener('click', (e)=>{
    if(tabsNavEl.classList.contains('open') && !tabsNavEl.contains(e.target)){
      tabsNavEl.classList.remove('open');
      tabsMobileTriggerEl.setAttribute('aria-expanded','false');
    }
  });
}

/* ===================== BUSCADOR GLOBAL DE TEMAS ===================== */
// Índice plano de todo lo que se puede buscar: Bloques, Leves, Inglés y Psicotécnicos.
// Se reconstruye bajo demanda (es barato) para no tener que mantenerlo sincronizado
// con cambios en los datos.
function buildSearchIndex(){
  const idx = [];
  Object.keys(BLOCKS).map(Number).sort((a,b)=>a-b).forEach(num=>{
    BLOCKS[num].temas.forEach((t,i)=>{
      if(t.type==='armas_explosivos'){
        [['armas', t.armas, 'armas'], ['explosivos', t.explosivos, 'explosivos']].forEach(([sub,label])=>{
          idx.push({
            text: (t.clase||'')+' '+label, display: label,
            meta: 'Bloque '+num+(t.clase?' · '+t.clase:''),
            tab:'temario', accordion:'bloques', block:num, elId:'temarow-b'+num+'-'+i+'-'+sub
          });
        });
        return;
      }
      idx.push({
        text: (t.clase||'')+' '+t.nombre, display: t.nombre,
        meta: 'Bloque '+num+(t.clase?' · '+t.clase:''),
        tab:'temario', accordion:'bloques', block:num, elId:'temarow-b'+num+'-'+i
      });
    });
  });
  LEVES.forEach((t,i)=>{
    if(t.type==='l39_l40'){
      [['l39', t.l39], ['l40', t.l40]].forEach(([sub,label])=>{
        idx.push({
          text: 'leve '+(i+1)+' '+(t.clase||'')+' '+label, display: label,
          meta: 'Leve Nº'+(i+1)+(t.clase?' · '+t.clase:''),
          tab:'temario', accordion:'leves', elId:'temarow-leve-'+i+'-'+sub
        });
      });
      return;
    }
    idx.push({
      text: 'leve '+(i+1)+' '+(t.clase||'')+' '+t.nombre, display: t.nombre,
      meta: 'Leve Nº'+(i+1)+(t.clase?' · '+t.clase:''),
      tab:'temario', accordion:'leves', elId:'temarow-leve-'+i
    });
  });
  for(let i=1;i<=INGLES_TOTAL;i++){
    idx.push({
      text: 'ingles tema '+i, display: 'Tema '+i, meta: 'Inglés',
      tab:'temario', accordion:'ingles', elId:'temarow-ingles-'+i
    });
  }
  PSICO_ITEMS.forEach((name,i)=>{
    idx.push({
      text: name, display: name, meta: 'Psicotécnicos',
      tab:'temario', accordion:'psico', elId:'temarow-psico-'+i
    });
  });
  return idx;
}
function normalizeSearch(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function goToSearchResult(entry){
  activateTab(entry.tab);
  temarioOpen[entry.accordion] = true;
  const section = document.getElementById('temario-section-'+entry.accordion);
  if(section){
    section.classList.add('open');
    const chev = section.querySelector(':scope > .temario-section-head .chev');
    if(chev) chev.textContent = '▴';
  }
  if(entry.block){
    const card = document.getElementById('blockcard-'+entry.block);
    if(card){
      const bbody = card.querySelector('.block-body');
      const chev = card.querySelector('.chev');
      if(bbody) bbody.classList.add('open');
      if(chev) chev.textContent = '▴';
      _bloquesAbiertos.add(Number(entry.block));
    }
  }
  setTimeout(()=>{
    const el = document.getElementById(entry.elId);
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.remove('temarow-flash');
      void el.offsetWidth; // reinicia la animación si ya se había lanzado antes
      el.classList.add('temarow-flash');
    }
  }, 60);
}
(function setupGlobalSearch(){
  const input = document.getElementById('globalSearchInput');
  const resultsEl = document.getElementById('globalSearchResults');
  const wrap = document.getElementById('globalSearchWrap');
  if(!input || !resultsEl) return;
  let lastResults = [];
  function renderResults(query){
    const q = normalizeSearch(query).trim();
    if(!q){ resultsEl.classList.remove('open'); resultsEl.innerHTML=''; return; }
    const idx = buildSearchIndex();
    const terms = q.split(/\s+/).filter(Boolean);
    lastResults = idx.filter(e=>{
      const hay = normalizeSearch(e.text+' '+e.meta);
      return terms.every(t=>hay.includes(t));
    }).slice(0, 25);
    if(!lastResults.length){
      resultsEl.innerHTML = '<div class="gsr-empty">Sin resultados para "'+query.replace(/</g,'&lt;')+'"</div>';
    } else {
      resultsEl.innerHTML = lastResults.map((e,i)=>
        '<div class="gsr-item" data-i="'+i+'">'+
          '<div class="gsr-name">'+e.display.replace(/</g,'&lt;')+'</div>'+
          '<div class="gsr-meta">'+e.meta.replace(/</g,'&lt;')+'</div>'+
        '</div>'
      ).join('');
    }
    resultsEl.classList.add('open');
  }
  input.addEventListener('input', ()=> renderResults(input.value));
  input.addEventListener('focus', ()=>{ if(input.value.trim()) renderResults(input.value); });
  resultsEl.addEventListener('click', (e)=>{
    const item = e.target.closest('.gsr-item');
    if(!item) return;
    const entry = lastResults[Number(item.dataset.i)];
    if(!entry) return;
    goToSearchResult(entry);
    resultsEl.classList.remove('open');
    input.value = '';
  });
  document.addEventListener('click', (e)=>{
    if(wrap && !wrap.contains(e.target)) resultsEl.classList.remove('open');
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){ resultsEl.classList.remove('open'); input.blur(); }
  });
})();

/* ===================== SELECTOR: calendario principal / calendario de clases =====================
   Ambos calendarios siguen existiendo tal cual (mismo host, mismas funciones de render); esto solo
   decide cuál de los dos paneles se ve dentro de la pestaña "Calendario". */
let calSelectorMode = 'principal';
try{ calSelectorMode = localStorage.getItem('calSelectorMode') || 'principal'; }catch(e){}
function syncCalSelectorToggle(){
  document.querySelectorAll('#calSelectorToggle .view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.cal===calSelectorMode));
  const mainPanel = document.getElementById('calMainPanel');
  const clasesPanel = document.getElementById('calClasesPanel');
  const simPanel = document.getElementById('calSimPanel');
  if(mainPanel) mainPanel.style.display = calSelectorMode==='principal' ? '' : 'none';
  if(clasesPanel) clasesPanel.style.display = calSelectorMode==='clases' ? '' : 'none';
  if(simPanel) simPanel.style.display = calSelectorMode==='simulacros' ? '' : 'none';
  const todoPanel = document.getElementById('calTodoPanel');
  if(todoPanel) todoPanel.style.display = calSelectorMode==='todo' ? '' : 'none';
}
function setCalSelectorMode(mode){
  calSelectorMode = mode;
  try{ localStorage.setItem('calSelectorMode', mode); }catch(e){}
  syncCalSelectorToggle();
}
document.querySelectorAll('#calSelectorToggle .view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setCalSelectorMode(btn.dataset.cal);
});
syncCalSelectorToggle();

/* ===================== VISTA CALENDARIO: rejilla / lista ===================== */
let calViewMode = 'grid';
try{
  calViewMode = localStorage.getItem('calViewMode') || (window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid');
}catch(e){
  calViewMode = window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid';
}
function syncViewToggleButtons(){
  document.querySelectorAll('#calViewToggle .view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===calViewMode));
}
function setCalViewMode(mode){
  calViewMode = mode;
  try{ localStorage.setItem('calViewMode', mode); }catch(e){}
  syncViewToggleButtons();
  renderCalendar();
}
document.querySelectorAll('#calViewToggle .view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setCalViewMode(btn.dataset.view);
});
syncViewToggleButtons();

/* ===================== VISTA CALENDARIO DE CLASES: rejilla / lista ===================== */
let claseCalViewMode = 'grid';
try{
  claseCalViewMode = localStorage.getItem('claseCalViewMode') || (window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid');
}catch(e){
  claseCalViewMode = window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid';
}
function syncClaseViewToggleButtons(){
  document.querySelectorAll('#claseCalViewToggle .view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===claseCalViewMode));
}
function setClaseCalViewMode(mode){
  claseCalViewMode = mode;
  try{ localStorage.setItem('claseCalViewMode', mode); }catch(e){}
  syncClaseViewToggleButtons();
  renderClaseCalendar();
}
document.querySelectorAll('#claseCalViewToggle .view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setClaseCalViewMode(btn.dataset.view);
});
syncClaseViewToggleButtons();

/* ===================== VISTA CALENDARIO DE SIMULACROS: rejilla / lista ===================== */
let simCalViewMode = 'grid';
try{
  simCalViewMode = localStorage.getItem('simCalViewMode') || (window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid');
}catch(e){
  simCalViewMode = window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid';
}
function syncSimCalViewToggleButtons(){
  document.querySelectorAll('#simCalViewToggle .view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===simCalViewMode));
}
function setSimCalViewMode(mode){
  simCalViewMode = mode;
  try{ localStorage.setItem('simCalViewMode', mode); }catch(e){}
  syncSimCalViewToggleButtons();
  renderSimCalendar();
}
document.querySelectorAll('#simCalViewToggle .view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setSimCalViewMode(btn.dataset.view);
});
syncSimCalViewToggleButtons();

/* ===================== VISTA CALENDARIO TODO INCLUIDO: rejilla / lista ===================== */
let todoCalViewMode = 'grid';
try{
  todoCalViewMode = localStorage.getItem('todoCalViewMode') || (window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid');
}catch(e){
  todoCalViewMode = window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid';
}
function syncTodoCalViewToggleButtons(){
  document.querySelectorAll('#todoCalViewToggle .view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===todoCalViewMode));
}
function setTodoCalViewMode(mode){
  todoCalViewMode = mode;
  try{ localStorage.setItem('todoCalViewMode', mode); }catch(e){}
  syncTodoCalViewToggleButtons();
  renderTodoCalendar();
}
document.querySelectorAll('#todoCalViewToggle .view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setTodoCalViewMode(btn.dataset.view);
});
syncTodoCalViewToggleButtons();

/* ===================== EXPORTAR CALENDARIO (imagen / PDF) =====================
   Genérico: sirve tanto para el Calendario principal (host "calendarHost") como
   para el Calendario de clases (host "clasesCalHost"); solo cambia el host que se
   captura y la etiqueta que se añade al nombre del archivo. */
function calendarExportBaseName(sufijo){
  // Usa el mes visible (p.ej. "2026-09") si existe, o la fecha de hoy como respaldo.
  let etiqueta = 'calendario';
  try{
    if (currentMonthKey && /^\d{4}-\d{2}$/.test(currentMonthKey)) {
      const [y, m] = currentMonthKey.split('-').map(Number);
      const nombreMes = (MESES[m - 1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      etiqueta = `${nombreMes || 'mes'}-${y}`;
    } else {
      etiqueta = hoyLocalISO();
    }
  }catch(e){ /* usamos el valor por defecto */ }
  return `operacion-baeza-${sufijo ? sufijo + '-' : ''}${etiqueta}`;
}

async function capturarHostComoCanvas(hostId){
  const host = document.getElementById(hostId);
  if (!host || !host.firstChild) {
    showToast('No hay nada que exportar todavía.');
    return null;
  }
  const bgVar = getComputedStyle(document.documentElement).getPropertyValue('--bg-panel').trim();
  return await html2canvas(host, {
    backgroundColor: bgVar || '#16302a',
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true
  });
}

function toggleExportButtonsDisabled(disabled, ids){
  (ids || ['exportCalImageBtn', 'exportCalPdfBtn']).forEach(id=>{
    const b = document.getElementById(id);
    if (b) b.disabled = disabled;
  });
}

async function exportarComoImagen(hostId, sufijo, btnIds){
  if (typeof html2canvas === 'undefined') {
    showToast('No se pudo cargar la herramienta de exportación. Revisa tu conexión.');
    return;
  }
  toggleExportButtonsDisabled(true, btnIds);
  try{
    const canvas = await capturarHostComoCanvas(hostId);
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = calendarExportBaseName(sufijo) + '.png';
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Imagen exportada ✓');
  }catch(err){
    console.error(err);
    showToast('No se pudo exportar la imagen.');
  }finally{
    toggleExportButtonsDisabled(false, btnIds);
  }
}

async function exportarComoPDF(hostId, sufijo, btnIds){
  if (typeof html2canvas === 'undefined' || !window.jspdf) {
    showToast('No se pudo cargar la herramienta de exportación. Revisa tu conexión.');
    return;
  }
  toggleExportButtonsDisabled(true, btnIds);
  try{
    const canvas = await capturarHostComoCanvas(hostId);
    if (!canvas) return;
    const { jsPDF } = window.jspdf;
    const orientacion = canvas.width >= canvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation: orientacion, unit: 'pt', format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(calendarExportBaseName(sufijo) + '.pdf');
    showToast('PDF exportado ✓');
  }catch(err){
    console.error(err);
    showToast('No se pudo exportar el PDF.');
  }finally{
    toggleExportButtonsDisabled(false, btnIds);
  }
}

function exportarCalendarioComoImagen(){ return exportarComoImagen('calendarHost', '', ['exportCalImageBtn', 'exportCalPdfBtn']); }
function exportarCalendarioComoPDF(){ return exportarComoPDF('calendarHost', '', ['exportCalImageBtn', 'exportCalPdfBtn']); }
function exportarClasesCalendarioComoImagen(){ return exportarComoImagen('clasesCalHost', 'clases', ['exportClasesCalImageBtn', 'exportClasesCalPdfBtn']); }
function exportarClasesCalendarioComoPDF(){ return exportarComoPDF('clasesCalHost', 'clases', ['exportClasesCalImageBtn', 'exportClasesCalPdfBtn']); }
function exportarSimCalendarioComoImagen(){ return exportarComoImagen('simCalHost', 'simulacros', ['exportSimCalImageBtn', 'exportSimCalPdfBtn']); }
function exportarSimCalendarioComoPDF(){ return exportarComoPDF('simCalHost', 'simulacros', ['exportSimCalImageBtn', 'exportSimCalPdfBtn']); }

document.getElementById('exportCalImageBtn').addEventListener('click', exportarCalendarioComoImagen);
document.getElementById('exportCalPdfBtn').addEventListener('click', exportarCalendarioComoPDF);
document.getElementById('exportClasesCalImageBtn').addEventListener('click', exportarClasesCalendarioComoImagen);
document.getElementById('exportClasesCalPdfBtn').addEventListener('click', exportarClasesCalendarioComoPDF);

/* Vaciar de una vez todo el calendario de clases, para empezarlo de cero. Como la pestaña
   "Clases" se calcula a partir de este calendario, al vaciarlo se quedan también todas las
   vueltas sin marcar — que es justo lo que se busca al rehacerlo desde el principio.
   No toca nada del calendario principal (estudio/descanso/trabajo, temario, notas del día). */
function contarClasesRegistradas(){
  let n = 0;
  Object.keys(state.claseCal||{}).forEach(mk=>{
    const mes = state.claseCal[mk] || {};
    Object.keys(mes).forEach(d=>{
      const e = mes[d]; if(!e) return;
      ['conocimientos','ingles','psico','psicoExtra','orto','gram'].forEach(k=>{
        if(Array.isArray(e[k])) n += e[k].length;
      });
    });
  });
  return n;
}
function vaciarCalendarioClases(){
  const n = contarClasesRegistradas();
  if(!n && !Object.keys(state.claseCal||{}).length){
    alert('El calendario de clases ya está vacío.');
    return;
  }
  const msg = 'Vas a borrar TODAS las clases del calendario de clases ('+n+' en total, de todos los meses), '+
    'incluidas sus notas.\n\nComo la pestaña «Clases» se calcula a partir de este calendario, también se '+
    'quedarán todas las vueltas sin marcar.\n\nNo se toca el calendario principal (estudio/descanso/trabajo, '+
    'temario, notas del día) ni el tablón de clases pendientes.\n\nEscribe BORRAR para confirmar:';
  const resp = prompt(msg, '');
  if(resp === null) return;
  if(resp.trim().toUpperCase() !== 'BORRAR'){
    alert('No se ha borrado nada (tenías que escribir BORRAR).');
    return;
  }
  state.claseCal = {};
  state.clasesSyncPendiente = [];
  // Los checks manuales del sistema antiguo tampoco pintan ya nada: se limpian también
  // para que no quede rastro de la versión anterior.
  state.clases.conocimientos = {};
  state.clases.ingles = {};
  state.clases.psico = {};
  invalidarClasesDerivadas();
  scheduleSave();
  renderAll();
  alert('Calendario de clases vaciado. Ya puedes montarlo de nuevo desde cero.');
}
document.getElementById('vaciarClasesCalBtn').addEventListener('click', vaciarCalendarioClases);
function exportarTodoCalendarioComoImagen(){ return exportarComoImagen('todoCalHost', 'todo', ['exportTodoCalImageBtn', 'exportTodoCalPdfBtn']); }
function exportarTodoCalendarioComoPDF(){ return exportarComoPDF('todoCalHost', 'todo', ['exportTodoCalImageBtn', 'exportTodoCalPdfBtn']); }
document.getElementById('exportTodoCalImageBtn').addEventListener('click', exportarTodoCalendarioComoImagen);
document.getElementById('exportTodoCalPdfBtn').addEventListener('click', exportarTodoCalendarioComoPDF);
document.getElementById('exportSimCalImageBtn').addEventListener('click', exportarSimCalendarioComoImagen);
document.getElementById('exportSimCalPdfBtn').addEventListener('click', exportarSimCalendarioComoPDF);


/* ===================== INIT ===================== */
function renderAll(){
  _renderAllEnCurso = true;
  try{
  invalidarClasesDerivadas();
  procesarSincronizacionesClaseVencidas(); // marca ya las vueltas cuyo día ha quedado atrás
  renderMonthBar();
  renderLegend();
  renderNotasPendientes();
  renderCalendar();
  renderBlocks();
  renderLeves();
  renderIngles();
  renderPsico();
  renderOrto();
  renderClasesConocimientos();
  renderClasesIngles();
  renderClasesPsico();
  renderClasesOrtoGram();
  renderClasesPendientes();
  renderClasesCalMonthBar();
  renderClaseCalendar();
  renderSimulacrosList();
  renderSimulacrosPendientes();
  renderSimCalMonthBar();
  renderSimCalendar();
  renderTodoCalMonthBar();
  renderTodoCalLegend();
  renderTodoCalendar();
  renderCiclo();
  renderRitmo();
  renderFlojos();
  renderProgreso();
  renderMarcas();
  renderEntrenos();
  renderAjustes();
  renderSyncBox();
  renderAccountBox();
  if(isAdmin) renderAdminBox();
  renderSecurity();
  renderThemeBox();
  renderDataSizeBox();
  renderBackupBox();
  renderHistoryBox();
  } finally { _renderAllEnCurso = false; }
}
// Qué hay que repintar en cada pestaña (mismo orden que renderAll).
const RENDER_PESTANA = {
  calendario(){
    renderMonthBar(); renderLegend(); renderNotasPendientes(); renderCalendar();
    renderClasesCalMonthBar(); renderClaseCalendar(); renderClasesPendientes();
    renderSimCalMonthBar(); renderSimCalendar(); renderSimulacrosPendientes();
    renderTodoCalMonthBar(); renderTodoCalLegend(); renderTodoCalendar();
  },
  clases(){ renderClasesConocimientos(); renderClasesIngles(); renderClasesPsico(); renderClasesOrtoGram(); },
  temario(){ renderBlocks(); renderLeves(); renderIngles(); renderPsico(); renderOrto(); },
  simulacros(){ renderSimulacrosList(); },
  entrenos(){ renderMarcas(); renderEntrenos(); },
  progreso(){ renderCiclo(); renderRitmo(); renderFlojos(); renderProgreso(); },
  arrastre(){ renderArrastre(); },
  ajustes(){ renderAjustes(); renderDataSizeBox(); }   // resumen de días/estadísticas (el resto de cajas de Ajustes no depende de los datos)
};
function repintarPestana(tab){
  const fn = RENDER_PESTANA[tab];
  if(!fn) return;
  try{ fn(); }catch(err){ try{ console.error('Error al actualizar la pestaña '+tab, err); }catch(e){} }
}
function actualizarVistasAhora(){
  _vistasTimer = null;
  if(typeof _appStarted === 'undefined' || !_appStarted || !_tabsSucias.size) return;
  const activa = pestanaActiva();
  _refrescandoVistas = true;
  const antesRenderAll = _renderAllEnCurso;
  _renderAllEnCurso = true;
  try{
    invalidarClasesDerivadas();
    procesarSincronizacionesClaseVencidas();
    try{ renderHomeDash(); }catch(err){ try{ console.error(err); }catch(e){} }
    // Pestañas que no estás viendo: se ponen al día en segundo plano.
    Array.from(_tabsSucias).forEach(tab=>{
      if(tab === activa) return;
      repintarPestana(tab);
      _tabsSucias.delete(tab);
    });
    // La que estás viendo: solo si no estás escribiendo. Temario no hace falta repintarlo (lo que se
    // edita ahí no cambia nada dentro de la propia pestaña, y así no se te pliegan los bloques).
    if(_tabsSucias.has(activa) && (activa === 'temario' || !usuarioEditando())){
      if(activa !== 'temario') repintarPestana(activa);
      _tabsSucias.delete(activa);
    }
  } finally {
    _renderAllEnCurso = antesRenderAll;
    _refrescandoVistas = false;
  }
  // Si estabas escribiendo, la pestaña activa queda para cuando termines.
  if(_tabsSucias.size){
    clearTimeout(_vistasTimer);
    _vistasTimer = setTimeout(actualizarVistasAhora, VISTAS_REINTENTO_MS);
  }
}
// Al cambiar de pestaña, si quedaba algo por pintar en ella, se pinta al entrar (nunca ves datos viejos).
function alEntrarEnPestana(tab){
  if(!_tabsSucias.has(tab)) return;
  _refrescandoVistas = true;
  const antes = _renderAllEnCurso; _renderAllEnCurso = true;
  try{
    invalidarClasesDerivadas();
    procesarSincronizacionesClaseVencidas();
    repintarPestana(tab);
    _tabsSucias.delete(tab);
  } finally { _renderAllEnCurso = antes; _refrescandoVistas = false; }
}
// Al terminar de escribir en un campo, se pone al día lo que hubiera quedado pendiente.
document.addEventListener('focusout', ()=>{
  if(_tabsSucias.size){ clearTimeout(_vistasTimer); _vistasTimer = setTimeout(actualizarVistasAhora, VISTAS_REINTENTO_MS); }
});
// Otro dispositivo: se comprueba cada minuto mientras la app está a la vista.
setInterval(()=>{ if(!document.hidden) checkForRemoteChanges(); }, 60000);

// Por si la app se queda abierta y cruza la medianoche: revisamos cada minuto (y al volver
// a primer plano) si alguna sincronización diferida de Clases ya ha vencido, para que la
// vuelta se marque sola sin que haga falta recargar la página.
setInterval(()=>{ procesarSincronizacionesClaseVencidas(); }, 60000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) procesarSincronizacionesClaseVencidas(); });
// Segunda mitad del arranque: construye la interfaz normal una vez sabemos qué mostrar
// (usuario aprobado, datos cargados y, si tenía PIN, ya desbloqueado).
function startApp(){
  const keys = sortedMonthKeys();
  const now = new Date();
  const todayKey = now.getFullYear()+'-'+pad2(now.getMonth()+1);
  currentMonthKey = keys.includes(todayKey) ? todayKey : (keys.length ? keys[keys.length-1] : null);
  renderAll();
  // Al abrir la app, nos aseguramos de estar en la pestaña Calendario. El día de hoy ya
  // queda resaltado con su borde propio (clase .today) — no desplazamos la vista hacia él,
  // así se ve la página desde arriba tal cual, sin saltos automáticos.
  const calBtn = document.querySelector('.tab-btn[data-tab="calendario"]');
  if(calBtn) calBtn.click();
  // Por si en la última sesión se hicieron cambios sin conexión y la app se cerró antes de
  // poder subirlos a Firebase: si ahora hay conexión, los sincronizamos de inmediato.
  if(hasPendingSync()){
    if(navigator.onLine) trySyncPending();
    else setSaveStatus('error', 'Sin conexión · se guardará al reconectar');
  }
  // Aviso del test de arrastre (solo en días de estudio y si aún no está hecho). Pequeño retraso
  // para que la pantalla ya esté pintada cuando aparezca.
  _appStarted = true;
  setTimeout(()=>{ maybeAskArrastreTest(true); }, 700);
}
(async function init(){
  if(!firebaseOk){ renderConfigNeeded(); return; }
  const approvedUser = await firebaseAuthReady;
  if(!firebaseUser){ renderAuthScreen(); return; }
  if(!approvedUser){ renderPendingScreen(); return; }
  // Cada cuenta aprobada tiene su propio planning, identificado por su uid: no hay dos
  // cuentas que puedan compartir ni pisarse los datos, ni falta ningún código manual.
  accessCode = firebaseUser.uid;
  syncEmailVerifiedFlag(); // no bloqueante: se hace en paralelo, no hace falta esperarla
  await loadState();
  if(state.settings.pinHash){
    let localHash = null;
    try{ localHash = localStorage.getItem(unlockKeyName()); }catch(e){}
    unlocked = (localHash === state.settings.pinHash);
  } else {
    unlocked = true;
  }
  if(!unlocked){ renderPinGate(); return; }
  startApp();
})();

/* ===================== PWA: registro del service worker ===================== */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').then((reg)=>{
      // Los navegadores solo miran si hay versión nueva al abrir la página (y de vez en cuando).
      // Para apps que se dejan abiertas días (como esta en el móvil), se comprueba además cada
      // 30 minutos y al volver a primer plano, y así el aviso llega enseguida.
      const buscarVersionNueva = ()=>{ try{ reg.update().catch(()=>{}); }catch(e){} };
      setInterval(buscarVersionNueva, 30*60*1000);
      document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) buscarVersionNueva(); });
      // Si el navegador detecta un service-worker.js distinto al que ya tenías (porque he
      // publicado una actualización), avisamos con una franja para que la persona recargue
      // cuando le venga bien, en vez de seguir usando en silencio una versión vieja de la app
      // hasta que recargue la pestaña por otro motivo.
      reg.addEventListener('updatefound', ()=>{
        const nuevo = reg.installing;
        if(!nuevo) return;
        nuevo.addEventListener('statechange', ()=>{
          if(nuevo.state === 'installed' && navigator.serviceWorker.controller){
            renderUpdateAvailableBanner();
          }
        });
      });
    }).catch((e)=> console.error('Service worker no registrado', e));
  });
}
function renderUpdateAvailableBanner(){
  if(document.getElementById('updateAvailableBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'updateAvailableBanner';
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:var(--amber);color:#1b2b1f;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;font-family:var(--font-mono);font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;';
  // «Actualizar ahora» guarda lo que tengas pendiente y recarga la página con la versión nueva.
  // «Después» cierra el aviso; la versión nueva se cargará sola la próxima vez que abras la app.
  banner.innerHTML = `
    <span>Hay una versión nueva de la app.</span>
    <span style="display:flex;gap:8px;">
      <button class="btn small" id="updateAvailableNowBtn" style="background:#1b2b1f;color:var(--amber-ink);font-weight:700;">Actualizar ahora</button>
      <button class="btn small ghost" id="updateAvailableCloseBtn" style="border-color:#1b2b1f;color:#1b2b1f;">Después</button>
    </span>`;
  document.body.appendChild(banner);
  document.getElementById('updateAvailableCloseBtn').onclick = ()=> banner.remove();
  document.getElementById('updateAvailableNowBtn').onclick = async (e)=>{
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Actualizando…';
    try{
      // Antes de recargar, se guarda lo pendiente (máximo 4 s de espera, por si no hay conexión).
      clearTimeout(saveTimer);
      if(firebaseOk && accessCode){
        await Promise.race([doSave(), new Promise(r=> setTimeout(r, 4000))]);
      }
    }catch(err){ try{ console.error(err); }catch(e2){} }
    location.reload();
  };
}

/* ===================== PWA: banner para instalar la app en pantalla de inicio =====================
   Discreto y de una sola vez: se muestra la primera vez que se detecta que se puede instalar
   (Android/Chrome vía "beforeinstallprompt", o iOS Safari con instrucciones manuales, que no
   dispara ese evento), y ya no vuelve a salir en cuanto se cierra o se acepta, quede o no
   instalada al final. No se muestra si la app ya se está usando instalada (modo standalone). */
(function(){
  const DISMISS_KEY = 'ob_install_banner_dismissed';
  try{ if(localStorage.getItem(DISMISS_KEY) === '1') return; }catch(e){}

  const yaInstalada = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true; // navigator.standalone: Safari/iOS
  if(yaInstalada) return;

  function dismiss(){
    try{ localStorage.setItem(DISMISS_KEY, '1'); }catch(e){}
    const b = document.getElementById('installAppBanner');
    if(b) b.remove();
  }

  function showBanner(innerHtml, onAccept){
    if(document.getElementById('installAppBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'installAppBanner';
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9998;background:var(--bg-panel-2);border-top:1px solid var(--amber);color:var(--cream);padding:10px 16px;font-family:var(--font-mono);font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;';
    banner.innerHTML = innerHtml;
    document.body.appendChild(banner);
    const closeBtn = document.getElementById('installAppCloseBtn');
    if(closeBtn) closeBtn.onclick = dismiss;
    const acceptBtn = document.getElementById('installAppAcceptBtn');
    if(acceptBtn && onAccept) acceptBtn.onclick = onAccept;
  }

  // Android / Chrome / Edge: el navegador dispara este evento cuando la web ya cumple los
  // requisitos técnicos para instalarse (manifest + service worker + servida por https).
  // Sin este listener, ningún navegador ofrece nunca instalarla por su cuenta.
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    showBanner(
      '<span>📲 Puedes instalar Operación Baeza como app en tu móvil, para abrirla directamente sin pasar por el navegador.</span>'+
      '<span style="display:flex;gap:8px;">'+
        '<button class="btn small" id="installAppAcceptBtn">Instalar</button>'+
        '<button class="btn small ghost" id="installAppCloseBtn">Ahora no</button>'+
      '</span>',
      async ()=>{
        const b = document.getElementById('installAppBanner');
        if(b) b.remove();
        deferredPrompt.prompt();
        try{ await deferredPrompt.userChoice; }catch(err){}
        deferredPrompt = null;
        // Tanto si acepta como si rechaza en el diálogo nativo, no insistimos más con el banner.
        try{ localStorage.setItem(DISMISS_KEY, '1'); }catch(e){}
      }
    );
  });

  // iOS Safari nunca dispara "beforeinstallprompt" ni permite instalar con un clic: hay que
  // guiar a mano por el menú Compartir. Se comprueba que sea Safari de verdad (no Chrome/Firefox
  // en iOS, que usan el motor de Safari por dentro pero tampoco pueden instalar así).
  const ua = navigator.userAgent || '';
  const esIOS = /iphone|ipad|ipod/i.test(ua);
  const esSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  if(esIOS && esSafari){
    showBanner(
      '<span>📲 Para instalar Operación Baeza en tu iPhone/iPad: pulsa el botón Compartir de Safari y elige «Añadir a pantalla de inicio».</span>'+
      '<button class="btn small ghost" id="installAppCloseBtn">Entendido</button>'
    );
  }
})();
