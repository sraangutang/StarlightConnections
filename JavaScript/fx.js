/* =========================================================
   HAPTICS & ASMR AUDIO
   ========================================================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
let noteIndex = 0; 

function vibratePhone(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch(e) {} }
}

let wRipples = [];
window.addEventListener('pointerdown', (e) => {
    if (window.ui && window.ui.gameContainer.style.display === 'flex') {
        if (document.body.classList.contains('theme-supernova') || document.body.classList.contains('theme-aurora') || document.body.classList.contains('theme-riverbed')) {
            wRipples.push({x: e.clientX, y: e.clientY, radius: 0, alpha: 1.0});
        }
    }
}, { capture: true });

let ambientOsc = null; let ambientGain = null;
function updateDynamicMusic(fillPct) {
    if (state.sfxVolume <= 0 || audioCtx.state === 'suspended') return;
    if (!ambientOsc) {
        ambientGain = audioCtx.createGain();
        ambientGain.connect(audioCtx.destination);
        ambientGain.gain.value = 0;
        ambientOsc = audioCtx.createOscillator();
        ambientOsc.type = 'sine';
        ambientOsc.connect(ambientGain);
        ambientOsc.start();
    }
    ambientGain.gain.setTargetAtTime((fillPct / 100) * 0.15 * state.sfxVolume, audioCtx.currentTime, 0.5);
    ambientOsc.frequency.setTargetAtTime(130.81 + (fillPct * 1.5), audioCtx.currentTime, 0.5);
}

function stopDynamicMusic() { if (ambientGain) ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5); }

function playSound(type, streak = 0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (state.sfxVolume <= 0 || isNaN(state.sfxVolume)) return;

    const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime; let baseVol = state.sfxVolume; 
    
    if (type === 'plop') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(300 + Math.random()*50, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gainNode.gain.setValueAtTime(0.15 * baseVol, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'snap') { 
        osc.type = 'triangle'; 
        let freq = PENTATONIC[noteIndex % PENTATONIC.length]; noteIndex++;
        osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
        gainNode.gain.setValueAtTime(0.4 * baseVol, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'win') { 
        [0, 2, 4].forEach((noteOffset, i) => {
            let winOsc = audioCtx.createOscillator(); let winGain = audioCtx.createGain();
            winOsc.connect(winGain); winGain.connect(audioCtx.destination); winOsc.type = 'sine';
            winOsc.frequency.setValueAtTime(PENTATONIC[noteOffset], now + (i*0.1)); 
            winGain.gain.setValueAtTime(0.3 * baseVol, now + (i*0.1)); winGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5); 
            winOsc.start(now + (i*0.1)); winOsc.stop(now + 1.5);
        });
        noteIndex = 0; 
    }
}

/* =========================================================
   DYNAMIC WEATHER ENGINE
   ========================================================= */
const wCanvas = document.getElementById('weather-canvas');
const wCtx = wCanvas.getContext('2d');
let wParticles = [];
let currentWeatherType = 'dust';

function resizeWeather() { wCanvas.width = window.innerWidth; wCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeWeather);
resizeWeather();

function updateWeather(themeKey) {
    currentWeatherType = THEMES[themeKey]?.weather || 'dust';
    wParticles = []; wRipples = [];
    for(let i = 0; i < 40; i++) wParticles.push({ x: Math.random() * wCanvas.width, y: Math.random() * wCanvas.height, vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1, size: Math.random() * 3 + 1, life: Math.random(), speed: Math.random() * 0.02 + 0.005 });
}

function animateWeather() {
    wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
    if (!window.game || !window.game.currentTheme) { requestAnimationFrame(animateWeather); return; }
    wCtx.fillStyle = window.game.currentTheme.text || '#fff';
    
    for (let i = wRipples.length - 1; i >= 0; i--) {
        let r = wRipples[i];
        r.radius += 1.5; r.alpha -= 0.015;
        if (r.alpha <= 0) { wRipples.splice(i, 1); continue; }
        wCtx.beginPath(); wCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        wCtx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.4})`;
        wCtx.lineWidth = 2; wCtx.stroke();
    }
    requestAnimationFrame(animateWeather);
}
animateWeather();

/* =========================================================
   PARTICLE ENGINE
   ========================================================= */
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');
let particles = [];

function spawnSplash(x, y, color, isConfetti = false) {
    let count = isConfetti ? 11 : (state.inkStyle === 'stardust' ? 15 : 8); 
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * (isConfetti ? 10 : 8), 
            vy: isConfetti ? (Math.random() * -8) - 2 : (Math.random() - 0.5) * 8, 
            life: 1.0, decay: isConfetti ? Math.random() * 0.003 + 0.002 : Math.random() * 0.02 + 0.01, 
            color: state.inkStyle === 'neon' ? '#fff' : color, glow: color,
            size: isConfetti ? Math.random() * 6 + 4 : Math.random() * 4 + 2, isConfetti: isConfetti
        });
    }
}

function animateFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        if (p.isConfetti) {
            p.vy += 0.12; p.vx *= 0.98;
            p.x += p.vx; p.y += p.vy;
            if (p.y >= fxCanvas.height - p.size) { p.y = fxCanvas.height - p.size; p.vy *= -0.3; p.vx *= 0.8; }
        } else { p.x += p.vx; p.y += p.vy; }
        
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        
        fxCtx.beginPath();
        if(state.inkStyle === 'stardust' || p.glow) { fxCtx.arc(p.x, p.y, p.size * p.life * 0.5, 0, Math.PI * 2); fxCtx.shadowBlur = 10; fxCtx.shadowColor = p.glow; } 
        else { fxCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); fxCtx.shadowBlur = 0; }
        fxCtx.fillStyle = p.color; fxCtx.globalAlpha = p.life; fxCtx.fill();
    }
    fxCtx.globalAlpha = 1.0; fxCtx.shadowBlur = 0; requestAnimationFrame(animateFx);
}
animateFx();