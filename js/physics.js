// physics.js - Handles Cannon-es physics environment and drone simulation

import * as CANNON from 'cannon-es';

export class PhysicsEngine {
    constructor() {
        // Core physics world
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.81, 0), // Standard Earth gravity
            allowSleep: false // Ensure physics never stop calculating for the drone
        });

        // Configurable Drone Parameters
        this.params = {
            mass: 0.5, // kg
            maxThrust: 35, // Newtons (Realistic TWR of 7:1)
            drag: 0.2, // Linear & Angular dampening
            rates: {
                roll: { center: 200, max: 600, expo: 0.5 },
                pitch: { center: 200, max: 600, expo: 0.5 },
                yaw: { center: 200, max: 400, expo: 0.5 }
            }
        };

        // Create the drone body (Simplified Cuboid)
        const size = new CANNON.Vec3(0.15, 0.05, 0.15); // W, H, D
        this.droneShape = new CANNON.Box(size);
        this.droneBody = new CANNON.Body({
            mass: this.params.mass,
            shape: this.droneShape,
            position: new CANNON.Vec3(0, 1, 0), // Start slightly above ground
            linearDamping: this.params.drag,
            angularDamping: this.params.drag
        });
        this.world.addBody(this.droneBody);

        // Placeholder Floor
        const floorShape = new CANNON.Plane();
        this.floorBody = new CANNON.Body({
            mass: 0, // Static
            shape: floorShape
        });
        // Rotate plane to be horizontal
        this.floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(this.floorBody);

        this.currentAxes = null;
        this.isArmed = false;

        // Apply continuous forces per physics sub-step using World events
        // This is guaranteed to run before every single internal integration step.
        this.world.addEventListener('preStep', () => {
            if (this.isArmed && this.currentAxes) {
                this.applyInputsInternal(this.currentAxes);
            }
        });

        this.collisionCallback = null;

        // Perform collision check and resolution immediately after every internal physics sub-step
        this.world.addEventListener('postStep', () => {
            if (this.collisionCallback) {
                const collision = this.collisionCallback(this.droneBody.position);
                if (collision) {
                    // Resolve position: push drone out of the colliding geometry
                    this.droneBody.position.x += collision.normal.x * collision.depth;
                    this.droneBody.position.y += collision.normal.y * collision.depth;
                    this.droneBody.position.z += collision.normal.z * collision.depth;
                    
                    // Resolve velocity: split into normal (bounce) and tangential (friction slide)
                    const vel = this.droneBody.velocity;
                    const vNormal = vel.x * collision.normal.x + vel.y * collision.normal.y + vel.z * collision.normal.z;
                    
                    if (vNormal < 0) {
                        const bounce = 0.2; // Restitution coefficient
                        const friction = 0.95; // Tangential sliding friction
                        
                        const vnX = collision.normal.x * vNormal;
                        const vnY = collision.normal.y * vNormal;
                        const vnZ = collision.normal.z * vNormal;
                        
                        const vtX = vel.x - vnX;
                        const vtY = vel.y - vnY;
                        const vtZ = vel.z - vnZ;
                        
                        this.droneBody.velocity.x = vtX * friction - vnX * bounce;
                        this.droneBody.velocity.y = vtY * friction - vnY * bounce;
                        this.droneBody.velocity.z = vtZ * friction - vnZ * bounce;
                    }
                }
            }
        });

        this.lastTime = performance.now();
    }

    updateConfig(config) {
        if (config.mass !== undefined) {
            this.params.mass = config.mass;
            this.droneBody.mass = config.mass;
            this.droneBody.updateMassProperties();
        }
        if (config.thrust !== undefined) this.params.maxThrust = config.thrust;
        if (config.drag !== undefined) {
            this.params.drag = config.drag;
            this.droneBody.linearDamping = config.drag;
            this.droneBody.angularDamping = config.drag;
        }
        if (config.rates !== undefined) {
            for (let axis in config.rates) {
                if (this.params.rates[axis]) {
                    this.params.rates[axis] = { ...this.params.rates[axis], ...config.rates[axis] };
                }
            }
        }
    }

    reset() {
        // Reset position and velocity
        this.droneBody.position.set(0, 1, 0);
        this.droneBody.quaternion.set(0, 0, 0, 1);
        this.droneBody.velocity.set(0, 0, 0);
        this.droneBody.angularVelocity.set(0, 0, 0);
    }

    setInputs(axes, armed) {
        this.currentAxes = axes;
        this.isArmed = armed;
    }

    applyInputsInternal(axes) {
        // Calculate thrust vector and apply locally at center of mass
        const thrustAmount = axes.throttle * this.params.maxThrust;
        const localThrust = new CANNON.Vec3(0, thrustAmount, 0);

        // Apply force exactly at the center of mass (0,0,0 local) to avoid unintended lever arm torque
        this.droneBody.applyLocalForce(localThrust, new CANNON.Vec3(0, 0, 0));

        // FPV Actual Rates (Betaflight style)
        // Interpolates between Center sensitivity and Max rate using Expo curve
        const degToRad = Math.PI / 180;

        const applyRate = (rcCommand, rateParams) => {
            const rcAbs = Math.abs(rcCommand);
            // 1. Exponential curve
            const expoValue = rcCommand * (1 - rateParams.expo) + Math.pow(rcCommand, 3) * rateParams.expo;
            // 2. Interpolation factor using SuperRate logic (SuperRate = 1 - Center/Max)
            const superRate = 1.0 - (rateParams.center / rateParams.max);
            const interpolationFactor = 1.0 - (rcAbs * superRate);
            // 3. Final rate in deg/s, converted to rad/s
            return ((rateParams.center * expoValue) / interpolationFactor) * degToRad;
        };

        const targetAngularVelocityLocal = new CANNON.Vec3(
            applyRate(axes.pitch, this.params.rates.pitch),
            applyRate(-axes.yaw, this.params.rates.yaw),
            applyRate(-axes.roll, this.params.rates.roll)
        );

        // Convert target angular velocity to world space
        const targetAngularVelocityWorld = this.droneBody.quaternion.vmult(targetAngularVelocityLocal);

        // Calculate angular velocity error
        const angularVelocityError = new CANNON.Vec3(
            targetAngularVelocityWorld.x - this.droneBody.angularVelocity.x,
            targetAngularVelocityWorld.y - this.droneBody.angularVelocity.y,
            targetAngularVelocityWorld.z - this.droneBody.angularVelocity.z
        );

        // Apply corrective torque (P-controller for gyro)
        // Tune pGain to control how snappy the drone stops and starts rotating.
        const pGain = 0.05;
        const correctiveTorque = new CANNON.Vec3(
            angularVelocityError.x * pGain,
            angularVelocityError.y * pGain,
            angularVelocityError.z * pGain
        );

        this.droneBody.applyTorque(correctiveTorque);
    }

    step(dt) {
        this.world.step(1 / 120, dt, 20);
    }

    getDroneState() {
        return {
            position: this.droneBody.position,
            quaternion: this.droneBody.quaternion
        };
    }
}
