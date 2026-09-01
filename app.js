// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Navegación por pestañas
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

// Alternar Modo Claro/Oscuro
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  themeToggle.textContent = isLight ? '🌙 Modo Oscuro' : '☀️ Modo Claro';
});

// Evaluación de Carrera 2000m
function calcFisicas() {
  const timeInput = document.getElementById('time-2k').value;
  const parts = timeInput.split(':');
  if (parts.length === 2) {
    const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    const resBox = document.getElementById('res-2k');
    // Criterio de corte orientativo de preparación
    if (totalSeconds <= 570) { // 9:30 min
      resBox.textContent = "✅ APTO (Marca dentro del objetivo de preparación)";
      resBox.style.color = "#40916c";
    } else {
      resBox.textContent = "⚠️ FUERA DE TIEMPO. Hay que apretar en pista.";
      resBox.style.color = "#e63946";
    }
  }
}

// Entrenador de Psicotécnicos (Patrones de resta)
let currentAnswer = 0;
function generatePsico() {
  const num1 = Math.floor(Math.random() * 50) + 20;
  const num2 = Math.floor(Math.random() * 20) + 1;
  currentAnswer = num1 - num2;
  document.getElementById('psico-question').textContent = `Fila A: [${num1}] - [${num2}] = [ ? ]`;
}

function checkPsico() {
  const val = parseInt(document.getElementById('psico-answer').value);
  const fb = document.getElementById('psico-feedback');
  if (val === currentAnswer) {
    fb.textContent = "¡Correcto! Excelente agilidad visual/numérica.";
    fb.style.color = "#40916c";
    generatePsico();
    document.getElementById('psico-answer').value = '';
  } else {
    fb.textContent = `Incorrecto. El resultado según la resta del patrón era ${currentAnswer}`;
    fb.style.color = "#e63946";
  }
}
generatePsico();

// Calculadora de Examen
function calcScore() {
  const ok = parseFloat(document.getElementById('test-ok').value) || 0;
  const fail = parseFloat(document.getElementById('test-fail').value) || 0;
  const score = ok - (fail * 0.33);
  const box = document.getElementById('test-score');
  box.textContent = `Nota Final: ${score.toFixed(2)} puntos`;
}

// Backup de datos
function exportData() {
  const data = { date: new Date(), app: "OperacionBaeza" };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'baeza_backup.json';
  a.click();
}