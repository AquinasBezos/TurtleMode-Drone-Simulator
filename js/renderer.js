// renderer.js - Handles Three.js visualization

import * as THREE from 'three';

export class Renderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

        // Camera setup (FPV)
        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 1000);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        // Drone Mesh (Visual rep of the collision box)
        const droneGeo = new THREE.BoxGeometry(0.3, 0.1, 0.3); // Width x Height x Depth
        const droneMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.droneMesh = new THREE.Mesh(droneGeo, droneMat);
        this.droneMesh.castShadow = true;
        this.droneMesh.visible = false; // Make invisible for FPV
        this.scene.add(this.droneMesh);

        // Attach Camera to Drone (slightly forward/up for FPV view)
        this.cameraOffset = new THREE.Vector3(0, 0.05, -0.15); // Local offset
        this.droneMesh.add(this.camera);
        this.camera.position.copy(this.cameraOffset);
        // Look forward with a 20 degree up tilt (typical FPV)
        this.camera.rotation.set(THREE.MathUtils.degToRad(20), 0, 0);

        this.createPlaceholderEnvironment();

        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    createPlaceholderEnvironment() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ 
            color: 0x888888, 
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x444444);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Colored Cubes
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        for(let i=0; i<20; i++) {
            const size = Math.random() * 2 + 0.5;
            const cubeGeo = new THREE.BoxGeometry(size, size, size);
            const cubeMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            
            cube.position.x = (Math.random() - 0.5) * 40;
            cube.position.z = (Math.random() - 0.5) * 40;
            cube.position.y = size / 2;
            
            cube.castShadow = true;
            cube.receiveShadow = true;
            this.scene.add(cube);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    resetCamera() {
        this.camera.position.copy(this.cameraOffset);
        this.camera.rotation.set(THREE.MathUtils.degToRad(20), 0, 0);
    }

    updateDrone(state) {
        // State contains position and quaternion from physics engine
        this.droneMesh.position.copy(state.position);
        this.droneMesh.quaternion.copy(state.quaternion);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
