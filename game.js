/* =========================================================
   SECURE PROFILE & STATE MANAGEMENT
   ========================================================= */
let currentUser = localStorage.getItem('sc_currentUser') || null;

function getKey(key) { return `${currentUser}_${key}`; }

const defaultState = {
    sfxVolume: 1.0, inkStyle: 'watercolor', themeOverride: 'auto',
    stardust: 0, telescopes: 3, 
    inventory: { ink_watercolor: true, theme_fundamentals: true },
    stars: {}, pendingGlow: false,
    uiMode: 'light' // default UI mode
};

let state = { ...defaultState };
let maxUnlocked = 0;
let lastPlayedLevel = -1;
let currentMistakes = 0;

/* =========================================================
   FIREBASE BACKEND DATABASE SYSTEM
   ========================================================= */
// 1. PASTE YOUR CONFIG HERE (From the Firebase Console)
 firebaseConfig = {
    apiKey: "AIzaSyDz2zxc68JS6tHG_hkvWoMAKid_ulVsUI0", 
    authDomain: "starlight-connections.firebaseapp.com", 
    projectId: "starlight-connections", 
    storageBucket: "starlight-connections.firebasestorage.app", 
    messagingSenderId: "100102338562", 
    appId: "1:100102338562:web:6f3569882c628b44614f1b"
};

// 2. Initialize the Server Connection
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 3. The Cloud Save Function
function saveToCloud() {
    // Only save to the cloud if a user is actively logged in
    if (auth.currentUser) {
        db.collection("users").doc(auth.currentUser.uid).set({
            state: state,
            maxUnlocked: maxUnlocked,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("✅ Game saved to the cloud!");
        }).catch((error) => {
            console.error("🚨 Cloud save failed:", error);
        });
    }
}

// 4. The Cloud Load Function
function loadFromCloud(uid) {
    db.collection("users").doc(uid).get().then((doc) => {
        if (doc.exists) {
            let cloudData = doc.data();
            state = { ...defaultState, ...cloudData.state };
            maxUnlocked = cloudData.maxUnlocked || 1;
            console.log("☁️ Cloud save loaded successfully!");
            
            // Sync it to local storage just in case they go offline
            localStorage.setItem(getKey('save'), JSON.stringify(state));
            
            // Refresh the UI if necessary
            if (window.ui && typeof window.ui.showMainMenu === 'function') {
                window.ui.showMainMenu();
            }
        } else {
            console.log("New account detected. Creating fresh cloud save.");
            saveToCloud(); // Create their first cloud document
        }
    }).catch((error) => {
        console.error("🚨 Error loading cloud save:", error);
    });
}

// 5. Authentication Setup (Listen for logins/logouts & Update UI)
auth.onAuthStateChanged((user) => {
    const loggedOutUI = document.getElementById('logged-out-ui');
    const loggedInUI = document.getElementById('logged-in-ui');
    const emailDisplay = document.getElementById('user-email-display');

    if (user) {
        console.log("User is logged in:", user.email);
        
        // Hide login boxes, show logout button
        if (loggedOutUI) loggedOutUI.style.display = 'none';
        if (loggedInUI) loggedInUI.style.display = 'block';
        if (emailDisplay) emailDisplay.innerText = user.email;

        // Load their save data
        loadFromCloud(user.uid);
    } else {
        console.log("No user logged in. Playing on LocalStorage only.");
        
        // Show login boxes, hide logout button
        if (loggedOutUI) loggedOutUI.style.display = 'block';
        if (loggedInUI) loggedInUI.style.display = 'none';
    }
});

/* =========================================================
   ACCOUNT UI FUNCTIONS (Attach these to your HTML buttons!)
   ========================================================= */
window.createAccount = function(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Account created successfully! Game is now synced to the cloud.");
            saveToCloud(); // Instantly push their current local progress to their new cloud account
        })
        .catch((error) => alert("Error: " + error.message));
};

window.loginAccount = function(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Welcome back! Loading cloud save...");
            // onAuthStateChanged will automatically trigger loadFromCloud()
        })
        .catch((error) => alert("Error: " + error.message));
};

window.logoutAccount = function() {
    auth.signOut().then(() => {
        alert("Logged out securely.");
        // Reset the game to default state so they don't play on the old account's local save
        state = { ...defaultState };
        maxUnlocked = 1;
        saveState();
        window.location.reload();
    });
};

function loadState() {
    try {
        // Grab local save data
        let saved = localStorage.getItem(getKey('save'));
        if (saved) {
            let parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
            maxUnlocked = state.maxUnlocked || 1;
        }
    } catch (e) { 
        console.error("Save corrupted, using defaults."); 
    }
    
    // Apply Dark Mode safely
    state.uiMode = localStorage.getItem(getKey('uimode')) || 'light';
    document.body.classList.toggle('dark-mode-ui', state.uiMode === 'dark');

    // That's it! No more old HTML UI updates here.
}

function saveState() {
    // 1. Save locally (for speed and offline play)
    state.maxUnlocked = maxUnlocked;
    localStorage.setItem(getKey('save'), JSON.stringify(state));
    localStorage.setItem(getKey('uimode'), state.uiMode);
    
    // 2. Upload to the database (for cross-device play)
    if (typeof saveToCloud === 'function') {
        saveToCloud();
    }
}

loadState();

/* =========================================================
   HAPTICS & ASMR AUDIO
   ========================================================= */
// NEW: Initialize Audio Context 
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// THE FIX: The missing musical notes for the 'snap' and 'win' sounds!
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
let noteIndex = 0; 

// NEW: Haptics Engine (Fixes the Drawing Crash!)
function vibratePhone(pattern) {
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch(e) {}
    }
}

// NEW: Interactive Background Ripples
let wRipples = [];
window.addEventListener('pointerdown', (e) => {
    // Only spawn ripples if we are actively playing a level...
    if (window.ui && window.ui.gameContainer.style.display === 'flex') {
        // ...AND only if we are in a liquid/Fenergy theme!
        if (document.body.classList.contains('theme-supernova') || document.body.classList.contains('theme-aurora') || document.body.classList.contains('theme-riverbed')) {
            wRipples.push({x: e.clientX, y: e.clientY, radius: 0, alpha: 1.0});
        }
    }
}, { capture: true });

// NEW: Dynamic Background Drone
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
    
    if (type === 'plop') { // ASMR Paper Scratching
        osc.type = 'sine'; osc.frequency.setValueAtTime(300 + Math.random()*50, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gainNode.gain.setValueAtTime(0.15 * baseVol, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'snap') { // Node Connected! (Plays the next harp note)
        osc.type = 'triangle'; 
        let freq = PENTATONIC[noteIndex % PENTATONIC.length]; noteIndex++;
        osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
        gainNode.gain.setValueAtTime(0.4 * baseVol, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'win') { // Victory Chord
        [0, 2, 4].forEach((noteOffset, i) => {
            let winOsc = audioCtx.createOscillator(); let winGain = audioCtx.createGain();
            winOsc.connect(winGain); winGain.connect(audioCtx.destination); winOsc.type = 'sine';
            winOsc.frequency.setValueAtTime(PENTATONIC[noteOffset], now + (i*0.1)); 
            winGain.gain.setValueAtTime(0.3 * baseVol, now + (i*0.1)); winGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5); 
            winOsc.start(now + (i*0.1)); winOsc.stop(now + 1.5);
        });
        noteIndex = 0; // Reset melody for the next puzzle!
    }
}

/* =========================================================
   PALETTES, THEMES, & LORE
   ========================================================= */
// Completely distinct, hyper-readable colors
const WATERCOLORS = [
    '#E63946', // Bold Crimson Red
    '#1E88E5', // Deep Azure Blue
    '#FDD835', // Bright Amber Yellow
    '#43A047', // Emerald Green
    '#8E24AA', // Royal Purple
    '#F4511E', // Burnt Orange
    '#00ACC1', // Vibrant Cyan
    '#D81B60', // Hot Pink
    '#3949AB', // Indigo
    '#7CB342', // Lime Green
    '#F06292', // Light Rose
    '#FFB300'  // Goldenrod
];

const THEMES = {
    fundamentals: { name: "The Fundamentals", bg: '#f4f1ea', text: '#2c2c2c', grid: 'rgba(0,0,0,0.1)', weather: 'dust', price: 0 },
    riverbed:     { name: "The Riverbed", bg: '#e3f2fd', text: '#0d47a1', grid: 'rgba(13, 71, 161, 0.15)', weather: 'bubbles', price: 0 },
    checkpoints:  { name: "The Checkpoints", bg: '#fff9c4', text: '#f57f17', grid: 'rgba(245, 127, 23, 0.15)', weather: 'embers', price: 0 },
    void:         { name: "The Void", bg: 'transparent', text: '#c9d1d9', grid: 'transparent', weather: 'stars', price: 0 }, 
    cassiopeia:   { name: "The Prisms", bg: '#f3e5f5', text: '#4a148c', grid: 'rgba(74, 20, 140, 0.1)', weather: 'dust', price: 0 },
    portals:      { name: "The Portals", bg: 'transparent', text: '#e1bee7', grid: 'transparent', weather: 'void', price: 0 },
    currents:     { name: "The Currents", bg: 'transparent', text: '#e0f7fa', grid: 'rgba(224, 247, 250, 0.1)', weather: 'wind', price: 0 },
    locks:        { name: "The Locks", bg: 'transparent', text: '#d7ccc8', grid: 'rgba(215, 204, 200, 0.15)', weather: 'dust', price: 0 },
    frost:        { name: "Frost", bg: 'transparent', text: '#004d40', grid: 'rgba(0, 77, 64, 0.15)', weather: 'snow', price: 0 },
    phantom:      { name: "Phantom", bg: 'transparent', text: '#b0bec5', grid: 'rgba(176, 190, 197, 0.1)', weather: 'fog', price: 0 },
    zenith:       { name: "Zenith", bg: 'transparent', text: '#3e2723', grid: 'rgba(62, 39, 35, 0.2)', weather: 'embers', price: 0 },
    obsidian:     { name: "Obsidian Core", bg: '#0a0a0a', text: '#ffffff', grid: 'transparent', weather: 'dust', price: 4000 },
    supernova:    { name: "Supernova", bg: 'transparent', text: '#ffeb3b', grid: 'rgba(255,235,59,0.1)', weather: 'embers', price: 6000 },
    aurora:       { name: "Aurora Borealis", bg: 'transparent', text: '#a7ffeb', grid: 'rgba(167,255,235,0.1)', weather: 'wind', price: 8000 }
};

const INKS = {
    watercolor: { name: "Classic Watercolor", price: 0 },
    neon:       { name: "Neon Laser", price: 3000 },
    stardust:   { name: "Cosmic Stardust", price: 6000 }
};

const SECTIONS = [
    { name: "Ursa Major", start: 0, end: 24, theme: 'fundamentals', lore: "Log 01: I found the artifact buried near the crater. It looks like a heavy pane of glass, but it responds to my touch. Nodes of light appear when my hand hovers over it. When I connect the frequencies, it hums. It’s teaching me its language." },
    { name: "Orion", start: 25, end: 49, theme: 'riverbed', lore: "Log 02: The board is adapting. Solid stones manifest to block my paths. It's a recalibration sequence. The artifact is aligning itself to my spatial reasoning. I can feel the grid pulsing in my mind even when I try to sleep." },
    { name: "Scorpius", start: 50, end: 99, theme: 'checkpoints', lore: "Log 03: Waypoints have appeared. I have to route energy through specific gates or the resonance fails. The hum is growing louder, turning into a harmonic chord. It’s broadcasting a signal. But to where?" },
    { name: "Cygnus", start: 100, end: 149, theme: 'void', lore: "Log 04: The grid vanished today. The training wheels are off. I drew a path blindly in the dark, and for a terrifying moment, the walls of my lab faded into an infinite field of stars. I am mapping a cosmic coordinate system." },
    { name: "Cassiopeia", start: 150, end: 199, theme: 'cassiopeia', lore: "Log 05: The artifact plunged into darkness today. I have to cast my own light to navigate the glass, feeling my way through the fog. It's testing my short-term memory. It doesn't want me to just see the path; it wants me to remember it." },
    { name: "Leo", start: 200, end: 249, theme: 'portals', lore: "Log 06: Spatial tears on the glass. Portals. I touched one with my pen, and my fingers felt the freezing, absolute zero vacuum of space. The signal we are building... it's a literal bridge across the fabric of spacetime." },
    { name: "Pegasus", start: 250, end: 299, theme: 'currents', lore: "Log 07: The engine is demanding absolute precision. Certain nodes now require an exact, mathematical length of energy to stabilize. I can no longer just wander the board; I must find the perfect, most efficient route." },
    { name: "Draco", start: 300, end: 349, theme: 'locks', lore: "Log 08: Locks and keys. Security protocols. Whoever built this wanted to ensure only a synchronized mind could open the final gate. The hum is deafening now. The lab smells of ozone and burning stardust." },
    { name: "Taurus", start: 350, end: 399, theme: 'frost', lore: "Log 09: Shattering ice. The artifact tolerates absolutely zero hesitation. One wrong move and the resonance collapses completely. It is preparing me for a physical journey where second-guessing means disintegration." },
    { name: "Canis Major", start: 400, end: 449, theme: 'phantom', lore: "Log 10: Ethereal ink. Time is folding on the glass. The paths I draw fade into echoes, allowing me to weave new timelines directly over the old ones. I am drawing in four dimensions." },
    { name: "Hercules", start: 450, end: 499, theme: 'zenith', lore: "Log 11: The Zenith. The edges of the canvas are gone. The 2D plane has folded into a continuous cylinder. The artifact wasn't a communicator—it is the ship itself. The glass is dissolving into a doorway of blinding light. I am stepping through." }
];

/* =========================================================
   CUSTOM MODALS
   ========================================================= */
function showModal(title, text, callback = null, inputType = 'none') {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerHTML = text;
    
    const inputContainer = document.getElementById('modal-input-container');
    const inputUser = document.getElementById('modal-input-user');
    const inputPass = document.getElementById('modal-input-pass');
    const cancelBtn = document.getElementById('btn-modal-cancel');
    
    inputUser.value = ''; inputPass.value = '';

    if (inputType === 'text') {
        inputContainer.style.display = 'flex'; inputUser.style.display = 'block'; inputPass.style.display = 'none'; cancelBtn.style.display = 'inline-block';
    } else if (inputType === 'auth') {
        inputContainer.style.display = 'flex'; inputUser.style.display = 'block'; inputPass.style.display = 'block'; cancelBtn.style.display = 'inline-block';
    } else {
        inputContainer.style.display = 'none'; cancelBtn.style.display = 'none';
    }

    document.getElementById('custom-modal').style.display = 'flex';
    
    document.getElementById('btn-modal-close').onclick = () => {
        playSound('plop');
        document.getElementById('custom-modal').style.display = 'none';
        if(callback) {
            if(inputType === 'auth') callback({ user: inputUser.value.trim(), pass: inputPass.value });
            else if(inputType === 'text') callback(inputUser.value.trim());
            else callback();
        }
    };

    cancelBtn.onclick = () => {
        playSound('plop');
        document.getElementById('custom-modal').style.display = 'none';
    };
}

/* =========================================================
   TUTORIAL OVERLAYS (SKETCHY APP THEME)
   ========================================================= */
function showWelcomeTutorial(onCompleteCallback = null) {
    const slides = [
       "<b>WELCOME TO YOUR CRASH COURSE</b><br><br>Let's get you fully oriented before you dive into the stars. For the best experience, <b>turn up your sound</b>. The cosmos sings to those who listen.",
        "<b>THE OBJECTIVE</b><br><br>Your goal is simple: Draw a continuous line to connect the matching colored nodes on the grid.",
        "<b>THE GOLDEN RULE</b><br><br>You MUST fill <b>100%</b> of the empty grid tiles to clear the board. You cannot leave a single square empty, and your lines can NEVER cross each other.",
        "<b>CONTROLS & MISTAKES</b><br><br>Tap and drag to draw. If you make a mistake, simply trace backward over your line to erase it. Erasing your own line does not penalize you.",
        "<b>STARTING THE GAME & TUTORIALS</b><br><br>To play, click 'Play Game' on the menu and tap the glowing '1' on the Constellation Map! Every time a new mechanic (like Portals or Ice) appears, a tutorial will pop up right before the level starts.",
        "<b>EARNING STARDUST</b><br><br>You are graded on a 3-Star system. Completing levels flawlessly earns you max Stardust! However, using a Hint or resetting the board lowers your final star rating.",
        "<b>THE STARDUST SHOP</b><br><br>Spend your hard-earned Stardust in the Shop! You can buy premium Ink Colors (like Neon or Cosmic Stardust), beautiful animated Background Themes, or extra Hints for when you get stuck.",
        "<b>SETTINGS & SAVING</b><br><br>In the Settings menu, you can toggle <b>Dark Mode</b>, equip your purchased Themes/Inks, and most importantly: <b>Create an Account</b>. Guest data is permanently lost when you close the app, so save your progress!",
        "<b>YOU ARE READY</b><br><br>Take your time, map out your routes in your head before drawing, and remember... leave no empty space behind."
    ];
    let currentSlide = 0;

    const overlay = document.createElement('div');
    overlay.id = 'welcome-tutorial-overlay';
    overlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:90000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:'Nunito', sans-serif;`;
    
    const box = document.createElement('div');
    box.className = 'tutorial-card'; // NEW CSS CLASS
    box.style.cssText = `background:var(--paper-bg); color:var(--ink-black); padding:40px; border-radius:24px; text-align:center; max-width:600px; width:90vw; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-height: 80vh; overflow-y: auto;`;

    const title = document.createElement('h2');
    title.className = 'tutorial-title'; // NEW CSS CLASS
    title.style.cssText = "font-family:'Architects Daughter', cursive; font-size:4rem; margin-top:0; margin-bottom:20px; color:var(--primary);";
    title.innerText = "ORIENTATION";

    const content = document.createElement('p');
    content.className = 'tutorial-text'; // NEW CSS CLASS
    content.style.cssText = "font-size:1.4rem; margin:10px 0; line-height:1.5; font-weight:600;";
    content.innerHTML = slides[currentSlide];

    const btn = document.createElement('button');
    btn.className = 'sketch-btn primary';
    btn.style.marginTop = '30px';
    btn.innerText = "Next ➔";

    btn.onclick = () => {
        playSound('plop');
        currentSlide++;
        if (currentSlide < slides.length) {
            content.innerHTML = slides[currentSlide];
            if (currentSlide === slides.length - 1) btn.innerText = "I Understand. Let's Draw!";
        } else {
            overlay.remove();
            // THE FIX: Save to memory so it doesn't pop up again, and go to destination!
            localStorage.setItem('sc_tutorial_seen', 'true'); 
            if (typeof onCompleteCallback === 'function') onCompleteCallback();
        }
    };

    box.appendChild(title); box.appendChild(content); box.appendChild(btn);
    overlay.appendChild(box); document.body.appendChild(overlay);
}

const MECHANIC_SLIDES = {
    26:  ["Welcome to The Riverbed.", "Grey Stones now appear on the map.<br><br>You cannot paint over them, but they count toward board completion.", "Flow smoothly around the obstacles!"],
    51:  ["Welcome to The Checkpoints.", "Hollow rings have appeared on the canvas.<br><br>These are Waypoints.", "The matching color's line MUST pass through its Waypoint!"],
    101: ["Welcome to The Void.", "The grid guidelines have faded away.", "Trust your spatial instincts. The rules remain unchanged."],
    151: ["Welcome to Cassiopeia.", "Colored Prisms act as light filters. You can draw through them normally, but ONLY if your ink matches the Prism's color!"],
    201: ["Welcome to The Portals.", "Enter a Warp Portal tile to instantly emerge out of its pair. Tap the exit portal to pick up the line and continue drawing!"],
    251: ["Welcome to The Currents.", "One-way current arrows direct the flow of your line. Follow the current."],
    301: ["Welcome to The Locks.", "Pass over a yellow Key tile to unlock matching Door gates across the board."],
    351: ["Welcome to Frost.", "Cracked ice tiles shatter if you try to ERASE a line you drew over them. Be certain of your path before drawing!"],
    401: ["Welcome to Phantom.", "Destination nodes shift position mid-stroke. Keep your focus sharp."],
    451: ["Welcome to Zenith.", "Golden Cosmic Dust covers the board. ANY color can draw over them, but you MUST sweep up every single pile of dust to beat the level!"]
};

function showMechanicTutorial(levelNum, themeData) {
    if (!MECHANIC_SLIDES[levelNum]) return;
    const slides = MECHANIC_SLIDES[levelNum];
    let currentSlide = 0;

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:'Nunito', sans-serif;`;
    
    const box = document.createElement('div');
    box.className = 'tutorial-card'; // NEW CSS CLASS
    let boxBg = themeData.bg === 'transparent' ? '#1a237e' : themeData.bg;
    box.style.cssText = `background:${boxBg}; color:${themeData.text}; padding:50px; border-radius: 255px 15px 225px 15px/15px 225px 15px 255px; border:3px solid ${themeData.text}; text-align:center; max-width:600px; width:90vw; box-shadow: 8px 8px 0px rgba(0,0,0,0.4); max-height: 80vh; overflow-y: auto;`;

    const title = document.createElement('h2');
    title.className = 'tutorial-title'; // NEW CSS CLASS
    title.style.cssText = "font-family:'Architects Daughter', cursive; font-size:4.5rem; margin-top:0; margin-bottom:15px;";
    title.innerText = "New Mechanic";

    const content = document.createElement('p');
    content.className = 'tutorial-text'; // NEW CSS CLASS
    content.style.cssText = "font-size:2.5rem; margin:10px 0; line-height:1.2;";
    content.innerHTML = slides[currentSlide];

    const btn = document.createElement('button');
    btn.className = 'sketch-btn';
    btn.style.marginTop = '30px';
    btn.style.background = themeData.text; btn.style.color = boxBg; 
    btn.innerText = slides.length > 1 ? "Next ➔" : "Let's Draw!";

    btn.onclick = () => {
        playSound('plop');
        currentSlide++;
        if (currentSlide < slides.length) {
            content.innerHTML = slides[currentSlide];
            if (currentSlide === slides.length - 1) btn.innerText = "Let's Draw!";
        } else {
            overlay.remove();
        }
    };

    box.appendChild(title); box.appendChild(content); box.appendChild(btn);
    overlay.appendChild(box); document.body.appendChild(overlay);
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
    for(let i = 0; i < 40; i++) wParticles.push(createWeatherParticle());
}

function createWeatherParticle() {
    return { x: Math.random() * wCanvas.width, y: Math.random() * wCanvas.height, vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1, size: Math.random() * 3 + 1, life: Math.random(), speed: Math.random() * 0.02 + 0.005 };
}

function animateWeather() {
    wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
    if (!window.game || !window.game.currentTheme) { requestAnimationFrame(animateWeather); return; }
    wCtx.fillStyle = window.game.currentTheme.text || '#fff';
    
    // Draw Ripples
    for (let i = wRipples.length - 1; i >= 0; i--) {
        let r = wRipples[i];
        r.radius += 1.5; r.alpha -= 0.015;
        if (r.alpha <= 0) { wRipples.splice(i, 1); continue; }
        wCtx.beginPath(); wCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        wCtx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.4})`;
        wCtx.lineWidth = 2; wCtx.stroke();
    }
}
animateWeather();

/* =========================================================
   REALISTIC CONSTELLATION MAP ENGINE
   ========================================================= */
const RAW_PATHS = [
    [[85, 20], [65, 30], [50, 45], [35, 55], [45, 75], [75, 80], [65, 55], [35, 55]], 
    [[20, 15], [35, 30], [70, 20], [50, 40], [30, 60], [50, 50], [70, 40], [50, 40], [45, 75], [25, 90], [45, 75], [70, 85], [60, 60], [70, 40]], 
    [[85, 15], [70, 30], [55, 50], [60, 75], [75, 90], [90, 80], [80, 65]], 
    [[50, 90], [50, 60], [15, 45], [50, 60], [85, 45], [50, 60], [50, 15]], 
    [[15, 25], [35, 75], [50, 40], [65, 85], [85, 25]], 
    [[85, 75], [80, 45], [60, 30], [40, 25], [25, 40], [40, 55], [60, 45], [40, 55], [20, 80]], 
    [[80, 70], [80, 35], [40, 40], [45, 75], [80, 70], [90, 15], [40, 40], [15, 20], [15, 55]], 
    [[45, 90], [25, 75], [15, 50], [35, 35], [60, 45], [85, 35], [75, 15], [55, 20], [45, 10]], 
    [[90, 15], [65, 40], [45, 55], [20, 40], [45, 55], [15, 75], [45, 55], [65, 80]], 
    [[35, 15], [55, 35], [80, 25], [55, 35], [45, 65], [20, 85], [45, 65], [75, 80], [65, 60], [55, 35]], 
    [[15, 15], [30, 40], [65, 25], [55, 45], [35, 55], [30, 40], [35, 55], [25, 85], [10, 90], [25, 85], [55, 75], [85, 90], [55, 75], [55, 45]] 
];

const CONSTELLATION_PATHS = RAW_PATHS.map(path => {
    let minX = 100, maxX = 0, minY = 100, maxY = 0;
    path.forEach(p => { if(p[0]<minX) minX=p[0]; if(p[0]>maxX) maxX=p[0]; if(p[1]<minY) minY=p[1]; if(p[1]>maxY) maxY=p[1]; });
    let rangeX = maxX - minX || 1; let rangeY = maxY - minY || 1;
    // Map bounds to 10% - 90%
    return path.map(p => [ 10 + ((p[0] - minX) / rangeX) * 80, 10 + ((p[1] - minY) / rangeY) * 80 ]);
});

function getStarCoords(i, total, secIdx) {
    const path = CONSTELLATION_PATHS[secIdx % CONSTELLATION_PATHS.length];
    let totalLength = 0; let segmentLengths = [];
    for (let j = 0; j < path.length - 1; j++) {
        let dx = path[j+1][0] - path[j][0]; let dy = path[j+1][1] - path[j][1];
        let len = Math.sqrt(dx*dx + dy*dy);
        totalLength += len; segmentLengths.push(len);
    }
    if(totalLength === 0) return {x: 50, y: 50};

    let targetDist = (i / Math.max(1, total - 1)) * totalLength;
    let currentDist = 0;

    for (let j = 0; j < path.length - 1; j++) {
        if (currentDist + segmentLengths[j] >= targetDist || j === path.length - 2) {
            let remaining = targetDist - currentDist;
            let fraction = Math.max(0, Math.min(1, remaining / segmentLengths[j]));
            let cx = path[j][0] + (path[j+1][0] - path[j][0]) * fraction;
            let cy = path[j][1] + (path[j+1][1] - path[j][1]) * fraction;
            let seed = (i * 1337 + secIdx * 42) % 1000;
            let jitterX = ((seed / 1000) - 0.5) * 3;
            seed = (seed * 1337) % 1000; let jitterY = ((seed / 1000) - 0.5) * 3;
            if(i === 0 || i === total - 1) { jitterX *= 0; jitterY *= 0; } 
            return { x: Math.max(5, Math.min(95, cx + jitterX)), y: Math.max(5, Math.min(95, cy + jitterY)) };
        }
        currentDist += segmentLengths[j];
    }
    return { x: 50, y: 50 }; 
}

/* =========================================================
   PROCEDURAL ARTISAN GENERATOR
   ========================================================= */
function generateLevelBoard(size, numColors, activeFeatures) {
    for (let attempt = 0; attempt < 1000; attempt++) {
        let grid = Array(size).fill(null).map(() => Array(size).fill(-1));
        let stones = []; let waypoints = []; let prisms = []; let portals = []; let currents = []; let locks = []; let keys = []; let ices = []; let cosmicDust = [];

        if (activeFeatures.includes('stones')) {
            let numStones = Math.floor(size / 2.5);
            for(let s = 0; s < numStones; s++) {
                let rx = Math.floor(Math.random() * size); let ry = Math.floor(Math.random() * size);
                if (grid[ry][rx] === -1) { grid[ry][rx] = -2; stones.push({x: rx, y: ry}); }
            }
        }

        let emptyCells = [];
        for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) if (grid[y][x] !== -2) emptyCells.push({ x, y });

        let seeds = [];
        for (let i = 0; i < numColors; i++) {
            if (emptyCells.length === 0) break;
            seeds.push(emptyCells.splice(Math.floor(Math.random() * emptyCells.length), 1)[0]);
        }
        if (seeds.length < numColors) continue; 

        let worms = seeds.map((s, i) => { grid[s.y][s.x] = i; return [{ x: s.x, y: s.y }]; });
        let stuck = false;
        
        while (emptyCells.length > 0) {
            let growable = [];
            worms.forEach((worm, i) => {
                let head = worm[0], tail = worm[worm.length - 1];
                let neighbors = [];
                let dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
                dirs.forEach(d => {
                    let nx = head.x + d.dx, ny = head.y + d.dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === -1) neighbors.push({ side: 'head', x: nx, y: ny });
                });
                if (head.x !== tail.x || head.y !== tail.y) {
                    dirs.forEach(d => {
                        let nx = tail.x + d.dx, ny = tail.y + d.dy;
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === -1) neighbors.push({ side: 'tail', x: nx, y: ny });
                    });
                }
                if (neighbors.length > 0) growable.push({ wormIndex: i, neighbors: neighbors });
            });

            if (growable.length === 0) { stuck = true; break; }

            let chosen = growable[Math.floor(Math.random() * growable.length)];
            let neighbor = chosen.neighbors[Math.floor(Math.random() * chosen.neighbors.length)];

            if (neighbor.side === 'head') worms[chosen.wormIndex].unshift({ x: neighbor.x, y: neighbor.y });
            else worms[chosen.wormIndex].push({ x: neighbor.x, y: neighbor.y });
            
            grid[neighbor.y][neighbor.x] = chosen.wormIndex;
            let eIdx = emptyCells.findIndex(e => e.x === neighbor.x && e.y === neighbor.y);
            if (eIdx > -1) emptyCells.splice(eIdx, 1);
        }

        if (!stuck && worms.every(w => w.length >= 3)) {
            let pairs = worms.map(w => [w[0].x, w[0].y, w[w.length - 1].x, w[w.length - 1].y, w.length]);

            if (activeFeatures.includes('waypoints')) {
                worms.forEach((w, i) => {
                    if (w.length >= 5 && Math.random() > 0.4) {
                        let mid = Math.floor(w.length / 2); waypoints.push({ x: w[mid].x, y: w[mid].y, colorId: i });
                    }
                });
            }
            if (activeFeatures.includes('prisms')) {
                worms.forEach((w, i) => {
                    if (w.length >= 5 && Math.random() > 0.5) {
                        let mid = Math.floor(w.length / 2); prisms.push({ x: w[mid].x, y: w[mid].y, colorId: i });
                    }
                });
            }
            if (activeFeatures.includes('portals')) {
                let w = worms.find(w => w.length >= 6);
                if (w) { 
                    portals.push({x: w[2].x, y: w[2].y, id: 1}, {x: w[4].x, y: w[4].y, id: 1}); 
                    stones.push({x: w[3].x, y: w[3].y}); 
                    w.splice(3, 1);
                }
            }
            if (activeFeatures.includes('currents')) {
                worms.forEach(w => {
                    if (w.length >= 4 && Math.random() > 0.5) {
                        let idx = Math.floor(w.length / 2); let p1 = w[idx]; let p2 = w[idx+1];
                        currents.push({x: p1.x, y: p1.y, dx: p2.x - p1.x, dy: p2.y - p1.y});
                    }
                });
            }
            if (activeFeatures.includes('keys')) {
                let w = worms[0];
                if (w && w.length >= 5) { keys.push({x: w[1].x, y: w[1].y, id: 1}); locks.push({x: w[3].x, y: w[3].y, id: 1}); }
            }
            if (activeFeatures.includes('ice')) {
                worms.forEach(w => { if (w.length >= 5) ices.push({x: w[2].x, y: w[2].y}); });
            }
            if (activeFeatures.includes('dust')) { 
                worms.forEach(w => { if (w.length >= 4) cosmicDust.push({x: w[1].x, y: w[1].y}); });
            }

            return { pairs, stones, waypoints, prisms, portals, currents, locks, keys, ices, dust: cosmicDust, solution: worms };
        }
    }
    return null; 
}

/* =========================================================
   INITIALIZATION (The Master Progression Plan)
   ========================================================= */
const LEVELS = [];
for (let i = 1; i <= 500; i++) {
    let sec = SECTIONS.find(s => (i-1) >= s.start && (i-1) <= s.end);
    let secIndex = SECTIONS.indexOf(sec); 
    let isTut = (i-1) === sec.start;

    // 1. BASE MATH (+1 size every 2 sections)
    let baseSize = 5 + Math.floor(secIndex / 2);
    let baseColors = 3 + Math.floor(secIndex / 3);

    // 2. THE EXPLICIT PLAN OVERRIDES
    if (i >= 1 && i <= 4) {
        baseSize = 3;
        baseColors = 2; // Keep intro colors simple so 3x3 doesn't crash!
    } else if (i === 5) {
        baseSize = 4;
        baseColors = 3;
    } else if (i >= 6 && i <= 50) {
        baseSize = 5;
    }

    let maxColors = WATERCOLORS.length;
    if (baseColors > maxColors) baseColors = maxColors;

    // 3. THE DIFFICULTY SPIKES
    let isSuperHard = (i % 10 === 0);
    let isHard = (i % 5 === 0 && !isSuperHard);

    // Only apply spikes to Level 6 and beyond (Protects Level 5 from accidentally becoming a 5x5)
    if (i >= 6) {
        if (isSuperHard) {
            baseSize += 2; 
            baseColors = Math.min(maxColors, baseColors + 2);
        } else if (isHard) {
            baseSize += 1; 
            baseColors = Math.min(maxColors, baseColors + 1);
        }
    }

    // 4. HARD CAP (Prevents CPU meltdown on endgame Super Hards)
    if (baseSize > 11) baseSize = 11; 

    let features = [];
    
    // 5. THE TUTORIAL OVERRIDE (Forced 5x5, easy colors for learning mechanics)
    if (isTut && i !== 1 && i !== 451) {
        baseSize = 5; baseColors = 2;
        if (i === 26) features = ['stones'];
        else if (i === 51) features = ['waypoints'];
        else if (i === 101) features = ['void'];
        else if (i === 151) features = ['searchlight'];
        else if (i === 201) features = ['portals'];
        else if (i === 251) features = ['siphons'];
        else if (i === 301) features = ['keys'];
        else if (i === 351) features = ['ice'];
        else if (i === 401) features = ['ethereal'];
    } else {
        if(i > 25) features.push('stones');
        if(i > 50) features.push('waypoints');
        if(i > 100) features.push('void');
        if(i > 150) features.push('searchlight');
        if(i > 200) features.push('portals');
        if(i > 250) features.push('siphons');
        if(i > 300) features.push('keys');
        if(i > 350) features.push('ice');
        if(i > 400) features.push('ethereal');
        if(i > 450) features.push('wrap');
    }

    LEVELS.push({
        title: `Level ${i}`, 
        flavor: isSuperHard ? "ANOMALY DETECTED" : (isHard ? "Spacetime is warping..." : "Trace the stars."),
        size: baseSize, targetColors: baseColors, features: features, theme: sec.theme, isTutorial: isTut, board: null 
    });
}

/* =========================================================
   UI, SHOP, LOGIN & LORE MANAGER
   ========================================================= */
const ui = {
    screens: document.querySelectorAll('.screen'),
    gameContainer: document.getElementById('game-container'),
    currentSectionIndex: 0,
    
    hideAll() { this.screens.forEach(s => s.classList.remove('active')); this.gameContainer.style.display = 'none'; },
    
    showMainMenu() {
        this.hideAll();
        
        // THE FIX: Force the background to reset to the default theme when entering the menu!
        if (window.game && typeof window.game.applyTheme === 'function') {
            window.game.applyTheme('fundamentals');
        }
        
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('main-menu').style.display = 'flex';
    },

    handleLogin() {
        showModal("Account Login", "Enter a Username and Password. If it's a new name, an account will be created.", (creds) => {
            if(!creds || !creds.user || !creds.pass) return;
            let users = JSON.parse(localStorage.getItem('sc_users')) || {};
            
            if (users[creds.user]) {
                if (users[creds.user].pass === creds.pass) {
                    currentUser = creds.user; loadState();
                    showModal("Welcome Back", `Logged in as ${currentUser}. Progress will be saved.`);
                    document.getElementById('profile-name').innerText = currentUser;
                    document.getElementById('profile-name').style.color = '#0d47a1';
                } else { showModal("Error", "Incorrect password."); }
            } else {
                users[creds.user] = { pass: creds.pass };
                localStorage.setItem('sc_users', JSON.stringify(users));
                currentUser = creds.user; state = { ...defaultState };
                maxUnlocked = 0; lastPlayedLevel = -1;
                saveState();
                document.getElementById('profile-name').innerText = currentUser;
                document.getElementById('profile-name').style.color = '#0d47a1';
                showModal("Account Created", `Welcome, ${currentUser}! Your progress will now be saved.`, () => { showWelcomeTutorial(); });
            }
        }, 'auth');
    },

    showShop() {
        this.hideAll(); window.game.applyTheme('fundamentals');
        document.getElementById('shop-screen').classList.add('active');
        document.getElementById('shop-stardust-display').innerText = state.stardust;
        
        const container = document.getElementById('shop-items-container');
        container.innerHTML = '';

        Object.keys(INKS).forEach(key => {
            if(key === 'watercolor') return; 
            const item = INKS[key];
            const div = document.createElement('div'); div.className = 'shop-item';
            const isOwned = state.inventory[`ink_${key}`];
            div.innerHTML = `<span>🎨 ${item.name}</span>
                <button class="sketch-btn sm shop-btn" ${isOwned ? 'disabled' : ''} onclick="window.ui.buyItem('ink_${key}', ${item.price}, this)">
                    ${isOwned ? 'Owned' : item.price + ' Dust'}
                </button>`;
            container.appendChild(div);
        });

        ['obsidian', 'supernova', 'aurora'].forEach(key => {
            const item = THEMES[key];
            const div = document.createElement('div'); div.className = 'shop-item';
            const isOwned = state.inventory[`theme_${key}`];
            div.innerHTML = `<span>🌌 ${item.name} (Theme)</span>
                <button class="sketch-btn sm shop-btn" ${isOwned ? 'disabled' : ''} onclick="window.ui.buyItem('theme_${key}', ${item.price}, this)">
                    ${isOwned ? 'Owned' : item.price + ' Dust'}
                </button>`;
            container.appendChild(div);
        });

        const teleDiv = document.createElement('div'); teleDiv.className = 'shop-item';
        teleDiv.innerHTML = `<span>🔭 +1 Hint</span>
            <button class="sketch-btn sm shop-btn" onclick="window.ui.buyHints()">100 Dust</button>`;
        container.appendChild(teleDiv);
    },

    buyItem(id, price, btnElement) {
        if (state.stardust >= price) {
            state.stardust -= price; 
            state.inventory[id] = true; 
            saveState();
            vibratePhone([50, 50, 50]); playSound('snap');
            
            // Safely update UI directly without destroying the menu
            document.getElementById('shop-stardust-display').innerText = state.stardust;
            if (btnElement) {
                btnElement.disabled = true;
                btnElement.innerText = "Owned";
            }
            
            showModal("Purchased!", "Item has been added to your settings.");
        } else { 
            showModal("Insufficient Stardust", "Solve more puzzles to earn stardust."); 
        }
    },

    buyHints() {
        if (state.stardust >= 100) {
            state.stardust -= 100; 
            state.telescopes += 1; 
            saveState();
            vibratePhone([50, 50, 50]); playSound('snap');
            
            document.getElementById('shop-stardust-display').innerText = state.stardust;
            showModal("Purchased!", "You now have " + state.telescopes + " hints.");
        } else { 
            showModal("Insufficient Stardust", "Solve more puzzles to earn stardust."); 
        }
    },

    showJournal() {
        this.hideAll(); window.game.applyTheme('fundamentals');
        document.getElementById('journal-screen').classList.add('active');
        const container = document.getElementById('journal-entries-container');
        container.innerHTML = '';

        SECTIONS.forEach(sec => {
            if (maxUnlocked >= sec.end) {
                const div = document.createElement('div'); div.className = 'lore-entry';
                div.innerHTML = `<h3 class="lore-title">${sec.name} Sequence</h3><p class="lore-text">"${sec.lore}"</p>`;
                container.appendChild(div);
            }
        });
        if (container.innerHTML === '') {
            container.innerHTML = '<p class="lore-text" style="text-align:center;">Complete a full Constellation to decrypt entries.</p>';
        }
    },

    showSettings() {
        this.hideAll();
        document.getElementById('settings-screen').classList.add('active');
        
        const inkSelect = document.getElementById('ink-select');
        inkSelect.innerHTML = '';
        Object.keys(INKS).forEach(key => {
            if (state.inventory[`ink_${key}`]) {
                const opt = document.createElement('option'); opt.value = key; opt.innerText = INKS[key].name;
                inkSelect.appendChild(opt);
            }
        });

        const themeSelect = document.getElementById('theme-select');
        themeSelect.innerHTML = '<option value="auto">Auto (Matches Map)</option>';
        
        let unlockedThemes = new Set(['fundamentals']); 
        for(let i=0; i<=maxUnlocked; i++) {
            let sec = SECTIONS.find(s => i >= s.start && i <= s.end);
            if(sec) unlockedThemes.add(sec.theme);
        }
        ['obsidian', 'supernova', 'aurora'].forEach(pTheme => {
            if(state.inventory[`theme_${pTheme}`]) unlockedThemes.add(pTheme);
        });

        unlockedThemes.forEach(key => {
            const opt = document.createElement('option'); opt.value = key; opt.innerText = THEMES[key].name;
            themeSelect.appendChild(opt);
        });
        
        themeSelect.value = state.themeOverride;
        inkSelect.value = state.inkStyle;
        document.getElementById('sfx-slider').value = state.sfxVolume * 100;
        document.getElementById('sfx-val').innerText = Math.round(state.sfxVolume * 100) + '%';
        document.getElementById('ui-mode-select').value = state.uiMode;
    },

    showLevelSelect() {
        this.hideAll();
        
        // THE FIX: Ignore Time Trials (Level 999) when finding the map section!
        let mapTarget = (lastPlayedLevel >= 0 && lastPlayedLevel !== 999) ? lastPlayedLevel : maxUnlocked;
        this.currentSectionIndex = SECTIONS.findIndex(s => mapTarget >= s.start && mapTarget <= s.end);
        
        // Safety net: If they beat the whole game, keep them on the final Constellation!
        if (this.currentSectionIndex === -1) this.currentSectionIndex = SECTIONS.length - 1; 
        
        this.renderConstellationMap();
        document.getElementById('level-select').classList.add('active');

        if(state.pendingGlow) {
            const canvasObj = document.getElementById('constellation-canvas');
            canvasObj.classList.add('angelic-glow');
            setTimeout(() => {
                showModal("Sequence Completed!", "A new decrypted fragment has been added to the Inventor's Journal.", () => {
                    canvasObj.classList.remove('angelic-glow');
                });
            }, 1000);
            state.pendingGlow = false; saveState();
        }
    },

    renderConstellationMap() {
        const sec = SECTIONS[this.currentSectionIndex];
        window.game.applyTheme(sec.theme); 

        document.getElementById('constellation-title').innerText = sec.name;
        document.getElementById('constellation-subtitle').innerText = `Levels ${sec.start + 1} - ${sec.end + 1}`;
        document.getElementById('btn-prev-star').disabled = this.currentSectionIndex === 0;
        document.getElementById('btn-next-star').disabled = (this.currentSectionIndex === SECTIONS.length - 1) || (maxUnlocked < sec.end + 1);
        
        const grid = document.getElementById('level-grid-container');
        grid.innerHTML = '';
        const total = sec.end - sec.start + 1;
        const secTheme = THEMES[sec.theme];
        const starSize = 50; 

        let coordsList = [];
        for (let i = 0; i < total; i++) coordsList.push(getStarCoords(i, total, this.currentSectionIndex));

        // Physics-based Anti-Smush Algorithm
        for (let iter = 0; iter < 20; iter++) {
            for (let i = 0; i < coordsList.length; i++) {
                for (let j = i + 1; j < coordsList.length; j++) {
                    let dx = coordsList[j].x - coordsList[i].x;
                    let dy = coordsList[j].y - coordsList[i].y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    let minDist = 8; 
                    if (dist < minDist && dist > 0) {
                        let overlap = (minDist - dist) / 2; let angle = Math.atan2(dy, dx);
                        if (i > 0) { coordsList[i].x -= Math.cos(angle) * overlap; coordsList[i].y -= Math.sin(angle) * overlap; }
                        if (j < coordsList.length - 1) { coordsList[j].x += Math.cos(angle) * overlap; coordsList[j].y += Math.sin(angle) * overlap; }
                    }
                }
            }
        }

        coordsList.forEach((coords, i) => {
            const levelIdx = sec.start + i;
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            
            let starsHtml = '';
            if (state.stars[levelIdx] !== undefined) {
                const sCount = state.stars[levelIdx];
                starsHtml = `<div class="star-rating">${'★'.repeat(sCount)}</div>`;
            }
            btn.innerHTML = `${levelIdx + 1}${starsHtml}`;
            
            btn.style.width = starSize + 'px'; btn.style.height = starSize + 'px';
            btn.style.left = coords.x + '%'; btn.style.top = coords.y + '%';
            btn.style.color = secTheme.text;

            if (levelIdx <= maxUnlocked) { btn.onclick = () => { lastPlayedLevel = levelIdx; window.game.start(levelIdx); } } 
            else { btn.disabled = true; }
            grid.appendChild(btn);
        });
        setTimeout(() => this.drawConstellationLines(coordsList, secTheme.text), 100);
    },

    drawConstellationLines(coordsList, color) {
        // THE FIX: Cache the coordinates so the resize listener can redraw them without crashing!
        if (coordsList) this.lastCoords = coordsList;
        if (color) this.lastColor = color;
        
        let currentCoords = coordsList || this.lastCoords;
        let currentColor = color || this.lastColor;
        
        if (!currentCoords) return; // Failsafe

        const wrapper = document.getElementById('constellation-wrapper');
        const cCanvas = document.getElementById('constellation-canvas');
        cCanvas.width = wrapper.clientWidth; cCanvas.height = wrapper.clientHeight;
        const cCtx = cCanvas.getContext('2d');
        cCtx.clearRect(0,0, cCanvas.width, cCanvas.height);
        
        cCtx.strokeStyle = currentColor; cCtx.globalAlpha = 0.3; cCtx.lineWidth = 2; cCtx.lineCap = 'round'; cCtx.lineJoin = 'round';
        cCtx.setLineDash([5, 5]);
        
        cCtx.beginPath();
        for(let i=0; i<currentCoords.length; i++) {
            const levelIdx = SECTIONS[this.currentSectionIndex].start + i;
            if(levelIdx > maxUnlocked) break; 
            const px = (currentCoords[i].x / 100) * cCanvas.width;
            const py = (currentCoords[i].y / 100) * cCanvas.height;
            if(i===0) cCtx.moveTo(px, py); else cCtx.lineTo(px, py);
        }
        cCtx.stroke(); cCtx.globalAlpha = 1.0; 
    },

    showLevelComplete(dustEarned, earnedStars) {
        this.hideAll();
        document.getElementById('level-complete-screen').classList.add('active');
        if (typeof playSound === 'function') playSound('win');

        // 1. UPDATE THE UI TEXT (The Missing Wires!)
        let starString = '';
        for (let i = 0; i < 3; i++) {
            // Fills in solid stars for what you earned, hollow stars for what you missed
            starString += (i < earnedStars) ? '★' : '☆';
        }
        document.getElementById('lc-stars').innerText = starString;
        document.getElementById('lc-dust').innerText = `+${dustEarned || 0} Stardust`;

        // 2. STANDARD LEVEL PROGRESSION
        if (lastPlayedLevel >= maxUnlocked) {
            maxUnlocked = lastPlayedLevel + 1;
            saveState();
        }
        
        // 3. NEXT BUTTON LOGIC
        if (lastPlayedLevel >= LEVELS.length - 1) {
            document.getElementById('btn-lc-next').style.display = 'none';
        } else {
            document.getElementById('btn-lc-next').style.display = 'inline-block';
            document.getElementById('btn-lc-next').onclick = () => window.game.start(lastPlayedLevel + 1);
        }
        
        // (Removed the hardcoded +30 Stardust payout here, because your game engine already safely added your actual earnings to the bank before this screen opened!)
    },

    resetProgress() {
        showModal("Erase Progress", "Are you sure you want to burn this profile's sketchbook and start over?", () => {
            maxUnlocked = 0; lastPlayedLevel = -1;
            state.stardust = 0; state.telescopes = 3; state.stars = {};
            state.inventory = { ink_watercolor: true, theme_fundamentals: true };
            state.inkStyle = 'watercolor'; state.themeOverride = 'auto'; // THE FIX: Force unequip premium items!
            saveState(); this.showMainMenu();
        });
    }
};
window.ui = ui; 

/* =========================================================
   PARTICLE ENGINE (LOWER CONFETTI COUNT)
   ========================================================= */
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');
let particles = [];

function spawnSplash(x, y, color, isConfetti = false) {
    // Bumped confetti count from 6 to 15 for a better celebration!
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
            p.vy += 0.12; // WAS 0.4. This is gravity! Lower means floatier.
            p.vx *= 0.98; // Adds a tiny bit of air resistance so they drift naturally
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

/* =========================================================
   CORE GAME ENGINE (Lenient 3-Star Logic)
   ========================================================= */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const game = {
    levelIndex: 0, size: 0, cellSize: 0,
    nodes: [], stones: [], waypoints: [], bridges: [], portals: [], currents: [], keys: [], locks: [], ices: [], prisms: [], dust: [],
    paths: {}, drawingColor: null, isWon: false, activeFeatures: [],
    currentTheme: THEMES.fundamentals, solution: null, 

    applyTheme(themeKey) {
        const finalTheme = (state.themeOverride === 'auto') ? themeKey : state.themeOverride;
        this.currentTheme = THEMES[finalTheme] || THEMES.fundamentals;
        
        // Set the background theme, but DO NOT nuke Dark Mode if it's active!
        document.body.className = 'theme-' + finalTheme; 
        if (state.uiMode === 'dark') {
            document.body.classList.add('dark-mode-ui');
        }
        
        updateWeather(finalTheme); 
    },

    start(index) {
        this.levelIndex = index; lastPlayedLevel = index; 
        this.isWon = false; currentMistakes = 0; 
        const levelData = LEVELS[index];
        this.size = levelData.size; this.activeFeatures = levelData.features;
        this.applyTheme(levelData.theme);

        if (!levelData.board) {
            // THE FIX: Seeded Randomness guarantees this level is identical for EVERY player on Earth!
            let originalRandom = Math.random;
            let seed = (index + 1) * 99991; // Create a unique, fixed math seed for this specific level
            
            Math.random = function() {
                var t = seed += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            let generatedBoard = null; let currentColors = levelData.targetColors;
            let attempts = 0;
            while (!generatedBoard && currentColors >= 2 && attempts < 50) {
                generatedBoard = generateLevelBoard(this.size, currentColors, this.activeFeatures);
                if (!generatedBoard) { 
                    attempts++; 
                    if(attempts % 4 === 0) currentColors--; 
                    if(attempts % 15 === 0) this.size--; 
                }
            }
            if(!generatedBoard) generatedBoard = { pairs:[[0,0,0,1,2], [1,0,1,1,2]], stones:[], waypoints:[], bridges:[], portals:[], currents:[], locks:[], keys:[], ices:[], dust:[], solution:[[{x:0,y:0},{x:0,y:1}], [{x:1,y:0},{x:1,y:1}]] };
            levelData.board = generatedBoard;
            
            Math.random = originalRandom; // Restore normal randomness for the rest of the game
        }
        
        this.solution = levelData.board.solution; 
        document.getElementById('level-title').innerText = levelData.title;
        document.getElementById('level-flavor').innerText = levelData.flavor || '';

        this.nodes = [];
        levelData.board.pairs.forEach((pair, colorId) => {
            this.nodes.push({ x: pair[0], y: pair[1], colorId: colorId, targetLength: pair[4] });
            this.nodes.push({ x: pair[2], y: pair[3], colorId: colorId });
        });
        
        this.stones = JSON.parse(JSON.stringify(levelData.board.stones || []));
        this.waypoints = JSON.parse(JSON.stringify(levelData.board.waypoints || []));
        this.portals = JSON.parse(JSON.stringify(levelData.board.portals || []));
        this.currents = JSON.parse(JSON.stringify(levelData.board.currents || []));
        this.keys = JSON.parse(JSON.stringify(levelData.board.keys || []));
        this.locks = JSON.parse(JSON.stringify(levelData.board.locks || []));
        this.ices = JSON.parse(JSON.stringify(levelData.board.ices || []));
        this.prisms = JSON.parse(JSON.stringify(levelData.board.prisms || []));
        this.dust = JSON.parse(JSON.stringify(levelData.board.dust || []));

        this.resetLevel(true); // THE FIX: Tell resetLevel this is the initial load!
        window.ui.hideAll(); window.ui.gameContainer.style.display = 'flex';
        this.resizeCanvas(); this.render();

        // THE FIX: Pierce the CSS forcefield so the Hint button is clickable again!
        // THE FIX: Pierce the CSS forcefield, and DISABLE hints during Time Trials to prevent pay-to-win speedruns!
        let hintBtn = document.getElementById('btn-hint');
        if (hintBtn) {
            hintBtn.style.pointerEvents = 'auto';
            hintBtn.style.display = (index === 999) ? 'none' : 'inline-block';
        }

        if (levelData.isTutorial) showMechanicTutorial(index + 1, this.currentTheme);
    },

    resetLevel(isInitialLoad = false) {
        this.paths = {};
        const numColors = LEVELS[this.levelIndex].board.pairs.length;
        for (let i = 0; i < numColors; i++) { this.paths[i] = []; } // Cleaned up the undefined targetColors bug!
        
        this.drawingColor = null;
        this.isWon = false;
        
        // THE FIX: Do NOT penalize the player for simply opening the level!
        if (!isInitialLoad && typeof currentMistakes !== 'undefined') currentMistakes++;
        
        // THE FIX: Re-load pristine ice and stones from the original board data!
        const levelData = LEVELS[this.levelIndex];
        if (levelData && levelData.board) {
            this.stones = JSON.parse(JSON.stringify(levelData.board.stones || []));
            this.ices = JSON.parse(JSON.stringify(levelData.board.ices || []));
        }
        
        // NEW: Restart Time Trial timer!
        if (window.timeTrialManager && window.timeTrialManager.isActive) {
            window.timeTrialManager.startTime = performance.now();
            cancelAnimationFrame(window.timeTrialManager.timerFrame);
            window.timeTrialManager.updateTimer();
        }
        
        this.render();
    },

    useHint() {
        if (this.isWon) return;
        if (state.telescopes <= 0) { showModal("Out of Hints", "You are out of Telescopes! You can buy more in the Stardust Shop."); return; }
        
        let hintColor = -1; const numColors = LEVELS[this.levelIndex].board.pairs.length;
        for (let i = 0; i < numColors; i++) {
            if (!this.paths[i] || this.paths[i].length !== this.solution[i].length) { hintColor = i; break; }
        }

        if (hintColor !== -1) {
            state.telescopes--; saveState();
            const truePath = this.solution[hintColor];
            for (let cId in this.paths) {
                if (parseInt(cId) === hintColor) continue;
                let cutIdx = this.paths[cId].findIndex(p => truePath.some(tp => tp.x === p.x && tp.y === p.y));
                if (cutIdx !== -1) this.paths[cId] = this.paths[cId].slice(0, cutIdx);
            }
            this.paths[hintColor] = [...truePath];
            currentMistakes += 5; // Hint voids perfect clear
            playSound('win'); vibratePhone([30, 30, 30]);
            this.updateHUD(); this.render();
            setTimeout(() => this.checkWinCondition(), 500);
        }
    },

    exitToMenu() { window.ui.showLevelSelect(); },

    resizeCanvas() {
        const isMobile = window.innerWidth <= 768;
        const maxW = window.innerWidth * 0.95; 
        // THE FIX: Shrinks the canvas slightly on mobile to make room for stacked buttons!
        const maxH = window.innerHeight * (isMobile ? 0.52 : 0.60);
        
        const canvasSize = Math.min(maxW, maxH, 600);
        canvas.width = canvasSize; canvas.height = canvasSize; fxCanvas.width = canvasSize; fxCanvas.height = canvasSize;
        this.cellSize = canvasSize / this.size;
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) { wrapper.style.width = canvasSize + 'px'; wrapper.style.height = canvasSize + 'px'; }
    },

    updateHUD() {
        let filledCells = new Set();
        this.nodes.forEach(n => filledCells.add(`${n.x},${n.y}`));
        this.stones.forEach(s => filledCells.add(`${s.x},${s.y}`)); 
        for (let cId in this.paths) this.paths[cId].forEach(p => filledCells.add(`${p.x},${p.y}`));

        const pct = Math.round((filledCells.size / (this.size * this.size)) * 100);
        document.getElementById('fill-indicator').innerText = `${pct}% Filled`;
        document.getElementById('hint-count').innerText = state.telescopes;
        
        // NEW: Ramp up the background drone based on how full the board is!
        updateDynamicMusic(pct);
    },

    render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cs = this.cellSize;

        if (!this.activeFeatures.includes('void')) {
            ctx.strokeStyle = this.currentTheme.grid; ctx.lineWidth = 2;
            for(let i = 0; i <= this.size; i++) {
                ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, canvas.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(canvas.width, i * cs); ctx.stroke();
            }
        }

        let pOffset = 0; let pAlpha = 1.0;
        if (this.activeFeatures.includes('phantom') && !this.isWon) {
            pOffset = Math.sin(Date.now() / 150) * 4; pAlpha = Math.abs(Math.cos(Date.now() / 300)) * 0.8 + 0.2;
            
            // THE FIX: Kill the old animation loop before starting a new one so they don't stack up and crash the phone!
            if (this.phantomFrame) cancelAnimationFrame(this.phantomFrame);
            this.phantomFrame = requestAnimationFrame(() => this.render()); 
        }

        this.prisms.forEach(pr => {
            const cx = pr.x * cs + cs/2; const cy = pr.y * cs + cs/2;
            const cColor = WATERCOLORS[pr.colorId % WATERCOLORS.length];
            ctx.fillStyle = cColor; ctx.globalAlpha = 0.3; ctx.fillRect(pr.x*cs + cs*0.1, pr.y*cs + cs*0.1, cs*0.8, cs*0.8);
            ctx.globalAlpha = 1.0; ctx.strokeStyle = cColor; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, cy - cs*0.3); ctx.lineTo(cx + cs*0.3, cy); ctx.lineTo(cx, cy + cs*0.3); ctx.lineTo(cx - cs*0.3, cy); ctx.closePath(); ctx.stroke();
        });

        this.dust.forEach(d => {
            let cx = d.x * cs + cs/2; let cy = d.y * cs + cs/2;
            let isCovered = false;
            for (let cId in this.paths) { if (this.paths[cId].some(p => p.x === d.x && p.y === d.y)) isCovered = true; }
            if (!isCovered) {
                ctx.fillStyle = '#f1c40f'; ctx.shadowBlur = 10; ctx.shadowColor = '#f1c40f';
                ctx.beginPath(); ctx.arc(cx, cy, cs * 0.15, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }
        });

        this.portals.forEach(pt => {
            const cx = pt.x * cs + cs/2; const cy = pt.y * cs + cs/2;
            ctx.beginPath(); ctx.arc(cx, cy, cs * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(156, 39, 176, 0.4)'; ctx.fill();
            ctx.strokeStyle = '#9c27b0'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        });

        this.currents.forEach(c => {
            const cx = c.x * cs + cs/2; const cy = c.y * cs + cs/2;
            ctx.fillStyle = 'rgba(0, 188, 212, 0.4)'; ctx.fillRect(c.x * cs + cs*0.1, c.y * cs + cs*0.1, cs*0.8, cs*0.8);
            ctx.beginPath(); ctx.moveTo(cx - (c.dx * cs*0.2), cy - (c.dy * cs*0.2)); ctx.lineTo(cx + (c.dx * cs*0.2), cy + (c.dy * cs*0.2));
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        });

        this.stones.forEach(st => {
            const cx = st.x * cs + cs/2; const cy = st.y * cs + cs/2;
            ctx.beginPath(); ctx.arc(cx, cy, cs * 0.40, 0, Math.PI * 2); ctx.fillStyle = 'rgba(120, 130, 140, 0.8)'; ctx.fill();
        });

        this.ices.forEach(ice => {
            ctx.fillStyle = 'rgba(178, 235, 242, 0.6)'; ctx.fillRect(ice.x * cs + cs*0.1, ice.y * cs + cs*0.1, cs*0.8, cs*0.8);
            ctx.beginPath(); ctx.moveTo(ice.x*cs + cs*0.2, ice.y*cs + cs*0.2); ctx.lineTo(ice.x*cs + cs*0.8, ice.y*cs + cs*0.8);
            ctx.moveTo(ice.x*cs + cs*0.8, ice.y*cs + cs*0.2); ctx.lineTo(ice.x*cs + cs*0.2, ice.y*cs + cs*0.8);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
        });

        this.keys.forEach(k => {
            const cx = k.x * cs + cs/2; const cy = k.y * cs + cs/2;
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(cx, cy - cs*0.1, cs*0.15, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(cx - cs*0.05, cy, cs*0.1, cs*0.25);
        });

        this.locks.forEach(l => {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.7)'; ctx.fillRect(l.x * cs + cs*0.1, l.y * cs + cs*0.1, cs*0.8, cs*0.8);
            const cx = l.x * cs + cs/2; const cy = l.y * cs + cs/2;
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy - cs*0.05, cs*0.1, 0, Math.PI*2); ctx.fill();
            ctx.fillRect(cx - cs*0.05, cy, cs*0.1, cs*0.2);
        });

        this.waypoints.forEach(wp => {
            const cx = wp.x * cs + cs/2; const cy = wp.y * cs + cs/2;
            const color = WATERCOLORS[wp.colorId % WATERCOLORS.length];
            ctx.beginPath(); ctx.arc(cx, cy, cs * 0.25, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, cs * 0.08, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        });

        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let cId in this.paths) {
            const path = this.paths[cId]; if (path.length === 0) continue;
            const baseColor = WATERCOLORS[cId % WATERCOLORS.length];
            
            // Ethereal Ink: Fade out completed lines
            let isPathComplete = false;
            if (path.length > 1) {
                let n1 = this.nodes.find(n => n.colorId == cId && n.x === path[0].x && n.y === path[0].y);
                let n2 = this.nodes.find(n => n.colorId == cId && n.x === path[path.length-1].x && n.y === path[path.length-1].y);
                if (n1 && n2 && n1 !== n2) isPathComplete = true;
            }
            ctx.globalAlpha = (isPathComplete && this.activeFeatures.includes('ethereal')) ? 0.3 : 1.0;
            
            ctx.beginPath(); 
            for (let i = 0; i < path.length; i++) {
                let px = path[i].x * cs + cs/2; let py = path[i].y * cs + cs/2;
                if (i === 0) { ctx.moveTo(px, py); continue; }
                
                let prev = path[i-1];
                let isWrapMove = Math.abs(path[i].x - prev.x) > 1 && this.activeFeatures.includes('wrap');
                
                // Don't draw a line across the screen for Wraps or Portals
                if (isWrapMove || (prev.isPortalIn && path[i].isPortalOut)) { ctx.moveTo(px, py); } 
                else { ctx.lineTo(px, py); }
            }
            
            ctx.strokeStyle = baseColor; ctx.lineWidth = cs * 0.4; ctx.stroke(); ctx.globalAlpha = 1.0; 
        }

        this.nodes.forEach(node => {
            let isEndNode = true;
            if (this.paths[node.colorId] && this.paths[node.colorId].length > 0) {
                let startPos = this.paths[node.colorId][0];
                if (startPos.x === node.x && startPos.y === node.y) isEndNode = false;
            }
            let cx = node.x * cs + cs/2; let cy = node.y * cs + cs/2;
            ctx.globalAlpha = 1.0;
            
            if (isEndNode && this.activeFeatures.includes('phantom') && !this.isWon) { cx += pOffset; cy += pOffset; ctx.globalAlpha = pAlpha; }

            const color = WATERCOLORS[node.colorId % WATERCOLORS.length];
            
            ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowOffsetY = 3; 
            ctx.beginPath(); ctx.arc(cx, cy, cs * 0.30, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            
            ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();

           // Siphon Length Numbers OR Geometric Blueprint Cores
            if (node.targetLength && this.activeFeatures.includes('siphons')) {
                // If it's a Siphon node, draw the required length number
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `900 ${cs * 0.35}px Nunito`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(node.targetLength, cx, cy + 2);
            } else {
                // Colorblind Pass: Geometric Shapes instead of plain dots
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                let shape = node.colorId % 4; // Cycles through 4 distinct shapes
                let s = cs * 0.10;
                
                if (shape === 0) { ctx.arc(cx, cy, s, 0, Math.PI * 2); } // Circle
                else if (shape === 1) { ctx.rect(cx - s, cy - s, s*2, s*2); } // Square
                else if (shape === 2) { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s*1.2, cy + s); ctx.lineTo(cx - s*1.2, cy + s); } // Triangle
                else if (shape === 3) { ctx.moveTo(cx, cy - s*1.2); ctx.lineTo(cx + s*1.2, cy); ctx.lineTo(cx, cy + s*1.2); ctx.lineTo(cx - s*1.2, cy); } // Diamond
                
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        });

        // ---------------- REPLACE FROM HERE ---------------- 
        // The Searchlight Overlay
        if (this.activeFeatures.includes('searchlight') && !this.isWon) {
            // Only trigger the darkness and searchlight WHILE drawing
            if (this.drawingColor !== null && this.paths[this.drawingColor].length > 0) {
                ctx.save();
                let head = this.paths[this.drawingColor][this.paths[this.drawingColor].length-1];
                let lightX = head.x * cs + cs/2; let lightY = head.y * cs + cs/2;
                
                // THE FIX: Widen the radius so a human thumb doesn't completely eclipse the light!
                let gradient = ctx.createRadialGradient(lightX, lightY, cs * 1.2, lightX, lightY, cs * 5.0);
                gradient.addColorStop(0, 'rgba(15, 15, 18, 0)');     // Perfectly clear at the finger
                gradient.addColorStop(1, 'rgba(15, 15, 18, 0.98)');  // Pitch black everywhere else
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            };
        };
    },

    getGridCoord(evt) {
        const rect = canvas.getBoundingClientRect();
        let clientX = evt.clientX; let clientY = evt.clientY;
        if (evt.touches && evt.touches.length > 0) { clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY; }
        if (clientX === undefined || clientY === undefined) return null;
        return { x: Math.floor((clientX - rect.left) / this.cellSize), y: Math.floor((clientY - rect.top) / this.cellSize) };
    },

    handleStart(evt) {
        if (this.isWon) return; evt.preventDefault(); audioCtx.resume();
        if (typeof updateDynamicMusic === 'function') updateDynamicMusic(0);
        const pos = this.getGridCoord(evt); if (!pos) return;
        const node = this.nodes.find(n => n.x === pos.x && n.y === pos.y);
        
        if (node) {
            playSound('plop', 0); vibratePhone([10]);
            this.drawingColor = node.colorId;
            this.paths[this.drawingColor] = [{ x: pos.x, y: pos.y }];
            this.render(); return;
        }
        
        for (let cId in this.paths) {
            const path = this.paths[cId]; const idx = path.findIndex(p => p.x === pos.x && p.y === pos.y);
            if (idx !== -1) {
                let cutNodes = path.slice(idx + 1);
                cutNodes.forEach(cn => {
                    let iceIdx = this.ices.findIndex(ice => ice.x === cn.x && ice.y === cn.y);
                    if (iceIdx !== -1) {
                        this.ices.splice(iceIdx, 1); this.stones.push({x: cn.x, y: cn.y});
                        playSound('snap'); vibratePhone([50]);
                    }
                });

                playSound('plop', 0); vibratePhone([10]);
                this.drawingColor = cId;
                this.paths[cId] = path.slice(0, idx + 1); 
                this.render(); return;
            }
        }
    },

    handleMove(evt) {
        if (this.drawingColor === null || this.isWon) return; evt.preventDefault();
        const pos = this.getGridCoord(evt); if (!pos) return;

        if (pos.x < 0 || pos.x >= this.size || pos.y < 0 || pos.y >= this.size) return;
        if (this.stones.some(s => s.x === pos.x && s.y === pos.y)) return;

        let lock = this.locks.find(l => l.x === pos.x && l.y === pos.y);
        if (lock) {
            let keyCollected = false;
            for (let cId in this.paths) { if (this.paths[cId].some(p => this.keys.some(k => k.x === p.x && k.y === p.y && k.id === lock.id))) keyCollected = true; }
            if (!keyCollected) return; 
        }

        let prism = this.prisms.find(p => p.x === pos.x && p.y === pos.y);
        if (prism && parseInt(this.drawingColor) !== prism.colorId) return; 

        if (state.inkStyle === 'stardust' && Math.random() > 0.5) {
            spawnSplash(pos.x * this.cellSize + this.cellSize/2 + (Math.random()*20-10), pos.y * this.cellSize + this.cellSize/2 + (Math.random()*20-10), WATERCOLORS[this.drawingColor % WATERCOLORS.length]);
        }

        const currentPath = this.paths[this.drawingColor];
        const lastPos = currentPath[currentPath.length - 1];

        // Replaces the old Math.abs distance check to allow Hercules Screen Wrapping!
        let dx = Math.abs(pos.x - lastPos.x);
        let dy = Math.abs(pos.y - lastPos.y);
        let isWrap = this.activeFeatures.includes('wrap') && dy === 0 && dx === this.size - 1;
        if (dx + dy !== 1 && !isWrap) return;

        const nodeHit = this.nodes.find(n => n.x === pos.x && n.y === pos.y);
        if (nodeHit) {
            if (nodeHit.colorId !== parseInt(this.drawingColor)) return; 
            if (pos.x !== currentPath[0].x || pos.y !== currentPath[0].y) {
                currentPath.push({ x: pos.x, y: pos.y });
                playSound('snap', currentPath.length); vibratePhone([15, 30, 15]);
                this.drawingColor = null; 
                this.checkWinCondition();
                this.render(); return;
            }
        }

        const selfIdx = currentPath.findIndex(p => p.x === pos.x && p.y === pos.y);
        if (selfIdx !== -1) {
            let cutNodes = currentPath.slice(selfIdx + 1);
            cutNodes.forEach(cn => {
                let iceIdx = this.ices.findIndex(ice => ice.x === cn.x && ice.y === cn.y);
                if (iceIdx !== -1) { this.ices.splice(iceIdx, 1); this.stones.push({x: cn.x, y: cn.y}); playSound('snap'); vibratePhone([50]); }
            });
            this.paths[this.drawingColor] = currentPath.slice(0, selfIdx + 1);
            this.updateHUD(); this.render(); return;
        }

        // Replaces the old "isBlocked" check to allow Ethereal Ghost lines!
        let isBlocked = false;
        for (let cId in this.paths) {
            if (parseInt(cId) === parseInt(this.drawingColor)) continue;
            let otherPath = this.paths[cId];
            let isGhost = false;
            
            // If Ethereal is active and the other line is fully connected, it becomes a ghost you can cross!
            if (this.activeFeatures.includes('ethereal') && otherPath.length > 1) {
                let n1 = this.nodes.find(n => n.colorId == cId && n.x === otherPath[0].x && n.y === otherPath[0].y);
                let n2 = this.nodes.find(n => n.colorId == cId && n.x === otherPath[otherPath.length-1].x && n.y === otherPath[otherPath.length-1].y);
                if (n1 && n2 && n1 !== n2) isGhost = true; 
            }
            if (!isGhost && otherPath.some(p => p.x === pos.x && p.y === pos.y)) isBlocked = true;
        }
        if (isBlocked) return;

        currentPath.push({ x: pos.x, y: pos.y });
        playSound('plop', currentPath.length); vibratePhone([10]);

        let pIn = this.portals.find(p => p.x === pos.x && p.y === pos.y);
        if (pIn) {
            let pOut = this.portals.find(p => p.id === pIn.id && p !== pIn);
            if (pOut) {
                currentPath[currentPath.length - 1].isPortalIn = true;
                currentPath.push({ x: pOut.x, y: pOut.y, isPortalOut: true });
                playSound('snap'); vibratePhone([20, 20]);
                this.drawingColor = null; 
            }
        }

        let cTile = this.currents.find(c => c.x === pos.x && c.y === pos.y);
        if (cTile) {
            let nx = pos.x + cTile.dx; let ny = pos.y + cTile.dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && !this.stones.some(s => s.x === nx && s.y === ny)) {
                currentPath.push({ x: nx, y: ny });
                playSound('plop', currentPath.length); vibratePhone([10]);
                // Premium Dynamic Ink Trails
        if (state.inkStyle === 'neon') spawnSplash(pos.x * cs + cs/2, pos.y * cs + cs/2, '#ffffff', false);
        if (state.inkStyle === 'stardust' && Math.random() > 0.3) spawnSplash(pos.x * cs + cs/2, pos.y * cs + cs/2, WATERCOLORS[this.drawingColor % WATERCOLORS.length], false);
            }
        }

        this.updateHUD(); this.render();
    },

    handleEnd(evt) {
        // THE SHIELD: Only run this if we were ACTUALLY drawing an ink line!
        if (this.drawingColor !== null) {
            this.drawingColor = null;
            
            // Extra Safety Net: Only check for a win if a level is fully loaded
            if (this.nodes && this.nodes.length > 0) {
                try {
                    this.checkWinCondition();
                } catch (e) {
                    console.warn("Ghost check ignored.", e);
                }
            }
            
            this.render(); // This correctly turns off the searchlight!
        }
    },

    checkWinCondition() {
        if (this.isWon) return;
        let allPairs = true;
        const numColors = LEVELS[this.levelIndex].board.pairs.length;
        
        for (let i = 0; i < numColors; i++) {
            const path = this.paths[i];
            if (!path || path.length < 2) { allPairs = false; break; }
            const startNode = path[0], endNode = path[path.length - 1];
            const colorNodes = this.nodes.filter(n => n.colorId === i);
            const n1 = colorNodes[0], n2 = colorNodes[1];
            const startMatches = (startNode.x===n1.x && startNode.y===n1.y) || (startNode.x===n2.x && startNode.y===n2.y);
            const endMatches = (endNode.x===n1.x && endNode.y===n1.y) || (endNode.x===n2.x && endNode.y===n2.y);
            if (!startMatches || !endMatches) { allPairs = false; break; }
            
            // THE FIX: Properly extract the targetLength from the actual Node object!
            if (this.activeFeatures.includes('siphons')) {
                let targetLen = n1.targetLength || n2.targetLength;
                if (targetLen && path.length !== targetLen) { allPairs = false; break; }
            }
        }

        let filledCells = new Set();
        this.nodes.forEach(n => filledCells.add(`${n.x},${n.y}`));
        this.stones.forEach(s => filledCells.add(`${s.x},${s.y}`));
        for (let cId in this.paths) this.paths[cId].forEach(p => filledCells.add(`${p.x},${p.y}`));
        const allCellsFilled = filledCells.size === (this.size * this.size);

        let allWaypointsMet = true;
        this.waypoints.forEach(wp => {
            let wpFound = false;
            if (this.paths[wp.colorId]) wpFound = this.paths[wp.colorId].some(p => p.x === wp.x && p.y === wp.y);
            if (!wpFound) allWaypointsMet = false;
        });

        let allDustMet = true;
        this.dust.forEach(d => {
            let dFound = false;
            for(let cId in this.paths) { if(this.paths[cId].some(p => p.x === d.x && p.y === d.y)) dFound = true; }
            if(!dFound) allDustMet = false;
        });

        if (allPairs && allCellsFilled && allWaypointsMet && allDustMet) {
            this.isWon = true;
            this.render(); 
            
            if (typeof stopDynamicMusic === 'function') stopDynamicMusic();
            playSound('win'); vibratePhone([50, 50, 50, 50, 150]);
            
            for (let cId in this.paths) {
                const c = WATERCOLORS[cId % WATERCOLORS.length];
                this.paths[cId].forEach(p => { spawnSplash(p.x * this.cellSize + this.cellSize/2, p.y * this.cellSize + this.cellSize/2, c, 1, true); });
            }
            
            let earnedStars = currentMistakes === 0 ? 3 : (currentMistakes <= 5 ? 2 : 1);
            let prevStars = state.stars[this.levelIndex] || 0;
            if (earnedStars > prevStars) state.stars[this.levelIndex] = earnedStars;
            
            let dustEarned = earnedStars * 5; 
            // FIXED: Prevent the game from trying to unlock Level 1000!
            if (this.levelIndex >= maxUnlocked && this.levelIndex < LEVELS.length - 1 && this.levelIndex !== 999) {
                maxUnlocked = this.levelIndex + 1;
                dustEarned += 10; 
            }
            if (this.levelIndex !== 999) { state.stardust += dustEarned; }
            saveState();

            if (window.timeTrialManager && window.timeTrialManager.isActive) {
                window.timeTrialManager.winTrial(); // Save to database immediately!
            }

            setTimeout(() => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (let cId in this.paths) {
                    const path = this.paths[cId];
                    ctx.beginPath(); ctx.moveTo(path[0].x * this.cellSize + this.cellSize/2, path[0].y * this.cellSize + this.cellSize/2);
                    for (let i = 1; i < path.length; i++) {
                        if (path[i-1].isPortalIn && path[i].isPortalOut) ctx.moveTo(path[i].x * this.cellSize + this.cellSize/2, path[i].y * this.cellSize + this.cellSize/2);
                        else ctx.lineTo(path[i].x * this.cellSize + this.cellSize/2, path[i].y * this.cellSize + this.cellSize/2);
                    }
                    ctx.strokeStyle = WATERCOLORS[cId % WATERCOLORS.length]; ctx.lineWidth = this.cellSize * 0.4;
                    ctx.shadowBlur = 15; ctx.shadowColor = WATERCOLORS[cId % WATERCOLORS.length]; ctx.stroke();
                }
            }, 300);

            setTimeout(() => {
                // FIXED: Bulletproof check for Level 999 (Time Trials)
                if (this.levelIndex === 999) {
                    window.ui.hideAll();
                    document.getElementById('level-complete-screen').classList.add('active');
                    document.getElementById('lc-title').innerText = "TIME POSTED!";
                    document.getElementById('lc-dust').innerText = document.getElementById('hud-timer').innerText;
                    document.getElementById('lc-stars').innerText = "⏱️";
                    
                    let btnNext = document.getElementById('btn-lc-next');
                    btnNext.style.display = 'inline-block';
                    btnNext.innerText = "Try Again";
                    btnNext.onclick = () => {
                        if (window.timeTrialManager) window.timeTrialManager.startTrial();
                    };

                    let btnMap = document.getElementById('btn-lc-map');
                    btnMap.innerText = "Leaderboards"; 
                    btnMap.onclick = () => { 
                        if (window.timeTrialManager) {
                            window.timeTrialManager.isActive = false; 
                            window.timeTrialManager.showMenu(); // Kicks you straight to the leaderboard menu!
                        }
                        document.getElementById('hud-timer').style.display = 'none';
                        document.getElementById('fill-indicator').style.display = 'block';
                    };
                } else {
                    // NORMAL WIN SCREEN
                    let btnNext = document.getElementById('btn-lc-next');
                    let btnMap = document.getElementById('btn-lc-map');
                    btnNext.innerText = "Next Level"; 
                    btnMap.innerText = "Map";
                    btnMap.onclick = () => window.ui.showLevelSelect();

                    let currentSec = SECTIONS.find(s => this.levelIndex >= s.start && this.levelIndex <= s.end);
                    if (currentSec && this.levelIndex === currentSec.end) {
                        state.pendingGlow = true; saveState();
                        window.ui.currentSectionIndex++; window.ui.showLevelSelect();
                    } else { 
                        window.ui.showLevelComplete(dustEarned, earnedStars); 
                    }
                }
            }, 2500); 
        }
    }
};
window.game = game; 

/* =========================================================
   EVENT BINDINGS & STARTUP TRIGGER
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    // --- The Boot Sequence ---
    let loadProgress = 0;
    const loadBar = document.getElementById('loading-bar');
    const loadText = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');
    const loadPhrases = ["Mapping constellations...", "Calibrating physics...", "Siphoning stardust...", "Folding spacetime...", "Preparing canvas..."];
    
    const bootInterval = setInterval(() => {
        loadProgress += Math.random() * 20 + 5;
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(bootInterval);
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.remove(), 600); // Wait for fade to finish before deleting
            }, 400); // Tiny pause at 100% for satisfaction
        }
        loadBar.style.width = loadProgress + '%';
        if (Math.random() > 0.6 && loadProgress < 90) {
            loadText.innerText = loadPhrases[Math.floor(Math.random() * loadPhrases.length)];
        }
    }, 120);
    
    document.getElementById('btn-open-sketchbook').addEventListener('click', () => {
        if (!currentUser) showWelcomeTutorial(); 
        else window.ui.showLevelSelect();
    });

    document.getElementById('btn-shop').addEventListener('click', () => window.ui.showShop());
    document.getElementById('btn-journal').addEventListener('click', () => window.ui.showJournal());
    document.getElementById('btn-settings').addEventListener('click', () => window.ui.showSettings());
    
    document.getElementById('reset-btn').addEventListener('click', () => window.ui.resetProgress());
    document.getElementById('btn-back-main').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-back-main-from-shop').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-back-main-from-journal').addEventListener('click', () => window.ui.showMainMenu());
    
    document.getElementById('btn-close-book').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-restart').addEventListener('click', () => window.game.resetLevel());
    document.getElementById('btn-back-index').addEventListener('click', () => {
        if (typeof stopDynamicMusic === 'function') stopDynamicMusic();
        document.getElementById('hud-timer').style.display = 'none';
        document.getElementById('fill-indicator').style.display = 'block';
        
        if(window.game.levelIndex === 999) { 
            if(window.timeTrialManager) {
                window.timeTrialManager.isActive = false; 
                window.timeTrialManager.showMenu(); 
            }
        } else {
            window.game.exitToMenu();
        }
    });
    
    document.getElementById('btn-lc-map').addEventListener('click', () => {
        document.getElementById('hud-timer').style.display = 'none';
        document.getElementById('fill-indicator').style.display = 'block';
        
        if(window.game.levelIndex === 999) { 
            if(window.timeTrialManager) {
                window.timeTrialManager.isActive = false; 
                window.timeTrialManager.showMenu(); 
            }
        } else {
            window.ui.showLevelSelect();
        }
    });
    document.getElementById('btn-lc-next').addEventListener('click', () => {
    });
    document.getElementById('btn-hint').addEventListener('click', () => window.game.useHint());
    document.getElementById('btn-replay-tutorial').addEventListener('click', () => { playSound('plop'); showWelcomeTutorial(); });

    document.getElementById('btn-prev-star').addEventListener('click', () => {
        if (window.ui.currentSectionIndex > 0) { window.ui.currentSectionIndex--; window.ui.renderConstellationMap(); }
    });
    document.getElementById('btn-next-star').addEventListener('click', () => {
        if (window.ui.currentSectionIndex < SECTIONS.length - 1) { window.ui.currentSectionIndex++; window.ui.renderConstellationMap(); }
    });

    document.getElementById('sfx-slider').addEventListener('input', (e) => {
        state.sfxVolume = e.target.value / 100; localStorage.setItem(getKey('vol'), state.sfxVolume);
        document.getElementById('sfx-val').innerText = `${e.target.value}%`; if(e.target.value % 10 === 0) playSound('snap');
    });

    document.getElementById('ink-select').addEventListener('change', (e) => {
        state.inkStyle = e.target.value; localStorage.setItem(getKey('ink'), e.target.value);
    });

    document.getElementById('theme-select').addEventListener('change', (e) => {
        state.themeOverride = e.target.value; localStorage.setItem(getKey('theme'), e.target.value);
        if (window.ui.gameContainer.style.display === 'flex') window.game.applyTheme(LEVELS[window.game.levelIndex].theme);
    });

    document.getElementById('ui-mode-select').addEventListener('change', (e) => {
        state.uiMode = e.target.value; 
        localStorage.setItem(getKey('uimode'), state.uiMode);
        document.body.classList.toggle('dark-mode-ui', state.uiMode === 'dark');
    });

    canvas.addEventListener('mousedown', (e) => window.game.handleStart(e)); 
    window.addEventListener('mousemove', (e) => window.game.handleMove(e)); 
    window.addEventListener('mouseup', (e) => window.game.handleEnd(e));
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); window.game.handleStart(e); }, {passive: false});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); window.game.handleMove(e); }, {passive: false});
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); window.game.handleEnd(e); }, {passive: false});
    window.addEventListener('resize', () => { 
        if (window.ui.gameContainer.style.display === 'flex') { window.game.resizeCanvas(); window.game.render(); } 
        if (document.getElementById('level-select').classList.contains('active')) window.ui.drawConstellationLines();
    });

    const devBtn = document.createElement('button');
    devBtn.innerText = "Unlock All Levels";
    devBtn.style.cssText = "position:fixed; bottom:10px; right:10px; opacity:0.1; font-size:12px; z-index:9999; border:none; background:transparent; cursor:pointer; color:inherit; font-family:'Architects Daughter', cursive;";
    devBtn.onmouseenter = () => devBtn.style.opacity = "1.0"; devBtn.onmouseleave = () => devBtn.style.opacity = "0.1";
    devBtn.onclick = () => {
        showModal("Dev Access", "Enter Developer Password:", (val) => {
            if(val === "DUBrajsl") {
                maxUnlocked = 499; state.stardust += 50000; saveState();
                showModal("Unlocked", "Developer Override: All 500 Levels Unlocked. +50,000 Stardust!", () => window.ui.showLevelSelect());
            } else if (val !== null) { showModal("Access Denied", "Incorrect password."); }
        }, 'text');
    };
    document.body.appendChild(devBtn);

    window.ui.showMainMenu();
// =========================================================
    // THE MASTER UI CONTROLLER (Fixed & Simplified)
    // =========================================================
    
    // 1. PLAY GAME BUTTON (Wired to your actual map function!)
    const btnPlayGame = document.getElementById('btn-open-sketchbook');
    if (btnPlayGame) {
        let newPlayBtn = btnPlayGame.cloneNode(true);
        btnPlayGame.parentNode.replaceChild(newPlayBtn, btnPlayGame);
        newPlayBtn.addEventListener('click', () => {
            // THE FIX: Checks if you are a guest AND haven't seen the tutorial this session!
            if (!currentUser && !window.guestTutorialSeen && typeof showWelcomeTutorial === 'function') {
                window.guestTutorialSeen = true; // Remembers you saw it!
                showWelcomeTutorial(() => {
                    if (window.ui && typeof window.ui.showLevelSelect === 'function') window.ui.showLevelSelect();
                });
            } else if (window.ui && typeof window.ui.showLevelSelect === 'function') {
                window.ui.showLevelSelect();
            }
            if (typeof playSound === 'function') playSound('plop');
        });
    }

    // 2. PROTECTED MAP SWEEPER (Fixed the Unclickable Menu Bug!)
    if (window.ui) {
        window.ui.hideAll = function() {
            // THE MISSING FIX: Destroy the cloud modal when hiding the UI!
            let cloudModal = document.getElementById('cloud-modal-overlay');
            if (cloudModal) cloudModal.style.display = 'none';

            document.querySelectorAll('.screen, .app-card').forEach(el => {
                if (el.id !== 'ui-layer') {
                    el.classList.remove('active');
                    el.style.display = ''; 
                }
            });
            let menu = document.getElementById('main-menu');
            if (menu) { menu.classList.remove('active'); menu.style.display = ''; }
            let gameBox = document.getElementById('game-container');
            if (gameBox) { gameBox.style.display = 'none'; }
        };
    }

    if (window.game && typeof window.game.start === 'function') {
        const originalGameStart = window.game.start.bind(window.game);
        window.game.start = function(...args) {
            let customMap = document.getElementById('level-select');
            if (customMap) { customMap.classList.remove('active'); customMap.style.display = ''; }
            originalGameStart(...args);
        };
    }

    // 3. THE GLOBAL UI CATCHER (For Firebase Modal & Lore ONLY)
    document.addEventListener('click', (e) => {
        let btn = e.target.closest('button');

        // --- Catch Firebase Pop-up Buttons ---
        if (btn) {
            const btnId = btn.id;
            if (btnId === 'btn-open-cloud-modal') { let m = document.getElementById('cloud-modal-overlay'); if (m) m.style.display = 'flex'; if(typeof playSound==='function') playSound('plop'); return; }
            if (btnId === 'btn-close-cloud-modal') { let m = document.getElementById('cloud-modal-overlay'); if (m) m.style.display = 'none'; if(typeof playSound==='function') playSound('plop'); return; }
            if (btnId === 'btn-cloud-login' || btnId === 'btn-cloud-signup') {
                let em = document.getElementById('cloud-email'), pass = document.getElementById('cloud-password');
                if (em && pass && em.value && pass.value) {
                    if (btnId === 'btn-cloud-login' && window.loginAccount) window.loginAccount(em.value, pass.value);
                    if (btnId === 'btn-cloud-signup' && window.createAccount) window.createAccount(em.value, pass.value);
                } else alert("Please enter an email and password!");
                if(typeof playSound==='function') playSound('plop'); return;
            }
            if (btnId === 'btn-cloud-logout' && window.logoutAccount) { window.logoutAccount(); if(typeof playSound==='function') playSound('plop'); return; }
        }

        // --- Fix Blank Journal Entries ---
        let clickedLore = e.target.closest('.lore-entry') || e.target.closest('.lore-card') || e.target.closest('.shop-item');
        if (clickedLore && document.getElementById('lore-detail-screen')) {
            let detailScreen = document.getElementById('lore-detail-screen');
            detailScreen.style.color = 'var(--ink-black)'; 
            let titleEl = clickedLore.querySelector('h3') || clickedLore.querySelector('h4');
            let bodyEl = clickedLore.querySelector('p');
            let destTitle = detailScreen.querySelector('h2') || detailScreen.querySelector('h3');
            let destBody = detailScreen.querySelector('p');
            if (destTitle && titleEl) destTitle.innerText = titleEl.innerText;
            if (destBody && bodyEl) destBody.innerText = bodyEl.innerText;
        }
    });
    /* =========================================================
       TIME TRIALS & LEADERBOARD ENGINE
       ========================================================= */
    const timeTrialManager = {
        isActive: false, currentGrid: 3, currentLvl: 1, 
        startTime: 0, timeMs: 0, timerFrame: null, boardSeed: 0, lbUnsubscribe: null, pbUnsubscribe: null,

        // Seeded RNG: Guarantees every player gets the exact same "random" board for that layout
        seededRandom(seed) {
            return function() {
                var t = seed += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            }
        },

        initMenu() {
            const gridSelect = document.getElementById('tt-grid-select');
            gridSelect.innerHTML = '';
            for(let i = 3; i <= 12; i++) {
                let opt = document.createElement('option');
                opt.value = i; opt.innerText = `${i}x${i} Grid`;
                gridSelect.appendChild(opt);
            }
            gridSelect.onchange = (e) => { this.currentGrid = parseInt(e.target.value); this.renderLevelGrid(); };
            
            document.getElementById('btn-time-trials').addEventListener('click', () => {
                // THE FIX: Allows guests to enter the lobby after watching the tutorial once!
                if(!currentUser && !window.guestTutorialSeen) { 
                    window.guestTutorialSeen = true;
                    showWelcomeTutorial(() => this.showMenu()); 
                    return; 
                }
                this.showMenu();
            });
            
            // THE FIX: Wire up the new dedicated Play Button!
            let playBtn = document.getElementById('btn-start-time-trial');
            if (playBtn) playBtn.addEventListener('click', () => this.startTrial());

            document.getElementById('btn-back-main-from-tt').addEventListener('click', () => window.ui.showMainMenu());
        },

        showMenu() {
            window.ui.hideAll();
            document.getElementById('time-trials-screen').classList.add('active');
            document.getElementById('time-trials-screen').style.display = 'flex';
            this.renderLevelGrid();
        },

        renderLevelGrid() {
            const grid = document.getElementById('tt-level-grid');
            grid.innerHTML = '';
            for(let i = 1; i <= 10; i++) {
                let btn = document.createElement('button');
                btn.className = `tt-lvl-btn ${this.currentLvl === i ? 'active' : ''}`;
                btn.innerText = `Lvl ${i}`;
                
                // THE FIX: Clicking a level NOW ONLY shows the leaderboard. No accidental starts!
                btn.onclick = () => {
                    this.currentLvl = i; 
                    document.querySelectorAll('.tt-lvl-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadLeaderboard();
                };
                grid.appendChild(btn);
            }
            this.loadLeaderboard(); 
        },

        startTrial() {
            this.isActive = true;
            this.boardSeed = (this.currentGrid * 100) + this.currentLvl; 
            
            // Generate the fixed board
            let originalRandom = Math.random;
            Math.random = this.seededRandom(this.boardSeed);
            let ttBoard = null; let attempts = 0; let colors = Math.max(2, Math.floor(this.currentGrid / 1.5));
            while (!ttBoard && colors >= 2 && attempts < 100) {
                ttBoard = generateLevelBoard(this.currentGrid, colors, ['stones']);
                if(!ttBoard) { attempts++; if(attempts%10===0) colors--; }
            }
            Math.random = originalRandom; 

            LEVELS[999] = { 
                title: `${this.currentGrid}x${this.currentGrid} | Lvl ${this.currentLvl}`, 
                flavor: "TIME TRIAL ACTIVE", size: this.currentGrid, 
                targetColors: colors, features: ['stones'], theme: 'void', isTutorial: false, board: ttBoard 
            };

            window.ui.hideAll();
            document.getElementById('fill-indicator').style.display = 'none';
            document.getElementById('hud-timer').style.display = 'block';
            
            window.game.start(999);
            
            // Start Timer
            this.startTime = performance.now();
            this.updateTimer();
        },

        updateTimer() {
            if(!timeTrialManager.isActive || window.game.isWon) return;
            let elapsed = performance.now() - timeTrialManager.startTime;
            timeTrialManager.timeMs = elapsed;
            let mins = Math.floor(elapsed / 60000);
            let secs = Math.floor((elapsed % 60000) / 1000);
            let ms = Math.floor(elapsed % 1000);
            document.getElementById('hud-timer').innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
            timeTrialManager.timerFrame = requestAnimationFrame(() => timeTrialManager.updateTimer());
        },

        winTrial() {
            this.isActive = false;
            cancelAnimationFrame(this.timerFrame);
            
            // Allow players with local accounts to post to the leaderboard too!
            let uid = (auth && auth.currentUser) ? auth.currentUser.uid : currentUser;
            let displayName = (auth && auth.currentUser && auth.currentUser.email) ? auth.currentUser.email.split('@')[0] : currentUser;

            if (uid) {
                const boardID = `${this.currentGrid}x${this.currentGrid}_${this.currentLvl}`;
                const docRef = db.collection('leaderboards').doc(boardID).collection('scores').doc(uid);
                
                docRef.get().then(doc => {
                    if(!doc.exists || doc.data().timeMs > this.timeMs) {
                        docRef.set({ username: displayName, timeMs: this.timeMs, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
                        .then(() => {
                            console.log("New Time Trial Record Saved!");
                        }).catch(e => console.error("Firebase Save Error:", e));
                    }
                }).catch(e => console.error("Firebase Get Error:", e));
            }
        },

        loadLeaderboard() {
            const boardID = `${this.currentGrid}x${this.currentGrid}_${this.currentLvl}`;
            const lbContainer = document.getElementById('tt-leaderboard');
            const pbContainer = document.getElementById('tt-personal-best');
            
            lbContainer.innerHTML = '<p style="text-align:center;">Fetching subspace signals...</p>';
            if (pbContainer) pbContainer.style.display = 'none'; // Hide PB until we find one
            
            // Stop listening to the old board if we click a new one
            if (this.lbUnsubscribe) { this.lbUnsubscribe(); }
            if (this.pbUnsubscribe) { this.pbUnsubscribe(); }
            
            // 1. Fetch the Global Top 10
            this.lbUnsubscribe = db.collection('leaderboards').doc(boardID).collection('scores')
              .orderBy('timeMs').limit(10).onSnapshot(snapshot => {
                  lbContainer.innerHTML = '';
                  if(snapshot.empty) { lbContainer.innerHTML = '<p style="text-align:center;">No records found. Be the first!</p>'; return; }
                  
                  let rank = 1;
                  snapshot.forEach(doc => {
                      let data = doc.data();
                      let mins = Math.floor(data.timeMs / 60000);
                      let secs = Math.floor((data.timeMs % 60000) / 1000);
                      let ms = Math.floor(data.timeMs % 1000);
                      let timeString = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
                      
                      let div = document.createElement('div');
                      div.className = `leaderboard-entry ${rank === 1 ? 'first-place' : ''}`;
                      div.innerHTML = `<div><span class="rank">#${rank}</span> ${data.username}</div><div>${timeString}</div>`;
                      lbContainer.appendChild(div);
                      rank++;
                  });
              }, err => {
                  lbContainer.innerHTML = '<p style="text-align:center; color:red;">Failed to load leaderboard.</p>';
              });

            // 2. NEW: Fetch Your Personal Best Privately
            let uid = (auth && auth.currentUser) ? auth.currentUser.uid : currentUser;
            if (uid && pbContainer) {
                this.pbUnsubscribe = db.collection('leaderboards').doc(boardID).collection('scores').doc(uid)
                  .onSnapshot(doc => {
                      pbContainer.style.display = 'block'; // ALWAYS show the container now!
                      
                      if (doc.exists) {
                          let data = doc.data();
                          let mins = Math.floor(data.timeMs / 60000);
                          let secs = Math.floor((data.timeMs % 60000) / 1000);
                          let ms = Math.floor(data.timeMs % 1000);
                          let timeString = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
                          
                          pbContainer.innerHTML = `<div class="leaderboard-entry" style="border-bottom:none; color:var(--primary);"><div style="font-family:'Nunito', sans-serif; font-weight: 900;">★ Your Best:</div><div>${timeString}</div></div>`;
                      } else {
                          // THE FIX: Show N/A instead of hiding the box!
                          pbContainer.innerHTML = `<div class="leaderboard-entry" style="border-bottom:none; color:var(--primary); opacity: 0.6;"><div style="font-family:'Nunito', sans-serif; font-weight: 900;">★ Your Best:</div><div>N/A</div></div>`;
                      }
                  });
            }
        }
    };
    // THE FIX: Make the manager globally accessible so the Game Engine can see it!
    window.timeTrialManager = timeTrialManager; 
    
    timeTrialManager.initMenu();                         
});