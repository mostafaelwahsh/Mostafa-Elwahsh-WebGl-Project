import { Vector3, Vector2, PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh } from "three";
import type { Document2D } from "../documents/Document2D";
import type { ICommand } from "./ICommand";

export class CreateWallCommand implements ICommand {
    document: Document2D;
    points: Vector3[] = [];
    mouse: Vector2 = new Vector2();
    drawing: boolean = false;
    previewWall: any;
    lengthLabel: HTMLDivElement | null = null;

    constructor(document: Document2D) {
        this.document = document;
        this.createLengthLabel();
    }

    private createLengthLabel() {
        this.lengthLabel = document.createElement('div');
        this.lengthLabel.className = 'wall-length-label';
        this.lengthLabel.style.display = 'none';
        document.body.appendChild(this.lengthLabel);
    }

    private updateLengthLabel(startPoint: Vector3, currentPoint: Vector3) {
        if (!this.lengthLabel) return;
        
        const length = new Vector2(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y).length();
        this.lengthLabel.textContent = `${length.toFixed(2)} m`;
        
        const rect = this.document.getBoundingClientRect();
        const midPoint = new Vector3().addVectors(startPoint, currentPoint).multiplyScalar(0.5);
        const screenPos = this.document.worldToScreen(midPoint);
        
        this.lengthLabel.style.left = `${screenPos.x}px`;
        this.lengthLabel.style.top = `${screenPos.y - 30}px`;
        this.lengthLabel.style.display = 'block';
    }

    onMouseUp(e: MouseEvent) {
        if (e.button === 2 && this.drawing && this.points.length > 0) {
            // Right click finishes the wall series
            if (this.previewWall) {
                this.document.removeObject(this.previewWall);
                this.previewWall = null;
            }
            if (this.lengthLabel) {
                this.lengthLabel.style.display = 'none';
            }
            this.drawing = false;
            this.points = [];
            return;
        }

        if (e.button === 0 && this.drawing && this.points.length > 0) {
            const endPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            if (this.previewWall) {
                this.document.removeObject(this.previewWall);
                this.previewWall.geometry.dispose();
                this.previewWall.material.dispose();
                this.previewWall = null;
            }
            this.execute(this.points[this.points.length - 1], endPoint);
            this.points.push(endPoint);
        }
    }

    onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return;
        
        const point = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
        if (!this.drawing) {
            this.drawing = true;
            this.points = [point];
        }
    }

    onMouseMove(e: MouseEvent) {
        const rect = this.document.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.drawing && this.points.length > 0) {
            const currentPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            const lastPoint = this.points[this.points.length - 1];
            
            const wallVec = new Vector2(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);
            const length = wallVec.length();
            const angle = Math.atan2(wallVec.y, wallVec.x);
            
            if (this.previewWall) {
                this.document.removeObject(this.previewWall);
                this.previewWall.geometry.dispose();
                this.previewWall.material.dispose();
            }
            
            const geometry = new PlaneGeometry(length, 1);
            const material = new MeshBasicMaterial({
                color: 'gray',
                transparent: true,
                opacity: 0.5,
                side: DoubleSide
            });
            
            this.previewWall = new Mesh(geometry, material);
            this.previewWall.position.set(
                ((lastPoint.x + currentPoint.x) / 2),
                ((lastPoint.y + currentPoint.y) / 2),
                0
            );
            this.previewWall.rotation.z = angle;
            this.document.addObject(this.previewWall);
            this.updateLengthLabel(lastPoint, currentPoint);
        }
    }

    execute(start?: Vector3, end?: Vector3) {
        if (start && end) {
            this.document.drawWall(start, end);
        }
    }
}