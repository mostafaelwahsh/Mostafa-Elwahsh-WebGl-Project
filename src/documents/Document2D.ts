import {AxesHelper, Box3, BoxGeometry, Color, DoubleSide, GridHelper, MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Scene, Vector2, Vector3, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';
import type { ICommand } from '../commands/ICommand';
import { CreateWallCommand } from '../commands/CreateWallCommand';
import { ZoomFitCommand } from '../commands/ZoomFitCommand';

export class Document2D implements IDocument {
    container: HTMLElement;
    scene: Scene;
    camera: OrthographicCamera;
    controls: OrbitControls;
    activeCommand: ICommand;
     
    constructor(canvas: HTMLElement) {
        this.container = canvas;
        this.scene = this.createScene();
        this.camera = this.createCamera();
        new Resizer(canvas, this.camera);
        this.controls = this.addControls();
        this.addGridHelper();
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.zoomFit();
        this.activeCommand = new CreateWallCommand(this);
    }

    onMouseDown(e: MouseEvent) {
        this.activeCommand.onMouseDown(e);
    }

    removeObject(obj: any) {
        this.scene.remove(obj);
    }

    addObject(obj: any) {
        this.scene.add(obj);
    }

    getBoundingClientRect() {
        return this.container.getBoundingClientRect();
    }

    worldToScreen(worldPosition: Vector3): { x: number; y: number } {
        const vector = worldPosition.clone();
        vector.project(this.camera);

        const rect = this.getBoundingClientRect();
        const x = (vector.x + 1) * rect.width / 2 + rect.left;
        const y = (-vector.y + 1) * rect.height / 2 + rect.top;

        return { x, y };
    }

    unproject(vec: Vector3) {
        return vec.unproject(this.camera);
    }

    onMouseUp(e: MouseEvent) {
        this.activeCommand.onMouseUp(e);
    }

    drawWall(start: Vector3, end: Vector3) {
        var wallVec = new Vector2(end.x - start.x, end.y - start.y);
        var length = wallVec.length();
        var angle = Math.atan2(wallVec.y, wallVec.x);
        var geometry = new PlaneGeometry(length, 1);
        var material = new MeshBasicMaterial({
            color: 0x6699ff,
            side: DoubleSide,
            transparent: true,
            opacity: 0.6,
        });
        var mesh = new Mesh(geometry, material);
        mesh.position.set(
            ((start.x + end.x) / 2),
            ((start.y + end.y) / 2),
            0
        );
        mesh.rotation.z = angle;
        this.scene.add(mesh);
    }

    onMouseMove(e: MouseEvent) {
        this.activeCommand.onMouseMove(e);
    }

    zoomFit(offset = 1.1) {
        new ZoomFitCommand(this).execute(offset);
    }

    addControls() {
        const controls = new OrbitControls(this.camera, this.container);
        controls.enablePan = true;
        controls.enableRotate = false; // Disable rotation to keep elevation view
        controls.update();
        return controls;
    }

    addGridHelper() {
        // Create a grid in the XY plane for plan view
        const grid = new GridHelper(200, 20, 0x000000, 0xcccccc);
        grid.material.opacity = 0.5;
        grid.material.transparent = true;
        // Keep grid in XY plane for plan view
        grid.position.set(0, 0, 0);
        grid.rotation.x = Math.PI / 2; // Rotate to XY plane
        this.scene.add(grid);

        // Add axes helper with X and Y axes more prominent
        const axesHelper = new AxesHelper(50);
        // Make the Z axis less visible since we're in 2D plan view
        if (axesHelper.children) {
            const zAxis = axesHelper.children[2]; // Z axis is typically the third child
            if (zAxis && 'material' in zAxis) {
                (zAxis as any).material.opacity = 0.3;
                (zAxis as any).material.transparent = true;
            }
        }
        axesHelper.position.set(0, 0, 0);
        this.scene.add(axesHelper);
    }

    createScene() {
        const scene = new Scene();
        scene.background = new Color('white');
        return scene;
    }

    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = 100;
        const camera = new OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            100
        );
        // Position camera to look at XY plane from above
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        return camera;
    }
}