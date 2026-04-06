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
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        
        // States
        this.popping = false;
        this.falling = false;
        this.scale = 0; // Starts at 0 for spawn animation
        this.targetScale = 1;
        
        // Animation
        this.popTimer = 0;
    }

    update(dt) {
        // Growth animation
        if (this.scale < this.targetScale && !this.popping) {
            this.scale += dt * 5;
            if (this.scale > this.targetScale) this.scale = this.targetScale;
        }

        // Lerp position for smooth grid snapping
        if (!this.falling && !this.popping) {
            this.x += (this.targetX - this.x) * (dt * 15);
            this.y += (this.targetY - this.y) * (dt * 15);
        }

        if (this.falling) {
            this.vy += 800 * dt; // Gravity
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        if (this.popping) {
            this.scale -= dt * 5;
            this.popTimer -= dt;
            if (this.scale <= 0) {
                this.scale = 0;
                this.dead = true;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Bubble Shadow with glow
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        // Outer glow for aiming effect
        if (this.type === 'normal') {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
            const glowGrad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + 3);
            glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
            glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glowGrad;
            ctx.fill();
        }

        // Bubble Base Color with enhanced gradient
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        if (this.type === 'normal') {
            const grad = ctx.createRadialGradient(-this.radius*0.4, -this.radius*0.4, this.radius*0.2, 
                                                -this.radius*0.2, -this.radius*0.2, this.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, this.lightenColor(this.color, 30));
            grad.addColorStop(0.7, this.color);
            grad.addColorStop(1, this.darkenColor(this.color, 50));
            ctx.fillStyle = grad;
        } else if (this.type === CONFIG.SPECIAL_COLORS.BOMB) {
            ctx.fillStyle = '#333';
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Bomb fuse with glow
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.quadraticCurveTo(10, -this.radius - 10, 15, -this.radius-5);
            ctx.strokeStyle = '#ff8c00';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else if (this.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            grad.addColorStop(0, '#ff0000');
            grad.addColorStop(0.2, '#ff8000');
            grad.addColorStop(0.4, '#ffff00');
            grad.addColorStop(0.6, '#00ff00');
            grad.addColorStop(0.8, '#0080ff');
            grad.addColorStop(1, '#8000ff');
            ctx.fillStyle = grad;
            // Rainbow glow
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
        } else if (this.type === CONFIG.SPECIAL_COLORS.FIRE) {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#ffff00');
            grad.addColorStop(0.6, '#ff8c00');
            grad.addColorStop(1, '#ff0000');
            ctx.fillStyle = grad;
            // Fire glow
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 12;
        }

        ctx.fill();

        // Enhanced high gloss highlight
        if(this.type === 'normal' || this.type === CONFIG.SPECIAL_COLORS.RAINBOW) {
            ctx.beginPath();
            ctx.ellipse(-this.radius*0.4, -this.radius*0.5, this.radius*0.5, this.radius*0.25, -Math.PI/4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
            
            // Inner highlight
            ctx.beginPath();
            ctx.ellipse(-this.radius*0.2, -this.radius*0.3, this.radius*0.2, this.radius*0.1, -Math.PI/4, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
        if (this.popping) return;
        this.popping = true;
        this.popTimer = 0.2;
    }

    darkenColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 - percent) / 100);
        G = parseInt(G * (100 - percent) / 100);
        B = parseInt(B * (100 - percent) / 100);

        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  

        let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }

    lightenColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R>255)?255:R;  
        G = (G>255)?255:G;  
        B = (B>255)?255:B;  

        let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }
}
