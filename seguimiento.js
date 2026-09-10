/* ===================== RENDER: PROGRESO (comparativa de notas de test) ===================== */
function collectNotaData(){
  const porGrupo = {}; // grupo -> [{key,label,notas:[..],seq:[..],max}]
  Object.keys(state.ticks).forEach(key=>{
    const meta = KEY_LABELS[key];
    if(!meta) return; // key de un tema que ya no existe en el temario actual
    const entries = (state.ticks[key]||[]).map(migrateTickEntry);
    const notas = []; // solo las vueltas con nota numérica (para media/gráfico)
    const seq = [];   // notas + "no test" + "no tiempo" + "solo lectura", en el orden real de las vueltas
    entries.forEach(e=>{
      if(e.mode==='nota' && e.nota!=null && !isNaN(e.nota)){
        notas.push(e.nota);
        seq.push({mode:'nota', nota:e.nota});
      } else if(e.mode==='no_test' || e.mode==='no_tiempo' || e.mode==='solo_lectura'){
        seq.push({mode:e.mode});
      }
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
  ctx.strokeStyle = 'rgba(236,228,211,0.14)';
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
    ctx.fillStyle = isLast ? color : 'rgba(236,228,211,0.55)';
    ctx.arc(x, y, isLast ? 2.6 : 1.7, 0, Math.PI*2);
    ctx.fill();
  });
}
function drawTrendChart(canvas, points, color){
  const parent = canvas.parentElement;
  const parentW = parent && parent.clientWidth;
  const cssW = Math.max(260, Math.min(680, parentW || (window.innerWidth - 60)));
  const cssH = 140;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW+'px';
  canvas.style.height = cssH+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const values = points.map(p=>p.value);
  const maxV = Math.max(1, ...values);
  const padL=26, padR=10, padT=10, padB=20;
  const w = cssW-padL-padR, h = cssH-padT-padB;
  const n = points.length;
  const xAt = i => n>1 ? padL + w*i/(n-1) : padL + w/2;
  const yAt = v => padT + h*(1 - v/maxV);

  // Líneas de referencia en 0 y en el máximo, con su etiqueta.
  ctx.strokeStyle = 'rgba(236,228,211,0.14)';
  ctx.lineWidth = 1;
  [0, maxV].forEach(v=>{
    const y = yAt(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL+w, y); ctx.stroke();
  });
  ctx.fillStyle = 'rgba(236,228,211,0.55)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(maxV)), padL-4, yAt(maxV));
  ctx.fillText('0', padL-4, yAt(0));

  // Relleno bajo la línea.
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xAt(i), y=yAt(p.value); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
  ctx.lineTo(xAt(n-1), yAt(0)); ctx.lineTo(xAt(0), yAt(0)); ctx.closePath();
  ctx.fillStyle = color+'26';
  ctx.fill();

  // Línea de la evolución.
  ctx.beginPath();
  points.forEach((p,i)=>{ const x=xAt(i), y=yAt(p.value); i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();

  // Punto final resaltado.
  const lastX = xAt(n-1), lastY = yAt(points[n-1].value);
  ctx.beginPath(); ctx.fillStyle = color; ctx.arc(lastX, lastY, 3, 0, Math.PI*2); ctx.fill();

  // Etiquetas de fecha: primera, del medio y última.
  ctx.fillStyle = 'rgba(236,228,211,0.55)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const labelIdxs = n>1 ? [0, Math.floor((n-1)/2), n-1] : [0];
  labelIdxs.forEach(i=>{
    const parts = points[i].date.split('-');
    ctx.fillText(parts[2]+'/'+parts[1], xAt(i), padT+h+4);
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
      verdictEl.style.cssText = 'font-family:var(--font-mono);font-size:12px;color:var(--amber);margin-top:8px;';
      verdictEl.textContent = veredicto;
      body.appendChild(verdictEl);

      drawTrendChart(canvas, trendPoints, '#c9a227');
    });
    host.appendChild(sTrend);
  }

  const data = collectNotaData();
  const grupos = Object.keys(data.porGrupo);

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
      'Psicotécnicos':'#8b6fae'
    };
    // Mismos colores que arriba pero en hex literal: el contexto 2D del <canvas> no resuelve
    // variables CSS (var(--amber)) como sí hace el resto de la app, así que para dibujar el
    // sparkline necesitamos el valor final.
    const GRUPO_HEX_COLOR = {
      'Bloques':'#c9a227',
      'Leves':'#6f9a6a',
      'Inglés':'#5c8a99',
      'Psicotécnicos':'#8b6fae'
    };
    grupos.forEach(grupo=>{
      const tagClass = grupoTagClass[grupo] || 'g-bloques';
      data.porGrupo[grupo].forEach(item=>{
        const notas = item.notas;
        const max = item.max;
        const hasNotas = notas.length>0;
        const avg = hasNotas ? notas.reduce((a,b)=>a+b,0)/notas.length : null;

        // Recorremos la secuencia real de vueltas (notas + "no test" intercalados). El delta
        // ▲/▼ de una nota se calcula contra la nota numérica anterior, saltándose los huecos
        // de "no test" que haya por en medio (igual que hacía antes, pero sin perder de vista
        // en qué vuelta cayó cada "no test").
        let lastNota = null;
        const NON_NOTA_PILL = {
          no_test:      {label:'No test',      color:'var(--muted)'},
          no_tiempo:    {label:'No tiempo',     color:'#c0672f'},
          solo_lectura: {label:'Solo lectura',  color:'#5c8a99'}
        };
        const notasHtml = item.seq.map(entry=>{
          if(entry.mode!=='nota'){
            const pillMeta = NON_NOTA_PILL[entry.mode] || {label:entry.mode, color:'var(--muted)'};
            return '<span class="nota-pill" style="background:transparent;color:'+pillMeta.color+';border:1px dashed '+pillMeta.color+';">'+pillMeta.label+'</span>';
          }
          const n = entry.nota;
          let deltaTxt = '';
          if(lastNota!=null){
            const diff = Math.round((n - lastNota)*10)/10;
            if(diff > 0) deltaTxt = ' <span style="color:var(--green);">▲+'+diff+'</span>';
            else if(diff < 0) deltaTxt = ' <span style="color:var(--red-text);">▼'+diff+'</span>';
            else deltaTxt = ' <span style="color:var(--muted);">=</span>';
          }
          lastNota = n;
          return '<span class="nota-pill '+notaPillClass(n, max)+'">'+n+'/'+max+'</span>'+deltaTxt;
        }).join(' ');

        // Tendencia general: última nota frente a la anterior (se usa como texto accesible
        // del gráfico, para quien use lector de pantalla o quiera el dato exacto).
        let tendenciaTxt = hasNotas ? 'Sin datos suficientes para ver tendencia' : 'Todavía no hay ninguna nota numérica para este tema';
        if(notas.length>1){
          const diff = Math.round((notas[notas.length-1]-notas[notas.length-2])*10)/10;
          if(diff>0) tendenciaTxt = 'Mejorando, +'+diff+' respecto a la vuelta anterior';
          else if(diff<0) tendenciaTxt = 'Empeorando, '+diff+' respecto a la vuelta anterior';
          else tendenciaTxt = 'Igual que la vuelta anterior';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="border-left:3px solid ${GRUPO_BORDER_COLOR[grupo]};"><span class="grupo-tag ${tagClass}">${grupo}</span></td><td>${item.label}</td>`+
          `<td>${notasHtml}</td>`+
          `<td>${hasNotas ? '<span class="nota-pill '+notaPillClass(avg, max)+'">'+avg.toFixed(1)+'/'+max+'</span>' : '<span style="color:var(--muted);font-size:11px;">— sin notas —</span>'}</td>`+
          `<td></td>`;
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
          sparkTd.innerHTML = '<span style="color:var(--muted);font-size:11px;">— hace falta otra vuelta —</span>';
        } else {
          sparkTd.innerHTML = '<span style="color:var(--muted);font-size:11px;">— sin notas —</span>';
        }
        tbody.appendChild(tr);
      });
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
}
const progresoOpen = {detalleTema:false, tendenciaArrastre:true};
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
/* Guarda (o actualiza si ya hay una entrada de hoy) un punto en el historial de una prueba física. */
function registrarMarcaHistorial(pruebaId, raw){
  if(raw==='') return;
  if(!state.marcasHistory) state.marcasHistory = {};
  if(!state.marcasHistory[pruebaId]) state.marcasHistory[pruebaId] = [];
  const hist = state.marcasHistory[pruebaId];
  const today = todayISO();
  const todayEntry = hist.find(h=>h.date===today);
  if(todayEntry) todayEntry.valor = raw;
  else hist.push({date:today, valor:raw});
  scheduleSave();
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
  topBar.innerHTML = '<h3 style="margin:0 0 4px;font-family:var(--font-display);text-transform:uppercase;color:var(--amber);font-size:17px;letter-spacing:.03em;">Marcas físicas mínimas</h3>'
    + '<div class="sub" style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">Apunta tu mejor marca en cada prueba para ver si ya cumples el mínimo de la oposición.</div>';
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
function renderEntrenos(){
  const host = document.getElementById('entrenosHost');
  if(!host) return;
  host.innerHTML = '';
  const topBar = document.createElement('div');
  topBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
  topBar.innerHTML = '<h3 style="margin:0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber);font-size:17px;letter-spacing:.03em;">Entrenos físicos</h3>';
  const addBtn = document.createElement('button'); addBtn.className='btn small'; addBtn.textContent='+ Añadir entreno';
  addBtn.onclick = ()=>{
    state.entrenosLog.unshift({id:Date.now(), date:todayISO(), tipo:'', notas:''});
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

  const logTitle = document.createElement('h3');
  logTitle.style.cssText = "margin:22px 0 0;font-family:var(--font-display);text-transform:uppercase;color:var(--amber);font-size:15px;letter-spacing:.03em;";
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
    dateIn.onchange = ()=>{ item.date = dateIn.value; scheduleSave(); renderEntrenos(); };
    row.appendChild(dateIn);
    const tipoIn = document.createElement('input'); tipoIn.type='text'; tipoIn.className='entreno-tipo';
    tipoIn.placeholder='Tipo de entreno (ej. Piernas, Carrera 5km, Circuito...)'; tipoIn.value = item.tipo||'';
    tipoIn.oninput = ()=>{ item.tipo = tipoIn.value; scheduleSave(); };
    row.appendChild(tipoIn);
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
  h.style.cssText = "font-family:var(--font-display);text-transform:uppercase;color:var(--amber);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:8px;font-size:17px;letter-spacing:.03em;";
  return h;
}
function cicloIntro(text){
  const p = document.createElement('p');
  p.style.cssText = "font-family:var(--font-mono);font-size:12px;color:var(--cream-dim);line-height:1.6;max-width:680px;margin:0 0 18px;";
  p.textContent = text;
  return p;
}
function simpleGapsBody(datesMs){
  if(datesMs.length < 2){
    return '<div class="ciclo-empty">Todavía sin datos suficientes (hacen falta al menos 2 apariciones en tu calendario guardado).</div>';
  }
  const gaps = [];
  for(let i=1;i<datesMs.length;i++){
    gaps.push(Math.round((datesMs[i]-datesMs[i-1])/86400000));
  }
  const avg = gaps.reduce((a,b)=>a+b,0) / gaps.length;
  let html = '<div class="ciclo-line">Media real: <strong>'+avg.toFixed(1)+' días</strong> · '+datesMs.length+' apariciones registradas</div>';
  html += '<div class="ciclo-gaps">' + gaps.map((g,i)=>'<div>Vuelta '+(i+1)+' → Vuelta '+(i+2)+': <strong>'+g+' días</strong></div>').join('') + '</div>';
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
    body.appendChild(cicloIntro('Una "vuelta completa" no es ver los dos colores de este bloque en concreto, sino dar la vuelta a toda su familia de bloques (graves 1-5 o menos graves 6-12): empezando en este bloque en azul, pasando por el resto de la familia en azul, luego toda la familia en morado, hasta volver a tocar este mismo bloque otra vez en azul. Los días se cuentan desde tu calendario real (con tus descansos y días de trabajo ya metidos): cada "Vuelta N → Vuelta N+1" es el tiempo desde que este bloque se tocó en azul hasta que se vuelve a tocar en azul (equivale a lo que muestra el desglose "Azul" de abajo). Debajo se muestra, por separado y por color, cuánto tarda en volver a tocar exactamente el mismo color de ese bloque (p.ej. bloque 7 azul → próxima vez bloque 7 azul).'));

    const blockAppearances = {};
    for(let b=1;b<=12;b++) blockAppearances[b]=[];
    studyDays.forEach(({dateMs,e})=>{
      const arr = blockAppearances[e.bloque];
      // Colapsamos días consecutivos con el mismo color (repetidos por no completarse):
      // solo cuenta la fecha en la que realmente cambia de color, es decir, cuando se
      // completa esa vuelta.
      if(arr.length === 0 || arr[arr.length-1].color !== e.color){
        arr.push({dateMs, color:e.color});
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
        return unificados.map(a=>({completeMs:a.dateMs}));
      }
      // Anclamos en azul (el color con el que arranca cada bloque); si un bloque no
      // tuviera azul, usamos el único color que tenga.
      const anchorColor = arr.some(a=>a.color==='azul') ? 'azul' : 'morado';
      return arr.filter(a=>a.color===anchorColor).map(a=>({completeMs:a.dateMs}));
    }

    const blockGrid = document.createElement('div');
    blockGrid.className = 'ciclo-grid';
    Object.keys(BLOCKS).map(Number).sort((a,b)=>a-b).forEach(num=>{
      const graves = BLOCKS[num].graves;
      const arr = blockAppearances[num];
      const cycles = buildFullCycles(arr);
      let bodyHtml;
      if(cycles.length < 2){
        bodyHtml = '<div class="ciclo-empty">Todavía sin datos suficientes (hacen falta al menos 2 vueltas completas de este bloque en tu calendario guardado, es decir, 2 veces que este bloque se toque en azul).</div>';
      } else {
        const gaps = [];
        for(let i=1;i<cycles.length;i++){
          gaps.push(Math.round((cycles[i].completeMs - cycles[i-1].completeMs)/86400000));
        }
        const avg = gaps.reduce((a,b)=>a+b,0) / gaps.length;
        let html = '<div class="ciclo-line">Media real: <strong>'+avg.toFixed(1)+' días</strong> · '+cycles.length+' vueltas completas registradas</div>';
        html += '<div class="ciclo-gaps">' + gaps.map((g,i)=>'<div>Vuelta '+(i+1)+' → Vuelta '+(i+2)+': <strong>'+g+' días</strong></div>').join('') + '</div>';

        // Desglose por color: cuánto tarda en volver a tocar el MISMO color de este bloque
        // (p.ej. bloque 7 azul -> próxima vez bloque 7 azul), no solo la vuelta completa azul+morado.
        const COLOR_LABEL = {azul:'Azul', morado:'Morado', unificado:'Unificado'};
        let colorHtml = '';
        ['azul','morado','unificado'].forEach(col=>{
          const list = arr.filter(a=>a.color===col);
          if(list.length < 2) return;
          const cgaps = [];
          for(let i=1;i<list.length;i++){
            cgaps.push(Math.round((list[i].dateMs - list[i-1].dateMs)/86400000));
          }
          const cavg = cgaps.reduce((a,b)=>a+b,0) / cgaps.length;
          const lbl = COLOR_LABEL[col];
          colorHtml += '<div class="ciclo-color-block">'+
            '<div class="ciclo-color-title"><span class="colorpill '+col+'">'+col+'</span> media hasta volver a tocar '+lbl.toLowerCase()+': <strong>'+cavg.toFixed(1)+' días</strong></div>'+
            '<div class="ciclo-gaps">' + cgaps.map((g,i)=>'<div>'+lbl+' '+(i+1)+' → '+lbl+' '+(i+2)+': <strong>'+g+' días</strong></div>').join('') + '</div>'+
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
    body.appendChild(cicloIntro('Cada leve entra todos los días de estudio, así que una "vuelta" es simplemente el tiempo que tarda en volver a tocar ese mismo leve (ciclo de 17). Si un día no lo das por completado, ese mismo leve se repite al día siguiente de estudio y esa repetición no cuenta como una vuelta nueva.'));

    const leveAppearances = LEVES.map(()=>[]);
    let lastLeveNum = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.leveNum !== lastLeveNum){
        leveAppearances[e.leveNum-1].push(dateMs);
      }
      lastLeveNum = e.leveNum;
    });

    const leveGrid = document.createElement('div');
    leveGrid.className = 'ciclo-grid';
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
    body.appendChild(cicloIntro('Igual que con los leves: el inglés entra cada día de estudio, así que la vuelta mide cuánto tarda en volver a tocar exactamente el mismo tema (ciclo de 32).'));

    const inglesAppearances = Array.from({length:INGLES_TOTAL}, ()=>[]);
    let lastInglesNum = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.inglesNum !== lastInglesNum){
        inglesAppearances[e.inglesNum-1].push(dateMs);
      }
      lastInglesNum = e.inglesNum;
    });

    const inglesGrid = document.createElement('div');
    inglesGrid.className = 'ciclo-grid';
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
    body.appendChild(cicloIntro('Los psicotécnicos solo entran lunes y miércoles de estudio (cuando no hay entreno), así que la vuelta se mide contando solo esos días, no el calendario completo (ciclo de 23 pruebas + 2 controles).'));

    const psicoAppearances = PSICO_ITEMS.map(()=>[]);
    let lastPsicoIdx = null;
    studyDays.forEach(({dateMs,e})=>{
      if(e.psicoIdx === undefined) return;
      if(e.psicoIdx !== lastPsicoIdx){
        psicoAppearances[e.psicoIdx].push(dateMs);
      }
      lastPsicoIdx = e.psicoIdx;
    });

    const psicoGrid = document.createElement('div');
    psicoGrid.className = 'ciclo-grid';
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
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--amber);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Sincronización</div>
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
  state = { months:{}, notes:{}, ticks:{}, dayTicks:{}, ortoTests:{ortografia:[], gramatica:[]}, entrenosLog:[], marcas:{}, marcasHistory:{}, settings:{unifyFromDate:null, pinHash:keepPin}, clases:{conocimientos:{}, ingles:{}, psico:{}, ortoGram:[]}, claseCal:{}, simulacros:[], simulacroCal:{} };
  currentMonthKey = null;
  invalidatePlan();
  scheduleSave();
  renderAll();
  showToast('Datos borrados');
};

