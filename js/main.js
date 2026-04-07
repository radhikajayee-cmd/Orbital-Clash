import { CONFIG } from './config.js';
import { UI } from './ui.js';
import { InputManager } from './input.js';
import { Grid } from './grid.js';
import { Bubble } from './bubble.js';
import { Shooter } from './shooter.js';
import { ParticleSystem } from './particles.js';
import { BackgroundRenderer } from './background.js';
import { saveManager } from './save.js';
import { initAudio, AudioMap, setSfxEnabled, playBackgroundMusic, stopBackgroundMusic } from './audio.js';
import { generateLevelHTML, getLevelLayout, getTargetScore } from './levels.js';

class Game {
    constructor() {
        this.canvas   = document.getElementById('game-canvas');
        this.bgCanvas = document.getElementById('background-canvas');
        this.ctx      = this.canvas.getContext('2d');
        this.bgCtx    = this.bgCanvas.getContext('2d');

        this.lastTime        = 0;
        this.state           = CONFIG.STATE_MENU;
        this.score           = 0;
        this.combo           = 0;
        this.currentLevel    = 1;
        this.shotsRemaining  = CONFIG.MAX_SHOTS;
        this.currentMode     = 'classic';

        // Screen shake
        this.shakeTime      = 0;
        this.shakeIntensity = 0;

        // Systems
        this.input      = new InputManager(this.canvas);
        this.particles  = new ParticleSystem();
        this.background = new BackgroundRenderer(this.bgCanvas);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        UI.init();
        this.bindEvents();
        generateLevelHTML(saveManager.data.unlockedLevels);

        requestAnimationFrame((t) => this.loop(t));
    }

    /* ───────────── RESIZE ───────────── */
    resize() {
        const container = document.getElementById('game-container');
        const w = container.clientWidth  || 400;
        const h = container.clientHeight || 700;

        this.canvas.width  = w;
        this.canvas.height = h;
        this.bgCanvas.width  = w;
        this.bgCanvas.height = h;
        CONFIG.HEX_RADIUS = Math.floor(w / (CONFIG.COLS * 2));

        if (this.grid) {
            this.grid.width         = w;
            this.grid.height        = h;
            this.grid.hexRadius     = CONFIG.HEX_RADIUS;
            this.grid.bubbleDiameter = CONFIG.HEX_RADIUS * 2;
            this.grid.rowHeight     = CONFIG.HEX_RADIUS * Math.sqrt(3);
            this.grid.offsetX       = (w - this.grid.cols * this.grid.bubbleDiameter) / 2 + this.grid.hexRadius;
            this.grid.offsetY       = CONFIG.HEX_RADIUS + 60; // below HUD
        }
        if (this.shooter) {
            this.shooter.width  = w;
            this.shooter.height = h;
            this.shooter.x = w / 2;
            this.shooter.y = h - 90;
        }
        this.background.resize(w, h);
    }

    /* ───────────── SCREEN SHAKE ───────────── */
    shakeScreen(intensity = CONFIG.SHAKE_INTENSITY) {
        this.shakeTime      = CONFIG.SHAKE_DURATION;
        this.shakeIntensity = intensity;
    }

    updateShake(dt) {
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            if (this.shakeTime <= 0) { this.shakeTime = 0; this.shakeIntensity = 0; }
        }
    }

    /* ───────────── BIND EVENTS ───────────── */
    bindEvents() {
        // Unlock audio on first touch
        document.body.addEventListener('click', () => initAudio(), { once: true });

        // Main menu
        document.getElementById('btn-play-classic').addEventListener('click', () => {
            AudioMap.click(); this.startGame('classic');
        });
        document.getElementById('btn-play-levels').addEventListener('click', () => {
            AudioMap.click(); UI.showScreen('levels');
        });
        document.getElementById('btn-back-levels').addEventListener('click', () => {
            AudioMap.click(); UI.showScreen('main');
        });

        // Level grid
        document.getElementById('level-grid').addEventListener('click', (e) => {
            const btn = e.target.closest('.level-btn');
            if (!btn) return;
            const lvl = parseInt(btn.dataset.level);
            if (btn.classList.contains('locked')) {
                AudioMap.lose();
                const needed = getTargetScore(lvl - 1);
                this.particles.emitText(this.canvas.width / 2, this.canvas.height / 2,
                    `🔒 Need ${needed} in Lv${lvl - 1}`, '#f43f5e');
            } else {
                AudioMap.click();
                this.currentLevel = lvl;
                this.startGame('level');
            }
        });

        // Pause / Resume
        document.getElementById('btn-pause').addEventListener('click', () => {
            if (this.state === CONFIG.STATE_PLAYING) {
                AudioMap.click();
                this.state = CONFIG.STATE_PAUSED;
                UI.showScreen('pause');
                stopBackgroundMusic();
            }
        });
        document.getElementById('btn-resume').addEventListener('click', () => {
            AudioMap.click();
            this.state = CONFIG.STATE_PLAYING;
            UI.showScreen('hud');
            if (saveManager.data.settings.music) playBackgroundMusic();
        });

        // Quit buttons
        const doQuit = () => {
            AudioMap.click();
            stopBackgroundMusic();
            this.state = CONFIG.STATE_MENU;
            UI.showScreen('main');
            UI.updateCoins();
            generateLevelHTML(saveManager.data.unlockedLevels);
        };
        document.getElementById('btn-quit-pause').addEventListener('click', doQuit);
        document.getElementById('btn-quit-end').addEventListener('click', doQuit);

        // Next / Restart
        document.getElementById('btn-next-level').addEventListener('click', () => {
            AudioMap.click();
            if (this.currentMode === 'level') {
                this.currentLevel++;
                this.startGame('level');
            } else {
                this.startGame('classic');
            }
        });
        document.getElementById('btn-restart-pause').addEventListener('click', () => {
            AudioMap.click(); this.startGame(this.currentMode);
        });
        document.getElementById('btn-restart-end').addEventListener('click', () => {
            AudioMap.click(); this.startGame(this.currentMode);
        });

        // Settings
        document.getElementById('btn-settings').addEventListener('click', () => {
            AudioMap.click();
            document.getElementById('toggle-sfx').checked   = saveManager.data.settings.sfx;
            document.getElementById('toggle-music').checked = saveManager.data.settings.music;
            UI.showScreen('settings');
        });
        document.getElementById('btn-close-settings').addEventListener('click', () => {
            AudioMap.click();
            saveManager.data.settings.sfx   = document.getElementById('toggle-sfx').checked;
            saveManager.data.settings.music = document.getElementById('toggle-music').checked;
            saveManager.save();
            setSfxEnabled(saveManager.data.settings.sfx);
            UI.showScreen('main');
        });

        // Powerup buttons
        document.getElementById('btn-bomb').addEventListener('click',    () => this.buyPowerup(10, CONFIG.SPECIAL_COLORS.BOMB));
        document.getElementById('btn-rainbow').addEventListener('click', () => this.buyPowerup(15, CONFIG.SPECIAL_COLORS.RAINBOW));
        document.getElementById('btn-fire').addEventListener('click',    () => this.buyPowerup(20, CONFIG.SPECIAL_COLORS.FIRE));
    }

    /* ───────────── POWERUP ───────────── */
    buyPowerup(cost, type) {
        if (!this.shooter || !this.shooter.currentBubble) return;
        if (saveManager.getCoins() >= cost) {
            saveManager.addCoins(-cost);
            this.shooter.currentBubble.color = type === CONFIG.SPECIAL_COLORS.BOMB ? '#000' :
                                               type === CONFIG.SPECIAL_COLORS.RAINBOW ? 'RAINBOW' : '#ff4500';
            this.shooter.currentBubble.type = type;
            AudioMap.click();
            this.particles.emitText(this.shooter.x, this.shooter.y - 60, '⚡ POWERUP!', '#a78bfa');
        } else {
            AudioMap.lose();
            this.particles.emitText(this.shooter.x, this.shooter.y - 60, '🪙 Need Coins!', '#f43f5e');
        }
    }

    /* ───────────── START GAME ───────────── */
    startGame(mode) {
        this.currentMode    = mode;
        this.score          = 0;
        this.combo          = 0;
        this.shotsRemaining = CONFIG.MAX_SHOTS;

        const container = document.getElementById('game-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        CONFIG.HEX_RADIUS = Math.floor(w / (CONFIG.COLS * 2));

        this.grid    = new Grid(w, h);
        this.shooter = new Shooter(w, h);
        this.particles = new ParticleSystem();

        if (mode === 'classic') {
            this.grid.populateRandom(CONFIG.START_ROWS_CLASSIC);
            UI.updateLevel('∞');
        } else {
            const layout = getLevelLayout(this.currentLevel);
            this.loadLayoutIntoGrid(layout);
            UI.updateLevel(this.currentLevel.toString());
        }

        this.state = CONFIG.STATE_PLAYING;
        UI.showScreen('hud');
        UI.updateScore(this.score);
        UI.updateShots(this.shotsRemaining);
        UI.updateCoins();

        if (saveManager.data.settings.music) playBackgroundMusic();
    }

    loadLayoutIntoGrid(layout) {
        for (let r = 0; r < layout.length; r++) {
            for (let c = 0; c < layout[r].length; c++) {
                const colorIdx = layout[r][c];
                if (colorIdx >= 0 && colorIdx < CONFIG.COLORS.length) {
                    const pos = this.grid.getPixPos(r, c);
                    const b = new Bubble(pos.x, pos.y, CONFIG.COLORS[colorIdx], 'normal');
                    b.scale = 1;
                    b.targetX = pos.x;
                    b.targetY = pos.y;
                    if (this.grid.cells[r]) this.grid.cells[r][c] = b;
                }
            }
        }
    }

    /* ───────────── SCORING ───────────── */
    addScore(points, x, y) {
        const multi      = 1 + this.combo * 0.15;
        const finalPts   = Math.floor(points * multi);
        this.score      += finalPts;
        UI.updateScore(this.score);
        if (finalPts > 0 && x !== undefined) {
            this.particles.emitText(x, Math.max(y, 50), `+${finalPts}`, '#facc15');
        }
    }

    /* ───────────── COLLISION ───────────── */
    handleCollisions() {
        const proj = this.shooter.projectile;
        if (!proj) return;

        // Fire bubble: destroys anything it touches
        if (proj.type === CONFIG.SPECIAL_COLORS.FIRE) {
            for (let r = 0; r < this.grid.rows; r++) {
                const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
                for (let c = 0; c < rowCols; c++) {
                    const b = this.grid.cells[r][c];
                    if (b && !b.dead) {
                        const dx = proj.x - b.x, dy = proj.y - b.y;
                        if (Math.hypot(dx, dy) <= proj.radius + b.radius) {
                            b.startPop();
                            this.particles.emitExplosion(b.x, b.y, b.color, 10);
                            this.addScore(CONFIG.POINTS_POP * 2, b.x, b.y);
                            AudioMap.pop();
                        }
                    }
                }
            }
            if (proj.y - proj.radius <= this.grid.offsetY) {
                this.shooter.projectile = null;
                setTimeout(() => this.dropFloaters(), 120);
            }
            return;
        }

        // Ceiling snap
        if (proj.y - proj.radius <= this.grid.offsetY) {
            this.snapProjectile();
            return;
        }

        // Grid bubble collision
        for (let r = 0; r < this.grid.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.grid.cells[r][c];
                if (b && !b.dead) {
                    if (Math.hypot(proj.x - b.x, proj.y - b.y) <= proj.radius + b.radius * 0.85) {
                        this.snapProjectile();
                        return;
                    }
                }
            }
        }
    }

    snapProjectile() {
        const proj  = this.shooter.projectile;
        const coord = this.grid.snapBubble(proj);
        this.shooter.projectile = null;
        this.shakeScreen(6);
        AudioMap.drop();

        this.shotsRemaining--;
        UI.updateShots(this.shotsRemaining);

        // Bomb
        if (proj.type === CONFIG.SPECIAL_COLORS.BOMB) {
            this.combo++;
            AudioMap.pop();
            const neighbors = this.grid.getNeighbors(coord.row, coord.col);
            proj.startPop();
            this.particles.emitExplosion(proj.x, proj.y, '#ff3300', 28);
            neighbors.forEach(n => {
                const nb = this.grid.cells[n.row][n.col];
                if (nb && !nb.dead) {
                    nb.startPop();
                    this.particles.emitExplosion(nb.x, nb.y, nb.color);
                    this.addScore(CONFIG.POINTS_POP, nb.x, nb.y);
                }
            });
            setTimeout(() => this.dropFloaters(), 120);
            this.shooter.loadNext();
            if (this.shotsRemaining <= 0) { this.gameOver(false); return; }
            this.checkGameState();
            return;
        }

        // Rainbow / Normal match
        let targetColor = proj.color;
        let matches = [];

        if (proj.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            // Find all connected clusters from neighbors
            const neighbors = this.grid.getNeighbors(coord.row, coord.col);
            const seen = new Set();
            neighbors.forEach(n => {
                const nb = this.grid.cells[n.row][n.col];
                if (nb && !nb.dead && !seen.has(nb.color)) {
                    seen.add(nb.color);
                    const m = this.grid.findMatches(n.row, n.col, nb.color);
                    matches.push(...m);
                }
            });
            matches.push({ row: coord.row, col: coord.col, bubble: proj });
            // Deduplicate
            const uniq = new Map();
            matches.forEach(m => uniq.set(`${m.row},${m.col}`, m));
            matches = Array.from(uniq.values());
        } else {
            matches = this.grid.findMatches(coord.row, coord.col, targetColor);
        }

        if (matches.length >= 3) {
            this.combo++;
            AudioMap.pop();
            if (this.combo > 2) {
                this.particles.emitText(
                    this.canvas.width / 2, this.canvas.height / 2 - 60,
                    `${this.combo}x COMBO! 🔥`, '#f43f5e'
                );
                this.shakeScreen(this.combo * 2);
            }
            matches.forEach(m => {
                m.bubble.startPop();
                this.particles.emitExplosion(m.bubble.x, m.bubble.y, m.bubble.color);
                this.addScore(CONFIG.POINTS_POP, m.bubble.x, m.bubble.y);
            });
            setTimeout(() => this.dropFloaters(), 120);
        } else {
            this.combo = 0;
        }

        if (this.shotsRemaining <= 0) { this.gameOver(false); return; }
        this.checkGameState();
        this.shooter.loadNext();
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
            if (floaters.length >= 3) {
                this.particles.emitText(
                    this.canvas.width / 2, this.canvas.height * 0.4,
                    `${floaters.length} Bubbles Dropped! 💥`, '#38bdf8'
                );
            }
        }
        this.checkGameState();
    }

    checkGameState() {
        let isClear = true;
        let isDead  = false;
        const shooterY = this.shooter ? this.shooter.y : this.canvas.height - 90;

        for (let r = 0; r < this.grid.rows; r++) {
            const rowCols = (r % 2 === 0) ? this.grid.cols : this.grid.cols - 1;
            for (let c = 0; c < rowCols; c++) {
                const b = this.grid.cells[r][c];
                if (b && !b.dead) {
                    isClear = false;
                    const pixY = this.grid.getPixPos(r, c).y;
                    if (pixY > shooterY - this.grid.bubbleDiameter * 2) isDead = true;
                }
            }
        }

        if (isDead) {
            this.gameOver(false);
        } else if (isClear) {
            setTimeout(() => this.gameOver(true, true), 600);
        }
    }

    /* ───────────── GAME OVER ───────────── */
    gameOver(isClear) {
        if (this.state === CONFIG.STATE_GAMEOVER) return;
        this.state = CONFIG.STATE_GAMEOVER;
        stopBackgroundMusic();

        const target = this.currentMode === 'level' ? getTargetScore(this.currentLevel) : 0;
        const win    = isClear && (this.currentMode !== 'level' || this.score >= target);

        if (win) AudioMap.win(); else AudioMap.lose();

        const stars = win
            ? (this.score > target * 2 ? 3 : this.score > target * 1.4 ? 2 : 1)
            : 0;

        // Save progress
        if (this.currentMode === 'classic') {
            saveManager.data.highScoreClassic = Math.max(saveManager.data.highScoreClassic || 0, this.score);
            saveManager.save();
        } else if (win) {
            saveManager.saveLevelScore(this.currentLevel, this.score, stars);
            generateLevelHTML(saveManager.data.unlockedLevels);
        }

        const coins = Math.floor(this.score / 80) + (win ? 15 : 0);
        saveManager.addCoins(coins);

        const titleMsg = win
            ? (this.currentMode === 'classic' ? '🏆 Well Done!' : '🌟 Level Clear!')
            : (isClear ? `⚠ Need ${target}pts` : '💀 Game Over');

        UI.showGameOver(win, this.score, stars, titleMsg, coins);
    }

    /* ───────────── GAME LOOP ───────────── */
    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
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

        const { pointer } = this.input;

        if (!this.shooter.projectile && this.shooter.currentBubble) {
            // Always aim toward pointer — even if not pressed (nice aim line feedback)
            this.shooter.aim(pointer.x, pointer.y);
        }

        if (pointer.justReleased && !this.shooter.projectile) {
            // Only fire if aiming upward
            if (pointer.y < this.shooter.y - 20) {
                const fired = this.shooter.fire();
                if (fired) AudioMap.shoot();
            }
        }

        this.grid.update(dt);
        this.shooter.update(dt);
        this.particles.update(dt, this.canvas.height);
        this.handleCollisions();
    }

    draw() {
        this.background.draw();

        this.ctx.save();
        if (this.shakeTime > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(sx, sy);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === CONFIG.STATE_MENU) {
            this.ctx.restore();
            return;
        }

        // Draw grid separator line
        if (this.grid) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.grid.offsetY - 4);
            this.ctx.lineTo(this.canvas.width, this.grid.offsetY - 4);
            const lineGrad = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
            lineGrad.addColorStop(0,   'transparent');
            lineGrad.addColorStop(0.3, 'rgba(99,102,241,0.4)');
            lineGrad.addColorStop(0.7, 'rgba(99,102,241,0.4)');
            lineGrad.addColorStop(1,   'transparent');
            this.ctx.strokeStyle = lineGrad;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        }

        if (this.grid)    this.grid.draw(this.ctx);
        if (this.shooter) this.shooter.draw(this.ctx);
        this.particles.draw(this.ctx);

        this.ctx.restore();
    }
}

window.addEventListener('load', () => new Game());
