/* =========================================================
   HAPTICS & AUDIO
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
        ambientGain = audioCtx.createGain(); ambientGain.connect(audioCtx.destination); ambientGain.gain.value = 0;
        ambientOsc = audioCtx.createOscillator(); ambientOsc.type = 'sine'; ambientOsc.connect(ambientGain); ambientOsc.start();
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
   DYNAMIC BACKGROUND EFFECTS (PARALLAX STARS)
   ========================================================= */
const wCanvas = document.getElementById('weather-canvas');
const wCtx = wCanvas.getContext('2d');
let bgParticles = [];
let currentWeatherType = 'dust';

function resizeWeather() { wCanvas.width = window.innerWidth; wCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeWeather);
resizeWeather();

function updateWeather(themeKey) {
    currentWeatherType = (window.game && window.game.currentTheme) ? window.game.currentTheme.weather : 'dust';
    bgParticles = []; wRipples = [];
    
    let count = 50;
    if (currentWeatherType === 'stars' || currentWeatherType === 'void') count = 120;
    else if (currentWeatherType === 'snow' || currentWeatherType === 'bubbles') count = 75;

    for(let i = 0; i < count; i++) {
        bgParticles.push({
            x: Math.random() * wCanvas.width,
            y: Math.random() * wCanvas.height,
            z: Math.random() * 2 + 0.5, // Z-Depth for Parallax 3D effect
            size: Math.random() * 2 + 0.5,
            opacity: Math.random(),
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5
        });
    }
}

function animateWeather() {
    wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
    if (!window.game || !window.game.currentTheme) { requestAnimationFrame(animateWeather); return; }
    
    let t = Date.now() * 0.001;

    bgParticles.forEach(p => {
        if (currentWeatherType === 'stars') {
            p.y -= (0.2 / p.z); // Objects further away (high Z) move slower
            p.x -= (0.1 / p.z);
            if (p.y < 0) p.y = wCanvas.height;
            if (p.x < 0) p.x = wCanvas.width;
            p.opacity = Math.sin(t * 2 + p.x) * 0.5 + 0.5; // Twinkling effect
            wCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.8})`;
            
        } else if (currentWeatherType === 'void') {
            p.y += (1 / p.z);
            if (p.y > wCanvas.height) { p.y = 0; p.x = Math.random() * wCanvas.width; }
            wCtx.fillStyle = window.game.currentTheme.text;
            wCtx.globalAlpha = 0.5 / p.z;
            
        } else if (currentWeatherType === 'snow') {
            p.y += (1.5 / p.z); p.x += Math.sin(t + p.y * 0.01) * 0.5;
            if (p.y > wCanvas.height) { p.y = -10; p.x = Math.random() * wCanvas.width; }
            wCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            
        } else if (currentWeatherType === 'bubbles') {
            p.y -= (1 / p.z); p.x += Math.sin(t + p.y * 0.02) * 0.3;
            if (p.y < -10) { p.y = wCanvas.height + 10; p.x = Math.random() * wCanvas.width; }
            wCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            wCtx.beginPath(); wCtx.arc(p.x, p.y, p.size * 2, 0, Math.PI*2); wCtx.stroke();
            wCtx.fillStyle = 'transparent';
            
        } else { // Dust / Embers / Wind
            p.x += p.speedX; p.y += p.speedY;
            if(p.x < 0 || p.x > wCanvas.width) p.speedX *= -1;
            if(p.y < 0 || p.y > wCanvas.height) p.speedY *= -1;
            wCtx.fillStyle = window.game.currentTheme.text;
            wCtx.globalAlpha = 0.3;
        }

        if (wCtx.fillStyle !== 'transparent') {
            wCtx.beginPath(); wCtx.arc(p.x, p.y, p.size / p.z, 0, Math.PI*2); wCtx.fill();
        }
        wCtx.globalAlpha = 1.0;
    });

    // Drawing Ripples
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