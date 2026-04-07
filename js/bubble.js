import { CONFIG } from './config.js';

export class Bubble {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.color = color;
        this.type = type;
        this.radius = CONFIG.HEX_RADIUS;

        this.vx = 0;
        this.vy = 0;

        this.popping = false;
        this.falling = false;
        this.dead = false;
        this.scale = 0;
        this.targetScale = 1;
        this.popTimer = 0;
    }

    update(dt) {
        if (this.scale < this.targetScale && !this.popping) {
            this.scale += dt * 8;
            if (this.scale > this.targetScale) this.scale = this.targetScale;
        }
        if (!this.falling && !this.popping) {
            this.x += (this.targetX - this.x) * Math.min(1, dt * 18);
            this.y += (this.targetY - this.y) * Math.min(1, dt * 18);
        }
        if (this.falling) {
            this.vy += 900 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }
        if (this.popping) {
            this.scale -= dt * 7;
            this.popTimer -= dt;
            if (this.scale <= 0) {
                this.scale = 0;
                this.dead = true;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        if (this.scale <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        const r = this.radius;

        if (this.type === 'normal') {
            this._drawGlassBubble(ctx, r, this.color);
        } else if (this.type === CONFIG.SPECIAL_COLORS.BOMB) {
            this._drawBombBubble(ctx, r);
        } else if (this.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            this._drawRainbowBubble(ctx, r);
        } else if (this.type === CONFIG.SPECIAL_COLORS.FIRE) {
            this._drawFireBubble(ctx, r);
        } else {
            this._drawGlassBubble(ctx, r, this.color);
        }

        ctx.restore();
    }

    _drawGlassBubble(ctx, r, color) {
        // Drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 6;

        // === BASE SPHERE ===
        // Deep radial gradient: bright hot center -> saturated mid -> dark edge rim (3D feel)
        const baseGrad = ctx.createRadialGradient(
            -r * 0.25, -r * 0.25, r * 0.05,
             r * 0.15,  r * 0.15, r * 1.05
        );
        baseGrad.addColorStop(0.0, this.lightenColor(color, 55));
        baseGrad.addColorStop(0.35, color);
        baseGrad.addColorStop(0.75, this.darkenColor(color, 35));
        baseGrad.addColorStop(1.0, this.darkenColor(color, 70));

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = baseGrad;
        ctx.fill();

        // Reset shadow for highlights
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // === RIM LIGHT (bottom-right glow — simulates environment light) ===
        const rimGrad = ctx.createRadialGradient(r * 0.5, r * 0.5, r * 0.4, r * 0.5, r * 0.5, r * 1.1);
        rimGrad.addColorStop(0.0, 'rgba(255,255,255,0)');
        rimGrad.addColorStop(0.7, 'rgba(255,255,255,0)');
        rimGrad.addColorStop(0.85, `${this.lightenColor(color, 60)}55`);
        rimGrad.addColorStop(1.0, `${this.lightenColor(color, 80)}22`);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();

        // === GLASS REFRACTION (inner translucent layer) ===
        const refractGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, r * 0.05, 0, 0, r * 0.9);
        refractGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
        refractGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
        refractGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = refractGrad;
        ctx.fill();

        // === PRIMARY SPECULAR HIGHLIGHT (top-left curved crescent) ===
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
        ctx.clip();
        const specGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.45, 0, -r * 0.15, -r * 0.3, r * 0.65);
        specGrad.addColorStop(0.0, 'rgba(255,255,255,0.9)');
        specGrad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        specGrad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
        specGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = specGrad;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();

        // === SECONDARY BRIGHT GLINT (tiny hot-spot) ===
        ctx.beginPath();
        ctx.arc(-r * 0.42, -r * 0.52, r * 0.13, 0, Math.PI * 2);
        const glintGrad = ctx.createRadialGradient(-r*0.42, -r*0.52, 0, -r*0.42, -r*0.52, r*0.13);
        glintGrad.addColorStop(0, 'rgba(255,255,255,1.0)');
        glintGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glintGrad;
        ctx.fill();

        // === SUBTLE TINTED OUTLINE ===
        ctx.beginPath();
        ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `${this.darkenColor(color, 50)}88`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    _drawBombBubble(ctx, r) {
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 4;

        // Dark body
        const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.05, 0, 0, r);
        grad.addColorStop(0, '#555');
        grad.addColorStop(0.5, '#222');
        grad.addColorStop(1, '#000');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Red ring pulse
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
        ctx.stroke();

        // ☠ symbol hint
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,80,0,0.9)';
        ctx.font = `bold ${r * 0.9}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 1);

        // Specular
        ctx.shadowColor = 'transparent';
        const sp = ctx.createRadialGradient(-r*0.35, -r*0.45, 0, -r*0.2, -r*0.3, r*0.55);
        sp.addColorStop(0, 'rgba(255,255,255,0.5)');
        sp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawRainbowBubble(ctx, r) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;

        const grad = ctx.createLinearGradient(-r, -r, r, r);
        grad.addColorStop(0, '#ff0070');
        grad.addColorStop(0.25, '#ffcc00');
        grad.addColorStop(0.5, '#00ff88');
        grad.addColorStop(0.75, '#00ccff');
        grad.addColorStop(1, '#cc00ff');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Specular top-left
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const sp = ctx.createRadialGradient(-r*0.3, -r*0.45, 0, -r*0.15, -r*0.3, r*0.65);
        sp.addColorStop(0, 'rgba(255,255,255,0.85)');
        sp.addColorStop(0.4, 'rgba(255,255,255,0.3)');
        sp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawFireBubble(ctx, r) {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 4;

        const grad = ctx.createRadialGradient(-r*0.2, -r*0.2, r*0.05, r*0.3, r*0.3, r);
        grad.addColorStop(0, '#fff700');
        grad.addColorStop(0.3, '#ff8c00');
        grad.addColorStop(0.7, '#ff3300');
        grad.addColorStop(1, '#800000');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const sp = ctx.createRadialGradient(-r*0.3, -r*0.45, 0, -r*0.15, -r*0.3, r*0.6);
        sp.addColorStop(0, 'rgba(255,255,255,0.8)');
        sp.addColorStop(0.4, 'rgba(255,255,255,0.2)');
        sp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }

    startPop() {
        if (this.popping) return;
        this.popping = true;
        this.popTimer = 0.25;
    }

    darkenColor(color, percent) {
        if (!color || color[0] !== '#') return '#000';
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
        R = Math.max(0, Math.floor(R * (100 - percent) / 100));
        G = Math.max(0, Math.floor(G * (100 - percent) / 100));
        B = Math.max(0, Math.floor(B * (100 - percent) / 100));
        return '#' + R.toString(16).padStart(2, '0') + G.toString(16).padStart(2, '0') + B.toString(16).padStart(2, '0');
    }

    lightenColor(color, percent) {
        if (!color || color[0] !== '#') return '#fff';
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);
        R = Math.min(255, Math.floor(R * (100 + percent) / 100));
        G = Math.min(255, Math.floor(G * (100 + percent) / 100));
        B = Math.min(255, Math.floor(B * (100 + percent) / 100));
        return '#' + R.toString(16).padStart(2, '0') + G.toString(16).padStart(2, '0') + B.toString(16).padStart(2, '0');
    }
}
