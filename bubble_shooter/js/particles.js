import { CONFIG } from './config.js';

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 300 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.radius = Math.random() * 5 + 2;
        this.life = 1.0; // 1 second
        this.maxLife = 1.0;
    }

    update(dt) {
        this.vy += 800 * dt; // gravity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
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
        this.life = 1.0;
        this.vy = -100;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = 'bold 24px "Fredoka One", sans-serif';
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.fallingBubbles = [];
    }

    emitExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    emitText(x, y, text, color) {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    addFallingBubble(bubble) {
        bubble.falling = true;
        bubble.vx = (Math.random() - 0.5) * 200;
        bubble.vy = -100; // Bounce up slightly
        this.fallingBubbles.push(bubble);
    }

    update(dt, screenHeight) {
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0 || this.particles[i].y > screenHeight) {
                this.particles.splice(i, 1);
            }
        }
        
        // Texts
        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.texts[i].update(dt);
            if (this.texts[i].life <= 0) {
                this.texts.splice(i, 1);
            }
        }
        
        // Falling bubbles (drop points)
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            this.fallingBubbles[i].update(dt);
            if (this.fallingBubbles[i].y > screenHeight + 50) {
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
