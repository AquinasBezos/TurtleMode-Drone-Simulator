// main.js - Entry point for the application

import { Renderer } from './renderer.js';
import { PhysicsEngine } from './physics.js';
import { InputHandler } from './input.js';
import { UIHandler } from './ui.js';

class Simulator {
    constructor() {
        this.renderer = new Renderer('sim-container');
        this.physics = new PhysicsEngine();
        this.input = new InputHandler();
        
        // Setup UI
        this.ui = new UIHandler(
            this.physics,
            this.input,
            () => this.start(),
            () => this.resume(),
            () => this.reset(),
            () => this.exit()
        );

        this.state = 'MENU'; // MENU, PLAYING, PAUSED
        this.lastTime = performance.now();

        // Listen for ESC to pause
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state === 'PLAYING') {
                this.pause();
            }
        });

        // Start animation loop
        this.animate();
    }

    start() {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.renderer.resetCamera();
    }

    pause() {
        this.state = 'PAUSED';
        this.ui.showPauseMenu();
    }

    resume() {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.renderer.resetCamera();
    }

    reset() {
        this.physics.reset();
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.renderer.resetCamera();
    }

    exit() {
        this.physics.reset();
        this.state = 'MENU';
        // Reset camera lookat for menu
        this.renderer.camera.lookAt(0, 0, 0);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // 1. Get Inputs
        this.input.update();
        const axes = this.input.getAxes();
        const armed = this.input.isArmed();

        // 2. Update UI Dashboard
        this.ui.updateDashboard(axes, armed);

        if (this.state === 'PLAYING') {
            // 3. Apply physics if armed
            if (armed) {
                this.physics.applyInputs(axes);
            }
            
            // 4. Step Physics Engine
            // Cap dt to prevent huge jumps if tab was inactive
            this.physics.step(Math.min(dt, 0.1));
            
            // 5. Sync Renderer with Physics
            const droneState = this.physics.getDroneState();
            this.renderer.updateDrone(droneState);
        } else if (this.state === 'MENU') {
            // In menu, we can still slowly rotate the camera around the drone to look nice
            const time = now * 0.0005;
            this.renderer.camera.position.x = Math.sin(time) * 2;
            this.renderer.camera.position.z = Math.cos(time) * 2 + 1;
            this.renderer.camera.lookAt(0, 0, 0);
        }

        // 6. Render Frame
        this.renderer.render();
    }
}

// Initialize on window load
window.addEventListener('load', () => {
    new Simulator();
});
