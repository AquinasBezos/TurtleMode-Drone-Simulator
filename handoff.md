# TurtleMode Simulator - Developer Handoff Document

This document provides context, architectural details, and a summary of completed and pending tasks for the TurtleMode Drone Simulator. It is intended for any developer or AI agent taking over the project.

## Project Overview
TurtleMode Simulator is a web-based FPV drone simulator designed to run entirely in the browser using JavaScript. It focuses on realistic flight physics, Gamepad API support for actual RC transmitters, and robust performance across different framerates.

### Tech Stack
*   **Core:** Vanilla HTML, CSS, JavaScript (ES Modules).
*   **Rendering:** Three.js (v0.160.0).
*   **Physics:** Cannon-es (v0.20.0).
*   **Models:** GLTFLoader for loading `.glb` and `.gltf` maps.

## Architecture & File Structure
The codebase is modularized into specific handler classes:

*   **`index.html`**: The main entry point. Contains the UI overlays (Launch Menu, Pause Menu) and imports the ES modules using an `<importmap>`.
*   **`css/style.css`**: Styling for the glass-panel UI, flexbox layouts, and the in-game OSD (On-Screen Display).
*   **`js/main.js`**: The central controller. Manages the `requestAnimationFrame` loop, game state (`MENU`, `PLAYING`, `PAUSED`), and delegates updates to the other modules.
*   **`js/physics.js`**: Handles the Cannon-es physics world. 
    *   *Critical Detail:* Force application is perfectly framerate-independent. It uses `world.addEventListener('preStep', ...)` to apply the drone's thrust and corrective PID torque immediately before every internal physics sub-step, bypassing issues where `world.step()` clears forces unexpectedly on high/low FPS.
    *   *Default Config:* Mass is `0.5kg`. Max Thrust is `35N` (yielding a realistic 7:1 Thrust-to-Weight Ratio).
*   **`js/renderer.js`**: Manages the Three.js scene. Handles the FPV camera attached to the drone body, global illumination (using a combination of `HemisphereLight` and `AmbientLight`), directional shadows with specific biases to prevent shadow acne, and loading 3D environments via `GLTFLoader`.
*   **`js/input.js`**: Interacts with the browser's Gamepad API. Handles axis mapping, deadzones, and reversing. Designed specifically for RC radios (e.g., TBS Tango, Radiomaster).
*   **`js/ui.js`**: Manages DOM interactions, slider bindings (updating physics config and rates dynamically), and handles the logic for uploading local custom maps.

## Key Milestones & Solved Problems
1.  **Framerate Independent Physics:** Originally, thrust forces were tied to the visual framerate, causing the drone to lack lift at 60fps and explode upwards at 144fps. This was definitively solved by injecting inputs directly into Cannon-es's internal sub-step cycle via `preStep`.
2.  **Custom Map Loading:** Added a feature allowing users to upload local `.glb`/`.gltf` files directly into the map selector. This works locally in the browser by generating `URL.createObjectURL(file)` without needing a backend server.
3.  **Lighting Overhaul:** Replaced a simplistic, dark ambient light with a `HemisphereLight` and optimized directional light shadow bounds to eliminate pitch-black shadows and shadow-clipping artifacts on large maps like `bando.glb`.
4.  **UI Refinements:** Rebranded to "TurtleMode Simulator", implemented an FPS counter, a performance FPS limiter, and a fully scrollable, responsive glass-panel menu.

## Known Limitations & Next Steps

If you are continuing development, the following areas require attention:

1.  **Environment Collision Geometry (High Priority):** 
    Currently, custom loaded maps (`bando.glb` or uploaded files) are visual-only. The drone passes through walls. You need to implement a parser that traverses the loaded `gltf.scene`, extracts vertex/index data, and generates `CANNON.Trimesh` bodies to add to the physics world.
2.  **Persistent Storage:**
    User configurations (Rates, Physics params, Input mappings) reset on page reload. Implement `localStorage` in `ui.js` and `input.js` to save and restore these settings.
3.  **Audio Engine:**
    There is no sound. Implement a basic Web Audio API system that adjusts the pitch/volume of a motor looping sample based on `axes.throttle`.
4.  **Reset/Crash Logic:**
    Implement crash detection (when the drone hits a wall too hard) and improve the reset workflow so the drone is placed at a designated spawn point rather than just `(0,1,0)`.

---
*End of Handoff Document*
