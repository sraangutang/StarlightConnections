/* =========================================================
   CORE GAME ENGINE
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
        document.body.className = 'theme-' + finalTheme; 
        if (state.uiMode === 'dark') document.body.classList.add('dark-mode-ui');
        if(typeof updateWeather === 'function') updateWeather(finalTheme); 
    },

    start(index) {
        this.levelIndex = index; lastPlayedLevel = index; 
        this.isWon = false; currentMistakes = 0; 
        const levelData = LEVELS[index];
        this.size = levelData.size; this.activeFeatures = levelData.features;
        this.applyTheme(levelData.theme);

        if (!levelData.board) {
            let originalRandom = Math.random;
            let seed = (index + 1) * 99991; 
            Math.random = function() {
                var t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };

            let generatedBoard = null; let currentColors = levelData.targetColors;
            let attempts = 0;
            while (!generatedBoard && currentColors >= 2 && attempts < 50) {
                generatedBoard = generateLevelBoard(this.size, currentColors, this.activeFeatures);
                if (!generatedBoard) { attempts++; if(attempts % 4 === 0) currentColors--; if(attempts % 15 === 0) this.size--; }
            }
            if(!generatedBoard) generatedBoard = { pairs:[[0,0,0,1,2], [1,0,1,1,2]], stones:[], waypoints:[], bridges:[], portals:[], currents:[], locks:[], keys:[], ices:[], dust:[], solution:[[{x:0,y:0},{x:0,y:1}], [{x:1,y:0},{x:1,y:1}]] };
            levelData.board = generatedBoard;
            Math.random = originalRandom; 
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

        this.resetLevel(true); 
        if(window.ui) { window.ui.hideAll(); window.ui.gameContainer.style.display = 'flex'; }
        this.resizeCanvas(); this.render();

        let hintBtn = document.getElementById('btn-hint');
        if (hintBtn) {
            hintBtn.style.pointerEvents = 'auto';
            hintBtn.style.display = (index === 999) ? 'none' : 'inline-block';
        }

        if (levelData.isTutorial && window.showMechanicTutorial) showMechanicTutorial(index + 1, this.currentTheme);
    },

    resetLevel(isInitialLoad = false) {
        this.paths = {};
        const numColors = LEVELS[this.levelIndex].board.pairs.length;
        for (let i = 0; i < numColors; i++) { this.paths[i] = []; } 
        
        this.drawingColor = null; this.isWon = false;
        
        if (!isInitialLoad && typeof currentMistakes !== 'undefined') currentMistakes++;
        
        const levelData = LEVELS[this.levelIndex];
        if (levelData && levelData.board) {
            this.stones = JSON.parse(JSON.stringify(levelData.board.stones || []));
            this.ices = JSON.parse(JSON.stringify(levelData.board.ices || []));
        }
        
        if (window.timeTrialManager && window.timeTrialManager.isActive) {
            window.timeTrialManager.startTime = performance.now();
            cancelAnimationFrame(window.timeTrialManager.timerFrame);
            window.timeTrialManager.updateTimer();
        }
        this.render();
    },

    useHint() {
        if (this.isWon) return;
        if (state.telescopes <= 0) { if(window.showModal) window.showModal("Out of Hints", "You are out of Telescopes! You can buy more in the Stardust Shop."); return; }
        
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
            currentMistakes += 5; 
            playSound('win'); vibratePhone([30, 30, 30]);
            this.updateHUD(); this.render();
            setTimeout(() => this.checkWinCondition(), 500);
        }
    },

    exitToMenu() { if(window.ui) window.ui.showLevelSelect(); },

    resizeCanvas() {
        const isMobile = window.innerWidth <= 768;
        const maxW = window.innerWidth * 0.95; 
        const maxH = window.innerHeight * (isMobile ? 0.52 : 0.60);
        
        const canvasSize = Math.min(maxW, maxH, 600);
        canvas.width = canvasSize; canvas.height = canvasSize; 
        const fxC = document.getElementById('fx-canvas');
        if(fxC) { fxC.width = canvasSize; fxC.height = canvasSize; }
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
        
        if (typeof updateDynamicMusic === 'function') updateDynamicMusic(pct);
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

            if (node.targetLength && this.activeFeatures.includes('siphons')) {
                ctx.fillStyle = '#FFFFFF'; ctx.font = `900 ${cs * 0.35}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(node.targetLength, cx, cy + 2);
            } else {
                ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
                let shape = node.colorId % 4; let s = cs * 0.10;
                if (shape === 0) { ctx.arc(cx, cy, s, 0, Math.PI * 2); } 
                else if (shape === 1) { ctx.rect(cx - s, cy - s, s*2, s*2); } 
                else if (shape === 2) { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s*1.2, cy + s); ctx.lineTo(cx - s*1.2, cy + s); } 
                else if (shape === 3) { ctx.moveTo(cx, cy - s*1.2); ctx.lineTo(cx + s*1.2, cy); ctx.lineTo(cx, cy + s*1.2); ctx.lineTo(cx - s*1.2, cy); } 
                ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        });

        if (this.activeFeatures.includes('searchlight') && !this.isWon) {
            if (this.drawingColor !== null && this.paths[this.drawingColor].length > 0) {
                ctx.save();
                let head = this.paths[this.drawingColor][this.paths[this.drawingColor].length-1];
                let lightX = head.x * cs + cs/2; let lightY = head.y * cs + cs/2;
                let gradient = ctx.createRadialGradient(lightX, lightY, cs * 1.2, lightX, lightY, cs * 5.0);
                gradient.addColorStop(0, 'rgba(15, 15, 18, 0)');     
                gradient.addColorStop(1, 'rgba(15, 15, 18, 0.98)');  
                ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        if (this.isWon) return; evt.preventDefault(); 
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') audioCtx.resume();
        if (typeof updateDynamicMusic === 'function') updateDynamicMusic(0);
        const pos = this.getGridCoord(evt); if (!pos) return;
        const node = this.nodes.find(n => n.x === pos.x && n.y === pos.y);
        
        if (node) {
            if(typeof playSound === 'function') playSound('plop', 0); vibratePhone([10]);
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
                        if(typeof playSound === 'function') playSound('snap'); vibratePhone([50]);
                    }
                });
                if(typeof playSound === 'function') playSound('plop', 0); vibratePhone([10]);
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

        if (state.inkStyle === 'stardust' && Math.random() > 0.5 && typeof spawnSplash === 'function') {
            spawnSplash(pos.x * this.cellSize + this.cellSize/2 + (Math.random()*20-10), pos.y * this.cellSize + this.cellSize/2 + (Math.random()*20-10), WATERCOLORS[this.drawingColor % WATERCOLORS.length]);
        }

        const currentPath = this.paths[this.drawingColor];
        const lastPos = currentPath[currentPath.length - 1];

        let dx = Math.abs(pos.x - lastPos.x); let dy = Math.abs(pos.y - lastPos.y);
        let isWrap = this.activeFeatures.includes('wrap') && dy === 0 && dx === this.size - 1;
        if (dx + dy !== 1 && !isWrap) return;

        const nodeHit = this.nodes.find(n => n.x === pos.x && n.y === pos.y);
        if (nodeHit) {
            if (nodeHit.colorId !== parseInt(this.drawingColor)) return; 
            if (pos.x !== currentPath[0].x || pos.y !== currentPath[0].y) {
                currentPath.push({ x: pos.x, y: pos.y });
                if(typeof playSound === 'function') playSound('snap', currentPath.length); vibratePhone([15, 30, 15]);
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
                if (iceIdx !== -1) { this.ices.splice(iceIdx, 1); this.stones.push({x: cn.x, y: cn.y}); if(typeof playSound === 'function') playSound('snap'); vibratePhone([50]); }
            });
            this.paths[this.drawingColor] = currentPath.slice(0, selfIdx + 1);
            this.updateHUD(); this.render(); return;
        }

        let isBlocked = false;
        for (let cId in this.paths) {
            if (parseInt(cId) === parseInt(this.drawingColor)) continue;
            let otherPath = this.paths[cId];
            let isGhost = false;
            if (this.activeFeatures.includes('ethereal') && otherPath.length > 1) {
                let n1 = this.nodes.find(n => n.colorId == cId && n.x === otherPath[0].x && n.y === otherPath[0].y);
                let n2 = this.nodes.find(n => n.colorId == cId && n.x === otherPath[otherPath.length-1].x && n.y === otherPath[otherPath.length-1].y);
                if (n1 && n2 && n1 !== n2) isGhost = true; 
            }
            if (!isGhost && otherPath.some(p => p.x === pos.x && p.y === pos.y)) isBlocked = true;
        }
        if (isBlocked) return;

        currentPath.push({ x: pos.x, y: pos.y });
        if(typeof playSound === 'function') playSound('plop', currentPath.length); vibratePhone([10]);

        let pIn = this.portals.find(p => p.x === pos.x && p.y === pos.y);
        if (pIn) {
            let pOut = this.portals.find(p => p.id === pIn.id && p !== pIn);
            if (pOut) {
                currentPath[currentPath.length - 1].isPortalIn = true;
                currentPath.push({ x: pOut.x, y: pOut.y, isPortalOut: true });
                if(typeof playSound === 'function') playSound('snap'); vibratePhone([20, 20]);
                this.drawingColor = null; 
            }
        }

        let cTile = this.currents.find(c => c.x === pos.x && c.y === pos.y);
        if (cTile) {
            let nx = pos.x + cTile.dx; let ny = pos.y + cTile.dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size && !this.stones.some(s => s.x === nx && s.y === ny)) {
                currentPath.push({ x: nx, y: ny });
                if(typeof playSound === 'function') playSound('plop', currentPath.length); vibratePhone([10]);
                if (state.inkStyle === 'neon' && typeof spawnSplash === 'function') spawnSplash(pos.x * cs + cs/2, pos.y * cs + cs/2, '#ffffff', false);
                if (state.inkStyle === 'stardust' && Math.random() > 0.3 && typeof spawnSplash === 'function') spawnSplash(pos.x * cs + cs/2, pos.y * cs + cs/2, WATERCOLORS[this.drawingColor % WATERCOLORS.length], false);
            }
        }

        this.updateHUD(); this.render();
    },

    handleEnd(evt) {
        if (this.drawingColor !== null) {
            this.drawingColor = null;
            if (this.nodes && this.nodes.length > 0) {
                try { this.checkWinCondition(); } catch (e) { console.warn("Ghost check ignored.", e); }
            }
            this.render(); 
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
            this.isWon = true; this.render(); 
            
            if (typeof stopDynamicMusic === 'function') stopDynamicMusic();
            if(typeof playSound === 'function') playSound('win'); vibratePhone([50, 50, 50, 50, 150]);
            
            for (let cId in this.paths) {
                const c = WATERCOLORS[cId % WATERCOLORS.length];
                this.paths[cId].forEach(p => { if(typeof spawnSplash === 'function') spawnSplash(p.x * this.cellSize + this.cellSize/2, p.y * this.cellSize + this.cellSize/2, c, 1, true); });
            }
            
            let earnedStars = currentMistakes === 0 ? 3 : (currentMistakes <= 5 ? 2 : 1);
            let prevStars = state.stars[this.levelIndex] || 0;
            if (earnedStars > prevStars) state.stars[this.levelIndex] = earnedStars;
            
            let dustEarned = earnedStars * 5; 
            if (this.levelIndex >= maxUnlocked && this.levelIndex < LEVELS.length - 1 && this.levelIndex !== 999) {
                maxUnlocked = this.levelIndex + 1;
                dustEarned += 10; 
            }
            if (this.levelIndex !== 999) { state.stardust += dustEarned; }
            saveState();

            if (window.timeTrialManager && window.timeTrialManager.isActive) {
                window.timeTrialManager.winTrial(); 
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
                if (this.levelIndex === 999) {
                    window.ui.hideAll();
                    document.getElementById('level-complete-screen').classList.add('active');
                    document.getElementById('lc-title').innerText = "TIME POSTED!";
                    document.getElementById('lc-dust').innerText = document.getElementById('hud-timer').innerText;
                    document.getElementById('lc-stars').innerText = "⏱️";
                    
                    let btnNext = document.getElementById('btn-lc-next');
                    btnNext.style.display = 'inline-block'; btnNext.innerText = "Try Again";
                    btnNext.onclick = () => { if (window.timeTrialManager) window.timeTrialManager.startTrial(); };

                    let btnMap = document.getElementById('btn-lc-map');
                    btnMap.innerText = "Leaderboards"; 
                    btnMap.onclick = () => { 
                        if (window.timeTrialManager) { window.timeTrialManager.isActive = false; window.timeTrialManager.showMenu(); }
                        document.getElementById('hud-timer').style.display = 'none';
                        document.getElementById('fill-indicator').style.display = 'block';
                    };
                } else {
                    let btnNext = document.getElementById('btn-lc-next');
                    let btnMap = document.getElementById('btn-lc-map');
                    btnNext.innerText = "Next Level"; btnMap.innerText = "Map";
                    btnMap.onclick = () => window.ui.showLevelSelect();

                    let currentSec = SECTIONS.find(s => this.levelIndex >= s.start && this.levelIndex <= s.end);
                    if (currentSec && this.levelIndex === currentSec.end) {
                        state.pendingGlow = true; saveState();
                        window.ui.currentSectionIndex++; window.ui.showLevelSelect();
                    } else { 
                        if(window.ui) window.ui.showLevelComplete(dustEarned, earnedStars); 
                    }
                }
            }, 2500); 
        }
    }
};
window.game = game; 

/* TIME TRIALS & LEADERBOARD ENGINE */
const timeTrialManager = {
    isActive: false, currentGrid: 3, currentLvl: 1, 
    startTime: 0, timeMs: 0, timerFrame: null, boardSeed: 0, lbUnsubscribe: null, pbUnsubscribe: null,

    seededRandom(seed) {
        return function() {
            var t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    },

    initMenu() {
        const gridSelect = document.getElementById('tt-grid-select');
        gridSelect.innerHTML = '';
        for(let i = 3; i <= 12; i++) {
            let opt = document.createElement('option'); opt.value = i; opt.innerText = `${i}x${i} Grid`; gridSelect.appendChild(opt);
        }
        gridSelect.onchange = (e) => { this.currentGrid = parseInt(e.target.value); this.renderLevelGrid(); };
        
        document.getElementById('btn-time-trials').addEventListener('click', () => {
            if(!currentUser && !window.guestTutorialSeen) { 
                window.guestTutorialSeen = true;
                if(typeof showWelcomeTutorial==='function') showWelcomeTutorial(() => this.showMenu()); 
                return; 
            }
            this.showMenu();
        });
        
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
        
        let originalRandom = Math.random; Math.random = this.seededRandom(this.boardSeed);
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
        this.startTime = performance.now();
        this.updateTimer();
    },

    updateTimer() {
        if(!timeTrialManager.isActive || window.game.isWon) return;
        let elapsed = performance.now() - timeTrialManager.startTime;
        timeTrialManager.timeMs = elapsed;
        let mins = Math.floor(elapsed / 60000); let secs = Math.floor((elapsed % 60000) / 1000); let ms = Math.floor(elapsed % 1000);
        document.getElementById('hud-timer').innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
        timeTrialManager.timerFrame = requestAnimationFrame(() => timeTrialManager.updateTimer());
    },

    winTrial() {
        this.isActive = false; cancelAnimationFrame(this.timerFrame);
        let uid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : currentUser;
        let displayName = (typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.email) ? auth.currentUser.email.split('@')[0] : currentUser;

        if (uid && typeof db !== 'undefined') {
            const boardID = `${this.currentGrid}x${this.currentGrid}_${this.currentLvl}`;
            const docRef = db.collection('leaderboards').doc(boardID).collection('scores').doc(uid);
            docRef.get().then(doc => {
                if(!doc.exists || doc.data().timeMs > this.timeMs) {
                    docRef.set({ username: displayName, timeMs: this.timeMs, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
                    .then(() => console.log("New Time Trial Record Saved!"))
                    .catch(e => console.error("Firebase Save Error:", e));
                }
            }).catch(e => console.error("Firebase Get Error:", e));
        }
    },

    loadLeaderboard() {
        if(typeof db === 'undefined') return;
        const boardID = `${this.currentGrid}x${this.currentGrid}_${this.currentLvl}`;
        const lbContainer = document.getElementById('tt-leaderboard');
        const pbContainer = document.getElementById('tt-personal-best');
        
        lbContainer.innerHTML = '<p style="text-align:center;">Fetching subspace signals...</p>';
        if (pbContainer) pbContainer.style.display = 'none';
        
        if (this.lbUnsubscribe) this.lbUnsubscribe();
        if (this.pbUnsubscribe) this.pbUnsubscribe();
        
        this.lbUnsubscribe = db.collection('leaderboards').doc(boardID).collection('scores')
          .orderBy('timeMs').limit(10).onSnapshot(snapshot => {
              lbContainer.innerHTML = '';
              if(snapshot.empty) { lbContainer.innerHTML = '<p style="text-align:center;">No records found. Be the first!</p>'; return; }
              let rank = 1;
              snapshot.forEach(doc => {
                  let data = doc.data(); let mins = Math.floor(data.timeMs / 60000); let secs = Math.floor((data.timeMs % 60000) / 1000); let ms = Math.floor(data.timeMs % 1000);
                  let timeString = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
                  let div = document.createElement('div'); div.className = `leaderboard-entry ${rank === 1 ? 'first-place' : ''}`;
                  div.innerHTML = `<div><span class="rank">#${rank}</span> ${data.username}</div><div>${timeString}</div>`;
                  lbContainer.appendChild(div); rank++;
              });
          }, err => { lbContainer.innerHTML = '<p style="text-align:center; color:red;">Failed to load leaderboard.</p>'; });

        let uid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : currentUser;
        if (uid && pbContainer) {
            this.pbUnsubscribe = db.collection('leaderboards').doc(boardID).collection('scores').doc(uid)
              .onSnapshot(doc => {
                  pbContainer.style.display = 'block'; 
                  if (doc.exists) {
                      let data = doc.data(); let mins = Math.floor(data.timeMs / 60000); let secs = Math.floor((data.timeMs % 60000) / 1000); let ms = Math.floor(data.timeMs % 1000);
                      let timeString = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
                      pbContainer.innerHTML = `<div class="leaderboard-entry" style="border-bottom:none; color:var(--primary);"><div style="font-family:'Nunito', sans-serif; font-weight: 900;">★ Your Best:</div><div>${timeString}</div></div>`;
                  } else {
                      pbContainer.innerHTML = `<div class="leaderboard-entry" style="border-bottom:none; color:var(--primary); opacity: 0.6;"><div style="font-family:'Nunito', sans-serif; font-weight: 900;">★ Your Best:</div><div>N/A</div></div>`;
                  }
              });
        }
    }
};
window.timeTrialManager = timeTrialManager;