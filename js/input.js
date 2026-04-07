export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.pointer = { x: 0, y: 0, isDown: false, justPressed: false, justReleased: false };
        
        this.init();
    }

    init() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        window.addEventListener('mouseup', (e) => this.handleUp(e));

        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => this.handleDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleUp(e));
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        // Scale pos if canvas aspect changes
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleDown(e) {
        if(e.cancelable) e.preventDefault();
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
        this.pointer.isDown = true;
        this.pointer.justPressed = true;
    }

    handleMove(e) {
        if(this.pointer.isDown && e.cancelable) e.preventDefault();
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
    }

    handleUp(e) {
        const pos = this.getPointerPos(e);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
    }

    resetFrame() {
        this.pointer.justPressed = false;
        this.pointer.justReleased = false;
    }
}
