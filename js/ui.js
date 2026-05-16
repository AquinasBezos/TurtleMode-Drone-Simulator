// ui.js - Handles DOM interactions and Menus

export class UIHandler {
    constructor(physicsEngine, inputHandler, startCallback, resumeCallback, resetCallback, exitCallback) {
        this.physics = physicsEngine;
        this.inputHandler = inputHandler;
        this.startCallback = startCallback;
        this.resumeCallback = resumeCallback;
        this.resetCallback = resetCallback;
        this.exitCallback = exitCallback;

        this.elements = {
            launchMenu: document.getElementById('launch-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            osd: document.getElementById('osd'),
            
            btnStart: document.getElementById('btn-start'),
            btnResume: document.getElementById('btn-resume'),
            btnReset: document.getElementById('btn-reset'),
            btnExit: document.getElementById('btn-exit'),
            
            gpStatus: document.getElementById('gamepad-status'),
            stickLeft: document.getElementById('stick-left'),
            stickRight: document.getElementById('stick-right'),
            
            bars: {
                t: document.getElementById('bar-t'),
                y: document.getElementById('bar-y'),
                p: document.getElementById('bar-p'),
                r: document.getElementById('bar-r')
            },
            
            osdArm: document.getElementById('osd-arm'),
            osdThrottle: document.getElementById('osd-throttle')
        };

        this.initEventListeners();
        this.bindSliders();
    }

    initEventListeners() {
        this.elements.btnStart.addEventListener('click', () => {
            this.hideMenu(this.elements.launchMenu);
            this.elements.osd.classList.remove('hidden');
            this.startCallback();
        });

        this.elements.btnResume.addEventListener('click', () => {
            this.hideMenu(this.elements.pauseMenu);
            this.elements.osd.classList.remove('hidden');
            this.resumeCallback();
        });

        this.elements.btnReset.addEventListener('click', () => {
            this.hideMenu(this.elements.pauseMenu);
            this.elements.osd.classList.remove('hidden');
            this.resetCallback();
        });

        this.elements.btnExit.addEventListener('click', () => {
            this.hideMenu(this.elements.pauseMenu);
            // Don't show OSD.
            this.elements.launchMenu.classList.remove('hidden');
            // Slight delay before active to trigger transition
            setTimeout(() => {
                this.elements.launchMenu.classList.add('active');
            }, 10);
            this.exitCallback();
        });

        window.addEventListener('fpv-controller-connected', (e) => {
            if (e.detail.connected) {
                this.elements.gpStatus.textContent = "Gamepad Connected";
                this.elements.gpStatus.className = "status-indicator connected";
            } else {
                this.elements.gpStatus.textContent = "No Gamepad Detected";
                this.elements.gpStatus.className = "status-indicator disconnected";
            }
        });
    }

    bindSliders() {
        const bindSlider = (id, valId, callback) => {
            const slider = document.getElementById(id);
            const valSpan = document.getElementById(valId);
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                valSpan.textContent = val.toFixed(id.includes('drag') ? 2 : 1);
                callback(val);
            });
        };

        // Launch Menu
        bindSlider('cfg-mass', 'val-mass', (val) => this.physics.updateConfig({ mass: val }));
        bindSlider('cfg-thrust', 'val-thrust', (val) => this.physics.updateConfig({ thrust: val }));
        bindSlider('cfg-drag', 'val-drag', (val) => this.physics.updateConfig({ drag: val }));

        // Pause Menu (Rates)
        // Roll
        bindSlider('tune-r-c', 'val-r-c', (val) => this.physics.updateConfig({ rates: { roll: { center: val } } }));
        bindSlider('tune-r-m', 'val-r-m', (val) => this.physics.updateConfig({ rates: { roll: { max: val } } }));
        bindSlider('tune-r-e', 'val-r-e', (val) => this.physics.updateConfig({ rates: { roll: { expo: val } } }));
        // Pitch
        bindSlider('tune-p-c', 'val-p-c', (val) => this.physics.updateConfig({ rates: { pitch: { center: val } } }));
        bindSlider('tune-p-m', 'val-p-m', (val) => this.physics.updateConfig({ rates: { pitch: { max: val } } }));
        bindSlider('tune-p-e', 'val-p-e', (val) => this.physics.updateConfig({ rates: { pitch: { expo: val } } }));
        // Yaw
        bindSlider('tune-y-c', 'val-y-c', (val) => this.physics.updateConfig({ rates: { yaw: { center: val } } }));
        bindSlider('tune-y-m', 'val-y-m', (val) => this.physics.updateConfig({ rates: { yaw: { max: val } } }));
        bindSlider('tune-y-e', 'val-y-e', (val) => this.physics.updateConfig({ rates: { yaw: { expo: val } } }));

        // Mapping Inputs
        const bindMapping = (id, key) => {
            const input = document.getElementById(id);
            input.addEventListener('change', (e) => {
                this.inputHandler.updateMapping('axis', key, e.target.value);
            });
        };
        const bindReverse = (id, key) => {
            const checkbox = document.getElementById(id);
            checkbox.addEventListener('change', (e) => {
                this.inputHandler.updateMapping('reverse', key, e.target.checked);
            });
        };

        bindMapping('map-t-idx', 'throttle');
        bindMapping('map-y-idx', 'yaw');
        bindMapping('map-p-idx', 'pitch');
        bindMapping('map-r-idx', 'roll');
        bindMapping('map-arm-idx', 'armButton');

        bindReverse('map-t-rev', 'throttle');
        bindReverse('map-y-rev', 'yaw');
        bindReverse('map-p-rev', 'pitch');
        bindReverse('map-r-rev', 'roll');
    }

    showPauseMenu() {
        this.elements.osd.classList.add('hidden');
        this.elements.pauseMenu.classList.remove('hidden');
        this.elements.pauseMenu.classList.add('active');
    }

    hideMenu(menuElement) {
        menuElement.classList.remove('active');
        setTimeout(() => {
            menuElement.classList.add('hidden');
        }, 300); // Wait for transition
    }

    updateDashboard(axes, armed) {
        // Update input visualizer in launch menu (if active)
        if (this.elements.launchMenu.classList.contains('active')) {
            // Map axes to visual dots (assuming mode 2: Left=Yaw/Thr, Right=Roll/Pitch)
            // axes.throttle [0, 1] -> Y axis of left stick (invert for CSS top)
            // axes.yaw [-1, 1] -> X axis of left stick
            const ly = (1 - axes.throttle) * 100; 
            const lx = ((axes.yaw + 1) / 2) * 100;
            this.elements.stickLeft.style.top = `${ly}%`;
            this.elements.stickLeft.style.left = `${lx}%`;

            // axes.pitch [-1, 1] -> Y axis of right stick (pitch down is negative raw, so top)
            const ry = ((axes.pitch + 1) / 2) * 100;
            const rx = ((axes.roll + 1) / 2) * 100;
            this.elements.stickRight.style.top = `${ry}%`;
            this.elements.stickRight.style.left = `${rx}%`;

            // Bars
            this.elements.bars.t.innerHTML = `<div class="bar-value" style="width: ${axes.throttle * 100}%; background: ${axes.throttle > 0 ? 'var(--accent-color)' : 'transparent'};"></div>`;
            this.elements.bars.y.innerHTML = `<div class="bar-value" style="width: ${Math.abs(axes.yaw) * 50}%; margin-left: ${axes.yaw < 0 ? 50 - Math.abs(axes.yaw)*50 : 50}%;"></div>`;
            this.elements.bars.p.innerHTML = `<div class="bar-value" style="width: ${Math.abs(axes.pitch) * 50}%; margin-left: ${axes.pitch < 0 ? 50 - Math.abs(axes.pitch)*50 : 50}%;"></div>`;
            this.elements.bars.r.innerHTML = `<div class="bar-value" style="width: ${Math.abs(axes.roll) * 50}%; margin-left: ${axes.roll < 0 ? 50 - Math.abs(axes.roll)*50 : 50}%;"></div>`;
        }

        // Update OSD
        if (!this.elements.osd.classList.contains('hidden')) {
            if (armed) {
                this.elements.osdArm.textContent = "ARMED";
                this.elements.osdArm.classList.add('armed');
            } else {
                this.elements.osdArm.textContent = "DISARMED";
                this.elements.osdArm.classList.remove('armed');
            }
            this.elements.osdThrottle.textContent = `THR: ${Math.round(axes.throttle * 100)}%`;
        }
    }
}
