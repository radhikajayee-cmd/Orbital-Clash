import { saveManager } from './save.js';

export const UI = {
    screens: {
        main:     document.getElementById('screen-main'),
        levels:   document.getElementById('screen-levels'),
        pause:    document.getElementById('screen-pause'),
        gameOver: document.getElementById('screen-gameover'),
        settings: document.getElementById('screen-settings'),
        hud:      document.getElementById('hud-layer')
    },

    elements: {
        score:     document.getElementById('score-display'),
        level:     document.getElementById('level-display'),
        shots:     document.getElementById('shots-display'),
        menuCoins: document.getElementById('coins-amount-menu'),
        endScore:  document.getElementById('end-score'),
        endBonus:  document.getElementById('end-bonus'),
        endTitle:  document.getElementById('end-title'),
        stars: [
            document.getElementById('star-1'),
            document.getElementById('star-2'),
            document.getElementById('star-3')
        ]
    },

    init() {
        this.updateCoins();
    },

    updateCoins() {
        if (this.elements.menuCoins) {
            this.elements.menuCoins.innerText = saveManager.getCoins().toString();
        }
    },

    showScreen(name) {
        Object.values(this.screens).forEach(s => {
            if (s) s.classList.add('hidden');
        });
        if (name === 'hud') {
            if (this.screens.hud) this.screens.hud.classList.remove('hidden');
        } else if (this.screens[name]) {
            this.screens[name].classList.remove('hidden');
        }
    },

    updateScore(score) {
        if (this.elements.score) this.elements.score.innerText = score.toLocaleString();
    },

    updateLevel(lvl) {
        if (this.elements.level) this.elements.level.innerText = lvl.toString();
    },

    updateShots(shots) {
        if (!this.elements.shots) return;
        this.elements.shots.innerText = shots.toString();
        if (shots <= 5) {
            this.elements.shots.style.color      = '#f87171';
            this.elements.shots.style.textShadow = '0 0 12px #f87171';
        } else if (shots <= 10) {
            this.elements.shots.style.color      = '#fb923c';
            this.elements.shots.style.textShadow = '0 0 10px #fb923c';
        } else {
            this.elements.shots.style.color      = '';
            this.elements.shots.style.textShadow = '';
        }
    },

    showGameOver(win, score, stars, titleMsg, coinsEarned = 0) {
        if (this.elements.endTitle) {
            this.elements.endTitle.innerText = titleMsg;
            this.elements.endTitle.style.background = win
                ? 'linear-gradient(to right, #ffd700, #ff8c00)'
                : 'linear-gradient(to right, #f43f5e, #dc2626)';
            this.elements.endTitle.style.webkitBackgroundClip = 'text';
            this.elements.endTitle.style.webkitTextFillColor  = 'transparent';
            this.elements.endTitle.style.backgroundClip       = 'text';
            this.elements.endTitle.style.fontSize             = titleMsg.length > 14 ? '26px' : '36px';
        }
        if (this.elements.endScore) this.elements.endScore.innerText = score.toLocaleString();
        if (this.elements.endBonus) this.elements.endBonus.innerText = `+${coinsEarned} 🪙`;

        // Next Level button
        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) nextBtn.classList.toggle('hidden', !win);

        // Stars
        this.elements.stars.forEach((el, i) => {
            el.classList.remove('active');
            if (el && i < stars) {
                setTimeout(() => el.classList.add('active'), 450 * (i + 1));
            }
        });

        this.showScreen('gameOver');
        if (this.screens.hud) this.screens.hud.classList.add('hidden');
    }
};
