// Combined JavaScript for OrbitalClash Bubble Shooter Game

// CONFIG
const CONFIG = {
    // Game Physics & Timing
    FPS: 60,
    BUBBLE_SPEED: 1000, // pixels per second
    FALL_SPEED: 600,
    AIM_LINE_LENGTH: 400,
    
    // Screen Shake
    SHAKE_INTENSITY: 8,
    SHAKE_DURATION: 0.3,
    
    // Shots System
    MAX_SHOTS: 30,
    
    // Grid Settings
    HEX_RADIUS: 20, // To be scaled dynamically later
    ROWS: 12,
    COLS: 11,
    START_ROWS_CLASSIC: 5,
    
    // Colors (High quality gradients)
    COLORS: [
        '#ff0000', // Red
        '#00ff00', // Lime Green
        '#00bfff', // Deep Sky Blue
        '#ff8c00', // Orange
        '#ff1493', // Deep Pink
        '#9932cc'  // Dark Orchid (Purple)
    ],
    SPECIAL_COLORS: {
        BOMB: '#000000',
        RAINBOW: 'RAINBOW',
        FIRE: '#ff8c00'
    },
    
    // Scoring
    POINTS_POP: 10,
    POINTS_DROP: 20,
    COMBO_MULTIPLIER_BASE: 1.2,
    
    // State
    STATE_MENU: 0,
    STATE_PLAYING: 1,
    STATE_PAUSED: 2,
    STATE_GAMEOVER: 3
};

// InputManager
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.pointer = { x: 0, y: 0, isDown: false, justPressed: false, justReleased: false };
        
        this.init();
    }

    init() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', (e) => this.handleUp(e));

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => this.handleDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleUp(e));
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        // Scale pos if canvas aspect changes
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleDown(e) {
        if(e.cancelable) e.preventDefault();
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
        this.pointer.isDown = true;
        this.pointer.justPressed = true;
    }

    handleMove(e) {
        if(this.pointer.isDown && e.cancelable) e.preventDefault();
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
    }

    handleUp(e) {
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
    }

    resetFrame() {
        this.pointer.justPressed = false;
        this.pointer.justReleased = false;
    }
}

// SaveManager
class SaveManager {
    constructor() {
        this.saveKey = 'bubble_shooter_save_v1';
        this.data = this.load();
    }

    load() {
        const defaultData = {
            coins: 0,
            unlockedLevels: 1,
            levels: {}, // e.g., { 1: { stars: 3, score: 5000 } }
            settings: {
                music: true,
                sfx: true
            },
            highScoreClassic: 0
        };
        
        try {
            const stored = localStorage.getItem(this.saveKey);
            if (stored) {
                return { ...defaultData, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error("Save load failed", e);
        }
        return defaultData;
    }

    save() {
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(this.data));
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    addCoins(amount) {
        this.data.coins += amount;
        this.save();
    }

    getCoins() {
        return this.data.coins;
    }

    saveLevelScore(levelNum, score, stars) {
        if (!this.data.levels[levelNum]) {
            this.data.levels[levelNum] = { stars: 0, score: 0 };
        }
        if (score > this.data.levels[levelNum].score) {
            this.data.levels[levelNum].score = score;
        }
        if (stars > this.data.levels[levelNum].stars) {
            this.data.levels[levelNum].stars = stars;
        }
        
        // Unlock next
        if (stars > 0 && levelNum === this.data.unlockedLevels) {
            this.data.unlockedLevels++;
        }
        this.save();
    }
}

const saveManager = new SaveManager();

// Audio System
let audioCtx;
let ENABLE_SFX = true;
let ENABLE_MUSIC = true;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const saved = localStorage.getItem('bubble_shooter_save_v1');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.settings) {
            ENABLE_SFX = data.settings.sfx !== false;
            ENABLE_MUSIC = data.settings.music !== false;
        }
    }
};

const setSfxEnabled = (enabled) => {
    ENABLE_SFX = enabled;
};

const playBackgroundMusic = () => {
    if (!ENABLE_MUSIC || !audioCtx) return;
    
    // Resume context if suspended
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Simple procedural background music
    const playNote = (freq, duration, delay) => {
        setTimeout(() => {
            if (!ENABLE_MUSIC) return;
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }, delay);
    };
    
    // Simple melody loop
    const melody = [
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25
    ];
    
    let delay = 0;
    const loopMusic = () => {
        if (!ENABLE_MUSIC) return;
        
        melody.forEach((freq, i) => {
            playNote(freq, 0.5, delay + i * 300);
            playNote(freq * 1.5, 0.3, delay + i * 300 + 150); // Harmony
        });
        
        delay += melody.length * 300;
        setTimeout(loopMusic, melody.length * 300);
    };
    
    loopMusic();
};

const stopBackgroundMusic = () => {
    // Procedural music stops automatically when ENABLE_MUSIC is false
    ENABLE_MUSIC = false;
};

const playTone = (freq, type, duration, vol = 0.1, slideFreq = null) => {
    if (!ENABLE_SFX || !audioCtx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

const AudioMap = {
    shoot: () => playTone(300, 'sine', 0.2, 0.2, 800),
    pop: () => playTone(800, 'sine', 0.1, 0.1, 1200),
    drop: () => playTone(400, 'triangle', 0.3, 0.1, 200),
    combo: (level) => playTone(400 + (level * 100), 'square', 0.2, 0.1),
    win: () => {
        playTone(400, 'sine', 0.1, 0.2, 600);
        setTimeout(() => playTone(600, 'sine', 0.1, 0.2, 800), 100);
        setTimeout(() => playTone(800, 'sine', 0.4, 0.2, 1200), 200);
    },
    lose: () => {
        playTone(300, 'sawtooth', 0.3, 0.2, 200);
        setTimeout(() => playTone(200, 'sawtooth', 0.5, 0.2, 100), 300);
    },
    click: () => playTone(1000, 'sine', 0.05, 0.1)
};

// Levels
const LEVELS = [
    {
        id: 1,
        targetScore: 1000,
        grid: [
            [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
        ]
    },
    {
        id: 2,
        targetScore: 2000,
        grid: [
            [2, 2, 2, 3, 3, 3, 2, 2, 2, 0, 0],
            [2, 3, 3, 3, 3, 3, 3, 2, 2, 0],
            [0, 2, 3, 3, 3, 3, 3, 2, 0, 0, 0],
            [0, 0, 2, 3, 3, 3, 2, 0, 0, 0],
            [0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0]
        ]
    },
    {
        id: 3,
        targetScore: 3000,
        grid: [
            [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 1],
            [1, 2, 2, 3, 3, 4, 4, 5, 5, 1],
            [2, 2, 3, 3, 4, 4, 5, 5, 1, 1, 2],
            [2, 3, 3, 4, 4, 5, 5, 1, 1, 2]
        ]
    },
    {
        id: 4,
        targetScore: 4500,
        grid: [
            [5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5],
            [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
            [5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5],
            [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ]
    },
    {
        id: 5,
        targetScore: 6000,
        grid: [
            [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
            [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
            [1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
            [2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
            [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5],
            [2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
        ]
    }
];

// Extend procedural to 100 levels if needed
for (let i = 6; i <= 100; i++) {
    LEVELS.push({
        id: i,
        targetScore: 5000 + (i * 1000)
        // grid layout empty indicates procedural fallback
    });
}

const generateLevelHTML = (unlockedLevels) => {
    const gridEl = document.getElementById('level-grid');
    if (!gridEl) return;
    
    gridEl.innerHTML = '';
    
    // Generate UI for 50 levels for better display length
    for (let i = 1; i <= 50; i++) {
        const btn = document.createElement('button');
        btn.className = `level-btn ${i > unlockedLevels ? 'locked' : ''}`;
        btn.innerText = i;
        btn.dataset.level = i;
        gridEl.appendChild(btn);
    }
};

const getTargetScore = (levelNum) => {
    const defined = LEVELS.find(l => l.id === levelNum);
    return defined ? defined.targetScore : 5000 + (levelNum * 1000);
};

const getLevelLayout = (levelNum) => {
    // If we have a predefined layout, use it
    const defined = LEVELS.find(l => l.id === levelNum);
    if (defined && defined.grid) return defined.grid;
    
    // Otherwise procedurally generate one with increasing difficulty
    const rows = Math.min(5 + Math.floor(levelNum / 5), 10); // Max 10 rows starting
    const colorsCount = Math.min(3 + Math.floor(levelNum / 3), CONFIG.COLORS.length);
    
    const layout = [];
    for (let r = 0; r < rows; r++) {
        const rowCols = (r % 2 === 0) ? CONFIG.COLS : CONFIG.COLS - 1;
        const rowArray = [];
        for (let c = 0; c < rowCols; c++) {
            // Grouping logic for generated levels to create solvable clusters
            // Look at left neighbor and slightly above, maybe inherit color
            let colorIdx = Math.floor(Math.random() * colorsCount);
            if (c > 0 && Math.random() < 0.5) {
                colorIdx = rowArray[c - 1]; // Horizontal match tendency
            }
            rowArray.push(colorIdx);
        }
        layout.push(rowArray);
    }
    
    return layout;
};

// UI
const UI = {
    screens: {
        main: document.getElementById('screen-main'),
        levels: document.getElementById('screen-levels'),
        pause: document.getElementById('screen-pause'),
        gameOver: document.getElementById('screen-gameover'),
        settings: document.getElementById('screen-settings'),
        hud: document.getElementById('hud-layer')
    },
    
    elements: {
        score: document.getElementById('score-display'),
        level: document.getElementById('level-display'),
        shots: document.getElementById('shots-display'),
        menuCoins: document.getElementById('coins-amount-menu'),
        endScore: document.getElementById('end-score'),
        endTitle: document.getElementById('end-title'),
        stars: [
            document.getElementById('star-1'),
            document.getElementById('star-2'),
            document.getElementById('star-3')
        ]
    },

    init() {
        this.updateCoins();
    },

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen && !screen.classList.contains('hidden')) {
                screen.classList.add('hidden');
            }
        });

        // Show requested
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    },

    updateScore(score) {
        this.elements.score.innerText = score.toString();
    },

    updateCoins() {
        if (this.elements.menuCoins) {
            this.elements.menuCoins.innerText = saveManager.getCoins().toString();
        }
    },

    updateLevel(lvl) {
        this.elements.level.innerText = lvl === 'Classic' ? '-' : lvl.toString();
    },

    updateShots(shots) {
        this.elements.shots.innerText = shots.toString();
        // Add warning color when low on shots
        if (shots <= 5) {
            this.elements.shots.style.color = '#ff6b6b';
            this.elements.shots.style.textShadow = '0 0 10px #ff6b6b';
        } else {
            this.elements.shots.style.color = '';
            this.elements.shots.style.textShadow = '';
        }
    },

    showGameOver(win, score, stars, targetScoreMessage) {
        this.elements.endTitle.innerText = win ? 'LEVEL CLEARED!' : 'GAME OVER';
        this.elements.endTitle.style.color = win ? '#38ef7d' : '#ef473a';
        
        if (targetScoreMessage) {
            this.elements.endTitle.innerText = targetScoreMessage;
            this.elements.endTitle.style.fontSize = '28px'; // Make long text fit
        } else {
            this.elements.endTitle.style.fontSize = '36px';
        }
        
        this.elements.endScore.innerText = score.toString();
        
        // Show/Hide Next Level Button
        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) {
            if (win) {
                nextBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.add('hidden');
            }
        }
        
        // Setup stars
        this.elements.stars.forEach((starEl, index) => {
            starEl.classList.remove('active');
            if (index < stars) {
                setTimeout(() => starEl.classList.add('active'), 500 * (index + 1));
            }
        });

        this.showScreen('gameOver');
        this.screens.hud.classList.add('hidden');
    }
};

// Bubble
class Bubble {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.color = color;
        this.type = type;
        this.radius = CONFIG.HEX_RADIUS;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        
        // States
        this.popping = false;
        this.falling = false;
        this.scale = 0; // Starts at 0 for spawn animation
        this.targetScale = 1;
        
        // Animation
        this.popTimer = 0;
    }

    update(dt) {
        // Growth animation
        if (this.scale < this.targetScale && !this.popping) {
            this.scale += dt * 5;
            if (this.scale > this.targetScale) this.scale = this.targetScale;
        }

        // Lerp position for smooth grid snapping
        if (!this.falling && !this.popping) {
            this.x += (this.targetX - this.x) * (dt * 15);
            this.y += (this.targetY - this.y) * (dt * 15);
        }

        if (this.falling) {
            this.vy += 800 * dt; // Gravity
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        if (this.popping) {
            this.scale -= dt * 5;
            this.popTimer -= dt;
            if (this.scale <= 0) {
                this.scale = 0;
                this.dead = true;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Bubble Shadow with glow
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Outer glow for aiming effect
        if (this.type === 'normal') {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
            const glowGrad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + 3);
            glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
            glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glowGrad;
            ctx.fill();
        }

        // Bubble Base Color with enhanced gradient
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        if (this.type === 'normal') {
            const grad = ctx.createRadialGradient(-this.radius*0.4, -this.radius*0.4, this.radius*0.2, 
                                                -this.radius*0.2, -this.radius*0.2, this.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, this.lightenColor(this.color, 30));
            grad.addColorStop(0.7, this.color);
            grad.addColorStop(1, this.darkenColor(this.color, 50));
            ctx.fillStyle = grad;
        } else if (this.type === CONFIG.SPECIAL_COLORS.BOMB) {
            ctx.fillStyle = '#333';
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Bomb fuse with glow
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.quadraticCurveTo(10, -this.radius - 10, 15, -this.radius-5);
            ctx.strokeStyle = '#ff8c00';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (this.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            grad.addColorStop(0, '#ff0000');
            grad.addColorStop(0.2, '#ff8000');
            grad.addColorStop(0.4, '#ffff00');
            grad.addColorStop(0.6, '#00ff00');
            grad.addColorStop(0.8, '#0080ff');
            grad.addColorStop(1, '#8000ff');
            ctx.fillStyle = grad;
            // Rainbow glow
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
        } else if (this.type === CONFIG.SPECIAL_COLORS.FIRE) {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#ffff00');
            grad.addColorStop(0.6, '#ff8c00');
            grad.addColorStop(1, '#ff0000');
            ctx.fillStyle = grad;
            // Fire glow
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 12;
        }

        ctx.fill();

        // Enhanced high gloss highlight
        if(this.type === 'normal' || this.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            ctx.beginPath();
            ctx.ellipse(-this.radius*0.4, -this.radius*0.5, this.radius*0.5, this.radius*0.25, -Math.PI/4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
            
            // Inner highlight
            ctx.beginPath();
            ctx.ellipse(-this.radius*0.2, -this.radius*0.3, this.radius*0.2, this.radius*0.1, -Math.PI/4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fill();
        }

        ctx.restore();
    }

    startPop() {
        if (this.popping) return;
        this.popping = true;
        this.popTimer = 0.2;
    }

    darkenColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 - percent) / 100);
        G = parseInt(G * (100 - percent) / 100);
        B = parseInt(B * (100 - percent) / 100);

        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  

        let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }

    lightenColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R>255)?255:R;  
        G = (G>255)?G:255;  
        B = (B>255)?B:255;  

        let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }
}

// ParticleSystem
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 300 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.radius = Math.random() * 5 + 2;
        this.life = 1.0; // 1 second
        this.maxLife = 1.0;
    }

    update(dt) {
        this.vy += 800 * dt; // gravity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -100;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 24px "Fredoka One", sans-serif';
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.fallingBubbles = [];
    }

    emitExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    emitText(x, y, text, color) {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    addFallingBubble(bubble) {
        bubble.falling = true;
        bubble.vx = (Math.random() - 0.5) * 200;
        bubble.vy = -100; // Bounce up slightly
        this.fallingBubbles.push(bubble);
    }

    update(dt, screenHeight) {
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0 || this.particles[i].y > screenHeight) {
                this.particles.splice(i, 1);
            }
        }
        
        // Texts
        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.texts[i].update(dt);
            if (this.texts[i].life <= 0) {
                this.texts.splice(i, 1);
            }
        }
        
        // Falling bubbles (drop points)
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            this.fallingBubbles[i].update(dt);
            if (this.fallingBubbles[i].y > screenHeight + 50) {
                this.fallingBubbles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) p.draw(ctx);
        for (const b of this.fallingBubbles) b.draw(ctx);
        for (const t of this.texts) t.draw(ctx);
    }
}

// BackgroundRenderer
class BackgroundRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.particles = [];
        this.time = 0;
        
        this.initParticles();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const numParticles = 50;
        
        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.5 + 0.2,
                hue: Math.random() * 60 + 200 // Blue to purple range
            });
        }
    }

    update(dt) {
        this.time += dt;
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            // Subtle pulsing
            particle.alpha = 0.3 + Math.sin(this.time * 2 + particle.x * 0.01) * 0.2;
        });
    }

    draw() {
        // Clear with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw animated particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Add some subtle moving gradients
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        const waveGradient = this.ctx.createRadialGradient(
            this.width * 0.5 + Math.sin(this.time) * 100,
            this.height * 0.5 + Math.cos(this.time * 0.7) * 50,
            0,
            this.width * 0.5 + Math.sin(this.time) * 100,
            this.height * 0.5 + Math.cos(this.time * 0.7) * 50,
            200
        );
        waveGradient.addColorStop(0, '#4facfe');
        waveGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = waveGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }
}

// Grid
class Grid {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.rows = CONFIG.ROWS;
        this.cols = CONFIG.COLS;
        this.hexRadius = CONFIG.HEX_RADIUS;
        this.bubbleDiameter = this.hexRadius * 2;
        this.rowHeight = this.hexRadius * Math.sqrt(3); // Height of equilateral triangle
        
        // Offset to center the grid
        const gridWidth = this.cols * this.bubbleDiameter;
        this.offsetX = (this.width - gridWidth) / 2 + this.hexRadius;
        this.offsetY = this.hexRadius;

        this.cells = []; // 2D Array [row][col] mapping to Bubble or null
        this.init();
    }

    init() {
        this.cells = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    }

    populateRandom(numRows) {
        for (let r = 0; r < numRows; r++) {
            const rowCols = (r % 2 === 0) ? this.cols : this.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const color = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                const pos = this.getPixPos(r, c);
                const b = new Bubble(pos.x, pos.y, color, 'normal');
                b.scale = 1; // Start fully grown
                this.cells[r][c] = b;
            }
        }
    }

    getPixPos(row, col) {
        let x = this.offsetX + col * this.bubbleDiameter;
        // Shift odd rows by radius
        if (row % 2 !== 0) {
            x += this.hexRadius;
        }
        let y = this.offsetY + row * this.rowHeight;
        return { x, y };
    }

    getGridCoord(x, y) {
        const row = Math.round((y - this.offsetY) / this.rowHeight);
        let colPix = x - this.offsetX;
        if (row % 2 !== 0) colPix -= this.hexRadius;
        const col = Math.round(colPix / this.bubbleDiameter);
        return { row, col };
    }

    getNeighbors(r, c) {
        const isEven = r % 2 === 0;
        const diffs = isEven ? 
            [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]] :
            [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
            
        return diffs.map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
                    .filter(pos => pos.row >= 0 && pos.row < this.rows && 
                                   pos.col >= 0 && pos.col < ((pos.row % 2 === 0) ? this.cols : this.cols - 1));
    }

    snapBubble(bubble) {
        const coord = this.getGridCoord(bubble.x, bubble.y);
        
        // Prevent going out of bounds
        if (coord.row >= this.rows) coord.row = this.rows - 1;
        if (coord.row < 0) coord.row = 0;
        
        let maxCol = (coord.row % 2 === 0) ? this.cols - 1 : this.cols - 2;
        if (coord.col > maxCol) coord.col = maxCol;
        if (coord.col < 0) coord.col = 0;

        // Find closest empty cell if occupied
        if (this.cells[coord.row][coord.col]) {
            // Very naive fallback, usually snapping handles this via collision
            // We just place it in the highest empty row above it
            for (let tr = coord.row; tr >= 0; tr--) {
                const mc = (tr % 2 === 0) ? this.cols - 1 : this.cols - 2;
                let tc = coord.col > mc ? mc : coord.col;
                if (!this.cells[tr][tc]) {
                    coord.row = tr;
                    coord.col = tc;
                    break;
                }
            }
        }

        const pos = this.getPixPos(coord.row, coord.col);
        bubble.targetX = pos.x;
        bubble.targetY = pos.y;
        this.cells[coord.row][coord.col] = bubble;
        
        return coord;
    }

    findMatches(startRow, startCol, targetColor) {
        const visited = new Set();
        const cluster = [];
        const stack = [{ row: startRow, col: startCol }];
        
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const b = this.cells[row][col];
            if (b && b.color === targetColor && !b.dead) {
                cluster.push({ row, col, bubble: b });
                
                const neighbors = this.getNeighbors(row, col);
                for (const n of neighbors) {
                    stack.push(n);
                }
            }
        }
        return cluster;
    }

    getFloatingBubbles() {
        const visited = new Set();
        const stack = [];
        
        // Add all top row bubbles to stack
        for (let c = 0; c < this.cols; c++) {
            if (this.cells[0][c] && !this.cells[0][c].dead) {
                stack.push({ row: 0, col: c });
            }
        }
        
        // Find all connected to top
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const neighbors = this.getNeighbors(row, col);
            for (const n of neighbors) {
                if (this.cells[n.row][n.col] && !this.cells[n.row][n.col].dead) {
                    stack.push(n);
                }
            }
        }
        
        const floating = [];
        for (let r = 0; r < this.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.cols : this.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.cells[r][c];
                if (b && !b.dead && !visited.has(`${r},${c}`)) {
                    floating.push({ row: r, col: c, bubble: b });
                }
            }
        }
        
        return floating;
    }

    draw(ctx) {
        for (let r = 0; r < this.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.cols : this.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.cells[r][c];
                if (b && !b.dead) {
                    b.draw(ctx);
                } else if (CONFIG.DEBUG) {
                    const pos = this.getPixPos(r, c);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 2, 0, Math.PI*2);
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fill();
                }
            }
        }
    }

    update(dt) {
        for (let r = 0; r < this.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.cols : this.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.cells[r][c];
                if (b) {
                    b.update(dt);
                    if (b.dead) {
                        this.cells[r][c] = null;
                        b.falling = true; // In case we want to reuse logic, but normally dead = removed
                    }
                }
            }
        }
    }
}

// Shooter
class Shooter {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.x = canvasWidth / 2;
        this.y = canvasHeight - 70; // Position above bottom UI
        
        this.currentBubble = null;
        this.nextBubbleColor = null;
        
        // Cannon rotation
        this.angle = -Math.PI / 2; // Pointing straight up
        
        // Fired bubble reference
        this.projectile = null;
        
        this.loadNext();
        this.loadNext(); // Call twice to populate current and next
    }

    loadNext() {
        if (this.nextBubbleColor) {
            this.currentBubble = new Bubble(this.x, this.y, this.nextBubbleColor, 'normal');
        }
        // Random color for next (later map to existing grid colors)
        this.nextBubbleColor = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
        
        // Update DOM UI
        const nextDisp = document.getElementById('next-bubble-display');
        if (nextDisp) nextDisp.style.backgroundColor = this.nextBubbleColor;
    }

    aim(targetX, targetY) {
        if (this.projectile) return; // Can't aim while firing
        let dx = targetX - this.x;
        let dy = targetY - this.y;
        
        // Constrain angle so we don't shoot downwards
        this.angle = Math.atan2(dy, dx);
        if (this.angle > -0.1 && this.angle < Math.PI / 2) this.angle = -0.1;
        if (this.angle > Math.PI / 2 || this.angle < -Math.PI + 0.1) this.angle = -Math.PI + 0.1;
    }

    fire() {
        if (this.projectile || !this.currentBubble) return null;
        
        this.projectile = this.currentBubble;
        this.projectile.vx = Math.cos(this.angle) * CONFIG.BUBBLE_SPEED;
        this.projectile.vy = Math.sin(this.angle) * CONFIG.BUBBLE_SPEED;
        
        this.currentBubble = null;
        return this.projectile;
    }

    resetProjectile() {
        this.projectile = null;
        this.loadNext();
    }

    update(dt) {
        if (this.currentBubble) {
            this.currentBubble.update(dt);
        }
        if (this.projectile) {
            this.projectile.x += this.projectile.vx * dt;
            this.projectile.y += this.projectile.vy * dt;
            
            // Wall bouncing
            if (this.projectile.x - this.projectile.radius < 0) {
                this.projectile.x = this.projectile.radius;
                this.projectile.vx *= -1;
            } else if (this.projectile.x + this.projectile.radius > this.width) {
                this.projectile.x = this.width - this.projectile.radius;
                this.projectile.vx *= -1;
            }
            
            // Ceiling bounce (normally handled by grid snapping, but fallback)
            if (this.projectile.y - this.projectile.radius < 0) {
                // Should snap
            }
        }
    }

    drawAimLine(ctx) {
        if (this.projectile) return;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        
        let lx = this.x;
        let ly = this.y;
        let vx = Math.cos(this.angle);
        let vy = Math.sin(this.angle);
        let len = 0;
        
        while (len < CONFIG.AIM_LINE_LENGTH && ly > 0) {
            lx += vx * 10;
            ly += vy * 10;
            len += 10;
            
            // Wall bounce prediction
            if (lx < CONFIG.HEX_RADIUS || lx > this.width - CONFIG.HEX_RADIUS) {
                vx *= -1;
            }
        }
        
        ctx.lineTo(lx, ly);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Target dot
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }

    draw(ctx) {
        this.drawAimLine(ctx);
        
        // Cannon base
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Cannon barrel
        ctx.rotate(this.angle + Math.PI/2);
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#4facfe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-15, -40, 30, 50, 5);
        ctx.fill();
        ctx.stroke();
        
        // Cannon center
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (this.currentBubble) {
            this.currentBubble.draw(ctx);
        }
        if (this.projectile) {
            this.projectile.draw(ctx);
        }
    }
}

// Main Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.bgCanvas = document.getElementById('background-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.lastTime = 0;
        this.state = CONFIG.STATE_MENU;
        this.score = 0;
        this.combo = 0;
        this.currentLevel = 1;
        this.shotsRemaining = CONFIG.MAX_SHOTS;
        
        // Screen shake
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        // Systems
        this.input = new InputManager(this.canvas);
        this.particles = new ParticleSystem();
        this.background = new BackgroundRenderer(this.bgCanvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        UI.init();
        this.bindEvents();
        
        generateLevelHTML(saveManager.data.unlockedLevels);
        
        requestAnimationFrame((t) => this.loop(t));
    }

    // Inside Game class
    alertUI(x, y, text) {
        this.particles.emitText(x, y, text, '#ff0076');
        AudioMap.lose(); // error sound
    }

    resize() {
        this.canvas.width = 600;
        this.canvas.height = window.innerHeight > 900 ? 900 : window.innerHeight;
        this.bgCanvas.width = this.canvas.width;
        this.bgCanvas.height = this.canvas.height;
        CONFIG.HEX_RADIUS = this.canvas.width / (CONFIG.COLS * 2);
        
        if (this.grid) {
            this.grid.width = this.canvas.width;
            this.grid.height = this.canvas.height;
            this.grid.hexRadius = CONFIG.HEX_RADIUS;
            this.grid.bubbleDiameter = CONFIG.HEX_RADIUS * 2;
            this.grid.rowHeight = CONFIG.HEX_RADIUS * Math.sqrt(3);
        }
        if (this.shooter) {
            this.shooter.width = this.canvas.width;
            this.shooter.height = this.canvas.height;
            this.shooter.x = this.canvas.width / 2;
            this.shooter.y = this.canvas.height - 70;
        }
        if (this.background) {
            this.background.resize(this.canvas.width, this.canvas.height);
        }
    }

    shakeScreen() {
        this.shakeTime = CONFIG.SHAKE_DURATION;
        this.shakeIntensity = CONFIG.SHAKE_INTENSITY;
    }

    updateShake(dt) {
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            if (this.shakeTime <= 0) {
                this.shakeTime = 0;
                this.shakeIntensity = 0;
            }
        }
    }

    bindEvents() {
        document.body.addEventListener('click', () => {
            initAudio(); // Initialize audio context on first interaction
        }, { once: true });

        document.getElementById('btn-play-classic').addEventListener('click', () => {
            AudioMap.click();
            this.startGame('classic');
        });

        document.getElementById('btn-play-levels').addEventListener('click', () => {
            AudioMap.click();
            UI.showScreen('levels');
        });

        document.getElementById('btn-back-levels').addEventListener('click', () => {
            AudioMap.click();
            UI.showScreen('main');
        });

        document.getElementById('level-grid').addEventListener('click', (e) => {
            if (e.target.classList.contains('level-btn')) {
                const clickedLevel = parseInt(e.target.dataset.level);
                
                if (e.target.classList.contains('locked')) {
                    // It is locked, alert user of target score needed to unlock
                    const requiredScoreToUnlockThis = getTargetScore(clickedLevel - 1);
                    alert(`Locked! You need to reach ${requiredScoreToUnlockThis} score in Level ${clickedLevel - 1} to unlock this level.`);
                    AudioMap.lose();
                } else {
                    AudioMap.click();
                    this.currentLevel = clickedLevel;
                    this.startGame('level');
                }
            }
        });

        document.getElementById('btn-pause').addEventListener('click', () => {
            if (this.state === CONFIG.STATE_PLAYING) {
                AudioMap.click();
                this.state = CONFIG.STATE_PAUSED;
                UI.showScreen('pause');
            }
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            AudioMap.click();
            this.state = CONFIG.STATE_PLAYING;
            UI.showScreen('hud');
        });

        document.getElementById('btn-quit-pause').addEventListener('click', () => {
            AudioMap.click();
            this.state = CONFIG.STATE_MENU;
            UI.showScreen('main');
            UI.updateCoins();
            generateLevelHTML(saveManager.data.unlockedLevels);
        });

        document.getElementById('btn-quit-end').addEventListener('click', () => {
            AudioMap.click();
            this.state = CONFIG.STATE_MENU;
            UI.showScreen('main');
            UI.updateCoins();
            generateLevelHTML(saveManager.data.unlockedLevels);
        });

        document.getElementById('btn-next-level').addEventListener('click', () => {
            AudioMap.click();
            if (this.currentMode === 'level') {
                this.currentLevel++;
                this.startGame('level');
            }
        });

        document.getElementById('btn-restart-pause').addEventListener('click', () => {
            AudioMap.click();
            this.startGame(this.currentMode);
        });
        
        document.getElementById('btn-restart-end').addEventListener('click', () => {
            AudioMap.click();
            this.startGame(this.currentMode);
        });

        // Settings Buttons
        document.getElementById('btn-settings').addEventListener('click', () => {
            AudioMap.click();
            UI.showScreen('settings');
            document.getElementById('toggle-sfx').checked = saveManager.data.settings.sfx;
            document.getElementById('toggle-music').checked = saveManager.data.settings.music;
        });

        document.getElementById('btn-close-settings').addEventListener('click', () => {
            AudioMap.click();
            saveManager.data.settings.sfx = document.getElementById('toggle-sfx').checked;
            saveManager.data.settings.music = document.getElementById('toggle-music').checked;
            saveManager.save();
            setSfxEnabled(saveManager.data.settings.sfx);
            UI.showScreen('main');
        });

        // Powerups (Mock functionality with coins)
        document.getElementById('btn-bomb').addEventListener('click', () => this.buyPowerup(10, CONFIG.SPECIAL_COLORS.BOMB));
        document.getElementById('btn-rainbow').addEventListener('click', () => this.buyPowerup(15, CONFIG.SPECIAL_COLORS.RAINBOW));
        document.getElementById('btn-fire').addEventListener('click', () => this.buyPowerup(20, CONFIG.SPECIAL_COLORS.FIRE));
    }

    buyPowerup(cost, type) {
        if (saveManager.getCoins() >= cost && this.shooter.currentBubble) {
            saveManager.addCoins(-cost);
            this.shooter.currentBubble.color = type;
            this.shooter.currentBubble.type = type;
            AudioMap.click();
            this.particles.emitText(this.shooter.x, this.shooter.y - 50, "POWERUP!", '#00f2fe');
            // Normally update UI coins, but hiding them in game to save space
        } else {
            // Error sound
            this.particles.emitText(this.shooter.x, this.shooter.y - 50, "NEED COINS!", '#ff3b30');
        }
    }

    startGame(mode) {
        this.currentMode = mode;
        this.score = 0;
        this.combo = 0;
        this.shotsRemaining = CONFIG.MAX_SHOTS;
        
        this.grid = new Grid(this.canvas.width, this.canvas.height);
        
        if (mode === 'classic') {
            this.grid.populateRandom(CONFIG.START_ROWS_CLASSIC);
            UI.updateLevel('Classic');
        } else {
            const layout = getLevelLayout(this.currentLevel);
            this.loadLayoutIntoGrid(layout);
            const targetScore = getTargetScore(this.currentLevel);
            UI.updateLevel(`Lv ${this.currentLevel} (Goal: ${targetScore})`);
        }
        
        this.shooter = new Shooter(this.canvas.width, this.canvas.height);
        this.particles = new ParticleSystem();
        
        this.state = CONFIG.STATE_PLAYING;
        UI.showScreen('hud');
        UI.updateScore(this.score);
        UI.updateShots(this.shotsRemaining);
        
        // Start background music
        if (saveManager.data.settings.music) {
            playBackgroundMusic();
        }
    }

    loadLayoutIntoGrid(layout) {
        for (let r = 0; r < layout.length; r++) {
            for (let c = 0; c < layout[r].length; c++) {
                const colorIdx = layout[r][c];
                if (colorIdx >= 0 && colorIdx < CONFIG.COLORS.length) {
                    const pos = this.grid.getPixPos(r, c);
                    const b = new Bubble(pos.x, pos.y, CONFIG.COLORS[colorIdx], 'normal');
                    b.scale = 1;
                    this.grid.cells[r][c] = b;
                }
            }
        }
    }

    addScore(points, x, y) {
        let multi = 1 + (this.combo * 0.1);
        let finalPoints = Math.floor(points * multi);
        this.score += finalPoints;
        UI.updateScore(this.score);
        
        if (finalPoints > 0 && x !== undefined && y !== undefined) {
            this.particles.emitText(x, Math.max(y, 50), `+${finalPoints}`, '#ffcc00');
        }
    }

    handleCollisions() {
        const proj = this.shooter.projectile;
        if (!proj) return;

        // Fire Bubble Special: Doesn't snap until ceiling, destroys everything
        if (proj.type === CONFIG.SPECIAL_COLORS.FIRE) {
            let hitSomething = false;
            for (let r = this.grid.rows - 1; r >= 0; r--) {
                const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
                for (let c = 0; c < rowCols; c++) {
                    const b = this.grid.cells[r][c];
                    if (b && !b.dead) {
                        const dx = proj.x - b.x;
                        const dy = proj.y - b.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist <= proj.radius + b.radius) {
                            b.startPop();
                            this.particles.emitExplosion(b.x, b.y, b.color);
                            this.addScore(CONFIG.POINTS_POP * 2, b.x, b.y);
                            AudioMap.pop();
                            hitSomething = true;
                        }
                    }
                }
            }
            if (proj.y - proj.radius <= this.grid.offsetY - this.grid.hexRadius) {
                // Hit ceiling, disappear
                this.shooter.projectile = null;
                setTimeout(() => this.dropFloaters(), 100);
            }
            return;
        }

        // Regular Collisions
        if (proj.y - proj.radius <= this.grid.offsetY - this.grid.hexRadius) {
            this.snapProjectile();
            return;
        }

        for (let r = 0; r < this.grid.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.grid.cells[r][c];
                if (b && !b.dead) {
                    const dx = proj.x - b.x;
                    const dy = proj.y - b.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist <= proj.radius + b.radius * 0.8) {
                        this.snapProjectile();
                        return;
                    }
                }
            }
        }
    }

    snapProjectile() {
        const proj = this.shooter.projectile;
        const coord = this.grid.snapBubble(proj);
        this.shooter.projectile = null;
        
        // Screen shake on impact
        this.shakeScreen();
        
        AudioMap.drop(); // Snap sound
        
        // Decrement shots
        this.shotsRemaining--;
        UI.updateShots(this.shotsRemaining);
        
        // Check if out of shots
        if (this.shotsRemaining <= 0) {
            this.gameOver(false);
            return;
        }
    }

    handleMatches(coord, proj) {
        // Bomb Special
        if (proj.type === CONFIG.SPECIAL_COLORS.BOMB) {
            this.combo++;
            AudioMap.pop();
            const neighbors = this.grid.getNeighbors(coord.row, coord.col);
            proj.startPop();
            this.particles.emitExplosion(proj.x, proj.y, '#ff0000', 30);
            
            neighbors.forEach(n => {
                const nb = this.grid.cells[n.row][n.col];
                if (nb && !nb.dead) {
                    nb.startPop();
                    this.particles.emitExplosion(nb.x, nb.y, nb.color);
                    this.addScore(CONFIG.POINTS_POP, nb.x, nb.y);
                }
            });
            setTimeout(() => this.dropFloaters(), 100);
            this.shooter.loadNext();
            return;
        }

        // Rainbow Special or Normal
        const targetColor = proj.type === CONFIG.SPECIAL_COLORS.RAINBOW ? 
            (this.getAdjacentColor(coord.row, coord.col) || CONFIG.COLORS[0]) : proj.color;
        
        let matches = [];
        if (proj.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            // Rainbow counts as Match-3 automatically of touching colors
            matches = [ {row: coord.row, col: coord.col, bubble: proj} ];
            const neighbors = this.grid.getNeighbors(coord.row, coord.col);
            let colorsExploded = new Set();
            neighbors.forEach(n => {
                const nb = this.grid.cells[n.row][n.col];
                if (nb && !nb.dead) {
                    colorsExploded.add(nb.color);
                }
            });
            
            colorsExploded.forEach(col => {
                const m = this.grid.findMatches(coord.row, coord.col, col);
                if (m.length >= 2) { // 2 + rainbow = 3
                    matches.push(...m);
                }
            });
            
            // Filter unique
            matches = Array.from(new Set(matches.map(m => m.bubble))).map(b => matches.find(m => m.bubble === b));
            
            if (matches.length < 3) matches = [ {row: coord.row, col: coord.col, bubble: proj} ]; // Will pop itself
        } else {
            matches = this.grid.findMatches(coord.row, coord.col, targetColor);
        }
        
        if (matches.length >= 3 || proj.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            this.combo++;
            AudioMap.pop();
            if (this.combo > 1) {
                // AudioMap.combo(this.combo);
            }
            
            matches.forEach(m => {
                m.bubble.startPop();
                this.particles.emitExplosion(m.bubble.x, m.bubble.y, m.bubble.color);
                this.addScore(CONFIG.POINTS_POP, m.bubble.x, m.bubble.y);
            });
            
            setTimeout(() => this.dropFloaters(), 100);
        } else {
            this.combo = 0;
            // Advance grid logic could go here (e.g. drop ceiling after X misses)
        }
        
        this.checkGameState();
        this.shooter.loadNext();
    }

    getAdjacentColor(r, c) {
        const neighbors = this.grid.getNeighbors(r, c);
        for (const n of neighbors) {
            const b = this.grid.cells[n.row][n.col];
            if (b && !b.dead) return b.color;
        }
        return null;
    }

    dropFloaters() {
        const floaters = this.grid.getFloatingBubbles();
        if (floaters.length > 0) {
            AudioMap.drop();
            floaters.forEach(f => {
                this.particles.addFallingBubble(f.bubble);
                this.grid.cells[f.row][f.col] = null;
                this.addScore(CONFIG.POINTS_DROP, f.bubble.x, f.bubble.y);
            });
            this.combo++;
            if (this.combo > 1) {
                this.particles.emitText(this.canvas.width/2, this.canvas.height/2, `${this.combo}x COMBO!`, '#ff0076');
            }
        }
        this.checkGameState();
    }

    checkGameState() {
        let isClear = true;
        let isDead = false;
        
        for (let r = 0; r < this.grid.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                if (this.grid.cells[r][c] && !this.grid.cells[r][c].dead) {
                    isClear = false;
                    const pixY = this.grid.getPixPos(r, c).y;
                    if (pixY > this.shooter.y - this.grid.bubbleDiameter * 2) {
                        isDead = true;
                    }
                }
            }
        }
        
        if (isDead) {
            this.gameOver(false);
        } else if (isClear) {
            // Evaluates WIN or LOSE based on target score target
            setTimeout(() => this.gameOver(true, true), 500);
        }
    }

    gameOver(isClear, fromClearDelay = false) {
        if (this.state === CONFIG.STATE_GAMEOVER) return;
        this.state = CONFIG.STATE_GAMEOVER;
        
        // Stop background music
        stopBackgroundMusic();
        
        let win = false;
        let message = '';
        const targetStore = this.currentMode === 'level' ? getTargetScore(this.currentLevel) : 0;
        
        if (isClear) {
            if (this.currentMode === 'level' && this.score < targetStore) {
                // They cleared the board but didn't meet the target
                win = false;
                message = `SCORE TOO LOW! TARGET: ${targetStore}`;
                AudioMap.lose();
            } else {
                win = true;
                AudioMap.win();
            }
        } else {
            win = false;
            AudioMap.lose();
        }

        const stars = win ? (this.score > targetStore * 1.5 ? 3 : (this.score > targetStore * 1.2 ? 2 : 1)) : 0;
        
        if (this.currentMode === 'classic') {
            saveManager.data.highScoreClassic = Math.max(saveManager.data.highScoreClassic, this.score);
            saveManager.save();
        } else if (win) {
            saveManager.saveLevelScore(this.currentLevel, this.score, stars);
            generateLevelHTML(saveManager.data.unlockedLevels);
        }
        
        const earnedCoins = Math.floor(this.score / 100) + (win ? 10 : 0);
        saveManager.addCoins(earnedCoins);
        
        UI.showGameOver(win, this.score, stars, message);
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();
        
        this.input.resetFrame();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.updateShake(dt);
        this.background.update(dt);
        
        if (this.state !== CONFIG.STATE_PLAYING) return;
        
        if (this.input.pointer.isDown && !this.shooter.projectile) {
            this.shooter.aim(this.input.pointer.x, this.input.pointer.y);
        } else if (this.input.pointer.justReleased && !this.shooter.projectile) {
            const fired = this.shooter.fire();
            if (fired) AudioMap.shoot();
        }
        
        this.grid.update(dt);
        this.shooter.update(dt);
        this.particles.update(dt, this.canvas.height);
        
        this.handleCollisions();
    }

    draw() {
        // Draw background
        this.background.draw();
        
        // Apply screen shake
        this.ctx.save();
        if (this.shakeTime > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(shakeX, shakeY);
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === CONFIG.STATE_MENU) {
            this.ctx.restore();
            return;
        }
        
        this.grid.draw(this.ctx);
        
        if (this.state === CONFIG.STATE_PLAYING && this.input.pointer.isDown && !this.shooter.projectile) {
            this.shooter.drawAimLine(this.ctx);
        }
        
        this.shooter.draw(this.ctx);
        this.particles.draw(this.ctx);
        
        this.ctx.restore();
    }
}

// Initialize game
window.onload = () => {
    new Game();
};