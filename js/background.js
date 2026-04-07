export class BackgroundRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width || 500;
        this.height = canvas.height || 800;
        this.time = 0;
        this.stars = [];
        this.nebulas = [];
        this.initStars();
        this.initNebulas();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.initStars();
        this.initNebulas();
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.3,
                alpha: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 3 + 1,
                twinkleOffset: Math.random() * Math.PI * 2,
                hue: [220, 240, 260, 190, 300][Math.floor(Math.random() * 5)]
            });
        }
    }

    initNebulas() {
        this.nebulas = [];
        for (let i = 0; i < 6; i++) {
            this.nebulas.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 150 + 80,
                hue: [220, 260, 300, 180][Math.floor(Math.random() * 4)],
                alpha: Math.random() * 0.08 + 0.03,
                speed: (Math.random() - 0.5) * 6,
                drift: (Math.random() - 0.5) * 3
            });
        }
    }

    update(dt) {
        this.time += dt;

        this.nebulas.forEach(n => {
            n.x += n.drift * dt;
            n.y += n.speed * dt;
            if (n.y > this.height + n.radius) n.y = -n.radius;
            if (n.y < -n.radius) n.y = this.height + n.radius;
            if (n.x > this.width + n.radius) n.x = -n.radius;
            if (n.x < -n.radius) n.x = this.width + n.radius;
        });
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Deep space gradient
        const bg = ctx.createLinearGradient(0, 0, 0, this.height);
        bg.addColorStop(0, '#050811');
        bg.addColorStop(0.4, '#080d1a');
        bg.addColorStop(0.8, '#0a0f1e');
        bg.addColorStop(1, '#060a14');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Nebula clouds
        this.nebulas.forEach(n => {
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
            grad.addColorStop(0, `hsla(${n.hue}, 80%, 60%, ${n.alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, this.width, this.height);
        });

        // Twinkling stars
        this.stars.forEach(s => {
            const twinkle = 0.5 + 0.5 * Math.sin(this.time * s.twinkleSpeed + s.twinkleOffset);
            const alpha = s.alpha * (0.4 + 0.6 * twinkle);

            ctx.save();
            ctx.globalAlpha = alpha;

            // Glow for bigger stars
            if (s.size > 1.5) {
                const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
                glow.addColorStop(0, `hsl(${s.hue}, 90%, 90%)`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Star core
            ctx.fillStyle = `hsl(${s.hue}, 90%, 95%)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Subtle pulsing light at bottom (cannon area)
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.04 * Math.sin(this.time * 1.5);
        const bottomGlow = ctx.createRadialGradient(
            this.width / 2, this.height, 0,
            this.width / 2, this.height, this.width * 0.8
        );
        bottomGlow.addColorStop(0, '#6366f1');
        bottomGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = bottomGlow;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }
}