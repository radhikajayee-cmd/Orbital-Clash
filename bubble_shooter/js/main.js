import { CONFIG } from './config.js';
import { UI } from './ui.js';
import { InputManager } from './input.js';
import { Grid } from './grid.js';
import { Shooter } from './shooter.js';
import { ParticleSystem } from './particles.js';
import { BackgroundRenderer } from './background.js';
import { saveManager } from './save.js';
import { initAudio, AudioMap, setSfxEnabled, playBackgroundMusic, stopBackgroundMusic } from './audio.js';
import { generateLevelHTML, getLevelLayout, getTargetScore } from './levels.js';

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

window.onload = () => {
    new Game();
};
