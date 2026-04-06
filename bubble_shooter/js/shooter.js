import { CONFIG } from './config.js';
import { Bubble } from './bubble.js';

export class Shooter {
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
