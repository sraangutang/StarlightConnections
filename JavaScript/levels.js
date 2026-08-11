/* =========================================================
   PALETTES, THEMES, & LORE
   ========================================================= */
const WATERCOLORS = ['#E63946', '#1E88E5', '#FDD835', '#43A047', '#8E24AA', '#F4511E', '#00ACC1', '#D81B60', '#3949AB', '#7CB342', '#F06292', '#FFB300'];

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
    { name: "Ursa Major", start: 0, end: 24, theme: 'fundamentals', lore: "Log 01: I found the artifact buried near the crater..." },
    { name: "Orion", start: 25, end: 49, theme: 'riverbed', lore: "Log 02: The board is adapting. Solid stones manifest..." },
    { name: "Scorpius", start: 50, end: 99, theme: 'checkpoints', lore: "Log 03: Waypoints have appeared. I have to route energy..." },
    { name: "Cygnus", start: 100, end: 149, theme: 'void', lore: "Log 04: The grid vanished today. The training wheels are off..." },
    { name: "Cassiopeia", start: 150, end: 199, theme: 'cassiopeia', lore: "Log 05: The artifact plunged into darkness today..." },
    { name: "Leo", start: 200, end: 249, theme: 'portals', lore: "Log 06: Spatial tears on the glass. Portals..." },
    { name: "Pegasus", start: 250, end: 299, theme: 'currents', lore: "Log 07: The engine is demanding absolute precision..." },
    { name: "Draco", start: 300, end: 349, theme: 'locks', lore: "Log 08: Locks and keys. Security protocols..." },
    { name: "Taurus", start: 350, end: 399, theme: 'frost', lore: "Log 09: Shattering ice. The artifact tolerates absolutely zero hesitation..." },
    { name: "Canis Major", start: 400, end: 449, theme: 'phantom', lore: "Log 10: Ethereal ink. Time is folding on the glass..." },
    { name: "Hercules", start: 450, end: 499, theme: 'zenith', lore: "Log 11: The Zenith. The edges of the canvas are gone..." }
];

/* CONSTELLATION MAP DATA */
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

/* PROCEDURAL GENERATOR */
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
                worms.forEach((w, i) => { if (w.length >= 5 && Math.random() > 0.4) waypoints.push({ x: w[Math.floor(w.length / 2)].x, y: w[Math.floor(w.length / 2)].y, colorId: i }); });
            }
            if (activeFeatures.includes('prisms')) {
                worms.forEach((w, i) => { if (w.length >= 5 && Math.random() > 0.5) prisms.push({ x: w[Math.floor(w.length / 2)].x, y: w[Math.floor(w.length / 2)].y, colorId: i }); });
            }
            if (activeFeatures.includes('portals')) {
                let w = worms.find(w => w.length >= 6);
                if (w) { portals.push({x: w[2].x, y: w[2].y, id: 1}, {x: w[4].x, y: w[4].y, id: 1}); stones.push({x: w[3].x, y: w[3].y}); w.splice(3, 1); }
            }
            if (activeFeatures.includes('currents')) {
                worms.forEach(w => { if (w.length >= 4 && Math.random() > 0.5) { let idx = Math.floor(w.length / 2); currents.push({x: w[idx].x, y: w[idx].y, dx: w[idx+1].x - w[idx].x, dy: w[idx+1].y - w[idx].y}); } });
            }
            if (activeFeatures.includes('keys')) {
                let w = worms[0]; if (w && w.length >= 5) { keys.push({x: w[1].x, y: w[1].y, id: 1}); locks.push({x: w[3].x, y: w[3].y, id: 1}); }
            }
            if (activeFeatures.includes('ice')) { worms.forEach(w => { if (w.length >= 5) ices.push({x: w[2].x, y: w[2].y}); }); }
            if (activeFeatures.includes('dust')) { worms.forEach(w => { if (w.length >= 4) cosmicDust.push({x: w[1].x, y: w[1].y}); }); }

            return { pairs, stones, waypoints, prisms, portals, currents, locks, keys, ices, dust: cosmicDust, solution: worms };
        }
    }
    return null; 
}

/* MASTER PROGRESSION PLAN */
const LEVELS = [];
for (let i = 1; i <= 500; i++) {
    let sec = SECTIONS.find(s => (i-1) >= s.start && (i-1) <= s.end);
    let secIndex = SECTIONS.indexOf(sec); 
    let isTut = (i-1) === sec.start;

    let baseSize = 5 + Math.floor(secIndex / 2);
    let baseColors = 3 + Math.floor(secIndex / 3);

    if (i >= 1 && i <= 4) { baseSize = 3; baseColors = 2; } 
    else if (i === 5) { baseSize = 4; baseColors = 3; } 
    else if (i >= 6 && i <= 50) { baseSize = 5; }

    let maxColors = WATERCOLORS.length;
    if (baseColors > maxColors) baseColors = maxColors;

    let isSuperHard = (i % 10 === 0);
    let isHard = (i % 5 === 0 && !isSuperHard);

    if (i >= 6) {
        if (isSuperHard) { baseSize += 2; baseColors = Math.min(maxColors, baseColors + 2); } 
        else if (isHard) { baseSize += 1; baseColors = Math.min(maxColors, baseColors + 1); }
    }
    if (baseSize > 11) baseSize = 11; 

    let features = [];
    if (isTut && i !== 1 && i !== 451) {
        baseSize = 5; baseColors = 2;
        if (i === 26) features = ['stones']; else if (i === 51) features = ['waypoints'];
        else if (i === 101) features = ['void']; else if (i === 151) features = ['searchlight'];
        else if (i === 201) features = ['portals']; else if (i === 251) features = ['siphons'];
        else if (i === 301) features = ['keys']; else if (i === 351) features = ['ice'];
        else if (i === 401) features = ['ethereal'];
    } else {
        if(i > 25) features.push('stones'); if(i > 50) features.push('waypoints');
        if(i > 100) features.push('void'); if(i > 150) features.push('searchlight');
        if(i > 200) features.push('portals'); if(i > 250) features.push('siphons');
        if(i > 300) features.push('keys'); if(i > 350) features.push('ice');
        if(i > 400) features.push('ethereal'); if(i > 450) features.push('wrap');
    }

    LEVELS.push({
        title: `Level ${i}`, 
        flavor: isSuperHard ? "ANOMALY DETECTED" : (isHard ? "Spacetime is warping..." : "Trace the stars."),
        size: baseSize, targetColors: baseColors, features: features, theme: sec.theme, isTutorial: isTut, board: null 
    });
}