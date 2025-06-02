import {
    LineBasicMaterial, WebGLRenderer, Vector3, Color, Scene, PerspectiveCamera,
    OrthographicCamera, GridHelper, AxesHelper, AmbientLight,
    DirectionalLight, Line, BufferGeometry, Raycaster, Vector2,
    BoxGeometry, MeshStandardMaterial, Mesh, TextureLoader, DoubleSide,
    Box2, Box3, Object3D, Plane
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Wall {
    type: 'wall';
    start: Vector3;
    end: Vector3;
    angle: number;
    length: number;
    id: string;
    selected?: boolean;
    highlighted?: boolean;
    dimensionLabel?: {
        element: HTMLDivElement;
        update: () => void;
    };
}

export class Viewer {
    private container: HTMLElement;
    private renderer: WebGLRenderer;
    private scene2D: Scene;
    private scene3D: Scene;
    private camera2D: OrthographicCamera;
    private camera3D: PerspectiveCamera;
    private controls2D: OrbitControls;
    private controls3D: OrbitControls;
    private is2D: boolean = true;
    private walls: Wall[] = [];
    private wallCounter: number = 0;
    private isDrawing: boolean = false;
    private isDrawMode: boolean = false;
    private isMultiSelect: boolean = false;
    private currentStartPoint: Vector3 | null = null;
    private tempLine: Line | null = null;
    private wallMeshes: Map<string, Object3D> = new Map();
    private raycaster: Raycaster = new Raycaster();
    private mouse: Vector2 = new Vector2();
    private textureLoader: TextureLoader = new TextureLoader();
    private intersectionPlane: Plane;
    private tempDimensionLabel: HTMLDivElement | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.intersectionPlane = new Plane(new Vector3(0, 0, 1), 0);
   
        this.renderer = this.createRenderer();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.append(this.renderer.domElement);
     
        this.scene2D = this.createScene2D();
        this.scene3D = this.createScene3D();
        this.camera2D = this.createCamera2D();
        this.camera3D = this.createCamera3D();
        this.controls2D = this.createControls2D();
        this.controls3D = this.createControls3D();
        this.setup();
        this.animate();

        // Add window resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Initialize wall details panel
        this.updateWallDetailsPanel();

        // Add select walls button handler
        const selectWallsButton = document.getElementById('select-walls');
        if (selectWallsButton) {
            selectWallsButton.addEventListener('click', () => {
                if (this.isDrawMode) {
                    this.toggleDrawMode(); // Exit draw mode if active
                }
                this.toggleMultiSelect();
            });
        }

        // Add draw mode button handler
        const drawModeButton = document.getElementById('draw-mode');
        if (drawModeButton) {
            drawModeButton.addEventListener('click', () => {
                this.toggleDrawMode();
            });
        }
    }

    private setup() {
        // Add event listeners
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu

        // Add grid and lights to both scenes
        this.addGridAndLights(this.scene2D);
        this.addGridAndLights(this.scene3D);
    }

    private createRenderer(): WebGLRenderer {
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }

    private createScene2D(): Scene {
        const scene = new Scene();
        scene.background = new Color('white');
        return scene;
    }

    private createScene3D(): Scene {
        const scene = new Scene();
        scene.background = new Color('black');
        return scene;
    }

    private createCamera2D(): OrthographicCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 100;
        const camera = new OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            1,
            100
        );
        // Position camera to look at XY plane from above
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    private createCamera3D(): PerspectiveCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const camera = new PerspectiveCamera(35, aspect, 0.1, 500);
        camera.position.set(50, 50, 50);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    private createControls2D(): OrbitControls {
        const controls = new OrbitControls(this.camera2D, this.container);
        controls.enableRotate = false;
        controls.enablePan = true;
        controls.panSpeed = 2;
        controls.zoomSpeed = 1;
        controls.update();
        return controls;
    }

    private createControls3D(): OrbitControls {
        const controls = new OrbitControls(this.camera3D, this.container);
        controls.panSpeed = 2;
        controls.zoomSpeed = 1;
        controls.update();
        return controls;
    }

    private addGridAndLights(scene: Scene) {
        // Add grid with different settings for 2D and 3D
        const is2D = scene === this.scene2D;
        const grid = new GridHelper(200, 20, 0x000000, 0xcccccc);
        grid.material.opacity = 0.5;
        grid.material.transparent = true;
        
        if (is2D) {
            // For 2D view, rotate grid to XY plane
            grid.rotation.x = Math.PI / 2;
            grid.position.set(0, 0, 0);
        } else {
            // For 3D view, keep grid in XZ plane (default)
            grid.position.set(0, 0, 0);
        }
        scene.add(grid);

        // Add axes helper with appropriate size
        const axesHelper = new AxesHelper(is2D ? 50 : 5);
        if (is2D) {
            // Make Z axis less visible in 2D view
            if (axesHelper.children) {
                const zAxis = axesHelper.children[2];
                if (zAxis && 'material' in zAxis) {
                    (zAxis as any).material.opacity = 0.3;
                    (zAxis as any).material.transparent = true;
                }
            }
        }
        scene.add(axesHelper);

        // Add lights (only for 3D view)
        if (!is2D) {
            const ambientLight = new AmbientLight('white', 0.5);
            scene.add(ambientLight);

            const directionalLight = new DirectionalLight('white', 1);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);
        }
    }

    public setView(is2D: boolean) {
        // Don't allow switching to 3D view in draw mode
        if (this.isDrawMode && !is2D) {
            return;
        }

        this.is2D = is2D;
        if (is2D) {
            this.controls2D.update();
            // Show dimension labels in 2D view
            this.walls.forEach(wall => {
                if (wall.dimensionLabel) {
                    wall.dimensionLabel.element.style.display = 'block';
                }
            });
        } else {
            this.controls3D.update();
            this.update3DView();
            // Hide dimension labels in 3D view
            this.walls.forEach(wall => {
                if (wall.dimensionLabel) {
                    wall.dimensionLabel.element.style.display = 'none';
                }
            });
        }
    }

    private update3DView() {
        // Clear existing 3D meshes
        this.wallMeshes.forEach(mesh => {
            if (mesh.parent === this.scene3D) {
                this.scene3D.remove(mesh);
            }
        });
        this.wallMeshes.clear();
        
        // Recreate all walls in 3D
        this.walls.forEach(wall => this.createWallMesh3D(wall));
        this.updateWallDetailsPanel();
    }

    private createWallMesh3D(wall: Wall) {
        const wallHeight = 3; // meters
        const wallThickness = 0.2; // meters
        const wallLength = wall.length;

        // Create wall geometry
        const geometry = new BoxGeometry(wallLength, wallHeight, wallThickness);

        // Load and apply wall texture
        const texture = this.textureLoader.load('/textures/brick.jpg');
        texture.wrapS = texture.wrapT = 1000;
        texture.repeat.set(wallLength / 2, wallHeight / 2);

        const material = new MeshStandardMaterial({
            map: texture,
            side: DoubleSide,
            roughness: 0.7,
            metalness: 0.1
        });

        const mesh = new Mesh(geometry, material);

        // Position and rotate the wall
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        mesh.position.set(midPoint.x, wallHeight / 2, midPoint.y);
        mesh.rotation.y = -wall.angle; // Negative for correct orientation

        mesh.userData.wallId = wall.id;
        this.scene3D.add(mesh);
        this.wallMeshes.set(wall.id, mesh);
    }

    public addWall(start: Vector3, end: Vector3): Wall {
        const length = start.distanceTo(end);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const wall: Wall = {
            type: 'wall',
            start: start.clone(),
            end: end.clone(),
            angle,
            length,
            id: `wall_${this.wallCounter++}`,
            selected: false,
            highlighted: false
        };
        this.walls.push(wall);
        this.createWallMesh2D(wall);
        if (!this.is2D) {
            this.createWallMesh3D(wall);
        }
        this.updateWallDetailsPanel();
        this.clearTempDimensionLabel();
        return wall;
    }

    private createWallMesh2D(wall: Wall) {
        // Create a line for the wall
        const material = new LineBasicMaterial({ 
            color: 0x000000,
            linewidth: 2
        });
        const points = [wall.start, wall.end];
        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, material);
        line.userData.wallId = wall.id;

        // Create a rectangle for wall thickness
        const wallThickness = 0.2;
        const wallLength = wall.length;
        const wallGeometry = new BoxGeometry(wallLength, wallThickness, 0.01);
        const wallMaterial = new MeshStandardMaterial({ 
            color: 0xcccccc,
            side: DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const wallMesh = new Mesh(wallGeometry, wallMaterial);

        // Position and rotate the wall mesh
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        wallMesh.position.set(midPoint.x, midPoint.y, 0);
        wallMesh.rotation.z = wall.angle;
        wallMesh.userData.wallId = wall.id;

        this.scene2D.add(line);
        this.scene2D.add(wallMesh);
        this.wallMeshes.set(wall.id, line); // Store the line instead of mesh for 2D selection

        // Add dimension label
        this.addDimensionLabel(wall);
    }

    private onMouseMove(e: MouseEvent) {
        this.updateMousePosition(e);

        if (this.is2D) {
            if (this.isDrawing && this.currentStartPoint) {
                const intersects = this.getIntersectionPoint();
                if (intersects) {
                    this.updateTempLine(this.currentStartPoint, intersects);
                    this.updateTempDimensionLabel(this.currentStartPoint, intersects);
                }
            }
        }
        
        // Only highlight walls when not in drawing modes
        if (!this.isDrawing && !this.isDrawMode) {
            const intersects = this.getWallIntersection();
            if (intersects.length > 0) {
                const wallId = intersects[0].object.userData.wallId;
                this.highlightWall(wallId);
            } else {
                this.clearHighlights();
            }
        }
        
        this.updateDimensionLabels();
    }

    private onMouseDown(e: MouseEvent) {
        this.updateMousePosition(e);
        
        if (e.button === 0) { // Left click
            if (this.isMultiSelect || (!this.isDrawMode && !this.isDrawing)) {
                // Handle wall selection in both 2D and 3D views
                const intersects = this.getWallIntersection();
                if (intersects.length > 0) {
                    const wallId = intersects[0].object.userData.wallId;
                    if (this.isMultiSelect) {
                        this.toggleWallSelection(wallId);
                    } else {
                        this.selectWall(wallId);
                    }
                } else if (!this.isMultiSelect) {
                    // Clear selection only in single-select mode when clicking empty space
                    this.clearWallStates();
                }
            } else if (this.isDrawMode && this.is2D && !this.isDrawing) {
                // Start drawing new wall (only in 2D view and draw mode)
                const intersectPoint = this.getIntersectionPoint();
                if (intersectPoint) {
                    this.isDrawing = true;
                    this.currentStartPoint = intersectPoint;
                    this.tempLine = this.createTempLine(intersectPoint, intersectPoint);
                    this.scene2D.add(this.tempLine);
                }
            } else if (this.isDrawMode && this.is2D && this.isDrawing) {
                // Finish drawing wall (only in 2D view and draw mode)
                const intersectPoint = this.getIntersectionPoint();
                if (intersectPoint) {
                    const wall = this.addWall(this.currentStartPoint!, intersectPoint);
                    this.isDrawing = false;
                    this.scene2D.remove(this.tempLine!);
                    this.tempLine = null;
                    this.currentStartPoint = null;
                }
            }
        } else if (e.button === 2) { // Right click
            // Cancel drawing if in draw mode
            if (this.isDrawMode && this.isDrawing) {
                if (this.tempLine) {
                    this.scene2D.remove(this.tempLine);
                    this.tempLine = null;
                }
                this.isDrawing = false;
                this.currentStartPoint = null;
                this.clearTempDimensionLabel();
            }
        }
    }

    private onMouseUp(e: MouseEvent) {
        // Handle any mouse up events if needed
    }

    private createTempLine(start: Vector3, end: Vector3): Line {
        const material = new LineBasicMaterial({ color: 0x0000ff });
        const points = [start, end];
        const geometry = new BufferGeometry().setFromPoints(points);
        return new Line(geometry, material);
    }

    private updateTempLine(start: Vector3, end: Vector3) {
        if (this.tempLine) {
            const positions = this.tempLine.geometry.attributes.position;
            positions.setXYZ(0, start.x, start.y, start.z);
            positions.setXYZ(1, end.x, end.y, end.z);
            positions.needsUpdate = true;
        }
    }

    private updateMousePosition(e: MouseEvent) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
    }

    private getIntersectionPoint(): Vector3 | null {
        this.raycaster.setFromCamera(this.mouse, this.is2D ? this.camera2D : this.camera3D);
        const intersects = this.raycaster.ray.intersectPlane(this.intersectionPlane, new Vector3());
        return intersects || null;
    }

    private getWallIntersection(): any[] {
        this.raycaster.setFromCamera(this.mouse, this.is2D ? this.camera2D : this.camera3D);
        
        if (this.is2D) {
            // In 2D view, only check for Line objects
            const lineObjects = this.scene2D.children.filter(obj => 
                obj instanceof Line && obj.userData.wallId
            );
            return this.raycaster.intersectObjects(lineObjects);
        } else {
            // In 3D view, check meshes
            const wallObjects = Array.from(this.wallMeshes.values()).filter(obj => obj instanceof Mesh);
            return this.raycaster.intersectObjects(wallObjects);
        }
    }

    private animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.render();
    }

    private render() {
        if (this.is2D) {
            this.controls2D.update();
            this.renderer.render(this.scene2D, this.camera2D);
        } else {
            this.controls3D.update();
            this.renderer.render(this.scene3D, this.camera3D);
        }
    }

    private onWindowResize() {
        // Update renderer size
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Update 2D camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 100;
        this.camera2D.left = -frustumSize * aspect / 2;
        this.camera2D.right = frustumSize * aspect / 2;
        this.camera2D.top = frustumSize / 2;
        this.camera2D.bottom = -frustumSize / 2;
        this.camera2D.updateProjectionMatrix();

        // Update 3D camera
        this.camera3D.aspect = aspect;
        this.camera3D.updateProjectionMatrix();
    }

    public resetToOriginalView() {
        if (this.is2D) {
            // Reset 2D view
            this.camera2D.position.set(0, 0, 5);
            this.camera2D.lookAt(0, 0, 0);
            
            const aspect = this.container.clientWidth / this.container.clientHeight;
            const frustumSize = 100;
            this.camera2D.left = -frustumSize * aspect / 2;
            this.camera2D.right = frustumSize * aspect / 2;
            this.camera2D.top = frustumSize / 2;
            this.camera2D.bottom = -frustumSize / 2;
            this.camera2D.updateProjectionMatrix();
            
            this.controls2D.reset();
        } else {
            // Reset 3D view
            this.camera3D.position.set(50, 50, 50);
            this.camera3D.lookAt(0, 0, 0);
            this.camera3D.updateProjectionMatrix();
            
            this.controls3D.reset();
        }
    }

    private addDimensionLabel(wall: Wall) {
        const midPoint = new Vector3().addVectors(wall.start, wall.end).multiplyScalar(0.5);
        const label = document.createElement('div');
        label.className = 'dimension-label wall-length-label';
        label.textContent = `${wall.length.toFixed(2)} m`;
        label.style.position = 'absolute';
        // Hide label initially if in 3D view
        if (!this.is2D) {
            label.style.display = 'none';
        }
        
        // Update label position
        const updatePosition = () => {
            if (!this.is2D) return; // Don't update position if in 3D view
            const vector = midPoint.clone();
            vector.project(this.camera2D);
            const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
            const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight;
            label.style.transform = `translate(-50%, -50%)`;
            label.style.left = `${x}px`;
            label.style.top = `${y}px`;
        };
        
        updatePosition();
        this.container.appendChild(label);
        
        // Store the label and its update function for later use
        wall.dimensionLabel = {
            element: label,
            update: updatePosition
        };
    }

    private updateDimensionLabels() {
        // Only update labels if in 2D view
        if (this.is2D) {
            this.walls.forEach(wall => {
                if (wall.dimensionLabel) {
                    wall.dimensionLabel.update();
                }
            });
        }
    }

    private updateTempDimensionLabel(start: Vector3, end: Vector3) {
        if (!this.tempDimensionLabel) {
            this.tempDimensionLabel = document.createElement('div');
            this.tempDimensionLabel.className = 'wall-length-label';
            this.container.appendChild(this.tempDimensionLabel);
        }

        const length = start.distanceTo(end);
        const midPoint = new Vector3().addVectors(start, end).multiplyScalar(0.5);
        
        // Project the midpoint to screen coordinates
        const vector = midPoint.clone();
        vector.project(this.is2D ? this.camera2D : this.camera3D);
        const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight;
        
        this.tempDimensionLabel.textContent = `${length.toFixed(2)} m`;
        this.tempDimensionLabel.style.left = `${x}px`;
        this.tempDimensionLabel.style.top = `${y}px`;
        this.tempDimensionLabel.style.display = 'block';
    }

    private clearTempDimensionLabel() {
        if (this.tempDimensionLabel) {
            this.tempDimensionLabel.remove();
            this.tempDimensionLabel = null;
        }
    }

    private highlightWall(id: string) {
        this.walls.forEach(wall => {
            wall.highlighted = wall.id === id;
            this.updateWallAppearance(wall);
        });
        this.updateWallDetailsPanel();
    }

    private selectWall(id: string) {
        if (!this.isMultiSelect) {
            // In single select mode, deselect all other walls
            this.walls.forEach(wall => {
                wall.selected = wall.id === id;
                this.updateWallAppearance(wall);
            });
        }
        this.updateWallDetailsPanel();
    }

    private clearWallStates() {
        this.walls.forEach(wall => {
            wall.selected = false;
            wall.highlighted = false;
            this.updateWallAppearance(wall);
        });
        this.updateWallDetailsPanel();
    }

    private updateWallAppearance(wall: Wall) {
        // Find and update all objects associated with this wall
        const updateObjectInScene = (scene: Scene) => {
            scene.children.forEach(obj => {
                if (obj.userData.wallId === wall.id) {
                    if (scene === this.scene2D) {
                        if (obj instanceof Line) {
                            const material = obj.material as LineBasicMaterial;
                            // In 2D view: red for selected, green for hover, black for normal
                            material.color.setHex(wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0x000000));
                        }
                    } else {
                        // 3D view handling
                        if (obj instanceof Mesh) {
                            const material = obj.material as MeshStandardMaterial;
                            material.color.setHex(wall.selected ? 0xff0000 : (wall.highlighted ? 0x00ff00 : 0xcccccc));
                        }
                    }
                }
            });
        };

        // Update in both scenes
        updateObjectInScene(this.scene2D);
        updateObjectInScene(this.scene3D);
    }

    private toggleMultiSelect() {
        this.isMultiSelect = !this.isMultiSelect;
        const selectWallsButton = document.getElementById('select-walls');
        if (selectWallsButton) {
            selectWallsButton.style.backgroundColor = this.isMultiSelect ? '#4CAF50' : '#1976d2';
            selectWallsButton.textContent = this.isMultiSelect ? 'Finish Selection' : 'Select Walls';
        }
        if (!this.isMultiSelect) {
            // Update delete button text based on selection count
            const selectedCount = this.walls.filter(w => w.selected).length;
            const deleteButton = document.getElementById('delete-wall');
            if (deleteButton) {
                deleteButton.textContent = selectedCount > 0 ? `Delete Walls (${selectedCount})` : 'Delete Wall';
            }
        }
    }

    private toggleWallSelection(id: string) {
        const wall = this.walls.find(w => w.id === id);
        if (wall) {
            wall.selected = !wall.selected;
            this.updateWallAppearance(wall);
            this.updateWallDetailsPanel();
        }
    }

    public deleteSelectedWall() {
        const selectedWalls = this.walls.filter(wall => wall.selected);
        if (selectedWalls.length === 0) return;

        selectedWalls.forEach(wall => {
            // Remove dimension label if it exists
            if (wall.dimensionLabel) {
                wall.dimensionLabel.element.remove();
            }
            
            // Find and remove all objects associated with this wall from both scenes
            const removeFromScene = (scene: Scene) => {
                const objectsToRemove = scene.children.filter(obj => 
                    obj.userData.wallId === wall.id
                );
                
                objectsToRemove.forEach(obj => {
                    scene.remove(obj);
                    if (obj instanceof Mesh || obj instanceof Line) {
                        if (obj.geometry) obj.geometry.dispose();
                        if ('material' in obj && obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(m => m.dispose());
                            } else {
                                obj.material.dispose();
                            }
                        }
                    }
                });
            };

            // Remove from both scenes
            removeFromScene(this.scene2D);
            removeFromScene(this.scene3D);
            
            // Remove from wallMeshes map
            this.wallMeshes.delete(wall.id);
        });

        // Remove walls from the walls array
        this.walls = this.walls.filter(wall => !wall.selected);

        // Update UI
        this.updateWallDetailsPanel();

        // Reset delete button text
        const deleteButton = document.getElementById('delete-wall');
        if (deleteButton) {
            deleteButton.textContent = 'Delete Wall';
        }

        // Force both scenes to update
        this.renderer.render(this.scene2D, this.camera2D);
        this.renderer.render(this.scene3D, this.camera3D);

        // Clear any remaining selections
        this.clearWallStates();
    }

    private updateWallDetailsPanel() {
        const detailsDiv = document.getElementById('wall-details');
        if (!detailsDiv) return;
        const totalWalls = this.walls.length;
        const selectedWalls = this.walls.filter(w => w.selected).length;
        const totalLength = this.walls.reduce((sum, wall) => sum + wall.length, 0);
        let html = `<b>Walls Summary</b><br>`;
        html += `Total Walls: <b>${totalWalls}</b><br>`;
        html += `Selected Walls: <b>${selectedWalls}</b><br>`;
        html += `Total Length: <b>${totalLength.toFixed(2)} m</b><br><br>`;
        
        // Add individual wall details
        if (totalWalls > 0) {
            html += `<b>Individual Walls:</b><br>`;
            this.walls.forEach((wall, index) => {
                html += `Wall ${index + 1}: ${wall.length.toFixed(2)} m`;
                if (wall.selected) html += ' (Selected)';
                html += '<br>';
            });
        }
        
        detailsDiv.innerHTML = html;

        // Update delete button state and text
        const deleteButton = document.getElementById('delete-wall') as HTMLButtonElement;
        if (deleteButton) {
            const hasSelectedWall = this.walls.some(wall => wall.selected);
            deleteButton.disabled = !hasSelectedWall;
            deleteButton.textContent = selectedWalls > 0 ? `Delete Walls (${selectedWalls})` : 'Delete Wall';
        }
    }

    private toggleDrawMode() {
        this.isDrawMode = !this.isDrawMode;
        
        // Exit multi-select mode if active
        if (this.isDrawMode && this.isMultiSelect) {
            this.toggleMultiSelect();
        }

        // Update button appearance
        const drawModeButton = document.getElementById('draw-mode');
        if (drawModeButton) {
            drawModeButton.style.backgroundColor = this.isDrawMode ? '#4CAF50' : '#1976d2';
            drawModeButton.textContent = this.isDrawMode ? 'Exit Draw Mode' : 'Draw Mode';
        }

        // If exiting draw mode, clean up any ongoing drawing
        if (!this.isDrawMode) {
            if (this.tempLine) {
                this.scene2D.remove(this.tempLine);
                this.tempLine = null;
            }
            if (this.tempDimensionLabel) {
                this.clearTempDimensionLabel();
            }
            this.isDrawing = false;
            this.currentStartPoint = null;
        }

        // Switch to 2D view if entering draw mode
        if (this.isDrawMode && !this.is2D) {
            this.setView(true);
            const switchTo2DButton = document.getElementById('switch-to-2d');
            if (switchTo2DButton) {
                switchTo2DButton.click();
            }
        }
    }

    private clearHighlights() {
        this.walls.forEach(wall => {
            wall.highlighted = false;
            this.updateWallAppearance(wall);
        });
    }
}