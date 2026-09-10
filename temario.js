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
      b.temas.forEach((t,idx)=>{
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
      head.onclick = ()=>{ bbody.classList.toggle('open'); head.querySelector('.chev').textContent = bbody.classList.contains('open')?'▴':'▾'; };
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
        : '<span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">Sin tests todavía</span>';
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
  {key:'conocimientos', title:'Conocimientos', pools:['graves','mgraves','leves']},
  {key:'ingles', title:'Inglés', pools:['ingles']},
  {key:'psico', title:'Psicotécnicos', pools:['psico']}
];
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
    if(it.grupo) bits.push('<span class="grupo-txt">'+it.grupo.replace(/</g,'&lt;')+'</span>');
    if(it.color) bits.push('<span class="colorpill '+it.color+'">'+it.color+'</span>');
    return bits.length ? '<div class="arrastre-meta">'+bits.join('')+'</div>' : '';
  }

  // Fila individual, clicable, para marcar "ya repasado" (efímero, solo en memoria).
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
      '</div>';
    const toggle = ()=>{
      arrastreChecked[it.key] = !arrastreChecked[it.key];
      row.classList.toggle('done', !!arrastreChecked[it.key]);
      row.querySelector('.arrastre-check').checked = !!arrastreChecked[it.key];
      if(onToggle) onToggle();
    };
    row.addEventListener('click', (e)=>{
      if(e.target.tagName==='INPUT') return; // el propio checkbox ya dispara 'change'
      toggle();
    });
    row.querySelector('.arrastre-check').addEventListener('change', toggle);
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
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'arrastre-copy-btn';
    copyBtn.textContent = '📋 Copiar lista';
    headRow.appendChild(copyBtn);
    section.appendChild(headRow);

    const vueltaLine = document.createElement('div');
    vueltaLine.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber);margin:8px 0 8px;';
    vueltaLine.textContent = vueltaTxt;
    section.appendChild(vueltaLine);

    const sub = document.createElement('div'); sub.className='sub'; sub.style.marginBottom='10px';
    sub.textContent = group.pools.map(pk=>ARRASTRE_POOL_META[pk].sub).join(' · ');
    section.appendChild(sub);

    // Combina los temas de la vuelta actual de cada subgrupo en una sola lista.
    let items = [];
    group.pools.forEach(pk=>{
      const p = pools[pk];
      items = items.concat((p.items && p.items[p.lap]) || []);
    });

    if(!items.length){
      const empty = document.createElement('div'); empty.className='empty-state';
      empty.textContent = 'Todavía no has completado ningún tema de este grupo en la vuelta actual.';
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

