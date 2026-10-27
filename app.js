/* ==========================================================================
   SABIAPP INTERACTIVE ENGINE
   Gestión de estados, Audio Sintetizado WebAudio, Confetti y Accesibilidad
   ========================================================================== */

let currentScreen = 1;
let recordingTimer = null;
let recordingSeconds = 0;
let isRecording = false;
let audioCtx = null;

// Inicializador de AudioContext (se activa al primer toque de usuario)
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generador de sonidos amigables y accesibles con Web Audio API
function playSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      // Clic suave y cálido
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'record-start') {
      // Tono de inicio de grabación (estilo WhatsApp)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'send-msg') {
      // Sonido de 'pop' de mensaje enviado
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'victory') {
      // Fanfarria melódica alegre de recompensa
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do alto
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        
        const noteStart = now + (idx * 0.11);
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, noteStart);
        noteGain.gain.setValueAtTime(0.18, noteStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);
        noteOsc.start(noteStart);
        noteOsc.stop(noteStart + 0.35);
      });
    }
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

// Cambio de pantalla activo
function switchScreen(screenNum) {
  playSound('click');
  currentScreen = screenNum;

  // Actualizar visibilidad de pantallas
  document.querySelectorAll('.app-screen').forEach((screen, index) => {
    if (index + 1 === screenNum) {
      screen.classList.add('active');
    } else {
      screen.classList.remove('active');
    }
  });

  // Actualizar botones de pestaña superiores
  document.querySelectorAll('.tab-btn').forEach((btn, index) => {
    if (index + 1 === screenNum) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Si pasa a pantalla de recompensa, disparar confeti
  if (screenNum === 3) {
    playSound('victory');
    launchConfetti();
  }
}

// Asistente de Voz / Narrador Accesible (Web Speech API)
function readAloudTask() {
  playSound('click');
  const taskText = "Atención Carmen. Lucas te pregunta cómo estás. Mantén pulsado el botón verde grande que dice Grabar para responderle con tu voz.";
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(taskText);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9; // Hablar a ritmo pausado para adultos mayores
    window.speechSynthesis.speak(utterance);
    showToast("🔊 Leyendo instrucción en voz alta...");
  } else {
    showToast("Instrucción: " + taskText);
  }
}

// Simulación de Grabación de Audio
function startAudioRecording() {
  if (isRecording) return;
  isRecording = true;
  recordingSeconds = 0;
  
  playSound('record-start');
  const micBtn = document.getElementById('btnMic');
  const recordingBar = document.getElementById('recordingBar');
  const recTimer = document.getElementById('recTimer');
  
  micBtn.classList.add('recording');
  recordingBar.classList.add('active');
  recTimer.innerText = "Grabando... 0:01";
  
  recordingTimer = setInterval(() => {
    recordingSeconds++;
    const formatted = `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}`;
    recTimer.innerText = `Grabando audio... ${formatted}`;
  }, 1000);
}

function stopAudioRecording() {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(recordingTimer);
  
  const micBtn = document.getElementById('btnMic');
  const recordingBar = document.getElementById('recordingBar');
  
  micBtn.classList.remove('recording');
  recordingBar.classList.remove('active');
  
  // Agregar burbuja de mensaje de voz enviado
  const durationText = recordingSeconds > 0 ? `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}` : '0:03';
  addUserVoiceNote(durationText);
}

function addUserVoiceNote(duration) {
  playSound('send-msg');
  const container = document.getElementById('userResponseContainer');
  
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

  const bubbleHtml = `
    <div class="chat-bubble sent" style="animation: fadeIn 0.3s ease;">
      <div class="audio-player-sim">
        <button class="btn-play-audio" onclick="playVoiceSample()" title="Reproducir audio grabado">▶</button>
        <div class="audio-waveform">
          <div class="wave-bar" style="height: 12px;"></div>
          <div class="wave-bar" style="height: 20px;"></div>
          <div class="wave-bar" style="height: 16px;"></div>
          <div class="wave-bar" style="height: 24px;"></div>
          <div class="wave-bar" style="height: 14px;"></div>
          <div class="wave-bar" style="height: 22px;"></div>
          <div class="wave-bar" style="height: 18px;"></div>
        </div>
        <span class="wave-time">${duration}</span>
      </div>
      <div class="bubble-meta">
        <span class="bubble-time">${timeStr}</span>
        <span class="bubble-checks">✓✓</span>
      </div>
    </div>
  `;
  
  container.innerHTML = bubbleHtml;

  // Scroll suave al último mensaje
  const chatArea = document.getElementById('chatMessages');
  chatArea.scrollTop = chatArea.scrollHeight;

  showToast("¡Genial! Mensaje enviado. Evaluando lección...");

  // Transición a pantalla de recompensa tras 1.5s
  setTimeout(() => {
    switchScreen(3);
  }, 1600);
}

function playVoiceSample() {
  playSound('click');
  showToast("▶ Reproduciendo nota de voz de Carmen: '¡Hola Lucas, todo muy bien corazón!'");
}

function triggerKeyboardSim() {
  playSound('click');
  showToast("💡 En este ejercicio estamos practicando Notas de Voz con el micrófono grande 🎤");
}

function simulateSendText() {
  playSound('click');
  showToast("¡Prueba manteniendo pulsado el botón verde de GRABAR para enviar una nota de voz!");
}

// Toast Notifier
function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}

// Modales y Paneles
function toggleSpecPanel() {
  playSound('click');
  const panel = document.getElementById('uxSpecPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'flex';
  } else {
    panel.style.display = panel.style.display === '' ? 'none' : '';
  }
}

function openFigmaModal() {
  playSound('click');
  document.getElementById('figmaModal').classList.add('active');
}

function closeFigmaModal() {
  playSound('click');
  document.getElementById('figmaModal').classList.remove('active');
}

function copyFigmaSpecs() {
  const specs = `SABIAAPP FIGMA DESIGN SPECS:
- Ratio de Contraste: WCAG AAA 7:1
- Primario: #166534 (Verde Esmeralda Accesible)
- Secundario WhatsApp: #1EBE5D
- Fondo Superficie: #F9FAFB
- Tamaño Mínimo de Botones: 56x56dp a 72x64dp (Micrófono)
- Tipografía: Inter / Lexend (18sp cuerpo, 26sp títulos)
- Espaciado de separación mínimo entre botones: 16-24dp`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(specs).then(() => {
      showToast("¡Especificaciones copiadas al portapapeles para Figma!");
    });
  } else {
    showToast("Especificaciones listas en la consola.");
  }
}

// Motor de Confetti Canvas
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  const particles = [];
  const colors = ['#166534', '#1ebe5d', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
  
  for (let i = 0; i < 75; i++) {
    particles.push({
      x: canvas.width * 0.5,
      y: canvas.height * 0.35,
      w: Math.random() * 10 + 6,
      h: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      gravity: 0.38,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }
  
  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.008;
      
      if (p.opacity > 0 && p.y < canvas.height) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });
    
    frame++;
    if (alive && frame < 180) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  animate();
}

// Inicialización de accesibilidad y eventos al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
  console.log("SabiApp Prototype Loaded Successfully.");
});
