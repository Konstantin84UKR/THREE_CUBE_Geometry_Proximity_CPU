import * as THREE from 'three'
import { Vector3, Vector2 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Perlin, FBM } from 'three-noise/build/three-noise.module';
import { Material } from "./Material";
import * as dat from 'dat.gui';

//GUI
const gui = new dat.GUI();


// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

const raycaster = new THREE.Raycaster();
// const ray = new THREE.Ray();
const pointer = new THREE.Vector2(0,-0.1);
// const pointerNDC = new THREE.Vector3(0, 0, 0);
let planeIntersect = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const currentM = new THREE.Matrix4();
const mainPos = new THREE.Vector3();
const maxDistans = 200;

//https://www.npmjs.com/package/three-noise
const perlin = new Perlin(Math.random())
const fbm = new FBM(Math.random());

//Texture 
const textureloader = new THREE.TextureLoader();
const matCapTexture = textureloader.load("/MatCap/green.jpg")
const matCapTexture3 = textureloader.load("/MatCap/matcap8.jpg")
// const matCapTexture5 = textureloader.load("/MatCap/skin2.png")
const matCapTexture9 = textureloader.load("/MatCap/m1.jpeg")
// const matCapTexture10 = textureloader.load("/MatCap/grey.png")

/**
 * Object
 */
//MeshMatcapMaterial
const sizeBoxInstance = 10
const geometry = new THREE.BoxGeometry(sizeBoxInstance, sizeBoxInstance, sizeBoxInstance);

let uniforms = {
    u_pointPosition: { value: new Vector3(0, 0, 0) },
    u_mixFactor: { value: 0.0 },
    u_time:  { value: 0 },
    u_groupMatrix: { value: new THREE.Matrix4().identity()}
}
const material = new Material({ color: 0xffffff, wireframe: false, matcap: matCapTexture3, uniforms });

// const material = new Material({ uniforms }).material;

const sizeField = 25;

// const instances = sizeField * sizeField * sizeField;
let a = sizeField * sizeField * sizeField;
let b = (sizeField - 2)  * (sizeField - 2) * (sizeField - 2);
const instances = a-b;
const mesh = new THREE.InstancedMesh(geometry, material, instances);
let count = 0;


// ???????????? ?????????????????? ??????????????????
var offsets = [];
for (var i = 0; i < instances; i++) {
    var x = Math.random() * 100;
    var y = Math.random() * 100;
    var z = Math.random() * 100;
    offsets.push(x, y, z);
}
var offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
mesh.geometry.setAttribute('instanceOffset', offsetAttribute);

// ?????????????? ???????????? ?? ?????????????? ???????????????? (attribute data)
const positionMatrixArray = [];
const positionMatrixArrayGLSL = [];
const rotationQuaternionArray = [];
const vectorForPerlin = new Vector3();
const quaternionMain = new THREE.Quaternion();
const instancePositionNoiseGLSL = [];
// const instanceScaleNoiseGLSL = [];
// const instanceQuaternionGLSL = [];

for (let i = 0; i < sizeField; i++) {

    for (let j = 0; j < sizeField; j++) {

        for (let k = 0; k < sizeField; k++) {

            if (i >= 1 && i < sizeField - 1 && j >= 1 && j < sizeField - 1 && k >= 1 && k < sizeField - 1){
                continue
            }   

        let matrix = new THREE.Matrix4(); 
        let matrixMain = new THREE.Matrix4(); 
    
        let posInstans = new THREE.Vector3(
                i * (sizeBoxInstance + 1) - sizeField / 2 * sizeBoxInstance,
                j * (sizeBoxInstance + 1) - sizeField / 2 * sizeBoxInstance,
                k * (sizeBoxInstance + 1) - sizeField / 2 * sizeBoxInstance);
        matrix.setPosition(posInstans);

        mesh.setMatrixAt(count, matrix);
            // positionMatrixArrayGLSL.push(matrix.elements);

        // matrixMain.setPosition(posInstans);
        // positionMatrixArray.push(matrixMain);

        //ROTARION 
            let positionMain = new THREE.Vector3();
            positionMain.copy(posInstans)
            vectorForPerlin.copy(posInstans);
            vectorForPerlin.multiplyScalar(0.05);
           //         //Position
            let ndX = 1 * perlin.get3(vectorForPerlin.multiplyScalar(0.1));
            let ndY = 1 * perlin.get3(vectorForPerlin.multiplyScalar(2.0));
            let ndZ = 1 * perlin.get3(vectorForPerlin.multiplyScalar(1.5));
            
            let noisePosVec = new Vector3(positionMain.x + (ndX) * 100, positionMain.y + (ndY) * 100, positionMain.z + (ndZ) * 100);

            instancePositionNoiseGLSL.push(noisePosVec.toArray());

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 1, 1), Math.PI / 1 );
        rotationQuaternionArray.push(quaternion);
        
        // matrixMain.makeRotationFromQuaternion(quaternion);
        matrixMain.setPosition(noisePosVec);
        
        positionMatrixArray.push(matrixMain);
        positionMatrixArrayGLSL.push(matrixMain.elements);

        //COLOR
        let colorPerlin = new THREE.Vector3();
        colorPerlin.copy(posInstans);
        colorPerlin.normalize();
        let colorX = 5 * fbm.get3(colorPerlin.multiplyScalar(5));
        let colorY = 5 * fbm.get3(colorPerlin.multiplyScalar(0.5));
        let colorZ = 0.5 + fbm.get3(colorPerlin.multiplyScalar(4));
       
        // mesh.setColorAt(count, new THREE.Vector3(colorX, colorY, colorZ));
        mesh.setColorAt(count, new THREE.Vector3(1.0, 1.0, 1.0));

        count ++    
        }
    }
}
mesh.instanceMainPosition = positionMatrixArray;
mesh.instanceMainRotation = rotationQuaternionArray;
// // ?????????????? InstancedBufferAttribute

mesh.instanceMainPositionGLSL = new THREE.InstancedBufferAttribute(new Float32Array(positionMatrixArrayGLSL.flat()), 16);
mesh.geometry.setAttribute('instancePositionMatrix', mesh.instanceMainPositionGLSL);

mesh.instancePositionNoise = new THREE.InstancedBufferAttribute(new Float32Array(instancePositionNoiseGLSL.flat()), 3);
mesh.geometry.setAttribute('instancePositionNoise', mesh.instancePositionNoise);

const group = new THREE.Group();
group.add(mesh);
scene.add(group);

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
scene.add(plane)
const helper = new THREE.PlaneHelper(plane, 50, 0xffff00);
scene.add(helper);

const pointerCenter = new THREE.Object3D();
scene.add(pointerCenter)

//HelperCUBE 

const geometry_HelperCUBE = new THREE.BoxGeometry(10, 10, 10);
const material_HelperCUBE = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const mesh_HelperCUBE = new THREE.Mesh(geometry_HelperCUBE, material_HelperCUBE);
material_HelperCUBE.wireframe = true;
scene.add(mesh_HelperCUBE);

helper.visible = false
material_HelperCUBE.visible= false
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth, // 800
    height: window.innerHeight // 600
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 1, 2000)
camera.position.z = 700
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

canvas.addEventListener('pointermove', onPointerMove);
window.addEventListener('resize', onResize);


let mixFactor = gui.add(uniforms.u_mixFactor, "value", 0.0, 1.0, 0.01);
mixFactor.setValue(1.0);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias : true
})
renderer.setSize(sizes.width, sizes.height)

// Animate
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update();

    // group.rotateY(0.01);

    //Plane 
    let target = new THREE.Vector3();
    camera.getWorldDirection(target);
    let originPlane = new THREE.Vector3();
    originPlane.copy(camera.position).addScaledVector(target,600);
    plane.setFromNormalAndCoplanarPoint(target.negate(), originPlane);

    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    raycaster.ray.intersectPlane(plane, planeIntersect);
    
    //testBox
    const distPointerCenter = planeIntersect.distanceTo(pointerCenter.position); 
    pointerCenter.position.lerp(planeIntersect, Math.sign(distPointerCenter) * 1.00); 

    mesh_HelperCUBE.position.set(pointerCenter.position.x, pointerCenter.position.y, pointerCenter.position.z);

    uniforms.u_pointPosition.value = mesh_HelperCUBE.position.toArray();
    uniforms.u_time.value = elapsedTime;
    uniforms.u_groupMatrix.value = group.matrixWorld;
    
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = false;
    

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / sizes.width) * 2 - 1;
    pointer.y = - (event.clientY / sizes.height) * 2 + 1;

}

function onResize(event) {
    sizes.width = window.innerWidth; 
    sizes.height =  window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
}
