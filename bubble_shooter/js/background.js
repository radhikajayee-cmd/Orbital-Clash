export class BackgroundRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.particles = [];
        this.time = 0;
        
        this.initParticles();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const numParticles = 50;
        
        for (let i = 0; i < numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.5 + 0.2,
                hue: Math.random() * 60 + 200 // Blue to purple range
            });
        }
    }

    update(dt) {
        this.time += dt;
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
            
            // Subtle pulsing
            particle.alpha = 0.3 + Math.sin(this.time * 2 + particle.x * 0.01) * 0.2;
        });
    }

    draw() {
        // Clear with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw animated particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Add some subtle moving gradients
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        const waveGradient = this.ctx.createRadialGradient(
            this.width * 0.5 + Math.sin(this.time) * 100,
            this.height * 0.5 + Math.cos(this.time * 0.7) * 50,
            0,
            this.width * 0.5 + Math.sin(this.time) * 100,
            this.height * 0.5 + Math.cos(this.time * 0.7) * 50,
            200
        );
        waveGradient.addColorStop(0, '#4facfe');
        waveGradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = waveGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }
}