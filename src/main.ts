import { Viewer } from './Viewer';

// Get the container element
const container = document.getElementById('viewer-container');
if (!container) {
    throw new Error('Container element not found');
}

// Create the viewer
const viewer = new Viewer(container);

// Add view switching buttons
const switchTo2DButton = document.getElementById('switch-to-2d');
const switchTo3DButton = document.getElementById('switch-to-3d');
const originalViewButton = document.getElementById('original-view');
const deleteWallButton = document.getElementById('delete-wall');

if (switchTo2DButton) {
    switchTo2DButton.addEventListener('click', () => {
        viewer.setView(true);
    });
}

if (switchTo3DButton) {
    switchTo3DButton.addEventListener('click', () => {
        viewer.setView(false);
    });
}

if (originalViewButton) {
    originalViewButton.addEventListener('click', () => {
        viewer.resetToOriginalView();
    });
}

if (deleteWallButton) {
    deleteWallButton.addEventListener('click', () => {
        viewer.deleteSelectedWall();
    });
}