const gameState = {
    scene: null,
    camera: null,
    renderer: null,
    head: null,
    headBoundingSphere: null,
    toruses: [],
    torusLabels: [],
    headVelocity: { x: 0, y: 0, z: 0 },
    isThrown: false,
    isResetting: false,
    headOriginalPosition: { x: 0, y: 15, z: 14 },
    headOriginalScale: { x: 1, y: 1, z: 1 },
    gravity: -0.015,
    damping: 0.985,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragEnd: { x: 0, y: 0 },
    maxPower: 0.03,
    throwForceMultiplierWorld: 0.8,
    pulse: 0,
    gridHelper: null
};

const ringLinks = [
    { name: "Home", url: "pages/old.html", model: "../assets/Low_Poly_House.stl", size: 2.5 },
    { name: "Projects", url: "pages/projects.html", model: "../assets/monitorblend.stl", size: 2.5 },
    { name: "About me", url: "pages/about.html", model: "../assets/HEAD.glb", size: 6, isGLB: true },
    { name: "Notes", url: "../Notes/", model: "../assets/book.stl", size: 3 },
    { name: "CTF", url: "../CTF/", model: "../assets/gun.stl", size: 5 }
];

const colors = [0xff00ff, 0x00ffff, 0xffc600, 0xff6ec7, 0x00ff99];

function init() {
    setupScene();
    setupLighting();
    createHead();
    createToruses();
    createGround();
    setupControls();
    setupAimCanvas();
    animate();
}

function setupScene() {
    gameState.scene = new THREE.Scene();
    gameState.scene.background = new THREE.Color(0x1a0f2c);

    gameState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    gameState.camera.position.set(0, 20, 15);
    gameState.camera.lookAt(0, 0, 0);

    const canvas = document.getElementById('gameCanvas');
    gameState.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    gameState.renderer.shadowMap.enabled = true;
    gameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    gameState.scene.add(ambientLight);
}

function createHead() {
    const loader = new THREE.GLTFLoader();

    loader.load(
        '../assets/HEAD.glb',
        (gltf) => {
            gameState.head = gltf.scene;
            setupHeadModel(gameState.head);
            console.log('Head model loaded successfully');
        },
        (progress) => console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%'),
        (error) => {
            console.error('Error loading GLB model:', error);
            createFallbackHead();
        }
    );
}

function setupHeadModel(head) {
    const box = new THREE.Box3().setFromObject(head);
    const currentSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Center and scale the head
    head.traverse((child) => {
        if (child.isMesh) {
            child.geometry.translate(-center.x, -center.y, -center.z);
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    const centeredBox = new THREE.Box3().setFromObject(head);
    const centeredSize = centeredBox.getSize(new THREE.Vector3());
    const targetSize = 2;
    const maxDimension = Math.max(centeredSize.x, centeredSize.y, centeredSize.z);
    const scaleFactor = targetSize / maxDimension;

    head.scale.set(scaleFactor, scaleFactor, scaleFactor);
    gameState.headOriginalScale = { x: scaleFactor, y: scaleFactor, z: scaleFactor };
    head.position.copy(gameState.headOriginalPosition);
    gameState.scene.add(head);

    gameState.headBoundingSphere = new THREE.Sphere(head.position.clone(), 2.4);
}

function createFallbackHead() {
    const geometry = new THREE.SphereGeometry(2.4, 32, 32);
    const material = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    gameState.head = new THREE.Mesh(geometry, material);
    gameState.head.position.copy(gameState.headOriginalPosition);
    gameState.head.castShadow = true;
    gameState.head.receiveShadow = true;
    gameState.scene.add(gameState.head);

    gameState.headBoundingSphere = new THREE.Sphere(gameState.head.position.clone(), 2.4);
    console.log('Using fallback sphere head');
}

function createToruses() {
    ringLinks.forEach((link, i) => {
        if (link.isGLB) {
            loadGLBModel(link, i);
        } else {
            loadSTLModel(link, i);
        }
    });
}

function loadGLBModel(link, index) {
    const loader = new THREE.GLTFLoader();
    loader.load(
        link.model,
        (gltf) => {
            const model = gltf.scene;
            const scaledModel = scaleAndPositionModel(model, link.size);

            scaledModel.userData = { link, index };
            gameState.scene.add(scaledModel);
            gameState.toruses.push(scaledModel);
            createTextLabel(scaledModel, link.name, index);

            console.log(`${link.name} GLB loaded`);
        },
        (progress) => console.log(`${link.name} load progress: ${(progress.loaded / progress.total) * 100}%`),
        (error) => console.error(`Error loading ${link.name}:`, error)
    );
}

function loadSTLModel(link, index) {
    const loader = new THREE.STLLoader();
    loader.load(
        link.model,
        (rawGeometry) => {
            const mesh = createSTLMesh(rawGeometry, link.size, colors[index]);
            mesh.userData = { link, index, color: mesh.material.color.getHex() };
            gameState.scene.add(mesh);
            gameState.toruses.push(mesh);
            createTextLabel(mesh, link.name, index);

            console.log(`${link.name} STL loaded`);
        },
        (progress) => {
            if (progress.total) {
                console.log(`${link.name} load ${Math.round(progress.loaded / progress.total * 100)}%`);
            }
        },
        (error) => console.error(`Error loading ${link.name} STL:`, error)
    );
}

function createSTLMesh(rawGeometry, targetSize, color) {
    let geometry = rawGeometry.clone ? rawGeometry.clone() : rawGeometry;
    geometry.center();

    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetSize / maxDim;

    if (geometry.index) geometry = geometry.toNonIndexed();
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.5,
        roughness: 0.2,
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.0,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scaleFactor);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(
        (Math.random() - 0.5) * 20,
        2,
        (Math.random() - 0.5) * 20
    );

    // edge lines
    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMat = new THREE.LineBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.9
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMat);
    mesh.add(edgeLines);

    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffcc99,
        transparent: true,
        opacity: 0.10,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });
    const glow = new THREE.Mesh(geometry.clone(), glowMat);
    glow.scale.multiplyScalar(1.06);
    glow.renderOrder = 1;
    mesh.add(glow);

    return mesh;
}

function scaleAndPositionModel(model, targetSize) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetSize / maxDim;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const pivot = new THREE.Object3D();
    model.position.sub(center.multiplyScalar(scaleFactor));
    pivot.add(model);

    pivot.position.set(
        (Math.random() - 0.5) * 20,
        2,
        (Math.random() - 0.5) * 20
    );

    pivot.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return pivot;
}

function createTextLabel(torus, text, index) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0,0,0,0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    context.fillStyle = 'white';
    context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 10);

    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });

    const labelGeometry = new THREE.PlaneGeometry(3, 0.75);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.copy(torus.position);
    label.position.y += 3;

    gameState.scene.add(label);
    gameState.torusLabels.push(label);
}

function createGround() {
    const size = 300;
    const divisions = 40;

    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x920075,
        metalness: 0.8,
        roughness: 0.3,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    gameState.scene.add(floor);

    const mainColor = 0xff6f00;
    gameState.gridHelper = new THREE.GridHelper(size, divisions, mainColor, mainColor);
    gameState.gridHelper.position.y = -4.99;
    gameState.gridHelper.material = new THREE.LineBasicMaterial({
        color: mainColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    gameState.scene.add(gameState.gridHelper);
}

function setupControls() {
    const canvas = document.getElementById('gameCanvas');

    canvas.addEventListener('mousedown', onInputStart);
    canvas.addEventListener('mousemove', onInputMove);
    canvas.addEventListener('mouseup', onInputEnd);

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', handleTouchEnd);

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0] || e.changedTouches[0];
    const mockEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        type: e.type.replace('touch', 'mouse')
    };

    if (e.type === 'touchstart') onInputStart(mockEvent);
    else if (e.type === 'touchmove') onInputMove(mockEvent);
}

function handleTouchEnd(e) {
    e.preventDefault();
    onInputEnd({ clientX: 0, clientY: 0 });
}

function onInputStart(event) {
    if (!gameState.isThrown && gameState.head) {
        gameState.isDragging = true;
        gameState.dragStart.x = event.clientX;
        gameState.dragStart.y = event.clientY;
        gameState.dragEnd.x = event.clientX;
        gameState.dragEnd.y = event.clientY;
    }
}

function onInputMove(event) {
    if (gameState.isDragging && !gameState.isThrown && gameState.head) {
        gameState.dragEnd.x = event.clientX;
        gameState.dragEnd.y = event.clientY;
        drawAimLine();
        updateAimingUI();
    }
}

function onInputEnd(event) {
    if (gameState.isDragging && !gameState.isThrown && gameState.head) {
        gameState.isDragging = false;
        aimCtx.clearRect(0, 0, aimCanvas.width, aimCanvas.height);
        performThrow();
    }
}

function getWorldPointFromScreen(x, y) {
    if (!gameState.head) return new THREE.Vector3();

    const planeNormal = new THREE.Vector3();
    gameState.camera.getWorldDirection(planeNormal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, gameState.head.position);

    const rect = gameState.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        (x - rect.left) / rect.width * 2 - 1,
        -((y - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, gameState.camera);

    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    return point;
}

function updateAimingUI() {
    if (!gameState.head || !gameState.camera) return;

    const startVec = getWorldPointFromScreen(gameState.dragStart.x, gameState.dragStart.y);
    const endVec = getWorldPointFromScreen(gameState.dragEnd.x, gameState.dragEnd.y);
    const worldDrag = new THREE.Vector3().subVectors(endVec, startVec);
    const throwDirection = new THREE.Vector3(worldDrag.x, 0, worldDrag.z);

    const deltaX = gameState.dragEnd.x - gameState.dragStart.x;
    const deltaY = gameState.dragEnd.y - gameState.dragStart.y;
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDragDistance = Math.min(window.innerWidth, window.innerHeight) * 0.1;
    const power = Math.min(dragDistance / maxDragDistance, 1.0);

    throwDirection.normalize().multiplyScalar(power * gameState.throwForceMultiplierWorld);

    const scaleMultiplier = 1 + power * 0.35;
    gameState.head.scale.set(
        gameState.headOriginalScale.x * scaleMultiplier,
        gameState.headOriginalScale.y * scaleMultiplier,
        gameState.headOriginalScale.z * scaleMultiplier
    );

    gameState.head.userData._previewThrow = { dir: throwDirection.clone(), power: power };
}

function performThrow() {
    if (!gameState.head) return;
    const preview = gameState.head.userData._previewThrow;
    if (!preview) return;

    const { dir, power } = preview;

    if (power > 0.05) {
        gameState.headVelocity.x = dir.x;
        gameState.headVelocity.y = -0.1;
        gameState.headVelocity.z = dir.z;
        gameState.isThrown = true;

        console.log(`Throw velocity: (${gameState.headVelocity.x.toFixed(2)}, ${gameState.headVelocity.y.toFixed(2)}, ${gameState.headVelocity.z.toFixed(2)})`);
    }

    gameState.head.scale.set(gameState.headOriginalScale.x, gameState.headOriginalScale.y, gameState.headOriginalScale.z);
    gameState.head.userData._previewThrow = null;
}

function updatePhysics() {
    if (gameState.isThrown && gameState.head) {
        gameState.headVelocity.y += gameState.gravity;

        gameState.head.position.x += gameState.headVelocity.x;
        gameState.head.position.y += gameState.headVelocity.y;
        gameState.head.position.z += gameState.headVelocity.z;

        gameState.headVelocity.x *= gameState.damping;
        gameState.headVelocity.z *= gameState.damping;

        if (gameState.headBoundingSphere) {
            gameState.headBoundingSphere.center.copy(gameState.head.position);
        }

        checkCollisions();

        if (gameState.head.position.y <= -3) {
            gameState.head.position.y = -3;
            gameState.headVelocity.y = Math.abs(gameState.headVelocity.y) * 0.6;
            gameState.headVelocity.x *= 0.8;
            gameState.headVelocity.z *= 0.8;

            if (Math.abs(gameState.headVelocity.y) < 0.1 &&
                Math.abs(gameState.headVelocity.x) < 0.1 &&
                Math.abs(gameState.headVelocity.z) < 0.1) {
                resetHead();
            }
        }
        if (Math.abs(gameState.head.position.x) > 50 ||
            Math.abs(gameState.head.position.z) > 50 ||
            gameState.head.position.y < -10) {
            resetHead();
        }
    }

    if (gameState.head) {
        gameState.head.rotation.x += gameState.isThrown ? 0.15 : 0.01;
        gameState.head.rotation.y += gameState.isThrown ? 0.12 : 0.02;
    }
}

function checkCollisions() {
    if (!gameState.headBoundingSphere) return;

    gameState.toruses.forEach((torus, index) => {
        const distance = gameState.head.position.distanceTo(torus.position);
        if (distance < 3.5) {
            gameState.headVelocity.y += 4;
            gameState.headVelocity.x += (Math.random() - 0.5) * 6;
            gameState.headVelocity.z += (Math.random() - 0.5) * 6;

            console.log(`Hit ring ${index + 1}!`);
            const link = torus.userData.link;
            if (link && link.url) {
                console.log(`Redirecting to ${link.url}`);
                window.location.href = link.url;
            }
        }
    });
}

function resetHead() {
    if (!gameState.head || gameState.isResetting) return;
    gameState.isResetting = true;

    gameState.head.position.copy(gameState.headOriginalPosition);
    gameState.headVelocity = { x: 0, y: 0, z: 0 };
    gameState.head.scale.set(gameState.headOriginalScale.x, gameState.headOriginalScale.y, gameState.headOriginalScale.z);
    gameState.isThrown = false;

    console.log('Head reset');
    setTimeout(() => { gameState.isResetting = false; }, 50);
}

function drawAimLine() {
    aimCtx.clearRect(0, 0, aimCanvas.width, aimCanvas.height);
    if (!gameState.isDragging) return;

    const dx = gameState.dragEnd.x - gameState.dragStart.x;
    const dy = gameState.dragEnd.y - gameState.dragStart.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    const gradient = aimCtx.createLinearGradient(gameState.dragStart.x, gameState.dragStart.y, gameState.dragEnd.x, gameState.dragEnd.y);
    gradient.addColorStop(0, "rgba(255, 0, 255, 0.2)");
    gradient.addColorStop(0.5, "rgba(0, 255, 255, 0.9)");
    gradient.addColorStop(1, "rgba(255, 255, 0, 0.8)");

    aimCtx.save();
    aimCtx.translate(gameState.dragStart.x, gameState.dragStart.y);
    aimCtx.rotate(angle);

    aimCtx.strokeStyle = gradient;
    aimCtx.shadowBlur = 20;
    aimCtx.shadowColor = "#00ffff";
    aimCtx.lineWidth = 6;
    aimCtx.beginPath();
    aimCtx.moveTo(0, 0);
    aimCtx.lineTo(length - 20, 0);
    aimCtx.stroke();

    aimCtx.fillStyle = gradient;
    aimCtx.beginPath();
    aimCtx.moveTo(length, 0);
    aimCtx.lineTo(length - 20, 10);
    aimCtx.lineTo(length - 20, -10);
    aimCtx.closePath();
    aimCtx.fill();

    aimCtx.restore();
}

function animate() {
    requestAnimationFrame(animate);

    updatePhysics();

    gameState.toruses.forEach((torus, index) => {
        torus.rotation.x += 0.008;
        torus.rotation.z += 0.012;
        torus.position.y += Math.sin(Date.now() * 0.001 + index) * 0.002;
    });

    gameState.torusLabels.forEach(label => {
        label.lookAt(gameState.camera.position);
    });

    if (gameState.gridHelper && gameState.gridHelper.material) {
        gameState.pulse += 0.5;
        const h = (gameState.pulse % 360);
        const color = new THREE.Color(`hsl(${h}, 100%, 50%)`);
        gameState.gridHelper.material.color.copy(color);
    }

    gameState.renderer.render(gameState.scene, gameState.camera);
}

const aimCanvas = document.getElementById('aimCanvas');
const aimCtx = aimCanvas.getContext('2d');

function setupAimCanvas() {
    function resizeAimCanvas() {
        aimCanvas.width = window.innerWidth;
        aimCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', () => {
        gameState.camera.aspect = window.innerWidth / window.innerHeight;
        gameState.camera.updateProjectionMatrix();
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
        resizeAimCanvas();
    });

    resizeAimCanvas();
}

init();