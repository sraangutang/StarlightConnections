/* =========================================================
   CUSTOM MODALS & TUTORIALS (STRIPPED BACK)
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
        if(typeof playSound === 'function') playSound('plop');
        document.getElementById('custom-modal').style.display = 'none';
        if(callback) {
            if(inputType === 'auth') callback({ user: inputUser.value.trim(), pass: inputPass.value });
            else if(inputType === 'text') callback(inputUser.value.trim());
            else callback();
        }
    };

    cancelBtn.onclick = () => {
        if(typeof playSound === 'function') playSound('plop');
        document.getElementById('custom-modal').style.display = 'none';
    };
}

function showWelcomeTutorial(onCompleteCallback = null) {
    const slides = [
        "<b>How to Play</b><br><br>Connect matching colors with a continuous line.",
        "<b>Fill the Grid</b><br><br>Every empty tile on the board must be filled. Lines cannot cross each other.",
        "<b>Controls</b><br><br>Tap and drag to draw. Trace backward over your line to erase.",
        "<b>Stardust</b><br><br>Earn 3 stars for flawless clears. Using hints or restarting lowers your star rating.",
        "<b>Progression</b><br><br>Spend Stardust in the Shop to unlock new themes and inks. Create an account in Settings to save your progress."
    ];
    let currentSlide = 0;

    const overlay = document.createElement('div');
    overlay.id = 'welcome-tutorial-overlay';
    overlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:90000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:'Nunito', sans-serif;`;
    
    const box = document.createElement('div');
    box.className = 'tutorial-card'; 
    box.style.cssText = `background:var(--paper-bg); color:var(--ink-black); padding:40px; border-radius:24px; text-align:center; max-width:600px; width:90vw; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-height: 80vh; overflow-y: auto;`;

    const title = document.createElement('h2'); title.className = 'tutorial-title'; 
    title.style.cssText = "font-family:'Architects Daughter', cursive; font-size:4rem; margin-top:0; margin-bottom:20px; color:var(--primary);"; 
    title.innerText = "Tutorial";

    const content = document.createElement('p'); content.className = 'tutorial-text'; 
    content.style.cssText = "font-size:1.4rem; margin:10px 0; line-height:1.5; font-weight:600;"; content.innerHTML = slides[currentSlide];

    const btn = document.createElement('button'); btn.className = 'sketch-btn primary'; btn.style.marginTop = '30px'; btn.innerText = "Next ➔";

    btn.onclick = () => {
        if(typeof playSound === 'function') playSound('plop');
        currentSlide++;
        if (currentSlide < slides.length) {
            content.innerHTML = slides[currentSlide];
            if (currentSlide === slides.length - 1) btn.innerText = "Play!";
        } else {
            overlay.remove(); localStorage.setItem('sc_tutorial_seen', 'true'); 
            if (typeof onCompleteCallback === 'function') onCompleteCallback();
        }
    };
    box.appendChild(title); box.appendChild(content); box.appendChild(btn); overlay.appendChild(box); document.body.appendChild(overlay);
}

const MECHANIC_SLIDES = {
    26:  ["<b>Stones</b><br><br>Draw around the grey stones. They count as filled space."],
    51:  ["<b>Waypoints</b><br><br>Lines must pass through their matching colored rings."],
    101: ["<b>The Void</b><br><br>The grid guidelines have been removed."],
    151: ["<b>Prisms</b><br><br>Lines can only pass through prisms of the same color."],
    201: ["<b>Portals</b><br><br>Enter one portal to instantly exit the matching one."],
    251: ["<b>Currents</b><br><br>Arrows force your line to move in that direction."],
    301: ["<b>Keys & Doors</b><br><br>Collect the yellow key to open red doors across the board."],
    351: ["<b>Fragile Ice</b><br><br>Ice tiles will shatter if you erase a line drawn over them."],
    401: ["<b>Shifting Nodes</b><br><br>Target nodes will move while you draw."],
    451: ["<b>Cosmic Dust</b><br><br>Sweep up all the golden dust to complete the level."]
};

function showMechanicTutorial(levelNum, themeData) {
    if (!MECHANIC_SLIDES[levelNum]) return;
    const slides = MECHANIC_SLIDES[levelNum]; let currentSlide = 0;
    const overlay = document.createElement('div'); overlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:'Nunito', sans-serif;`;
    const box = document.createElement('div'); box.className = 'tutorial-card'; 
    let boxBg = themeData.bg === 'transparent' ? '#1a237e' : themeData.bg;
    box.style.cssText = `background:${boxBg}; color:${themeData.text}; padding:50px; border-radius: 255px 15px 225px 15px/15px 225px 15px 255px; border:3px solid ${themeData.text}; text-align:center; max-width:600px; width:90vw; box-shadow: 8px 8px 0px rgba(0,0,0,0.4); max-height: 80vh; overflow-y: auto;`;
    
    const title = document.createElement('h2'); title.className = 'tutorial-title'; 
    title.style.cssText = "font-family:'Architects Daughter', cursive; font-size:4.5rem; margin-top:0; margin-bottom:15px;"; 
    title.innerText = "New Feature";

    const content = document.createElement('p'); content.className = 'tutorial-text'; content.style.cssText = "font-size:2.5rem; margin:10px 0; line-height:1.2;"; content.innerHTML = slides[currentSlide];
    const btn = document.createElement('button'); btn.className = 'sketch-btn'; btn.style.marginTop = '30px'; btn.style.background = themeData.text; btn.style.color = boxBg; btn.innerText = slides.length > 1 ? "Next ➔" : "Let's Draw!";

    btn.onclick = () => {
        if(typeof playSound === 'function') playSound('plop');
        currentSlide++;
        if (currentSlide < slides.length) {
            content.innerHTML = slides[currentSlide];
            if (currentSlide === slides.length - 1) btn.innerText = "Let's Draw!";
        } else { overlay.remove(); }
    };
    box.appendChild(title); box.appendChild(content); box.appendChild(btn); overlay.appendChild(box); document.body.appendChild(overlay);
}

/* =========================================================
   UI OBJECT
   ========================================================= */
const ui = {
    screens: document.querySelectorAll('.screen'),
    gameContainer: document.getElementById('game-container'),
    currentSectionIndex: 0,
    
    hideAll() { 
        let cloudModal = document.getElementById('cloud-modal-overlay'); if (cloudModal) cloudModal.style.display = 'none';
        this.screens = document.querySelectorAll('.screen');
        this.screens.forEach(s => { if (s.id !== 'ui-layer') { s.classList.remove('active'); s.style.display = ''; } });
        let menu = document.getElementById('main-menu'); if (menu) { menu.classList.remove('active'); menu.style.display = ''; }
        if (this.gameContainer) this.gameContainer.style.display = 'none'; 
    },
    
    showMainMenu() {
        this.hideAll();
        if (window.game && typeof window.game.applyTheme === 'function') window.game.applyTheme('fundamentals');
        let menu = document.getElementById('main-menu');
        if(menu) { menu.classList.add('active'); menu.style.display = 'flex'; }
    },

    showShop() {
        this.hideAll(); if(window.game) window.game.applyTheme('fundamentals');
        document.getElementById('shop-screen').classList.add('active');
        document.getElementById('shop-stardust-display').innerText = state.stardust;
        const container = document.getElementById('shop-items-container'); container.innerHTML = '';

        Object.keys(INKS).forEach(key => {
            if(key === 'watercolor') return; 
            const item = INKS[key]; const div = document.createElement('div'); div.className = 'shop-item';
            const isOwned = state.inventory[`ink_${key}`];
            div.innerHTML = `<span>🎨 ${item.name}</span> <button class="sketch-btn sm shop-btn" ${isOwned ? 'disabled' : ''} onclick="window.ui.buyItem('ink_${key}', ${item.price}, this)">${isOwned ? 'Owned' : item.price + ' Dust'}</button>`;
            container.appendChild(div);
        });

        ['obsidian', 'supernova', 'aurora'].forEach(key => {
            const item = THEMES[key]; const div = document.createElement('div'); div.className = 'shop-item';
            const isOwned = state.inventory[`theme_${key}`];
            div.innerHTML = `<span>🌌 ${item.name} (Theme)</span> <button class="sketch-btn sm shop-btn" ${isOwned ? 'disabled' : ''} onclick="window.ui.buyItem('theme_${key}', ${item.price}, this)">${isOwned ? 'Owned' : item.price + ' Dust'}</button>`;
            container.appendChild(div);
        });

        const teleDiv = document.createElement('div'); teleDiv.className = 'shop-item';
        teleDiv.innerHTML = `<span>🔭 +1 Hint</span><button class="sketch-btn sm shop-btn" onclick="window.ui.buyHints()">100 Dust</button>`;
        container.appendChild(teleDiv);
    },

    buyItem(id, price, btnElement) {
        if (state.stardust >= price) {
            state.stardust -= price; state.inventory[id] = true; saveState();
            if(typeof vibratePhone==='function') vibratePhone([50, 50, 50]); 
            if(typeof playSound==='function') playSound('snap');
            document.getElementById('shop-stardust-display').innerText = state.stardust;
            if (btnElement) { btnElement.disabled = true; btnElement.innerText = "Owned"; }
            showModal("Purchased!", "Item has been added to your settings.");
        } else { showModal("Insufficient Stardust", "Solve more puzzles to earn stardust."); }
    },

    buyHints() {
        if (state.stardust >= 100) {
            state.stardust -= 100; state.telescopes += 1; saveState();
            if(typeof vibratePhone==='function') vibratePhone([50, 50, 50]); 
            if(typeof playSound==='function') playSound('snap');
            document.getElementById('shop-stardust-display').innerText = state.stardust;
            showModal("Purchased!", "You now have " + state.telescopes + " hints.");
        } else { showModal("Insufficient Stardust", "Solve more puzzles to earn stardust."); }
    },

    showJournal() {
        this.hideAll(); if(window.game) window.game.applyTheme('fundamentals');
        document.getElementById('journal-screen').classList.add('active');
        const container = document.getElementById('journal-entries-container'); container.innerHTML = '';
        SECTIONS.forEach(sec => {
            if (maxUnlocked >= sec.end) {
                const div = document.createElement('div'); div.className = 'lore-entry';
                div.innerHTML = `<h3 class="lore-title">${sec.name} Sequence</h3><p class="lore-text">"${sec.lore}"</p>`;
                container.appendChild(div);
            }
        });
        if (container.innerHTML === '') container.innerHTML = '<p class="lore-text" style="text-align:center;">Complete a full Constellation to decrypt entries.</p>';
    },

    showSettings() {
        this.hideAll(); document.getElementById('settings-screen').classList.add('active');
        const inkSelect = document.getElementById('ink-select'); inkSelect.innerHTML = '';
        Object.keys(INKS).forEach(key => {
            if (state.inventory[`ink_${key}`]) {
                const opt = document.createElement('option'); opt.value = key; opt.innerText = INKS[key].name; inkSelect.appendChild(opt);
            }
        });
        const themeSelect = document.getElementById('theme-select'); themeSelect.innerHTML = '<option value="auto">Auto (Matches Map)</option>';
        let unlockedThemes = new Set(['fundamentals']); 
        for(let i=0; i<=maxUnlocked; i++) {
            let sec = SECTIONS.find(s => i >= s.start && i <= s.end); if(sec) unlockedThemes.add(sec.theme);
        }
        ['obsidian', 'supernova', 'aurora'].forEach(pTheme => { if(state.inventory[`theme_${pTheme}`]) unlockedThemes.add(pTheme); });
        unlockedThemes.forEach(key => { const opt = document.createElement('option'); opt.value = key; opt.innerText = THEMES[key].name; themeSelect.appendChild(opt); });
        themeSelect.value = state.themeOverride; inkSelect.value = state.inkStyle;
        document.getElementById('sfx-slider').value = state.sfxVolume * 100;
        document.getElementById('sfx-val').innerText = Math.round(state.sfxVolume * 100) + '%';
        document.getElementById('ui-mode-select').value = state.uiMode;
    },

    showLevelSelect() {
        this.hideAll();
        let mapTarget = (lastPlayedLevel >= 0 && lastPlayedLevel !== 999) ? lastPlayedLevel : maxUnlocked;
        this.currentSectionIndex = SECTIONS.findIndex(s => mapTarget >= s.start && mapTarget <= s.end);
        if (this.currentSectionIndex === -1) this.currentSectionIndex = SECTIONS.length - 1; 
        
        this.renderConstellationMap();
        document.getElementById('level-select').classList.add('active');

        if(state.pendingGlow) {
            const canvasObj = document.getElementById('constellation-canvas'); canvasObj.classList.add('angelic-glow');
            setTimeout(() => { showModal("Sequence Completed!", "A new puzzle fragment has been added to the Map Lore.", () => { canvasObj.classList.remove('angelic-glow'); }); }, 1000);
            state.pendingGlow = false; saveState();
        }
    },

    renderConstellationMap() {
        const sec = SECTIONS[this.currentSectionIndex];
        if(window.game) window.game.applyTheme(sec.theme); 
        document.getElementById('constellation-title').innerText = sec.name;
        document.getElementById('constellation-subtitle').innerText = `Levels ${sec.start + 1} - ${sec.end + 1}`;
        document.getElementById('btn-prev-star').disabled = this.currentSectionIndex === 0;
        document.getElementById('btn-next-star').disabled = (this.currentSectionIndex === SECTIONS.length - 1) || (maxUnlocked < sec.end + 1);
        
        const grid = document.getElementById('level-grid-container'); grid.innerHTML = '';
        const total = sec.end - sec.start + 1; const secTheme = THEMES[sec.theme];
        let coordsList = [];
        for (let i = 0; i < total; i++) coordsList.push(getStarCoords(i, total, this.currentSectionIndex));

        for (let iter = 0; iter < 20; iter++) {
            for (let i = 0; i < coordsList.length; i++) {
                for (let j = i + 1; j < coordsList.length; j++) {
                    let dx = coordsList[j].x - coordsList[i].x; let dy = coordsList[j].y - coordsList[i].y;
                    let dist = Math.sqrt(dx * dx + dy * dy); let minDist = 8; 
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
            const btn = document.createElement('button'); btn.className = 'level-btn';
            let starsHtml = ''; if (state.stars[levelIdx] !== undefined) { starsHtml = `<div class="star-rating">${'★'.repeat(state.stars[levelIdx])}</div>`; }
            btn.innerHTML = `${levelIdx + 1}${starsHtml}`;
            btn.style.width = '50px'; btn.style.height = '50px'; btn.style.left = coords.x + '%'; btn.style.top = coords.y + '%'; btn.style.color = secTheme.text;

            if (levelIdx <= maxUnlocked) { btn.onclick = () => { lastPlayedLevel = levelIdx; if(window.game) window.game.start(levelIdx); } } 
            else { btn.disabled = true; }
            grid.appendChild(btn);
        });
        setTimeout(() => this.drawConstellationLines(coordsList, secTheme.text), 100);
    },

    drawConstellationLines(coordsList, color) {
        if (coordsList) this.lastCoords = coordsList;
        if (color) this.lastColor = color;
        let currentCoords = coordsList || this.lastCoords;
        let currentColor = color || this.lastColor;
        if (!currentCoords) return; 

        const wrapper = document.getElementById('constellation-wrapper');
        const cCanvas = document.getElementById('constellation-canvas');
        cCanvas.width = wrapper.clientWidth; cCanvas.height = wrapper.clientHeight;
        const cCtx = cCanvas.getContext('2d');
        cCtx.clearRect(0,0, cCanvas.width, cCanvas.height);
        
        cCtx.strokeStyle = currentColor; cCtx.globalAlpha = 0.3; cCtx.lineWidth = 2; cCtx.lineCap = 'round'; cCtx.lineJoin = 'round';
        cCtx.setLineDash([5, 5]); cCtx.beginPath();
        for(let i=0; i<currentCoords.length; i++) {
            const levelIdx = SECTIONS[this.currentSectionIndex].start + i;
            if(levelIdx > maxUnlocked) break; 
            const px = (currentCoords[i].x / 100) * cCanvas.width; const py = (currentCoords[i].y / 100) * cCanvas.height;
            if(i===0) cCtx.moveTo(px, py); else cCtx.lineTo(px, py);
        }
        cCtx.stroke(); cCtx.globalAlpha = 1.0; 
    },

    showLevelComplete(dustEarned, earnedStars) {
        this.hideAll(); document.getElementById('level-complete-screen').classList.add('active');
        let starString = '';
        for (let i = 0; i < 3; i++) { starString += (i < earnedStars) ? '★' : '☆'; }
        document.getElementById('lc-stars').innerText = starString;
        document.getElementById('lc-dust').innerText = `+${dustEarned || 0} Stardust`;

        if (lastPlayedLevel >= maxUnlocked) { maxUnlocked = lastPlayedLevel + 1; saveState(); }
        
        if (lastPlayedLevel >= LEVELS.length - 1) { document.getElementById('btn-lc-next').style.display = 'none'; } 
        else {
            document.getElementById('btn-lc-next').style.display = 'inline-block';
            document.getElementById('btn-lc-next').onclick = () => window.game.start(lastPlayedLevel + 1);
        }
    },

    resetProgress() {
        showModal("Erase Progress", "Are you sure you want to delete this profile's save data and start over?", () => {
            maxUnlocked = 0; lastPlayedLevel = -1;
            state.stardust = 0; state.telescopes = 3; state.stars = {};
            state.inventory = { ink_watercolor: true, theme_fundamentals: true };
            state.inkStyle = 'watercolor'; state.themeOverride = 'auto'; 
            saveState(); this.showMainMenu();
        });
    }
};
window.ui = ui; 

/* =========================================================
   APP BOOT SEQUENCE & EVENT LISTENERS
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    let loadProgress = 0; const loadBar = document.getElementById('loading-bar'); const loadText = document.getElementById('loading-text'); const loadingScreen = document.getElementById('loading-screen');
    const loadPhrases = ["Loading assets...", "Generating levels...", "Connecting database...", "Preparing UI..."];
    
    const bootInterval = setInterval(() => {
        loadProgress += Math.random() * 20 + 5;
        if (loadProgress >= 100) {
            loadProgress = 100; clearInterval(bootInterval);
            setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.remove(), 600); }, 400); 
        }
        loadBar.style.width = loadProgress + '%';
        if (Math.random() > 0.6 && loadProgress < 90) { loadText.innerText = loadPhrases[Math.floor(Math.random() * loadPhrases.length)]; }
    }, 120);

    if (window.game && typeof window.game.start === 'function') {
        const originalGameStart = window.game.start.bind(window.game);
        window.game.start = function(...args) {
            let customMap = document.getElementById('level-select');
            if (customMap) { customMap.classList.remove('active'); customMap.style.display = ''; }
            originalGameStart(...args);
        };
    }

    const btnPlayGame = document.getElementById('btn-open-sketchbook');
    if (btnPlayGame) {
        let newPlayBtn = btnPlayGame.cloneNode(true); btnPlayGame.parentNode.replaceChild(newPlayBtn, btnPlayGame);
        newPlayBtn.addEventListener('click', () => {
            if (!currentUser && !window.guestTutorialSeen && typeof showWelcomeTutorial === 'function') {
                window.guestTutorialSeen = true; 
                showWelcomeTutorial(() => { if (window.ui) window.ui.showLevelSelect(); });
            } else if (window.ui) { window.ui.showLevelSelect(); }
            if (typeof playSound === 'function') playSound('plop');
        });
    }

    document.getElementById('btn-shop').addEventListener('click', () => window.ui.showShop());
    document.getElementById('btn-journal').addEventListener('click', () => window.ui.showJournal());
    document.getElementById('btn-settings').addEventListener('click', () => window.ui.showSettings());
    document.getElementById('reset-btn').addEventListener('click', () => window.ui.resetProgress());
    document.getElementById('btn-back-main').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-back-main-from-shop').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-back-main-from-journal').addEventListener('click', () => window.ui.showMainMenu());
    document.getElementById('btn-close-book').addEventListener('click', () => window.ui.showMainMenu());
    
    document.getElementById('btn-restart').addEventListener('click', () => { if(window.game) window.game.resetLevel(); });
    document.getElementById('btn-back-index').addEventListener('click', () => {
        if (typeof stopDynamicMusic === 'function') stopDynamicMusic();
        document.getElementById('hud-timer').style.display = 'none'; document.getElementById('fill-indicator').style.display = 'block';
        if(window.game && window.game.levelIndex === 999) { if(window.timeTrialManager) { window.timeTrialManager.isActive = false; window.timeTrialManager.showMenu(); } } 
        else { if(window.game) window.game.exitToMenu(); }
    });
    
    document.getElementById('btn-lc-map').addEventListener('click', () => {
        document.getElementById('hud-timer').style.display = 'none'; document.getElementById('fill-indicator').style.display = 'block';
        if(window.game && window.game.levelIndex === 999) { if(window.timeTrialManager) { window.timeTrialManager.isActive = false; window.timeTrialManager.showMenu(); } } 
        else { window.ui.showLevelSelect(); }
    });

    document.getElementById('btn-hint').addEventListener('click', () => { if(window.game) window.game.useHint(); });
    document.getElementById('btn-replay-tutorial').addEventListener('click', () => { if(typeof playSound==='function') playSound('plop'); showWelcomeTutorial(); });
    document.getElementById('btn-prev-star').addEventListener('click', () => { if (window.ui.currentSectionIndex > 0) { window.ui.currentSectionIndex--; window.ui.renderConstellationMap(); } });
    document.getElementById('btn-next-star').addEventListener('click', () => { if (window.ui.currentSectionIndex < SECTIONS.length - 1) { window.ui.currentSectionIndex++; window.ui.renderConstellationMap(); } });

    document.getElementById('sfx-slider').addEventListener('input', (e) => {
        state.sfxVolume = e.target.value / 100; localStorage.setItem(getKey('vol'), state.sfxVolume);
        document.getElementById('sfx-val').innerText = `${e.target.value}%`; if(e.target.value % 10 === 0 && typeof playSound==='function') playSound('snap');
    });

    document.getElementById('ink-select').addEventListener('change', (e) => { state.inkStyle = e.target.value; localStorage.setItem(getKey('ink'), e.target.value); });
    document.getElementById('theme-select').addEventListener('change', (e) => {
        state.themeOverride = e.target.value; localStorage.setItem(getKey('theme'), e.target.value);
        if (window.ui.gameContainer.style.display === 'flex') window.game.applyTheme(LEVELS[window.game.levelIndex].theme);
    });
    document.getElementById('ui-mode-select').addEventListener('change', (e) => {
        state.uiMode = e.target.value; localStorage.setItem(getKey('uimode'), state.uiMode);
        document.body.classList.toggle('dark-mode-ui', state.uiMode === 'dark');
    });

    const canvas = document.getElementById('game-canvas');
    if(canvas) {
        canvas.addEventListener('mousedown', (e) => { if(window.game) window.game.handleStart(e); }); 
        window.addEventListener('mousemove', (e) => { if(window.game) window.game.handleMove(e); }); 
        window.addEventListener('mouseup', (e) => { if(window.game) window.game.handleEnd(e); });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(window.game) window.game.handleStart(e); }, {passive: false});
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if(window.game) window.game.handleMove(e); }, {passive: false});
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); if(window.game) window.game.handleEnd(e); }, {passive: false});
    }

    window.addEventListener('resize', () => { 
        if (window.ui.gameContainer.style.display === 'flex' && window.game) { window.game.resizeCanvas(); window.game.render(); } 
        if (document.getElementById('level-select').classList.contains('active')) window.ui.drawConstellationLines();
    });

    document.addEventListener('click', (e) => {
        let btn = e.target.closest('button');
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
        let clickedLore = e.target.closest('.lore-entry') || e.target.closest('.lore-card') || e.target.closest('.shop-item');
        if (clickedLore && document.getElementById('lore-detail-screen')) {
            let detailScreen = document.getElementById('lore-detail-screen'); detailScreen.style.color = 'var(--ink-black)'; 
            let titleEl = clickedLore.querySelector('h3') || clickedLore.querySelector('h4'); let bodyEl = clickedLore.querySelector('p');
            let destTitle = detailScreen.querySelector('h2') || detailScreen.querySelector('h3'); let destBody = detailScreen.querySelector('p');
            if (destTitle && titleEl) destTitle.innerText = titleEl.innerText;
            if (destBody && bodyEl) destBody.innerText = bodyEl.innerText;
        }
    });

    const devBtn = document.createElement('button'); devBtn.innerText = "Unlock All Levels";
    devBtn.style.cssText = "position:fixed; bottom:10px; right:10px; opacity:0.1; font-size:12px; z-index:9999; border:none; background:transparent; cursor:pointer; color:inherit; font-family:'Architects Daughter', cursive;";
    devBtn.onmouseenter = () => devBtn.style.opacity = "1.0"; devBtn.onmouseleave = () => devBtn.style.opacity = "0.1";
    devBtn.onclick = () => {
        showModal("Dev Access", "Enter Developer Password:", (val) => {
            if(val === "DUBrajsl") { maxUnlocked = 499; state.stardust += 50000; saveState(); showModal("Unlocked", "Developer Override: All 500 Levels Unlocked. +50,000 Stardust!", () => window.ui.showLevelSelect()); } 
            else if (val !== null) { showModal("Access Denied", "Incorrect password."); }
        }, 'text');
    };
    document.body.appendChild(devBtn);

    if(window.timeTrialManager) window.timeTrialManager.initMenu();
    window.ui.showMainMenu();
});
// lyddyw bsqrd, mvsmu exvymu vofovc, oxdob NELbktcv
// Yes I understand you guys are too lazy to do this so here's a hint:
// Who died in 44 BC?