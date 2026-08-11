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
    uiMode: 'light'
};

let state = { ...defaultState };
let maxUnlocked = 0;
let lastPlayedLevel = -1;
let currentMistakes = 0;

/* =========================================================
   FIREBASE BACKEND DATABASE SYSTEM
   ========================================================= */
const firebaseConfig = {
    apiKey: "AIzaSyDz2zxc68JS6tHG_hkvWoMAKid_ulVsUI0", 
    authDomain: "starlight-connections.firebaseapp.com", 
    projectId: "starlight-connections", 
    storageBucket: "starlight-connections.firebasestorage.app", 
    messagingSenderId: "100102338562", 
    appId: "1:100102338562:web:6f3569882c628b44614f1b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function saveToCloud() {
    if (auth.currentUser) {
        db.collection("users").doc(auth.currentUser.uid).set({
            state: state,
            maxUnlocked: maxUnlocked,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => console.log("✅ Game saved to the cloud!"))
        .catch((error) => console.error("🚨 Cloud save failed:", error));
    }
}

function loadFromCloud(uid) {
    db.collection("users").doc(uid).get().then((doc) => {
        if (doc.exists) {
            let cloudData = doc.data();
            state = { ...defaultState, ...cloudData.state };
            maxUnlocked = cloudData.maxUnlocked || 1;
            console.log("☁️ Cloud save loaded successfully!");
            localStorage.setItem(getKey('save'), JSON.stringify(state));
            if (window.ui && typeof window.ui.showMainMenu === 'function') window.ui.showMainMenu();
        } else {
            console.log("New account detected. Creating fresh cloud save.");
            saveToCloud(); 
        }
    }).catch((error) => console.error("🚨 Error loading cloud save:", error));
}

auth.onAuthStateChanged((user) => {
    const loggedOutUI = document.getElementById('logged-out-ui');
    const loggedInUI = document.getElementById('logged-in-ui');
    const emailDisplay = document.getElementById('user-email-display');

    if (user) {
        if (loggedOutUI) loggedOutUI.style.display = 'none';
        if (loggedInUI) loggedInUI.style.display = 'block';
        if (emailDisplay) emailDisplay.innerText = user.email;
        loadFromCloud(user.uid);
    } else {
        if (loggedOutUI) loggedOutUI.style.display = 'block';
        if (loggedInUI) loggedInUI.style.display = 'none';
    }
});

window.createAccount = function(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => { alert("Account created! Game is now synced to the cloud."); saveToCloud(); })
        .catch((error) => alert("Error: " + error.message));
};

window.loginAccount = function(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(() => alert("Welcome back! Loading cloud save..."))
        .catch((error) => alert("Error: " + error.message));
};

window.logoutAccount = function() {
    auth.signOut().then(() => {
        alert("Logged out securely.");
        state = { ...defaultState }; maxUnlocked = 1;
        saveState(); window.location.reload();
    });
};

function loadState() {
    try {
        let saved = localStorage.getItem(getKey('save'));
        if (saved) {
            let parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
            maxUnlocked = state.maxUnlocked || 1;
        }
    } catch (e) { console.error("Save corrupted, using defaults."); }
    
    state.uiMode = localStorage.getItem(getKey('uimode')) || 'light';
    document.body.classList.toggle('dark-mode-ui', state.uiMode === 'dark');
}

function saveState() {
    state.maxUnlocked = maxUnlocked;
    localStorage.setItem(getKey('save'), JSON.stringify(state));
    localStorage.setItem(getKey('uimode'), state.uiMode);
    if (typeof saveToCloud === 'function') saveToCloud();
}

loadState();