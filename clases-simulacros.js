/* ===================== RENDER: CLASES (visualización de clases) ===================== */
// Simple fila de 3 ticks (Vuelta 1/2/3) para marcar que la clase ya se ha visto.
// A diferencia de las "vueltas" de Temario y notas, aquí no hay modo ni nota: es un check binario.
function ensureClaseTick(cat, id){
  if(!state.clases[cat][id]) state.clases[cat][id] = [false,false,false];
  return state.clases[cat][id];
}
function buildSimpleTicksRow(arr){
  const wrap = document.createElement('div'); wrap.className='simple-ticks-row';
  arr.forEach((val,i)=>{
    const lbl = document.createElement('label'); lbl.className = 'simple-tick'+(val?' done':'');
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!val;
    cb.onchange = ()=>{
      arr[i] = cb.checked;
      lbl.classList.toggle('done', cb.checked);
      scheduleSave();
    };
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode('Vuelta '+(i+1)));
    wrap.appendChild(lbl);
  });
  return wrap;
}
function renderClasesConocimientos(){
  const host = document.getElementById('clasesConocimientosHost');
  if(!host) return;
  renderAccordionSection(host, 'clasesConocimientos', 'Clase de conocimientos (temas 1–23)', (body)=>{
    const grid = document.createElement('div'); grid.className='flat-grid';
    for(let i=1;i<=23;i++){
      const arr = ensureClaseTick('conocimientos', String(i));
      const item = document.createElement('div'); item.className='flat-item';
      item.innerHTML = `<div class="fi-head"><span class="fi-name">Tema ${i}</span></div>`;
      item.appendChild(buildSimpleTicksRow(arr));
      grid.appendChild(item);
    }
    body.appendChild(grid);
  });
}
function renderClasesIngles(){
  const host = document.getElementById('clasesInglesHost');
  if(!host) return;
  renderAccordionSection(host, 'clasesIngles', 'Clase de inglés (lesson 1–32)', (body)=>{
    const grid = document.createElement('div'); grid.className='flat-grid';
    for(let i=1;i<=INGLES_TOTAL;i++){
      const arr = ensureClaseTick('ingles', String(i));
      const item = document.createElement('div'); item.className='flat-item';
      item.innerHTML = `<div class="fi-head"><span class="fi-name">Lesson ${i}</span></div>`;
      item.appendChild(buildSimpleTicksRow(arr));
      grid.appendChild(item);
    }
    body.appendChild(grid);
  });
}
function renderClasesPsico(){
  const host = document.getElementById('clasesPsicoHost');
  if(!host) return;
  renderAccordionSection(host, 'clasesPsico', 'Clase de psicotécnicos (prueba 1–23 + control 1 y 2)', (body)=>{
    const grid = document.createElement('div'); grid.className='flat-grid';
    PSICO_ITEMS.forEach((name, idx)=>{
      const arr = ensureClaseTick('psico', String(idx));
      const item = document.createElement('div'); item.className='flat-item';
      item.innerHTML = `<div class="fi-head"><span class="fi-name">${name}</span></div>`;
      item.appendChild(buildSimpleTicksRow(arr));
      grid.appendChild(item);
    });
    body.appendChild(grid);
  });
}
function renderClasesOrtoGram(){
  const host = document.getElementById('clasesOrtoGramHost');
  if(!host) return;
  renderAccordionSection(host, 'clasesOrtoGram', 'Ortografía y gramática (clases)', (body)=>{
    const list = state.clases.ortoGram;
    const wrap = document.createElement('div');

    const addRow = document.createElement('div'); addRow.className='orto-gram-add-row';
    const nameIn = document.createElement('input'); nameIn.placeholder = 'Nombre de la clase (p. ej. "Clase 5 — Acentuación")';
    const descIn = document.createElement('input'); descIn.placeholder = '¿De qué va esta clase?';
    const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='tick-add'; addBtn.textContent='+ Añadir clase';
    addBtn.onclick = ()=>{
      if(!nameIn.value.trim()) return;
      list.push({id: Date.now()+'-'+Math.random(), nombre: nameIn.value.trim(), descripcion: descIn.value.trim(), ticks:[false,false,false]});
      nameIn.value=''; descIn.value='';
      scheduleSave();
      renderClasesOrtoGram();
    };
    addRow.appendChild(nameIn); addRow.appendChild(descIn); addRow.appendChild(addBtn);
    wrap.appendChild(addRow);

    if(!list.length){
      const empty = document.createElement('div'); empty.className='empty-state';
      empty.textContent = 'Todavía no has añadido ninguna clase de ortografía o gramática.';
      wrap.appendChild(empty);
    }

    list.forEach((entry, i)=>{
      if(!entry.ticks) entry.ticks = [false,false,false];
      const item = document.createElement('div'); item.className='orto-gram-item';

      const nameInput = document.createElement('input'); nameInput.className='fi-name-input';
      nameInput.value = entry.nombre || ''; nameInput.placeholder = 'Nombre de la clase';
      nameInput.oninput = ()=>{ entry.nombre = nameInput.value; scheduleSave(); };
      item.appendChild(nameInput);

      const descInput = document.createElement('input'); descInput.className='fi-desc-input';
      descInput.value = entry.descripcion || ''; descInput.placeholder = '¿De qué va esta clase?';
      descInput.oninput = ()=>{ entry.descripcion = descInput.value; scheduleSave(); };
      item.appendChild(descInput);

      item.appendChild(buildSimpleTicksRow(entry.ticks));

      const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.className='vuelta-del';
      delBtn.textContent = '✕ Eliminar clase'; delBtn.style.marginTop = '6px';
      delBtn.onclick = ()=>{ list.splice(i,1); scheduleSave(); renderClasesOrtoGram(); };
      item.appendChild(delBtn);

      wrap.appendChild(item);
    });

    body.appendChild(wrap);
  });
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
  const prevBtn = document.createElement('button'); prevBtn.className='icon-btn'; prevBtn.textContent='‹';
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
  const nextBtn = document.createElement('button'); nextBtn.className='icon-btn'; nextBtn.textContent='›';
  nextBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey=keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);
  bar.appendChild(controls);
  const info = document.createElement('span');
  info.style.cssText = 'font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-left:auto;';
  info.textContent = 'Estado del día sincronizado con el Calendario principal';
  bar.appendChild(info);
}
function ensureClaseCalDay(monthKey, day){
  if(!state.claseCal[monthKey]) state.claseCal[monthKey] = {};
  if(!state.claseCal[monthKey][day]) state.claseCal[monthKey][day] = {conocimientos:null, ingles:null, psico:null, orto:false, gram:false, nota:''};
  if(state.claseCal[monthKey][day].nota === undefined) state.claseCal[monthKey][day].nota = '';
  return state.claseCal[monthKey][day];
}
function renderClaseCalendar(){
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
    let any = false;
    if(entry.conocimientos){ pills.innerHTML += '<span class="cclase-pill p-con">CON · Tema '+entry.conocimientos+'</span>'; any=true; }
    if(entry.ingles){ pills.innerHTML += '<span class="cclase-pill p-ing">ING · Lesson '+entry.ingles+'</span>'; any=true; }
    if(entry.psico!=null){ pills.innerHTML += '<span class="cclase-pill p-psi">PSI · '+PSICO_ITEMS[entry.psico]+'</span>'; any=true; }
    if(entry.orto){ pills.innerHTML += '<span class="cclase-pill p-orto">ORTOGRAFÍA</span>'; any=true; }
    if(entry.gram){ pills.innerHTML += '<span class="cclase-pill p-gram">GRAMÁTICA</span>'; any=true; }
    if(entry.nota){
      const preview = entry.nota.length>28 ? entry.nota.slice(0,28)+'…' : entry.nota;
      pills.innerHTML += '<span class="cclase-pill p-nota">📝 '+preview.replace(/</g,'&lt;')+'</span>'; any=true;
    }
    if(!any){ pills.innerHTML = '<span class="cclase-empty">Sin clase</span>'; }
    cell.appendChild(pills);

    cell.onclick = ()=> openClaseDayModal(d, jsDow);
    grid.appendChild(cell);
  }
  host.appendChild(grid);
}
function openClaseDayModal(d, jsDow){
  const [y,m] = currentMonthKey.split('-').map(Number);
  document.getElementById('claseDayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  document.getElementById('claseDayModalSub').textContent = DOW[(jsDow===0?6:jsDow-1)];
  const body = document.getElementById('claseDayModalBody');
  body.innerHTML = '';
  const entry = ensureClaseCalDay(currentMonthKey, d);

  const conRow = document.createElement('div'); conRow.className='clase-select-row';
  conRow.innerHTML = '<label>Clase de conocimientos (temas 1–23)</label>';
  const conSel = document.createElement('select');
  conSel.setAttribute('aria-label','Clase de conocimientos (temas 1–23)');
  conSel.appendChild(new Option('— Ninguna —', ''));
  for(let i=1;i<=23;i++) conSel.appendChild(new Option('Tema '+i, i));
  conSel.value = entry.conocimientos ? String(entry.conocimientos) : '';
  conSel.onchange = ()=>{ entry.conocimientos = conSel.value ? Number(conSel.value) : null; scheduleSave(); renderClaseCalendar(); };
  conRow.appendChild(conSel);
  body.appendChild(conRow);

  const ingRow = document.createElement('div'); ingRow.className='clase-select-row';
  ingRow.innerHTML = '<label>Clase de inglés (lesson 1–32)</label>';
  const ingSel = document.createElement('select');
  ingSel.setAttribute('aria-label','Clase de inglés (lesson 1–32)');
  ingSel.appendChild(new Option('— Ninguna —', ''));
  for(let i=1;i<=INGLES_TOTAL;i++) ingSel.appendChild(new Option('Lesson '+i, i));
  ingSel.value = entry.ingles ? String(entry.ingles) : '';
  ingSel.onchange = ()=>{ entry.ingles = ingSel.value ? Number(ingSel.value) : null; scheduleSave(); renderClaseCalendar(); };
  ingRow.appendChild(ingSel);
  body.appendChild(ingRow);

  const psiRow = document.createElement('div'); psiRow.className='clase-select-row';
  psiRow.innerHTML = '<label>Clase de psicotécnicos (prueba 1–23 + control 1 y 2)</label>';
  const psiSel = document.createElement('select');
  psiSel.setAttribute('aria-label','Clase de psicotécnicos (prueba 1–23 + control 1 y 2)');
  psiSel.appendChild(new Option('— Ninguna —', ''));
  PSICO_ITEMS.forEach((name, idx)=> psiSel.appendChild(new Option(name, idx)));
  psiSel.value = entry.psico!=null ? String(entry.psico) : '';
  psiSel.onchange = ()=>{ entry.psico = psiSel.value!=='' ? Number(psiSel.value) : null; scheduleSave(); renderClaseCalendar(); };
  psiRow.appendChild(psiSel);
  body.appendChild(psiRow);

  const ortoLbl = document.createElement('label'); ortoLbl.className='clase-check-row';
  const ortoCb = document.createElement('input'); ortoCb.type='checkbox'; ortoCb.checked = !!entry.orto;
  ortoCb.onchange = ()=>{ entry.orto = ortoCb.checked; scheduleSave(); renderClaseCalendar(); };
  ortoLbl.appendChild(ortoCb); ortoLbl.appendChild(document.createTextNode('Clase de ortografía'));
  body.appendChild(ortoLbl);

  const gramLbl = document.createElement('label'); gramLbl.className='clase-check-row';
  const gramCb = document.createElement('input'); gramCb.type='checkbox'; gramCb.checked = !!entry.gram;
  gramCb.onchange = ()=>{ entry.gram = gramCb.checked; scheduleSave(); renderClaseCalendar(); };
  gramLbl.appendChild(gramCb); gramLbl.appendChild(document.createTextNode('Clase de gramática'));
  body.appendChild(gramLbl);

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

  document.getElementById('claseDayModal').classList.add('open');
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
  topBar.innerHTML = '<h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber);font-size:17px;letter-spacing:.03em;">Simulacros</h3>';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn';
  addBtn.textContent = '+ Añadir simulacro';
  addBtn.onclick = ()=>{
    list.push({nombre:'', conocimientos:null, ingles:null, psico:null, orto:null, gram:null, nota:''});
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
    titleWrap.appendChild(nameInput);
    head.appendChild(titleWrap);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger small';
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = ()=>{
      const label = sim.nombre ? sim.nombre : ('Simulacro '+(i+1));
      if(confirm('¿Eliminar "'+label+'"?')){
        list.splice(i,1);
        scheduleSave();
        renderSimulacrosList();
      }
    };
    head.appendChild(delBtn);
    card.appendChild(head);

    const fields = document.createElement('div'); fields.className='sim-fields';

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
      };
      paintPill();
      wrap.appendChild(inp); wrap.appendChild(pillHolder);
      f.appendChild(wrap);
      return f;
    };
    fields.appendChild(mkNotaField('Nota conocimientos','conocimientos',10));
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
      sel.onchange = ()=>{ sim[prop] = sel.value || null; scheduleSave(); };
      f.appendChild(sel);
      return f;
    };
    fields.appendChild(mkAptoField('Ortografía','orto'));
    fields.appendChild(mkAptoField('Gramática','gram'));

    card.appendChild(fields);

    const notaWrap = document.createElement('div'); notaWrap.className='sim-note-row';
    notaWrap.innerHTML = '<label>Sensaciones / notas</label>';
    const notaTa = document.createElement('textarea');
    notaTa.className = 'note-inline'; notaTa.placeholder = 'Cómo te fue, qué repasar, sensaciones del examen…';
    notaTa.value = sim.nota || '';
    notaTa.oninput = ()=>{ sim.nota = notaTa.value; scheduleSave(); };
    notaWrap.appendChild(notaTa);
    card.appendChild(notaWrap);

    host.appendChild(card);
  });
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
  const prevBtn = document.createElement('button'); prevBtn.className='icon-btn'; prevBtn.textContent='‹';
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
  const nextBtn = document.createElement('button'); nextBtn.className='icon-btn'; nextBtn.textContent='›';
  nextBtn.onclick = ()=>{ const i=keys.indexOf(currentMonthKey); if(i<keys.length-1){ currentMonthKey=keys[i+1]; renderAll(); } };
  controls.appendChild(nextBtn);
  bar.appendChild(controls);
  const info = document.createElement('span');
  info.style.cssText = 'font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-left:auto;';
  info.textContent = 'Estado del día sincronizado con el Calendario principal';
  bar.appendChild(info);
}
function renderSimCalendar(){
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
  const monthSim = state.simulacroCal[currentMonthKey] || {};

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

    const pills = document.createElement('div'); pills.className='cclase-pills';
    if(monthSim[d]){
      pills.innerHTML = '<span class="cclase-pill p-sim">SIMULACRO</span>';
    } else {
      pills.innerHTML = '<span class="cclase-empty">Sin simulacro</span>';
    }
    const simNoteTxt = state.notes[simNoteKey(currentMonthKey, d)];
    if(simNoteTxt){
      const preview = simNoteTxt.length>28 ? simNoteTxt.slice(0,28)+'…' : simNoteTxt;
      pills.innerHTML += '<span class="cclase-pill p-nota">📝 '+preview.replace(/</g,'&lt;')+'</span>';
    }
    cell.appendChild(pills);

    cell.onclick = ()=> openSimDayModal(d, jsDow);
    grid.appendChild(cell);
  }
  host.appendChild(grid);
}
function openSimDayModal(d, jsDow){
  const [y,m] = currentMonthKey.split('-').map(Number);
  document.getElementById('simDayModalTitle').textContent = d+' de '+MESES[m-1]+' '+y;
  document.getElementById('simDayModalSub').textContent = DOW[(jsDow===0?6:jsDow-1)];
  const body = document.getElementById('simDayModalBody');
  body.innerHTML = '';
  if(!state.simulacroCal[currentMonthKey]) state.simulacroCal[currentMonthKey] = {};
  const monthSim = state.simulacroCal[currentMonthKey];

  const row = document.createElement('div'); row.className='clase-select-row';
  row.innerHTML = '<label>Simulacro</label>';
  const sel = document.createElement('select');
  sel.setAttribute('aria-label','Simulacro');
  sel.appendChild(new Option('— Ninguno —',''));
  sel.appendChild(new Option('Simulacro','SIMULACRO'));
  sel.value = monthSim[d] ? 'SIMULACRO' : '';
  sel.onchange = ()=>{
    if(sel.value==='SIMULACRO') monthSim[d] = true; else delete monthSim[d];
    scheduleSave();
    renderSimCalendar();
  };
  row.appendChild(sel);
  body.appendChild(row);

  const notaRow = document.createElement('div'); notaRow.className='clase-note-row';
  notaRow.innerHTML = '<label for="simNotaTa">Notas del día</label>';
  const notaTa = buildNoteBox(simNoteKey(currentMonthKey, d), 'Sensaciones, aciertos, fallos a repasar…');
  notaTa.id = 'simNotaTa';
  notaTa.onblur = ()=> renderSimCalendar();
  notaRow.appendChild(notaTa);
  body.appendChild(notaRow);

  document.getElementById('simDayModal').classList.add('open');
}
document.getElementById('closeSimDayModal').onclick = ()=> document.getElementById('simDayModal').classList.remove('open');
document.getElementById('simDayModal').addEventListener('click', e=>{ if(e.target.id==='simDayModal') e.currentTarget.classList.remove('open'); });

