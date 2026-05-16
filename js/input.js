// input.js - Handles Gamepad API and normalizes inputs for the physics engine

export class InputHandler {
    constructor() {
        this.gamepadIndex = null;
        
        // Normalized inputs [-1, 1] for Pitch, Roll, Yaw. [0, 1] for Throttle.
        this.axes = {
            throttle: 0,
            yaw: 0,
            pitch: 0,
            roll: 0
        };
        
        this.armed = false;
        
        // Typical FPV Radio axis mapping (can be adjusted via UI later)
        // Adjust these indices based on the controller.
        this.mapping = {
            throttle: 0, // Usually Left Stick Y (but might be different on raw inputs)
            yaw: 3,      // Usually Left Stick X
            pitch: 2,    // Usually Right Stick Y
            roll: 1,     // Usually Right Stick X
            armButton: 0 // Button index for arming
        };

        this.reverse = {
            throttle: false,
            yaw: false,
            pitch: false,
            roll: false
        };

        this.initListeners();
    }

    updateMapping(type, key, value) {
        if (type === 'axis') {
            this.mapping[key] = parseInt(value, 10);
        } else if (type === 'reverse') {
            this.reverse[key] = value;
        }
    }

    initListeners() {
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            this.gamepadIndex = e.gamepad.index;
            
            // Dispatch a custom event to notify UI
            window.dispatchEvent(new CustomEvent('fpv-controller-connected', { detail: { connected: true }}));
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
                window.dispatchEvent(new CustomEvent('fpv-controller-connected', { detail: { connected: false }}));
            }
        });
        
        // Keyboard fallback for testing
        window.addEventListener("keydown", (e) => {
            if(e.key === 'w') this.axes.throttle = 1;
            if(e.key === 's') this.axes.throttle = 0;
            if(e.key === 'a') this.axes.yaw = -1;
            if(e.key === 'd') this.axes.yaw = 1;
            if(e.key === 'ArrowUp') this.axes.pitch = -1;
            if(e.key === 'ArrowDown') this.axes.pitch = 1;
            if(e.key === 'ArrowLeft') this.axes.roll = -1;
            if(e.key === 'ArrowRight') this.axes.roll = 1;
            if(e.key === ' ') {
                this.armed = !this.armed;
                window.dispatchEvent(new CustomEvent('fpv-arm-toggle', { detail: { armed: this.armed }}));
            }
        });
        
        window.addEventListener("keyup", (e) => {
            if(e.key === 'a' || e.key === 'd') this.axes.yaw = 0;
            if(e.key === 'ArrowUp' || e.key === 'ArrowDown') this.axes.pitch = 0;
            if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.axes.roll = 0;
        });
    }

    update() {
        if (this.gamepadIndex !== null) {
            const gamepad = navigator.getGamepads()[this.gamepadIndex];
            if (gamepad) {
                // Read raw axes
                // FPV controllers usually have 4 axes. Throttle is typically not self-centering.
                // Depending on the OS and browser, axis indices can vary. We use mapping.
                
                let rawThrottle = gamepad.axes[this.mapping.throttle] || 0;
                let rawYaw = gamepad.axes[this.mapping.yaw] || 0;
                let rawPitch = gamepad.axes[this.mapping.pitch] || 0;
                let rawRoll = gamepad.axes[this.mapping.roll] || 0;

                let t = (-rawThrottle + 1) / 2; 
                this.axes.throttle = this.reverse.throttle ? 1 - t : t;
                
                let y = this.reverse.yaw ? -rawYaw : rawYaw;
                let p = this.reverse.pitch ? -rawPitch : rawPitch;
                let r = this.reverse.roll ? -rawRoll : rawRoll;

                const applyDeadband = (val, db = 0.05) => {
                    if (Math.abs(val) < db) return 0;
                    return Math.sign(val) * ((Math.abs(val) - db) / (1 - db));
                };

                this.axes.yaw = applyDeadband(y);
                this.axes.pitch = applyDeadband(p);
                this.axes.roll = applyDeadband(r);

                // Handle arm switch
                if (gamepad.buttons[this.mapping.armButton]) {
                    const btnPressed = gamepad.buttons[this.mapping.armButton].pressed;
                    if (btnPressed && !this.prevArmBtnState) {
                        this.armed = !this.armed;
                        window.dispatchEvent(new CustomEvent('fpv-arm-toggle', { detail: { armed: this.armed }}));
                    }
                    this.prevArmBtnState = btnPressed;
                }
            }
        }
    }

    getAxes() {
        return this.axes;
    }

    isArmed() {
        return this.armed;
    }
}
