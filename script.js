import * as THREE from "three";

const loveData = {
  boyfriendName: "Your favorite person",
  yourName: "Me",
  introTitle: "A Little World For You",
  introSubtitle: "I made something small...\njust for you.",
  letter: `Hey you...\n\nI don't always know how to say\neverything I feel,\n\nso I made this little world\nto say some of it for me.\n\nThank you for being here.\nThank you for being you. ♡`,
  spotify: {
    url: "https://open.spotify.com/track/2v0vKdardqBzAPhObJyAvd?si=c9703aaee0564060"
  },
  photos: [
    { image: "assets/images/foto1.jpeg", caption: "another concert, another memory with you ♡" },
    { image: "assets/images/foto2.jpeg", caption: "the day you became my favorite person ♡" },
    { image: "assets/images/foto3.jpeg", caption: "one of the places that feels like us" },
    { image: "assets/images/foto4.jpeg", caption: "the safest place is right here, with you ♡" }
  ],
  finalMessage: `Thank you for being my favorite person.\n\nI don't need a perfect story.\nI just want more little moments with you.\n\nI love you. ♡`,
  starMessages: [
    "I love the way you make ordinary days feel special. ♡",
    "You are one of my favorite parts of every day.",
    "I'm really happy I get to know you, love you, and grow with you.",
    "Even on difficult days, I still choose you. ♡",
    "Some of my favorite memories have you in them."
  ]
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const experience = document.querySelector("#experience");
const canvas = document.querySelector("#world");
const intro = document.querySelector("#intro");
const modalLayer = document.querySelector("#modalLayer");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalEyebrow = document.querySelector("#modalEyebrow");
const modalContent = document.querySelector("#modalContent");
const modalActions = document.querySelector("#modalActions");
const sceneHint = document.querySelector("#sceneHint");
const discoveryHearts = document.querySelector("#discoveryHearts");
const discoveryCount = document.querySelector("#discoveryCount");
const finalNudge = document.querySelector("#finalNudge");
const customCursor = document.querySelector("#customCursor");
const discoveries = new Set();
const discoveryKeys = ["teddy", "letter", "photos", "gift", "music", "stars"];
let renderer;
let scene;
let camera;
let raycaster;
let pointer;
let worldReady = false;
let isEntered = false;
let isPlayingVisual = false;
let spotifyController = null;
let musicStartRequested = false;
let finalUnlocked = false;
let finalPending = false;
let galleryIndex = 0;
let lastTrigger = null;
let hoveredObject = null;
let finalSequence = false;
const roomCamera = { x: 0, y: 4.8, z: 12.5, lookX: 0, lookY: 1.45, lookZ: 0 };
let cameraTarget = { ...roomCamera };
let pointerNdc = { x: 0, y: 0 };
let activeDrag = null;
let suppressSceneClick = false;
let roomPan = { x: 0, y: 0 };
let clock;
const animated = [];
const hotspots = [];
const stars = [];
const floaters = [];
let lampLight;
let recordDisc;
let giftLid;
let teddyRoot;

document.querySelector("#introTitle").textContent = loveData.introTitle;
document.querySelector("#introSubtitle").textContent = loveData.introSubtitle;
document.title = `${loveData.introTitle} ♡`;
createIntroSpecks();

function createIntroSpecks() {
  const container = document.querySelector("#introSpecks");
  const symbols = ["♡", "✧", "·", "✳"];
  const count = window.innerWidth < 680 ? 18 : 30;
  for (let i = 0; i < count; i += 1) {
    const speck = document.createElement("span");
    speck.className = "intro-speck";
    speck.textContent = symbols[i % symbols.length];
    speck.style.left = `${Math.random() * 100}%`;
    speck.style.top = `${Math.random() * 100}%`;
    speck.style.fontSize = `${9 + Math.random() * 12}px`;
    speck.style.setProperty("--duration", `${7 + Math.random() * 9}s`);
    speck.style.setProperty("--delay", `${Math.random() * -12}s`);
    container.append(speck);
  }
}

function makeMaterial(color, roughness = 0.78, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function addMesh(parent, geometry, material, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.scale) mesh.scale.set(...options.scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function box(parent, size, color, position, options = {}) {
  return addMesh(parent, new THREE.BoxGeometry(...size), makeMaterial(color, options.roughness ?? 0.8), position, options);
}

function sphere(parent, radius, color, position, scale = [1, 1, 1], materialOptions = {}) {
  return addMesh(parent, new THREE.SphereGeometry(radius, 16, 12), makeMaterial(color, .72, materialOptions), position, { scale });
}

function cylinder(parent, top, bottom, height, color, position, segments = 16) {
  return addMesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), makeMaterial(color), position);
}

function roundedBox(parent, size, color, position, radius = .12) {
  const group = new THREE.Group();
  group.position.set(...position);
  parent.add(group);
  box(group, [size[0] - radius, size[1], size[2] - radius], color, [0, 0, 0]);
  sphere(group, radius * .72, color, [size[0] / 2 - radius / 2, 0, size[2] / 2 - radius / 2], [1, 1, 1]);
  sphere(group, radius * .72, color, [-size[0] / 2 + radius / 2, 0, size[2] / 2 - radius / 2], [1, 1, 1]);
  sphere(group, radius * .72, color, [size[0] / 2 - radius / 2, 0, -size[2] / 2 + radius / 2], [1, 1, 1]);
  sphere(group, radius * .72, color, [-size[0] / 2 + radius / 2, 0, -size[2] / 2 + radius / 2], [1, 1, 1]);
  return group;
}

function addHotspot(object, action, label) {
  object.userData.action = action;
  object.userData.label = label;
  object.userData.homeScale = object.scale.clone();
  hotspots.push(object);
  return object;
}

function setupWorld() {
  try {
    const context = canvas.getContext("webgl2", { alpha: true, antialias: window.innerWidth > 700, powerPreference: "low-power" });
    if (!context) throw new Error("WebGL 2 is unavailable");
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: window.innerWidth > 700, powerPreference: "low-power" });
  } catch (error) {
    experience.classList.add("no-webgl");
    document.querySelector("#fallbackRoom").setAttribute("aria-hidden", "false");
    setupControls();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 680 ? 1.25 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#d9ced7");
  scene.fog = new THREE.Fog("#d9ced7", 16, 30);
  camera = new THREE.PerspectiveCamera(39, window.innerWidth / window.innerHeight, .1, 60);
  camera.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  camera.lookAt(cameraTarget.lookX, cameraTarget.lookY, cameraTarget.lookZ);
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();
  buildRoom();
  buildWindow();
  buildBed();
  buildPhotoFrame();
  buildLetterTable();
  buildLampAndSideTable();
  buildGift();
  buildRecordPlayer();
  buildFlowers();
  buildStars();
  buildDust();
  worldReady = true;
  setupControls();
  onResize();
  renderer.setAnimationLoop(renderWorld);
}

function buildRoom() {
  scene.add(new THREE.HemisphereLight("#fff0dc", "#866f80", 2.05));
  const keyLight = new THREE.DirectionalLight("#fff1dc", 2.2);
  keyLight.position.set(-4, 9, 7);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight("#d5b9e5", 17, 22, 2);
  fillLight.position.set(-4.2, 3.6, -2.5);
  scene.add(fillLight);
  lampLight = new THREE.PointLight("#ffd58d", 32, 8, 2);
  lampLight.position.set(3.9, 2.9, -0.55);
  scene.add(lampLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), makeMaterial("#b6958c"));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -.07, 0);
  scene.add(floor);
  box(scene, [14, 5.8, .22], "#e8d8d6", [0, 2.8, -3.9]);
  box(scene, [.22, 5.8, 9], "#d8c6ce", [-7, 2.8, .35]);
  box(scene, [14, .23, 9], "#a9827b", [0, -.2, .35]);
  box(scene, [14, .16, .18], "#f0e4da", [0, .1, -3.75]);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.1, 48), makeMaterial("#d8b7b1"));
  rug.rotation.x = -Math.PI / 2;
  rug.scale.set(1.35, .64, 1);
  rug.position.set(.3, .015, .5);
  scene.add(rug);
  const rugInner = new THREE.Mesh(new THREE.CircleGeometry(2.55, 48), makeMaterial("#e6c9c0"));
  rugInner.rotation.x = -Math.PI / 2;
  rugInner.scale.set(1.35, .64, 1);
  rugInner.position.set(.3, .02, .5);
  scene.add(rugInner);

  for (let i = 0; i < 5; i += 1) {
    box(scene, [.18, .55, .22], ["#c8a9a0", "#d8b4a8", "#b4a3b2"][i % 3], [-5.7 + i * .28, .42 + (i % 2) * .05, -2.6], { rotation: [0, .07, 0] });
  }
}

function buildWindow() {
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-3.8, 3, -3.73);
  scene.add(windowGroup);
  box(windowGroup, [2.25, 2.05, .12], "#987c7c", [0, 0, 0]);
  box(windowGroup, [1.94, 1.75, .08], "#454c69", [0, .02, .08]);
  box(windowGroup, [1.84, .045, .04], "#c8a89a", [0, .02, .14]);
  box(windowGroup, [.045, 1.7, .04], "#c8a89a", [0, .02, .14]);
  const moon = sphere(windowGroup, .19, "#f4e5bc", [.54, .5, .17], [1, 1, .3], { emissive: "#ead8a7", emissiveIntensity: .48 });
  moon.material.roughness = .5;
  for (let i = 0; i < 13; i += 1) {
    const dot = sphere(windowGroup, .025 + Math.random() * .025, "#fff1ce", [-.78 + Math.random() * 1.55, -.66 + Math.random() * 1.4, .18]);
    dot.material.emissive.set("#ffe9b9");
    dot.material.emissiveIntensity = .38;
  }
  const sill = box(windowGroup, [2.6, .12, .38], "#c4a39b", [0, -1.12, .12]);
  sill.position.z += .02;
  box(scene, [2.45, .12, .34], "#b39187", [-3.8, 1.87, -3.35]);
}

function buildBed() {
  const bed = new THREE.Group();
  bed.position.set(.1, 0, -.75);
  scene.add(bed);
  box(bed, [3.8, .25, 2.55], "#92746e", [0, .38, 0]);
  box(bed, [3.78, .8, .2], "#bd9994", [0, .75, -1.3]);
  box(bed, [3.6, .55, 2.45], "#f1e7dc", [0, .82, .04]);
  box(bed, [2.35, .18, 1.62], "#d9bdc1", [.6, 1.12, .37]);
  box(bed, [1.52, .2, .73], "#fff8ec", [-.75, 1.2, -.51]);
  box(bed, [1.34, .2, .7], "#e9d6d1", [.67, 1.2, -.51]);
  box(bed, [1.24, .15, .74], "#d4b4bf", [-.72, 1.03, .75], { rotation: [0, -.12, 0] });
  const blanketEdge = box(bed, [2.65, .16, .13], "#c09aa4", [.55, 1.02, 1.15]);
  blanketEdge.rotation.y = -.06;
  const teddy = new THREE.Group();
  teddy.position.set(.73, 1.48, -.05);
  bed.add(teddy);
  sphere(teddy, .37, "#ae846d", [0, 0, 0], [1, 1.05, .88]);
  sphere(teddy, .27, "#bb9279", [0, .41, .035], [1, 1, .88]);
  sphere(teddy, .115, "#bb9279", [-.2, .61, .02]);
  sphere(teddy, .115, "#bb9279", [.2, .61, .02]);
  sphere(teddy, .07, "#d6b0a0", [-.2, .61, .075], [1, 1, .35]);
  sphere(teddy, .07, "#d6b0a0", [.2, .61, .075], [1, 1, .35]);
  sphere(teddy, .09, "#ead0b7", [0, .32, .225], [1.05, .72, .5]);
  sphere(teddy, .035, "#493d3a", [-.09, .46, .25], [1, 1, .45]);
  sphere(teddy, .035, "#493d3a", [.09, .46, .25], [1, 1, .45]);
  sphere(teddy, .038, "#77534f", [0, .34, .278], [1, .7, .5]);
  sphere(teddy, .12, "#ae846d", [-.32, .04, .06], [.82, .58, .72]);
  sphere(teddy, .12, "#ae846d", [.32, .04, .06], [.82, .58, .72]);
  sphere(teddy, .13, "#ae846d", [-.17, -.31, .03], [.72, .92, .72]);
  sphere(teddy, .13, "#ae846d", [.17, -.31, .03], [.72, .92, .72]);
  teddyRoot = addHotspot(teddy, "teddy", "♡ give teddy a hug");
  animated.push({ object: teddy, kind: "float", phase: 1.3, amplitude: .07, baseY: teddy.position.y });
  const teddyFeet = box(bed, [.57, .1, .1], "#b9917f", [.72, 1.17, .31]);
  teddyFeet.material.roughness = .95;
}

function buildPhotoFrame() {
  const frame = new THREE.Group();
  frame.position.set(1.25, 2.8, -3.69);
  scene.add(frame);
  box(frame, [1.16, 1.62, .13], "#a7776d", [0, 0, 0]);
  box(frame, [.94, 1.4, .04], "#fcf2df", [0, 0, .09]);
  box(frame, [.77, 1.2, .035], "#d6c3ca", [0, .03, .12]);
  const fallbackTexture = makeMemoryTexture();
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(.68, 1.08), new THREE.MeshBasicMaterial({ map: fallbackTexture, side: THREE.DoubleSide }));
  photo.position.set(0, .03, .145);
  frame.add(photo);
  new THREE.TextureLoader().load(loveData.photos[0].image, (texture) => {
    const imageAspect = texture.image.width / texture.image.height;
    const frameAspect = .68 / 1.08;
    texture.colorSpace = THREE.SRGBColorSpace;
    if (imageAspect > frameAspect) {
      texture.repeat.x = frameAspect / imageAspect;
      texture.offset.x = (1 - texture.repeat.x) / 2;
    } else {
      texture.repeat.y = imageAspect / frameAspect;
      texture.offset.y = (1 - texture.repeat.y) / 2;
    }
    texture.needsUpdate = true;
    photo.material.map = texture;
    photo.material.needsUpdate = true;
    fallbackTexture.dispose();
  });
  sphere(frame, .08, "#ca9d89", [0, -.67, .12]);
  addHotspot(frame, "photos", "♡ open our memories");
  frame.userData.fixedInRoom = true;
}

function makeMemoryTexture() {
  const memoryCanvas = document.createElement("canvas");
  memoryCanvas.width = 256;
  memoryCanvas.height = 192;
  const context = memoryCanvas.getContext("2d");
  const sky = context.createLinearGradient(0, 0, 0, 192);
  sky.addColorStop(0, "#afb2c8");
  sky.addColorStop(.56, "#ecc9b4");
  sky.addColorStop(1, "#d9998e");
  context.fillStyle = sky;
  context.fillRect(0, 0, 256, 192);
  context.fillStyle = "#f5e1bc";
  context.beginPath();
  context.arc(182, 56, 27, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#c2a59e";
  context.beginPath();
  context.ellipse(125, 170, 145, 48, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#715d69";
  context.beginPath();
  context.arc(111, 115, 20, 0, Math.PI * 2);
  context.arc(151, 113, 18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff1df";
  context.beginPath();
  context.arc(131, 118, 7, 0, Math.PI * 2);
  context.fill();
  context.font = "22px serif";
  context.fillStyle = "#fff6e7";
  context.fillText("♡", 118, 78);
  const texture = new THREE.CanvasTexture(memoryCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildLetterTable() {
  const table = new THREE.Group();
  table.position.set(-4.2, 0, .25);
  scene.add(table);
  box(table, [1.55, .18, 1.12], "#a88277", [0, 1.1, 0]);
  for (const x of [-.58, .58]) for (const z of [-.39, .39]) box(table, [.1, 1.08, .1], "#98776f", [x, .55, z]);
  const envelope = new THREE.Group();
  envelope.position.set(0, 1.25, .04);
  table.add(envelope);
  box(envelope, [.9, .08, .63], "#e5c1bb", [0, 0, 0]);
  const flap = new THREE.Mesh(new THREE.ConeGeometry(.43, .36, 3), makeMaterial("#d8a9a8"));
  flap.rotation.x = Math.PI / 2;
  flap.rotation.z = Math.PI;
  flap.position.set(0, .105, -.01);
  envelope.add(flap);
  sphere(envelope, .085, "#b46c75", [0, .1, .08], [1, 1, .45]);
  addHotspot(envelope, "letter", "♡ open your letter");
  box(table, [.45, .035, .34], "#f9eee2", [-.33, 1.22, -.24], { rotation: [0, .2, -.1] });
  box(table, [.3, .035, .24], "#d8c4d7", [.35, 1.22, -.29], { rotation: [0, -.3, .05] });
}

function buildLampAndSideTable() {
  const table = new THREE.Group();
  table.position.set(3.85, 0, -.75);
  scene.add(table);
  box(table, [1.45, .18, 1.14], "#ae887d", [0, .88, 0]);
  box(table, [.12, .85, .12], "#96756f", [-.48, .42, -.36]);
  box(table, [.12, .85, .12], "#96756f", [.48, .42, -.36]);
  box(table, [.12, .85, .12], "#96756f", [-.48, .42, .36]);
  box(table, [.12, .85, .12], "#96756f", [.48, .42, .36]);
  cylinder(table, .25, .32, .12, "#97756e", [0, 1.03, -.06]);
  cylinder(table, .06, .085, .56, "#ad8b7b", [0, 1.37, -.06]);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.36, .23, .42, 24, 1, true), makeMaterial("#eacb91", .6, { emissive: "#dbad61", emissiveIntensity: .48, side: THREE.DoubleSide }));
  shade.position.set(0, 1.82, -.06);
  table.add(shade);
  sphere(table, .07, "#f9e7bc", [0, 1.6, -.06], [1, .55, 1], { emissive: "#ffe2a3", emissiveIntensity: .8 });
  cylinder(table, .33, .37, .1, "#a77872", [0, 1.04, .36]);
  sphere(table, .3, "#c9a0a1", [0, 1.27, .36], [1, .78, .82]);
  animated.push({ object: shade, kind: "lamp" });
}

function buildGift() {
  const gift = new THREE.Group();
  gift.position.set(2.2, .16, 1.5);
  scene.add(gift);
  box(gift, [1.05, .72, .86], "#c87f83", [0, .43, 0]);
  box(gift, [1.1, .1, .92], "#d99a96", [0, .81, 0]);
  box(gift, [.16, .11, .94], "#f1d4b6", [0, .84, 0]);
  box(gift, [1.12, .11, .14], "#f1d4b6", [0, .84, 0]);
  giftLid = new THREE.Group();
  giftLid.position.set(0, .89, -.43);
  gift.add(giftLid);
  box(giftLid, [1.16, .18, .98], "#d99a96", [0, .02, .43]);
  box(giftLid, [.17, .1, 1], "#f1d4b6", [0, .15, .43]);
  sphere(giftLid, .18, "#efcfb0", [-.19, .23, .39], [1.3, .5, .65]);
  sphere(giftLid, .18, "#efcfb0", [.19, .23, .39], [1.3, .5, .65]);
  addHotspot(gift, "gift", "♡ open a little gift");
  animated.push({ object: gift, kind: "bounce", phase: .8 });
}

function buildRecordPlayer() {
  const player = new THREE.Group();
  player.position.set(4.8, .17, 1.55);
  scene.add(player);
  box(player, [1.6, .28, 1.45], "#af8580", [0, .32, 0]);
  box(player, [1.48, .08, 1.34], "#e0c6b3", [0, .49, 0]);
  cylinder(player, .45, .45, .06, "#574e55", [-.15, .56, .02], 40);
  recordDisc = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .065, 48), makeMaterial("#39363d", .56));
  recordDisc.position.set(-.15, .62, .02);
  player.add(recordDisc);
  cylinder(recordDisc, .11, .11, .071, "#ba737a", [0, .005, 0], 24);
  cylinder(recordDisc, .025, .025, .074, "#f3d5ae", [0, .006, 0], 16);
  for (let i = 0; i < 3; i += 1) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(.2 + i * .07, .006, 5, 48), makeMaterial("#777079", .45));
    groove.rotation.x = Math.PI / 2;
    groove.position.set(-.15, .66, .02);
    player.add(groove);
  }
  const arm = new THREE.Group();
  arm.position.set(.43, .62, -.42);
  player.add(arm);
  cylinder(arm, .035, .035, .46, "#806b62", [0, .04, -.16], 10).rotation.x = Math.PI / 2;
  sphere(arm, .07, "#d4b5a0", [0, .04, -.36], [1, .45, 1]);
  addHotspot(player, "music", "♡ play our song");
  const note = sphere(player, .08, "#d1969a", [.62, 1.02, .05], [.65, 1.2, .3]);
  animated.push({ object: note, kind: "note", phase: 2 });
}

function buildFlowers() {
  const pot = new THREE.Group();
  pot.position.set(-5.2, .08, -.9);
  scene.add(pot);
  cylinder(pot, .37, .24, .5, "#b27972", [0, .25, 0]);
  for (let i = 0; i < 4; i += 1) {
    const stem = cylinder(pot, .018, .025, .78 + (i % 2) * .22, "#798c70", [((i % 2) - .5) * .28, .82 + (i % 2) * .1, (i - 1.5) * .05], 8);
    stem.rotation.z = (i - 1.5) * .16;
    const flower = new THREE.Group();
    flower.position.set(((i % 2) - .5) * .28, 1.23 + (i % 2) * .22, (i - 1.5) * .05);
    pot.add(flower);
    const petalColor = ["#db9ba1", "#e4c6a9", "#cab8d6", "#e8b9ac"][i];
    for (let p = 0; p < 5; p += 1) {
      const angle = (p / 5) * Math.PI * 2;
      sphere(flower, .105, petalColor, [Math.cos(angle) * .12, Math.sin(angle) * .12, 0], [.95, .68, .8]);
    }
    sphere(flower, .075, "#e8d19d", [0, 0, .03]);
    animated.push({ object: flower, kind: "sway", phase: i * .7, amplitude: .045 });
  }
}

function buildStars() {
  const positions = [
    [-2.5, 4.4, -.7], [.15, 4.75, -1.7], [3.1, 3.9, .35], [-1.7, 2.6, 1.4], [4.7, 2.55, -1.7]
  ];
  positions.forEach((position, index) => {
    const star = new THREE.Group();
    star.position.set(...position);
    scene.add(star);
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.13 + (index % 2) * .04, 0), makeMaterial(index % 2 ? "#f1dbab" : "#e6c8dd", .4, { emissive: index % 2 ? "#f0d7a0" : "#d8b2cb", emissiveIntensity: .52 }));
    mesh.scale.y = 1.45;
    star.add(mesh);
    sphere(star, .22, "#ffffff", [0, 0, 0], [1, 1, 1], { transparent: true, opacity: .08, emissive: "#fff3d7", emissiveIntensity: .2 });
    addHotspot(star, "stars", "♡ a little reminder");
    star.userData.starIndex = index;
    stars.push(star);
    animated.push({ object: star, kind: "star", phase: index * .92, amplitude: .1 });
  });
  for (let i = 0; i < 5; i += 1) {
    const heart = makeHeart(i);
    scene.add(heart);
    floaters.push(heart);
  }
}

function makeHeart(index) {
  const heart = new THREE.Group();
  const material = makeMaterial(index % 2 ? "#dba5a9" : "#e7c1b7", .58, { transparent: true, opacity: .8, emissive: "#c3838d", emissiveIntensity: .17 });
  const left = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), material);
  left.position.set(-.055, .02, 0);
  left.scale.set(1, .84, .48);
  const right = left.clone();
  right.position.x = .055;
  const point = new THREE.Mesh(new THREE.ConeGeometry(.11, .17, 12), material);
  point.position.set(0, -.105, 0);
  point.rotation.z = Math.PI;
  heart.add(left, right, point);
  heart.position.set(-4 + Math.random() * 8, Math.random() * 4, -1 + Math.random() * 2.5);
  heart.userData.floatOffset = Math.random() * 10;
  heart.userData.startY = heart.position.y;
  return heart;
}

function buildDust() {
  const count = window.innerWidth < 680 ? 75 : 135;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = -6.2 + Math.random() * 12.4;
    positions[i * 3 + 1] = .4 + Math.random() * 4.7;
    positions[i * 3 + 2] = -2.8 + Math.random() * 5.8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: "#fff2d8", size: .045, transparent: true, opacity: .7, sizeAttenuation: true });
  scene.add(new THREE.Points(geometry, material));
}

function renderWorld() {
  if (!worldReady) return;
  const elapsed = clock.getElapsedTime();
  const motionScale = reducedMotion ? 0 : 1;
  animated.forEach((item) => {
    const { object, kind, phase = 0, amplitude = .05 } = item;
    if (kind === "float") {
      const bounceAge = object.userData.bounceAt === undefined ? -1 : elapsed - object.userData.bounceAt;
      const bounce = bounceAge >= 0 && bounceAge < 1.2 ? Math.max(0, Math.sin(bounceAge * 13)) * Math.exp(-bounceAge * 3.2) * .34 : 0;
      object.position.y = item.baseY + Math.sin(elapsed * .9 + phase) * amplitude * motionScale + bounce * motionScale;
    }
    if (kind === "bounce") object.position.y = .16 + Math.max(0, Math.sin(elapsed * .72 + phase)) ** 10 * .1 * motionScale;
    if (kind === "sway") object.rotation.z = Math.sin(elapsed * .7 + phase) * amplitude * motionScale;
    if (kind === "star") {
      object.rotation.y += .003 * motionScale;
      object.rotation.z = Math.sin(elapsed * 1.3 + phase) * .08 * motionScale;
      const pulse = .88 + (Math.sin(elapsed * 2.1 + phase) + 1) * .1;
      object.scale.setScalar(pulse);
    }
    if (kind === "lamp") item.object.material.emissiveIntensity = .42 + Math.sin(elapsed * .8) * .035 + (isPlayingVisual ? .16 : 0);
    if (kind === "note") {
      object.position.y = 1 + Math.sin(elapsed * 1.1 + phase) * .09 * motionScale;
      object.material.opacity = isPlayingVisual ? .9 : .48;
    }
  });
  floaters.forEach((heart) => {
    if (reducedMotion) return;
    heart.position.y += isPlayingVisual ? .0042 : .0014;
    heart.position.x += Math.sin(elapsed * .45 + heart.userData.floatOffset) * .0018;
    heart.rotation.z = Math.sin(elapsed + heart.userData.floatOffset) * .09;
    if (heart.position.y > 5.3) {
      heart.position.y = .3;
      heart.position.x = -4 + Math.random() * 8;
    }
  });
  if (lampLight) lampLight.intensity = 32 + (isPlayingVisual ? 8 : 0) + Math.sin(elapsed * .8) * .6;
  if (recordDisc && isPlayingVisual && !reducedMotion) recordDisc.rotation.y += .024;
  if (hoveredObject && hoveredObject.userData.action && !hoveredObject.userData.fixedInRoom) {
    const home = hoveredObject.userData.homeScale;
    const factor = 1.06;
    hoveredObject.scale.lerp(home.clone().multiplyScalar(factor), .14);
    if (!reducedMotion) hoveredObject.rotation.y += .0025;
  }
  const targetX = cameraTarget.x + roomPan.x + (isEntered && !reducedMotion ? Math.sin(elapsed * .18) * .04 + pointerNdc.x * .25 : 0);
  const targetY = cameraTarget.y + roomPan.y + (isEntered && !reducedMotion ? Math.sin(elapsed * .22) * .025 - pointerNdc.y * .12 : 0);
  camera.position.x += (targetX - camera.position.x) * .018;
  camera.position.y += (targetY - camera.position.y) * .018;
  camera.position.z += (cameraTarget.z - camera.position.z) * .018;
  camera.lookAt(cameraTarget.lookX + roomPan.x, cameraTarget.lookY + roomPan.y, cameraTarget.lookZ);
  renderer.render(scene, camera);
}

function setupControls() {
  document.querySelector("#enterButton").addEventListener("click", enterWorld);
  document.querySelector("#soundButton").addEventListener("click", () => openAction("music"));
  document.querySelector("#finalNudgeButton").addEventListener("click", showFinalReveal);
  document.querySelectorAll(".object-dock [data-action]").forEach((button) => {
    button.addEventListener("click", () => openAction(button.dataset.action, button));
  });
  document.querySelector("#modalLayer").addEventListener("click", (event) => {
    if (event.target === modalLayer || event.target.closest("[data-close]")) closeModal();
    const action = event.target.closest("[data-modal-action]")?.dataset.modalAction;
    if (action === "close") closeModal();
    if (action === "final") showFinalGift();
    if (action === "music-toggle") {
      if (spotifyController) spotifyController.togglePlay();
    }
    if (event.target.closest(".gallery-next")) changePhoto(1);
    if (event.target.closest(".gallery-previous")) changePhoto(-1);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalLayer.hidden) closeModal();
    if (event.key === "Tab" && !modalLayer.hidden) trapFocus(event);
  });
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointercancel", onCanvasPointerUp);
  canvas.addEventListener("pointerleave", clearHover);
  canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("pointermove", (event) => {
    if (customCursor && matchMedia("(pointer: fine) and (hover: hover)").matches) {
      customCursor.style.left = `${event.clientX}px`;
      customCursor.style.top = `${event.clientY}px`;
      customCursor.textContent = hoveredObject ? "♡" : "✧";
      customCursor.style.transform = `translate(-50%, -50%) scale(${hoveredObject ? 1.3 : 1})`;
    }
  }, { passive: true });
}

function enterWorld() {
  if (isEntered) return;
  musicStartRequested = true;
  if (!isPlayingVisual) requestSpotifyPlayback();
  isEntered = true;
  document.body.classList.add("entered");
  experience.classList.add("entered");
  document.querySelector("#spotifyPlayer").setAttribute("aria-hidden", "false");
  intro.classList.add("is-leaving");
  if (worldReady && !reducedMotion) {
    cameraTarget = { x: 0, y: 4.4, z: 11.2, lookX: 0, lookY: 1.5, lookZ: 0 };
    window.setTimeout(() => {
      cameraTarget = { x: 0, y: 4.8, z: 12.5, lookX: 0, lookY: 1.45, lookZ: 0 };
    }, 1500);
  }
  window.setTimeout(() => intro.remove(), reducedMotion ? 20 : 1500);
}

function onResize() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 680 ? 1.25 : 1.6));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width < 680 ? 45 : 39;
  camera.position.z = cameraTarget.z + (width < 680 ? 1.8 : 0);
  camera.updateProjectionMatrix();
}

function findHotspot(intersections) {
  for (const intersection of intersections) {
    let node = intersection.object;
    while (node && !node.userData.action) node = node.parent;
    if (node?.userData.action) return node;
  }
  return null;
}

function castAt(event) {
  if (!worldReady) return null;
  const bounds = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return findHotspot(raycaster.intersectObjects(scene.children, true));
}

function onPointerMove(event) {
  pointerNdc.x = (event.clientX / window.innerWidth - .5) * 2;
  pointerNdc.y = (event.clientY / window.innerHeight - .5) * 2;
  if (activeDrag?.pointerId === event.pointerId) {
    const deltaX = event.clientX - activeDrag.x;
    const deltaY = event.clientY - activeDrag.y;
    activeDrag.distance += Math.abs(deltaX) + Math.abs(deltaY);
    activeDrag.x = event.clientX;
    activeDrag.y = event.clientY;
    if (activeDrag.distance > 6) {
      activeDrag.moved = true;
      canvas.classList.add("is-panning");
      roomPan.x = Math.max(-3.5, Math.min(3.5, roomPan.x - deltaX * .018));
      roomPan.y = Math.max(-1.1, Math.min(1.1, roomPan.y + deltaY * .012));
    }
  }
  const hit = activeDrag?.moved ? null : castAt(event);
  if (hit !== hoveredObject) {
    if (hoveredObject) hoveredObject.scale.copy(hoveredObject.userData.homeScale);
    hoveredObject = hit;
  }
  if (hit && event.pointerType !== "touch") {
    sceneHint.textContent = hit.userData.label || "♡ click me";
    sceneHint.style.display = "block";
    sceneHint.style.left = `${Math.min(event.clientX + 15, window.innerWidth - 160)}px`;
    sceneHint.style.top = `${Math.max(10, event.clientY - 35)}px`;
  } else {
    sceneHint.style.display = "none";
  }
}

function onCanvasPointerDown(event) {
  if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
  activeDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, moved: false };
  suppressSceneClick = false;
  canvas.setPointerCapture(event.pointerId);
}

function onCanvasPointerUp(event) {
  if (activeDrag?.pointerId !== event.pointerId) return;
  suppressSceneClick = activeDrag.moved;
  activeDrag = null;
  canvas.classList.remove("is-panning");
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

function clearHover() {
  if (hoveredObject) hoveredObject.scale.copy(hoveredObject.userData.homeScale);
  hoveredObject = null;
  sceneHint.style.display = "none";
}

function onCanvasClick(event) {
  if (suppressSceneClick) {
    suppressSceneClick = false;
    return;
  }
  const hit = castAt(event);
  if (hit) openAction(hit.userData.action, null, hit);
}

function openAction(action, trigger = null, object = null) {
  lastTrigger = trigger || document.activeElement;
  focusOnAction(action, object);
  if (object && !object.userData.fixedInRoom) {
    object.scale.multiplyScalar(1.04);
    window.setTimeout(() => {
      if (object.userData.homeScale) object.scale.copy(object.userData.homeScale);
    }, 200);
  }
  markDiscovered(action);
  if (action === "teddy") showTeddy();
  if (action === "letter") showLetter();
  if (action === "photos") showPhotos();
  if (action === "gift") showGift();
  if (action === "music") showMusic();
  if (action === "stars") showStarMessage(object?.userData.starIndex);
}

function focusOnAction(action, object) {
  if (reducedMotion) return;
  const focusTargets = {
    teddy: { x: .2, y: 3.5, z: 9.2, lookX: .7, lookY: 1.55, lookZ: -.1 },
    letter: { x: -2.3, y: 3.15, z: 8.5, lookX: -3.6, lookY: 1.25, lookZ: .15 },
    gift: { x: 1.25, y: 3.1, z: 8.9, lookX: 2.2, lookY: .75, lookZ: 1.5 },
    music: { x: 3.1, y: 2.8, z: 8.7, lookX: 4.65, lookY: .75, lookZ: 1.5 }
  };
  if (action === "stars" && object) {
    const position = object.position;
    cameraTarget = { x: position.x * .35, y: 3.9, z: 10.5, lookX: position.x, lookY: position.y, lookZ: position.z };
  } else if (focusTargets[action]) {
    cameraTarget = { ...roomCamera, ...focusTargets[action] };
  }
}

function markDiscovered(action) {
  if (!discoveryKeys.includes(action)) return;
  discoveries.add(action);
  const count = discoveries.size;
  discoveryHearts.textContent = discoveryKeys.map((_, index) => index < count ? "♥" : "♡").join(" ");
  discoveryCount.textContent = `${count} of 6 found`;
  document.querySelector(".discovery").setAttribute("aria-label", `Little discoveries: ${count} of 6 found`);
  if (count === discoveryKeys.length && !finalUnlocked) {
    finalUnlocked = true;
    finalPending = true;
    finalNudge.hidden = false;
  }
}

function presentModal(eyebrow, title, content, actions = "") {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalContent.innerHTML = content;
  modalActions.innerHTML = actions;
  modalLayer.hidden = false;
  modal.focus({ preventScroll: true });
}

function closeModal() {
  if (modalLayer.hidden) return;
  modalLayer.hidden = true;
  if (lastTrigger?.isConnected && typeof lastTrigger.focus === "function") lastTrigger.focus({ preventScroll: true });
  if (finalPending) {
    finalPending = false;
    window.setTimeout(showFinalReveal, reducedMotion ? 0 : 450);
  } else if (!finalSequence && !document.body.classList.contains("final-mode")) {
    cameraTarget = { ...roomCamera };
  }
}

function actionButton(label, action = "close", className = "soft-button") {
  return `<button class="${className}" type="button" data-modal-action="${action}">${label}</button>`;
}

function showTeddy() {
  if (teddyRoot && !reducedMotion && clock) teddyRoot.userData.bounceAt = clock.getElapsedTime();
  const greeting = loveData.boyfriendName === "Your favorite person" ? "You deserve a hug today.\n\nCome here 🫂" : `${loveData.boyfriendName}, you deserve a hug today.\n\nCome here 🫂`;
  presentModal("special delivery", "A tiny reminder for you", `<p class="modal-copy script">${escapeHTML(greeting)}</p><span class="modal-heart" aria-hidden="true">♡</span>`, actionButton("Close ♡"));
}

function showLetter() {
  presentModal("a little letter", "Hey, you...", `<p class="modal-copy script">${escapeHTML(loveData.letter)}</p>`, actionButton("Close letter ♡"));
}

function showPhotos() {
  galleryIndex = 0;
  const photo = loveData.photos[galleryIndex];
  const actions = `<div class="gallery-arrows"><button class="gallery-previous" type="button" aria-label="Previous memory">←</button><button class="gallery-next" type="button" aria-label="Next memory">→</button></div>`;
  presentModal("our scrapbook", "Little moments", galleryMarkup(photo), actions + actionButton("Close ♡"));
  wireGalleryImage();
}

function galleryMarkup(photo) {
  return `<div class="gallery-frame"><div class="photo-placeholder"><span>♡</span><span>memory loading...</span></div><img src="${escapeAttribute(photo.image)}" alt="${escapeAttribute(photo.caption)}" loading="lazy"><span class="sr-only">Photo ${galleryIndex + 1} of ${loveData.photos.length}</span></div><p class="gallery-caption">${escapeHTML(photo.caption)}</p>`;
}

function wireGalleryImage() {
  const image = modalContent.querySelector(".gallery-frame img");
  const placeholder = modalContent.querySelector(".photo-placeholder");
  const showPlaceholder = () => {
    image.hidden = true;
    placeholder.hidden = false;
  };
  image.addEventListener("error", showPlaceholder, { once: true });
  image.addEventListener("load", () => { placeholder.hidden = true; }, { once: true });
  if (image.complete) {
    if (image.naturalWidth) placeholder.hidden = true;
    else showPlaceholder();
  }
}

function changePhoto(direction) {
  galleryIndex = (galleryIndex + direction + loveData.photos.length) % loveData.photos.length;
  modalContent.innerHTML = galleryMarkup(loveData.photos[galleryIndex]);
  wireGalleryImage();
}

function showGift() {
  if (giftLid && !reducedMotion) {
    giftLid.rotation.x = -.18;
    window.setTimeout(() => { giftLid.rotation.x = 0; }, 1100);
  }
  presentModal("a little surprise", "You found it!", `<p class="modal-copy">Your reward is...</p><p class="modal-copy script">one unlimited supply of<br>hugs, kisses, and love from me ♡</p><span class="modal-heart" aria-hidden="true">♥</span>`, actionButton("Close gift ♡"));
}

function showMusic() {
  if (!isPlayingVisual) requestSpotifyPlayback();
  const spotify = spotifyDetails(loveData.spotify.url);
  const fallback = spotify ? `<p class="spotify-fallback"><a href="${escapeAttribute(spotify.url)}" target="_blank" rel="noopener noreferrer">Open this song on Spotify ♡</a></p>` : `<p class="modal-copy">Add a Spotify track or playlist link in the love settings to hear your song here.</p>`;
  const toggle = actionButton(isPlayingVisual ? "Pause our song ♡" : "Play our song ♡", "music-toggle", "text-button music-toggle");
  presentModal("our song", "♫ A song for you ♫", `<p class="spotify-note">there's a song that reminds me of you...</p><p class="modal-copy">${isPlayingVisual ? "It's playing softly while you explore." : "Use the player in the corner to start listening."}</p>${fallback}`, toggle + actionButton("Close ♡"));
}

function spotifyDetails(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)\/?$/);
    if (!match || !["open.spotify.com", "www.open.spotify.com"].includes(url.hostname)) return null;
    const cleanUrl = `https://open.spotify.com/${match[1]}/${match[2]}`;
    return { url: cleanUrl, uri: `spotify:${match[1]}:${match[2]}` };
  } catch {
    return null;
  }
}

function requestSpotifyPlayback() {
  if (!spotifyController) return;
  try {
    spotifyController.play();
  } catch {
    updateMusicPrompt("tap below to start our song ♡");
  }
}

function updateMusicPrompt(message) {
  const prompt = document.querySelector("#musicPrompt");
  if (prompt) prompt.textContent = message;
}

function setMusicState(playing) {
  isPlayingVisual = playing;
  const button = document.querySelector("#soundButton");
  const status = document.querySelector("#musicStatus");
  button.classList.toggle("is-playing", playing);
  button.setAttribute("aria-label", playing ? "Our song is now playing. Open music details." : "Play our song");
  status.textContent = playing ? "now playing" : "play our song";
  if (playing) updateMusicPrompt("♫ our song is playing softly");
  const toggle = document.querySelector("[data-modal-action='music-toggle']");
  if (toggle) toggle.textContent = playing ? "Pause our song ♡" : "Play our song ♡";
}

function setupSpotify() {
  const spotify = spotifyDetails(loveData.spotify.url);
  if (!spotify) return;
  window.onSpotifyIframeApiReady = (iframeAPI) => {
    const embedTarget = document.querySelector("#spotifyEmbed");
    iframeAPI.createController(embedTarget, { uri: spotify.uri, width: "100%", height: "80" }, (controller) => {
      spotifyController = controller;
      controller.addListener("playback_started", () => setMusicState(true));
      controller.addListener("playback_update", (event) => setMusicState(!event.data.isPaused));
      controller.addListener("ready", () => {
        requestSpotifyPlayback();
        window.setTimeout(() => {
          if (!isPlayingVisual && !isEntered) updateMusicPrompt("tap below to start our song ♡");
        }, 1800);
      });
    });
  };
  const apiScript = document.createElement("script");
  apiScript.src = "https://open.spotify.com/embed/iframe-api/v1";
  apiScript.async = true;
  apiScript.onerror = () => {
    updateMusicPrompt("tap to open our song on Spotify ♡");
  };
  document.head.append(apiScript);
}

function showStarMessage(index) {
  const selected = Number.isInteger(index) ? loveData.starMessages[index % loveData.starMessages.length] : loveData.starMessages[Math.floor(Math.random() * loveData.starMessages.length)];
  presentModal("a little reminder", "Something among the stars", `<p class="modal-copy script">${escapeHTML(selected)}</p><span class="modal-heart" aria-hidden="true">✧</span>`, actionButton("Keep this close ♡"));
}

function showFinalReveal() {
  if (!finalUnlocked) return;
  document.body.classList.add("final-mode");
  experience.classList.add("final-mode");
  if (lampLight) lampLight.intensity = 49;
  if (worldReady && !reducedMotion) cameraTarget = { x: 0, y: 3.8, z: 10.7, lookX: 0, lookY: 1.35, lookZ: 0 };
  presentModal("you found everything", "But...", `<p class="modal-copy script">there's still one last thing.</p>`, actionButton("Open the final gift 🎁", "final"));
}

function showFinalGift() {
  modalLayer.hidden = true;
  finalSequence = true;
  if (worldReady && !reducedMotion) cameraTarget = { x: 1.6, y: 2.7, z: 7.2, lookX: 1.2, lookY: .9, lookZ: 1 };
  if (giftLid && !reducedMotion) giftLid.rotation.x = -.9;
  isPlayingVisual = false;
  window.setTimeout(() => {
    presentModal("for you, with all my love", "Reynaldi Febry Ariesty ♡", `<div class="final-reveal"><p class="final-message">${escapeHTML(loveData.finalMessage)}</p><p class="final-signoff">— from ${escapeHTML(loveData.yourName)}, with love ♡</p><span class="modal-heart" aria-hidden="true">♥</span></div>`, actionButton("Stay a little longer ♡"));
  }, reducedMotion ? 0 : 900);
}

function trapFocus(event) {
  const focusable = [...modal.querySelectorAll("button:not([disabled]), a[href], iframe")].filter((item) => item.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

setupSpotify();
setupWorld();