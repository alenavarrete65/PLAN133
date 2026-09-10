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
  prevBtn.className = 'icon-btn'; prevBtn.textContent = '‹';
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
  nextBtn.className = 'icon-btn'; nextBtn.textContent = '›';
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
    <span><i style="background:#8b6fae"></i>Psicotécnico</span>
    <span><i style="background:#c0672f"></i>Entreno</span>
    <span><i style="background:var(--muted)"></i>Orto-grama</span>
  `;
}

/* ===================== RENDER: CALENDARIO ===================== */
function renderCalendar(){
  if(typeof calViewMode !== 'undefined' && calViewMode === 'list') renderCalendarList();
  else renderCalendarGrid();
  renderHomeDash();
  renderArrastre();
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
/* Racha de días de estudio completados seguidos, contando hacia atrás desde hoy.
   Los días de descanso/trabajo/sin horario se saltan sin romper la racha.
   Si hoy todavía no está completo no rompe la racha (se cuenta desde ayer). */
function computeRacha(plan){
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let streak = 0, first = true, guard = 0;
  while(guard++ < 3650){
    const mk = d.getFullYear()+'-'+pad2(d.getMonth()+1);
    const monthPlan = plan[mk];
    const info = monthPlan ? monthPlan[d.getDate()] : null;
    if(!info) break;
    if(info.status === 'ESTUDIO'){
      const comp = dayCompletionInfo(info);
      const done = comp && comp.pending === 0;
      if(done) streak++;
      else if(first){ /* hoy en curso: no cuenta ni rompe */ }
      else break;
    }
    first = false;
    d.setDate(d.getDate()-1);
  }
  return streak;
}
/* Próxima fecha de examen estimada (10 de julio) y días restantes. */
function nextExamInfo(){
  const now = new Date();
  let year = now.getFullYear();
  const thisYearExam = new Date(year, 6, 10);
  if(now > thisYearExam) year++;
  const examDate = new Date(year, 6, 10);
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((examDate - today0) / 86400000);
  return {year, daysLeft};
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

  const arrastrePools = computeArrastreData();
  const arrastreTotal = arrastreItemsCount(arrastrePools);
  // Aviso: el arrastre cuenta a día vencido, así que lo de hoy todavía no está en la lista.
  const arrastreNota = (todayInfo && todayInfo.status==='ESTUDIO')
    ? '<div class="home-card-note">Lo de hoy se suma mañana, cuando el día termine.</div>'
    : '';
  const arrastreHtml = arrastreTotal
    ? '<div class="home-card-value" style="font-size:22px;">'+arrastreTotal+' tema'+(arrastreTotal!==1?'s':'')+'</div>'+
      '<div class="home-card-sub">para meter hoy en tu test de arrastre</div>'+
      arrastreNota+
      '<button class="btn small ghost" id="homeArrastreBtn" style="margin-top:8px;">Ver qué temas son →</button>'
    : '<div class="home-card-sub">Todavía no hay temas acumulados en ninguna vuelta abierta.</div>'+
      arrastreNota+
      '<button class="btn small ghost" id="homeArrastreBtn" style="margin-top:8px;">Abrir Arrastre →</button>';

  el.innerHTML =
    '<div class="home-card"><div class="home-card-label">Cuenta atrás</div>'+
      '<div class="home-card-value">'+exam.daysLeft+'</div>'+
      '<div class="home-card-sub">días para el examen (10 jul '+exam.year+')</div></div>'+
    '<div class="home-card"><div class="home-card-label">Racha de estudio</div>'+
      '<div class="home-card-value">'+racha+'</div>'+
      '<div class="home-card-sub">'+(racha===1?'día seguido completado':'días seguidos completados')+'</div></div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">Hoy</div>'+resumenHtml+'</div>'+
    '<div class="home-card home-card-wide"><div class="home-card-label">📋 Test de arrastre de hoy</div>'+arrastreHtml+'</div>';

  const arrastreBtn = document.getElementById('homeArrastreBtn');
  if(arrastreBtn) arrastreBtn.onclick = ()=>{
    const tabBtn = document.querySelector('.tab-btn[data-tab="arrastre"]');
    if(tabBtn) tabBtn.click();
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
    tasks.onclick = ()=> openDayModal(d, info);
    tasks.style.cursor = 'pointer';
    cell.appendChild(tasks);
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'off-label';
    lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    cell.appendChild(lbl);
  }
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
    item.onclick = ()=> openDayModal(d, info);
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'off-label';
    lbl.style.margin = '2px 0 0';
    lbl.textContent = info.status==='DESCANSO' ? 'Descanso' : info.status==='TRABAJO' ? 'Trabajo' : 'Sin horario';
    item.appendChild(lbl);
  }
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
function openDayModal(d, info){
  const [y,m] = currentMonthKey.split('-').map(Number);
  document.getElementById('dayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  document.getElementById('dayModalSub').textContent = DOW[(info.dow===0?6:info.dow-1)];
  const body = document.getElementById('dayModalBody');
  body.innerHTML = '';

  const dticks = info.ticks || {};
  const helpNote = document.createElement('div');
  helpNote.className = 'tick-help';
  helpNote.style.marginBottom = '12px';
  helpNote.innerHTML = '☑ Marca la casilla solo si <strong>NO</strong> has completado esa tarea (se repetirá el próximo día que toque).';
  body.appendChild(helpNote);
  const bTemas = info.temasDelDia;
  const bRow = document.createElement('div'); bRow.className='modal-row';
  bRow.innerHTML = '<div style="flex:1;"><span class="tag '+(info.bloqueTipo==='grave'?'tag-grave':'tag-mgrave')+'">BLOQUE '+info.bloque+'</span>'+
    '<span class="colorpill '+info.color+'">'+info.color+'</span><br>'+
    bTemas.map(t=>'<div style="margin-top:4px;font-size:12px;">• '+(t.clase?t.clase:t.nombre)+(t.clase?' <span style="color:var(--muted);font-family:var(--font-mono);font-size:10px;">('+t.nombre+')</span>':'')+'</div>').join('')+
    (info.unify ? '<div style="margin-top:6px;font-family:var(--font-mono);font-size:10px;color:var(--muted);">Modo repaso final: se estudia el bloque completo (azul + morado) en un solo día.</div>' :
    '<div style="margin-top:6px;font-family:var(--font-mono);font-size:10px;color:var(--muted);">El resto de temas de este bloque tocará la próxima vez que aparezca ('+(info.color==='azul'?'morado':'azul')+'). Si marcas abajo que NO lo has completado, este mismo bloque se repetirá el próximo día que toque en vez de avanzar.</div>')+
    '</div>';
  const bCb = document.createElement('input'); bCb.type='checkbox'; bCb.className='day-tick';
  bCb.checked = !!dticks.bloque; bCb.title='Marcar bloque como NO completado';
  bCb.setAttribute('aria-label', bCb.title);
  bCb.onchange = ()=>{ setDayTick(currentMonthKey, d, 'bloque', bCb.checked); renderCalendar(); };
  bRow.appendChild(bCb);
  body.appendChild(bRow);

  addModalRow(body, 'tag-leve', 'LEVE', 'Leve '+info.leveNum+' — '+(info.leveInfo.clase?info.leveInfo.clase:info.leveInfo.nombre)+(info.leveInfo.clase?' ('+info.leveInfo.nombre+')':''), {monthKey:currentMonthKey, day:d, stream:'leve', checked:dticks.leve});
  addModalRow(body, 'tag-ing', 'INGLÉS', 'Tema '+info.inglesNum+' / '+INGLES_TOTAL, {monthKey:currentMonthKey, day:d, stream:'ingles', checked:dticks.ingles});
  if(info.entreno) addModalRow(body, 'tag-entreno', 'ENTRENO', 'Día de entreno físico', {monthKey:currentMonthKey, day:d, stream:'entreno', checked:dticks.entreno});
  if(info.psico) addModalRow(body, 'tag-psico', 'PSICOTÉCNICO', info.psico, {monthKey:currentMonthKey, day:d, stream:'psico', checked:dticks.psico});
  addModalRow(body, 'tag-orto', 'ORTO-GRAMA', 'Ortografía y gramática diaria', {monthKey:currentMonthKey, day:d, stream:'orto', checked:dticks.orto});

  const notaRow = document.createElement('div'); notaRow.className='modal-row'; notaRow.style.flexDirection='column'; notaRow.style.alignItems='stretch';
  notaRow.innerHTML = '<label for="dayNotaTa" style="font-family:var(--font-mono);font-size:10px;text-transform:uppercase;color:var(--cream-dim);letter-spacing:.05em;margin-bottom:4px;display:block;">Notas del día</label>';
  const notaTa = buildNoteBox(dayNoteKey(currentMonthKey, d), 'Apuntes, dudas, pendientes de este día…');
  notaTa.id = 'dayNotaTa';
  notaTa.onblur = ()=> renderCalendar();
  notaRow.appendChild(notaTa);
  body.appendChild(notaRow);

  document.getElementById('dayModal').classList.add('open');
}
function addModalRow(body, tagClass, tag, txt, tickInfo){
  const row = document.createElement('div'); row.className='modal-row';
  row.innerHTML = '<span class="tag '+tagClass+'" style="margin-top:2px;">'+tag+'</span><span style="font-size:13px;flex:1;">'+txt+'</span>';
  if(tickInfo){
    const cb = document.createElement('input'); cb.type='checkbox'; cb.className='day-tick';
    cb.checked = !!tickInfo.checked; cb.title='Marcar como NO completado';
    cb.setAttribute('aria-label', 'Marcar "'+txt+'" como NO completado');
    cb.onchange = ()=>{ setDayTick(tickInfo.monthKey, tickInfo.day, tickInfo.stream, cb.checked); renderCalendar(); };
    row.appendChild(cb);
  }
  body.appendChild(row);
}
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
  if(v && typeof v === 'object') return v;
  return v ? {mode:'solo_lectura', nota:null} : {mode:'pendiente', nota:null};
}
function buildTicksRow(key, maxNota){
  maxNota = maxNota || 10;
  if(!state.ticks[key]) state.ticks[key] = new Array(6).fill(null).map(()=>({mode:'pendiente', nota:null}));
  state.ticks[key] = state.ticks[key].map(migrateTickEntry);
  const arr = state.ticks[key];
  const wrap = document.createElement('div'); wrap.className='ticks-row';
  arr.forEach((entry,i)=>{
    const row = document.createElement('div'); row.className='vuelta-row mode-'+entry.mode;
    const lbl = document.createElement('span'); lbl.className='vuelta-lbl'; lbl.textContent = 'Vuelta '+(i+1);
    row.appendChild(lbl);

    const sel = document.createElement('select'); sel.className='vuelta-select';
    sel.setAttribute('aria-label', 'Estado de la vuelta '+(i+1));
    VUELTA_MODES.forEach(([val,txt])=>{
      const o = document.createElement('option'); o.value=val; o.textContent=txt;
      if(entry.mode===val) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = ()=>{
      entry.mode = sel.value;
      if(entry.mode !== 'nota') entry.nota = null;
      scheduleSave();
      wrap.replaceWith(buildTicksRow(key, maxNota));
    };
    row.appendChild(sel);

    if(entry.mode === 'nota'){
      const numIn = document.createElement('input');
      numIn.type='number'; numIn.className='vuelta-nota'; numIn.step='0.1'; numIn.min='0'; numIn.max=String(maxNota);
      numIn.placeholder='Nota'; numIn.value = entry.nota==null ? '' : entry.nota;
      numIn.oninput = ()=>{
        entry.nota = numIn.value===''? null : Number(numIn.value);
        scheduleSave();
      };
      row.appendChild(numIn);
      const maxLbl = document.createElement('span');
      maxLbl.className = 'vuelta-nota-max';
      maxLbl.textContent = '/ '+maxNota;
      row.appendChild(maxLbl);
    }

    if(arr.length > 1){
      const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.className='vuelta-del';
      delBtn.textContent='✕'; delBtn.title='Eliminar esta vuelta';
      delBtn.onclick = ()=>{ arr.splice(i,1); scheduleSave(); wrap.replaceWith(buildTicksRow(key, maxNota)); };
      row.appendChild(delBtn);
    }

    wrap.appendChild(row);
  });
  const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='tick-add'; addBtn.textContent='+ Añadir vuelta';
  addBtn.onclick = (e)=>{ e.preventDefault(); arr.push({mode:'pendiente', nota:null}); scheduleSave(); wrap.replaceWith(buildTicksRow(key, maxNota)); };
  wrap.appendChild(addBtn);
  return wrap;
}
function buildNoteBox(key, placeholder){
  const ta = document.createElement('textarea');
  ta.className='note-inline'; ta.placeholder = placeholder || 'Notas de este tema…';
  ta.value = state.notes[key] || '';
  ta.oninput = ()=>{ state.notes[key] = ta.value; scheduleSave(); };
  return ta;
}

