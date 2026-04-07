import { CONFIG } from './config.js';

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 350 + 80;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 150;
        this.radius = Math.random() * 6 + 2;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 10;
    }

    update(dt) {
        this.vy += 600 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.98;
        this.life -= dt * 1.2;
        this.rotation += this.rotSpeed * dt;
        this.radius *= 0.98;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
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
        this.life = 1.2;
        this.maxLife = 1.2;
        this.vy = -120;
        this.scale = 0.5;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.vy *= 0.96;
        this.life -= dt;
        this.scale = Math.min(1.3, this.scale + dt * 5);
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.font = 'bold 26px "Fredoka One", cursive';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.fallingBubbles = [];
    }

    emitExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        // Ring flash
        this.particles.push({
            x, y, color,
            life: 0.3,
            maxLife: 0.3,
            radius: 5,
            isRing: true,
            update(dt) { this.life -= dt; this.radius += 60 * dt; },
            draw(ctx) {
                if (this.life <= 0) return;
                ctx.save();
                ctx.globalAlpha = this.life / this.maxLife * 0.5;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    emitText(x, y, text, color) {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    addFallingBubble(bubble) {
        bubble.falling = true;
        bubble.vx = (Math.random() - 0.5) * 250;
        bubble.vy = -80 + Math.random() * -80;
        this.fallingBubbles.push(bubble);
    }

    update(dt, screenHeight) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0 || this.particles[i].y > screenHeight + 80) {
                this.particles.splice(i, 1);
            }
        }
        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.texts[i].update(dt);
            if (this.texts[i].life <= 0) this.texts.splice(i, 1);
        }
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            this.fallingBubbles[i].update(dt);
            if (this.fallingBubbles[i].y > screenHeight + 80) {
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
