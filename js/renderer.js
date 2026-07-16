// renderer.js - Handles Three.js visualization

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Extend BufferGeometry and Mesh prototypes with BVH methods
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

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
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        // HemisphereLight provides a natural outdoor ambient gradient (sky color, ground color, intensity)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
        this.scene.add(hemiLight);

        // A softer ambient light to ensure the darkest crevices still have visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); 
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -150;
        dirLight.shadow.camera.right = 150;
        dirLight.shadow.camera.top = 150;
        dirLight.shadow.camera.bottom = -150;
        dirLight.shadow.bias = -0.0005;
        dirLight.shadow.normalBias = 0.02;
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

        this.environmentGroup = new THREE.Group();
        this.scene.add(this.environmentGroup);

        this.colliderMesh = null;
        this.collisionReady = false;

        this.currentMapName = null;
        this.loadMap('placeholder');

        // Handle Resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    async loadMap(mapName) {
        if (this.currentMapName === mapName) return;
        this.currentMapName = mapName;

        // Clear existing map
        while(this.environmentGroup.children.length > 0) { 
            const child = this.environmentGroup.children[0];
            this.environmentGroup.remove(child); 
        }

        if (mapName === 'placeholder') {
            this.createPlaceholderEnvironment();
        } else if (mapName === 'bando') {
            await this.loadEnvironment('bando.glb');
        } else {
            await this.loadEnvironment(mapName);
        }

        // Generate collision BVH for the loaded map
        await this.generateCollisionBVH();
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
        this.environmentGroup.add(floor);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x444444);
        gridHelper.position.y = 0.01;
        this.environmentGroup.add(gridHelper);

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
            this.environmentGroup.add(cube);
        }
    }

    loadEnvironment(url) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                const model = gltf.scene;
                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                this.environmentGroup.add(model);
                resolve();
            }, undefined, (error) => {
                console.error(error);
                reject(error);
            });
        });
    }

    generateCollisionBVH() {
        this.collisionReady = false;
        
        // 1. Gather all collidable geometries
        const geometries = [];
        this.environmentGroup.traverse((child) => {
            if (child.isMesh) {
                // Ignore the drone mesh itself
                if (child === this.droneMesh) return;
                
                child.updateMatrixWorld(true);
                if (child.geometry && child.geometry.attributes.position) {
                    const clonedGeom = child.geometry.clone();
                    clonedGeom.applyMatrix4(child.matrixWorld);
                    geometries.push(clonedGeom);
                }
            }
        });
        
        if (geometries.length === 0) {
            this.colliderMesh = null;
            this.collisionReady = true;
            return Promise.resolve();
        }
        
        // 2. Merge geometries into a single geometry
        const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);
        
        // Dispose of cloned geometries to free memory
        geometries.forEach(g => g.dispose());
        
        // 3. Build BVH using Web Worker (with synchronous fallback)
        return new Promise((resolve) => {
            const buildSync = () => {
                mergedGeom.computeBoundsTree();
                this.colliderMesh = new THREE.Mesh(mergedGeom);
                this.collisionReady = true;
                console.log("BVH generated successfully on main thread.");
                resolve();
            };

            try {
                console.log("Generating collision BVH tree asynchronously...");
                const worker = new GenerateMeshBVHWorker();
                
                // Set a timeout of 3 seconds. If it doesn't resolve, fall back to sync
                const timeoutId = setTimeout(() => {
                    console.warn("Worker BVH generation timed out. Falling back to main thread.");
                    worker.terminate();
                    buildSync();
                }, 3000);
                
                worker.generate(mergedGeom).then(bvh => {
                    clearTimeout(timeoutId);
                    mergedGeom.boundsTree = bvh;
                    this.colliderMesh = new THREE.Mesh(mergedGeom);
                    this.collisionReady = true;
                    console.log("BVH generated successfully via Web Worker.");
                    worker.terminate();
                    resolve();
                }).catch(err => {
                    clearTimeout(timeoutId);
                    console.warn("Worker BVH generation failed, falling back to main thread:", err);
                    worker.terminate();
                    buildSync();
                });
            } catch (e) {
                console.warn("Failed to initialize GenerateMeshBVHWorker, running on main thread:", e);
                buildSync();
            }
        });
    }

    checkCollision(position, radius) {
        if (!this.collisionReady || !this.colliderMesh) return null;
        
        const boundsTree = this.colliderMesh.geometry.boundsTree;
        if (!boundsTree) return null;
        
        const targetObj = {};
        const posVec = new THREE.Vector3(position.x, position.y, position.z);
        const result = boundsTree.closestPointToPoint(posVec, targetObj);
        
        if (result && result.distance < radius) {
            // Collision detected!
            const dist = result.distance;
            const closestPoint = result.point;
            const depth = radius - dist;
            const normal = new THREE.Vector3().subVectors(posVec, closestPoint);
            if (normal.lengthSq() > 0.0001) {
                normal.normalize();
            } else {
                // Default fallback normal
                normal.set(0, 1, 0);
            }
            
            return {
                closestPoint,
                dist,
                depth,
                normal
            };
        }
        
        return null;
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
