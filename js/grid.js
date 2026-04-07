import { CONFIG } from './config.js';
import { Bubble } from './bubble.js';

export class Grid {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.rows = CONFIG.ROWS;
        this.cols = CONFIG.COLS;
        this.hexRadius = CONFIG.HEX_RADIUS;
        this.bubbleDiameter = this.hexRadius * 2;
        this.rowHeight = this.hexRadius * Math.sqrt(3);

        // Start grid below the HUD (60px top bar + 1 bubble radius margin)
        const gridWidth = this.cols * this.bubbleDiameter;
        this.offsetX = (this.width - gridWidth) / 2 + this.hexRadius;
        this.offsetY = 70 + this.hexRadius; // below HUD

        this.cells = [];
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
