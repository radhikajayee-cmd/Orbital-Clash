import { CONFIG } from './config.js';

export const LEVELS = [
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

export const generateLevelHTML = (unlockedLevels) => {
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

export const getTargetScore = (levelNum) => {
    const defined = LEVELS.find(l => l.id === levelNum);
    return defined ? defined.targetScore : 5000 + (levelNum * 1000);
};

export const getLevelLayout = (levelNum) => {
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
