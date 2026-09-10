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

/* ===================== VISTA CALENDARIO: rejilla / lista ===================== */
let calViewMode = 'grid';
try{
  calViewMode = localStorage.getItem('calViewMode') || (window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid');
}catch(e){
  calViewMode = window.matchMedia('(max-width:640px)').matches ? 'list' : 'grid';
}
function syncViewToggleButtons(){
  document.querySelectorAll('.view-toggle-btn').forEach(b=> b.classList.toggle('active', b.dataset.view===calViewMode));
}
function setCalViewMode(mode){
  calViewMode = mode;
  try{ localStorage.setItem('calViewMode', mode); }catch(e){}
  syncViewToggleButtons();
  renderCalendar();
}
document.querySelectorAll('.view-toggle-btn').forEach(btn=>{
  btn.onclick = ()=> setCalViewMode(btn.dataset.view);
});
syncViewToggleButtons();

/* ===================== EXPORTAR CALENDARIO (imagen / PDF) ===================== */
function calendarExportBaseName(){
  // Usa el mes visible (p.ej. "2026-09") si existe, o la fecha de hoy como respaldo.
  let etiqueta = 'calendario';
  try{
    if (currentMonthKey && /^\d{4}-\d{2}$/.test(currentMonthKey)) {
      const [y, m] = currentMonthKey.split('-').map(Number);
      const nombreMes = (MESES[m - 1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      etiqueta = `${nombreMes || 'mes'}-${y}`;
    } else {
      const hoy = new Date();
      etiqueta = hoy.toISOString().slice(0, 10);
    }
  }catch(e){ /* usamos el valor por defecto */ }
  return `operacion-baeza-${etiqueta}`;
}

async function capturarCalendarioComoCanvas(){
  const host = document.getElementById('calendarHost');
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

function toggleExportButtonsDisabled(disabled){
  ['exportCalImageBtn', 'exportCalPdfBtn'].forEach(id=>{
    const b = document.getElementById(id);
    if (b) b.disabled = disabled;
  });
}

async function exportarCalendarioComoImagen(){
  if (typeof html2canvas === 'undefined') {
    showToast('No se pudo cargar la herramienta de exportación. Revisa tu conexión.');
    return;
  }
  toggleExportButtonsDisabled(true);
  try{
    const canvas = await capturarCalendarioComoCanvas();
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = calendarExportBaseName() + '.png';
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Imagen exportada ✓');
  }catch(err){
    console.error(err);
    showToast('No se pudo exportar la imagen.');
  }finally{
    toggleExportButtonsDisabled(false);
  }
}

async function exportarCalendarioComoPDF(){
  if (typeof html2canvas === 'undefined' || !window.jspdf) {
    showToast('No se pudo cargar la herramienta de exportación. Revisa tu conexión.');
    return;
  }
  toggleExportButtonsDisabled(true);
  try{
    const canvas = await capturarCalendarioComoCanvas();
    if (!canvas) return;
    const { jsPDF } = window.jspdf;
    const orientacion = canvas.width >= canvas.height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation: orientacion, unit: 'pt', format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(calendarExportBaseName() + '.pdf');
    showToast('PDF exportado ✓');
  }catch(err){
    console.error(err);
    showToast('No se pudo exportar el PDF.');
  }finally{
    toggleExportButtonsDisabled(false);
  }
}

document.getElementById('exportCalImageBtn').addEventListener('click', exportarCalendarioComoImagen);
document.getElementById('exportCalPdfBtn').addEventListener('click', exportarCalendarioComoPDF);


/* ===================== INIT ===================== */
function renderAll(){
  renderMonthBar();
  renderLegend();
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
  renderClasesCalMonthBar();
  renderClaseCalendar();
  renderSimulacrosList();
  renderSimCalMonthBar();
  renderSimCalendar();
  renderCiclo();
  renderProgreso();
  renderMarcas();
  renderEntrenos();
  renderAjustes();
  renderSyncBox();
  renderAccountBox();
  if(isAdmin) renderAdminBox();
  renderSecurity();
  renderThemeBox();
  renderBackupBox();
  renderHistoryBox();
}
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
  banner.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:var(--amber);color:#1b2b1f;padding:10px 16px;font-family:var(--font-mono);font-size:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;';
  // Puramente informativo: no hay botón de "recargar ahora" que empuje a actuar.
  // La próxima vez que se recargue la página (por el motivo que sea) se cargará sola
  // la versión nueva; este aviso solo lo indica, con un botón para cerrarlo si molesta.
  banner.innerHTML = `
    <span>Hay una versión nueva de la app disponible. Se aplicará sola la próxima vez que recargues la página.</span>
    <button class="btn small" id="updateAvailableCloseBtn" style="background:#1b2b1f;color:var(--amber);">Cerrar</button>`;
  document.body.appendChild(banner);
  document.getElementById('updateAvailableCloseBtn').onclick = ()=> banner.remove();
}
