import { CONFIG } from './config.js';
import { Bubble } from './bubble.js';

export class Shooter {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.x = canvasWidth / 2;
        this.y = canvasHeight - 90;

        this.currentBubble = null;
        this.nextBubbleColor = null;
        this.angle = -Math.PI / 2;
        this.projectile = null;
        this.time = 0;

        this.loadNext();
        this.loadNext();
    }

    loadNext() {
        if (this.nextBubbleColor) {
            this.currentBubble = new Bubble(this.x, this.y, this.nextBubbleColor, 'normal');
            this.currentBubble.scale = 1;
        }
        this.nextBubbleColor = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];

        const nextDisp = document.getElementById('next-bubble-display');
        if (nextDisp) {
            // Draw a mini preview bubble using the color
            nextDisp.style.backgroundColor = this.nextBubbleColor;
            nextDisp.style.boxShadow = `0 0 12px 4px ${this.nextBubbleColor}88, inset 0 3px 6px rgba(255,255,255,0.6)`;
        }
    }

    aim(targetX, targetY) {
        if (this.projectile) return;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.angle = Math.atan2(dy, dx);
        if (this.angle > -0.12 && this.angle < Math.PI / 2) this.angle = -0.12;
        if (this.angle > Math.PI / 2 || this.angle < -Math.PI + 0.12) this.angle = -Math.PI + 0.12;
    }

    fire() {
        if (this.projectile || !this.currentBubble) return null;
        this.projectile = this.currentBubble;
        this.projectile.vx = Math.cos(this.angle) * CONFIG.BUBBLE_SPEED;
        this.projectile.vy = Math.sin(this.angle) * CONFIG.BUBBLE_SPEED;
        this.currentBubble = null;
        return this.projectile;
    }

    update(dt) {
        this.time += dt;
        if (this.currentBubble) {
            this.currentBubble.x = this.x;
            this.currentBubble.y = this.y;
            this.currentBubble.update(dt);
        }
        if (this.projectile) {
            this.projectile.x += this.projectile.vx * dt;
            this.projectile.y += this.projectile.vy * dt;
            if (this.projectile.x - this.projectile.radius < 0) {
                this.projectile.x = this.projectile.radius;
                this.projectile.vx *= -1;
            } else if (this.projectile.x + this.projectile.radius > this.width) {
                this.projectile.x = this.width - this.projectile.radius;
                this.projectile.vx *= -1;
            }
        }
    }

    drawAimLine(ctx) {
        if (this.projectile || !this.currentBubble) return;

        let lx = this.x;
        let ly = this.y;
        let vx = Math.cos(this.angle);
        let vy = Math.sin(this.angle);
        const bubbleColor = this.currentBubble.color;

        // Glow aiming laser beam
        ctx.save();
        ctx.beginPath();
        lx = this.x + vx * (CONFIG.HEX_RADIUS + 5);
        ly = this.y + vy * (CONFIG.HEX_RADIUS + 5);

        // Trace path for beam
        let pts = [{ x: lx, y: ly }];
        let tvx = vx, tvy = vy;
        let len = 0;
        let tx = lx, ty = ly;
        while (len < CONFIG.AIM_LINE_LENGTH && ty > 0) {
            tx += tvx * 8;
            ty += tvy * 8;
            len += 8;
            if (tx < CONFIG.HEX_RADIUS) { tx = CONFIG.HEX_RADIUS; tvx *= -1; }
            if (tx > this.width - CONFIG.HEX_RADIUS) { tx = this.width - CONFIG.HEX_RADIUS; tvx *= -1; }
            pts.push({ x: tx, y: ty });
        }

        // Draw glowing dashed beam
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = `${bubbleColor}aa`;
        ctx.lineWidth = 3;
        ctx.shadowColor = bubbleColor;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Inner bright line
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.setLineDash([]);

        // End dot glow
        const lastPt = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = bubbleColor;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();
    }

    draw(ctx) {
        this.drawAimLine(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Platform base (flat ring)
        const platformGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
        platformGrad.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
        platformGrad.addColorStop(0.7, 'rgba(60, 58, 160, 0.6)');
        platformGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.beginPath();
        ctx.ellipse(0, 10, 42, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.2)';
        ctx.fill();

        // Cannon barrel (rotates with angle)
        ctx.rotate(this.angle + Math.PI / 2);

        // Barrel glow
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 20;

        // Barrel outer
        const barrelGrad = ctx.createLinearGradient(-14, -48, 14, -48);
        barrelGrad.addColorStop(0, '#4338ca');
        barrelGrad.addColorStop(0.4, '#818cf8');
        barrelGrad.addColorStop(1, '#312e81');
        ctx.beginPath();
        ctx.roundRect(-14, -50, 28, 55, 6);
        ctx.fillStyle = barrelGrad;
        ctx.fill();

        // Barrel highlight stripe
        ctx.beginPath();
        ctx.roundRect(-5, -48, 6, 45, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();

        ctx.restore();

        // Cannon center disc
        ctx.save();
        ctx.translate(this.x, this.y);
        const discGrad = ctx.createRadialGradient(-8, -8, 2, 0, 0, 24);
        discGrad.addColorStop(0, '#a5b4fc');
        discGrad.addColorStop(0.5, '#6366f1');
        discGrad.addColorStop(1, '#1e1b4b');
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fillStyle = discGrad;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 25;
        ctx.fill();

        // Disc ring
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Disc shine
        ctx.beginPath();
        ctx.arc(-6, -6, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();
        ctx.restore();

        if (this.currentBubble) this.currentBubble.draw(ctx);
        if (this.projectile) this.projectile.draw(ctx);
    }
}
