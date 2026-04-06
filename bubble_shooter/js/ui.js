import { saveManager } from './save.js';

export const UI = {
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
