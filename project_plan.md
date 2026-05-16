# Project Plan: Web-Based FPV Drone Simulator

## 1. Project Overview
A lightweight, browser-based FPV (First Person View) drone simulator built using **Google Antigravity** (matter.js based or similar gravity-defying physics concepts) and hosted via **GitHub Pages**. The focus is on high-performance input handling and customizable physics for pilot training.

## 2. Technical Stack
- **Engine:** JavaScript with Google Antigravity / Custom Physics Wrapper.
- **Rendering:** Three.js or WebGL for 3D environment rendering.
- **Input:** Gamepad API (supporting FPV controllers/radios).
- **Hosting:** GitHub Pages.
- **Version Control:** Git/GitHub.

## 3. Core Features

### 3.1 Controller Input (FPV Radio Support)
- **GPAD Integration:** Mirroring functionality found on `GPadTester.com` to ensure low-latency, raw input from USB FPV controllers (FrSky, TBS Tango, Radiomaster, etc.).
- **Axis Mapping:** Interface to map the 4 primary axes:
  - Throttle
  - Yaw
  - Pitch
  - Roll
- **Arming Switch:** A dedicated toggle input to enable/disable physics (Arm/Disarm).

### 3.2 Physics & Drone Model
- **Collision Shape:** A simplified cuboid collision box (no complex 3D mesh for the drone itself).
- **Flight Parameters (Adjustable):**
  - **Thrust:** Total upward force capability.
  - **Drag:** Global air resistance value.
  - **Rotation Rates:** Individual sliders for Roll, Pitch, and Yaw rates.
  - **Drone Scale:** Adjust the dimensions of the cuboid.

### 3.3 Environment & Map Loading
- **Custom Maps:** Support for uploading 3D files (e.g., `.obj` or `.gltf`) exported from Blender.
- **Map Scaling:** A slider to adjust the scale of the environment relative to the drone box.
- **Collision Detection:** Static mesh collision against the drone cuboid.

## 4. User Interface (Menus)

### 4.1 Launch Menu (Initial Setup)
- **Map Upload:** File selector for 3D models.
- **Drone Config:** Sliders for initial size and weight parameters.
- **Input Check:** Visual indicator of stick movement to confirm controller connection.

### 4.2 Pause Menu (In-Flight Adjustments)
- **Real-time Tuning:** Adjust Thrust, Drag, and Rates while the simulation is paused.
- **Controller Remapping:** Re-assign axes or invert controls without restarting.
- **Reset Button:** Quickly return the drone to the spawn point.

## 5. Development Roadmap

### Phase 1: Input & Basic Physics
- Implement Gamepad API listener.
- Set up the basic Antigravity physics loop.
- Apply thrust and rotational forces to a cube.

### Phase 2: Environment Rendering
- Integrate Three.js for the 3D viewport.
- Implement `.obj`/`.gltf` loader for user-provided maps.
- Implement the "Scale" slider logic for environments.

### Phase 3: UI & Polish
- Build the HTML/CSS overlay for menus.
- Implement the slider-to-physics binding.
- Finalize GitHub Pages deployment workflow.

---
*Generated for the FPV Simulator Development Team.*
