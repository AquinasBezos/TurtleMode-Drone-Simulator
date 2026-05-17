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
            (mapChoice) => this.start(mapChoice),
            () => this.resume(),
            () => this.reset(),
            () => this.exit()
        );

        this.state = 'MENU'; // MENU, PLAYING, PAUSED
        this.lastTime = performance.now();
        
        // FPS tracking
        this.fpsElement = document.getElementById('fps-counter');
        this.frames = 0;
        this.lastFpsTime = performance.now();

        // FPS Limiter
        this.fpsLimitEnabled = false;
        this.fpsLimit = 60;
        
        const fpsToggle = document.getElementById('fps-limit-toggle');
        const fpsValue = document.getElementById('fps-limit-value');
        
        fpsToggle.addEventListener('change', (e) => {
            this.fpsLimitEnabled = e.target.checked;
            fpsValue.disabled = !this.fpsLimitEnabled;
        });
        
        fpsValue.addEventListener('input', (e) => {
            this.fpsLimit = parseInt(e.target.value, 10) || 60;
        });

        // Listen for ESC to pause
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state === 'PLAYING') {
                this.pause();
            }
        });

        // Start animation loop
        this.animate();
    }

    async start(mapChoice) {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.renderer.resetCamera();
        await this.renderer.loadMap(mapChoice);
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
        
        // Enforce FPS Limit
        if (this.fpsLimitEnabled && this.fpsLimit > 0) {
            const minFrameTime = 1000 / this.fpsLimit;
            if (now - this.lastTime < minFrameTime) {
                return; // Skip rendering this frame
            }
        }

        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Calculate FPS
        this.frames++;
        if (now - this.lastFpsTime >= 1000) {
            this.fpsElement.textContent = `FPS: ${this.frames}`;
            this.frames = 0;
            this.lastFpsTime = now;
        }

        // 1. Get Inputs
        this.input.update();
        const axes = this.input.getAxes();
        const armed = this.input.isArmed();

        // 2. Update UI Dashboard
        this.ui.updateDashboard(axes, armed);

        if (this.state === 'PLAYING') {
            // 3. Set physics inputs (applied continuously in body.preStep)
            this.physics.setInputs(axes, armed);
            
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
