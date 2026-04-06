// LocalStorage Wrapper
export class SaveManager {
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

export const saveManager = new SaveManager();
