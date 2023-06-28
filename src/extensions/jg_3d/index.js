const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const ExtensionInfo = require("./info");
const Three = require("three");
const { OBJLoader } = require('three/examples/jsm/loaders/OBJLoader.js');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');
const CANNON = require('cannon');


const MeshLoaders = {
    OBJ: new OBJLoader(),
    GLTF: new GLTFLoader(),
    FBX: new FBXLoader(),
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
function toDeg(rad) {
    return rad * (180 / Math.PI);
}
function toDegRounding(rad) {
    const result = toDeg(rad);
    if (!String(result).includes('.')) return result;
    const split = String(result).split('.');
    const endingDecimals = split[1].substring(0, 3);
    if ((endingDecimals === '999') && (split[1].charAt(3) === '9')) return Number(split[0]) + 1;
    return Number(split[0] + '.' + endingDecimals);
}

/**
 * Class for 3D blocks
 * @constructor
 */
class Jg3DBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.three = Three;

        // prism has screenshots, lets tell it to use OUR canvas for them
        this.runtime.prism_screenshot_checkForExternalCanvas = true;
        this.runtime.prism_screenshot_externalCanvas = null;

        // Three.js requirements
        /**
         * @type {Three.Scene}
         */
        this.scene = null;
        /**
         * @type {Three.Camera}
         */
        this.camera = null;
        /**
         * @type {Three.WebGLRenderer}
         */
        this.renderer = null;

        this.existingSceneObjects = [];
        this.existingSceneLights = [];

        // extras
        this.lastStageSizeWhenRendering = {
            width: 0,
            height: 0
        }
        
        // event recievers
        // stop button clicked or project restarted, dispose of all objects
        this.runtime.on('PROJECT_STOP_ALL', () => {
            this.dispose();
        });
    }

    /**
     * Dispose of the scene, camera & renderer (and any objects)
     */
    dispose() {
        this.existingSceneObjects = [];
        this.existingSceneLights = [];
        if (this.scene) {
            this.scene.remove();
            this.scene = null;
        }
        if (this.camera) {
            this.camera.remove();
            this.camera = null;
        }
        if (this.renderer) {
            if (this.renderer.domElement) {
                this.renderer.domElement.remove();
            }
            this.renderer.dispose();
            this.renderer = null;
            this.runtime.prism_screenshot_externalCanvas = null;
        }
    }
    /**
     * Displays a message for stack blocks.
     * @param {BlockUtility} util 
     */
    stackWarning(util, message) {
        if (!util) return;
        if (!util.thread) return;
        if (!util.thread.stackClick) return;
        const block = util.thread.blockGlowInFrame;
        this.runtime.visualReport(block, message);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return ExtensionInfo;
    }

    // utilities
    getScratchCanvas() {
        return this.runtime.renderer.canvas;
    }
    restyleExternalCanvas(canvas) {
        canvas.style.position = "absolute"; // position above canvas without pushing it down
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        // we have no reason to register clicks on the three.js canvas,
        // so make it click on the scratch canvas instead
        canvas.style.pointerEvents = "none";
    }
    appendElementAboveScratchCanvas(element) {
        element.style.zIndex = 450;
        this.getScratchCanvas().parentElement.prepend(element);
    }
    needsToResizeCanvas() {
        const stage = {
            width: this.runtime.stageWidth,
            height: this.runtime.stageHeight
        }
        return stage !== this.lastStageSizeWhenRendering;
    }
    touching(t, e) {
        if (!!this.scene.getObjectByName(t).position&&this.scene.getObjectByName(e).position){
        const n = new Three.Raycaster,
        s = new Three.Raycaster;
        n.set(this.scene.getObjectByName(t).position, new Three.Vector3(0, 0, -1)),
        s.set(this.scene.getObjectByName(e).position, new Three.Vector3(0, 0, -1));
        const c = n.intersectObject(e, !0),
        i = s.intersectObject(t, !0);
        return c.length > 0 || i.length > 0
        } else {return false}
    }

    initialize() {
        // dispose of the previous scene
        this.dispose();
        this.scene = new Three.Scene();
        this.renderer = new Three.WebGLRenderer({ preserveDrawingBuffer: true, alpha: true });
        this.renderer.penguinMod = {
            backgroundColor: 0x000000,
            backgroundOpacity: 1
        }
        this.renderer.setClearColor(0x000000, 1);
        // add renderer canvas ontop of scratch canvas
        const canvas = this.renderer.domElement;
        this.runtime.prism_screenshot_externalCanvas = canvas;

        this.restyleExternalCanvas(canvas);
        this.appendElementAboveScratchCanvas(canvas);        
        /* dev: test rendering by drawing a cube and see if it appears
        // const geometry = new Three.BoxGeometry(1, 1, 1);
        // const material = new Three.MeshBasicMaterial({ color: 0x00ff00 });
        // const cube = new Three.Mesh(geometry, material);
        // this.scene.add(cube)
        
        dev update: it worked W
        */
    }
    render() {
        if (!this.renderer) return;
        if (!this.scene) return;
        if (!this.camera) return;
        if (this.needsToResizeCanvas()) {
            this.lastStageSizeWhenRendering = {
                width: this.runtime.stageWidth,
                height: this.runtime.stageHeight
            }
            /*
                multiply sizes because the stage looks like doo doo xd
                we dont need to worry about multiplying 1920 * 2 since projects
                shouldnt be using that large of a stage but instead a smaller size
                with the same aspect ratio, penguinmod even says that
            */
            this.renderer.setSize(this.lastStageSizeWhenRendering.width * 2, this.lastStageSizeWhenRendering.height * 2);
            this.restyleExternalCanvas(this.renderer.domElement);
        }
        // when switching between project page & editor, we need to move the canvas again since it gets lost
        /* todo: create layers so that iframe appears above 3d every time this is done */
        this.appendElementAboveScratchCanvas(this.renderer.domElement);
        return new Promise((resolve) => {
            // we do this to avoid HUGE lag when not waiting 1 tick
            // and because it waits if the tab isnt focused
            requestAnimationFrame(() => {
                // renderer might not exist anymore
                if (!this.renderer) return;
                resolve(this.renderer.render(this.scene, this.camera));
            })
        })
    }

    setCameraPerspective2(args) {
        if (this.camera) {
            // remove existing camera
            this.camera.remove();
            this.camera = null;
        }

        const fov = Cast.toNumber(args.FOV);
        const aspect = Cast.toNumber(args.AR);
        const near = Cast.toNumber(args.NEAR);
        const far = Cast.toNumber(args.FAR);

        this.camera = new Three.PerspectiveCamera(fov, aspect, near, far);
    }
    setCameraPerspective1(args) {
        /* todo: make near and far be the same as the existing camera if there is one */
        const near = 0.1;
        const far = 1000;
        return this.setCameraPerspective2({
            FOV: args.FOV,
            AR: args.AR,
            NEAR: near,
            FAR: far
        })
    }
    setCameraPerspective0(args) {
        /* todo: make ar, near and far be the same as the existing camera if there is one */
        const ar = this.runtime.stageWidth / this.runtime.stageHeight;
        const near = 0.1;
        const far = 1000;
        return this.setCameraPerspective2({
            FOV: args.FOV,
            AR: ar,
            NEAR: near,
            FAR: far
        })
    }

    setCameraPosition(args) {
        if (!this.camera) return;
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        }
        this.camera.position.set(position.x, position.y, position.z);
    }
    setCameraRotation(args) {
        if (!this.camera) return;
        const rotation = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        }
        // const euler = new Three.Euler(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
        // this.camera.setRotationFromEuler(euler);
        const euler = new Three.Euler(0, 0, 0);
        this.camera.setRotationFromEuler(euler);
        this.camera.rotateY(toRad(rotation.y));
        this.camera.rotateX(toRad(rotation.x));
        this.camera.rotateZ(toRad(rotation.z));
    }
    getCameraPosition(args) {
        if (!this.camera) return "";
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(this.camera.position[v]);
    }
    getCameraRotation(args) {
        if (!this.camera) return "";
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        const rotation = Cast.toNumber(this.camera.rotation[v]);
        // rotation is in radians, convert to degrees but round it
        // a bit so that we get 46 instead of 45.999999999999996
        return toDegRounding(rotation);
    }

    setSceneBackgroundColor(args) {
        if (!this.renderer) return;
        const color = Cast.toNumber(args.COLOR);
        this.renderer.penguinMod.backgroundColor = color;
        this.renderer.setClearColor(color, this.renderer.penguinMod.backgroundOpacity);
    }
    setSceneBackgroundOpacity(args) {
        if (!this.renderer) return;
        let opacity = Cast.toNumber(args.OPACITY);
        if (opacity > 100) opacity = 100;
        if (opacity < 0) opacity = 0;
        const backgroundOpac = 1 - (opacity / 100);
        this.renderer.penguinMod.backgroundOpacity = backgroundOpac;
        this.renderer.setClearColor(this.renderer.penguinMod.backgroundColor, backgroundOpac);
    }

    getCameraZoom() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.zoom) * 100;
    }
    setCameraZoom(args) {
        if (!this.camera) return;
        this.camera.zoom = Cast.toNumber(args.ZOOM) / 100;
        this.camera.updateProjectionMatrix();
    }

    getCameraClipPlane(args) {
        if (!this.camera) return "";
        const plane = args.CLIPPLANE;
        if (!["near", "far"].includes(plane)) return "";
        return this.camera[plane];
    }

    getCameraAspectRatio() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.aspect);
    }
    getCameraFov() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.fov);
    }

    isCameraPerspective() {
        if (!this.camera) return false;
        return Cast.toBoolean(this.camera.isPerspectiveCamera);
    }
    isCameraOrthographic() {
        if (!this.camera) return false;
        return Cast.toBoolean(!this.camera.isPerspectiveCamera);
    }

    doesObjectExist(args) {
        if (!this.scene) return false;
        const name = Cast.toString(args.NAME);
        // !! is easier to type than if (...) { return true; } return false;
        return !!this.scene.getObjectByName(name);
    }

    createGameObject(args, util, type) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        if (this.scene.getObjectByName(name)) return this.stackWarning(util, 'An object with this name already exists!');
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        let object;
        switch (type) {
            case 'sphere': {
                const geometry = new Three.SphereGeometry(1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const sphere = new Three.Mesh(geometry, material);
                object = sphere;
                break;
            }
            case 'plane': {
                const geometry = new Three.PlaneGeometry(1, 1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const plane = new Three.Mesh(geometry, material);
                object = plane;
                break;
            }
            case 'mesh': {
                const url = Cast.toString(args.URL);
                // switch loaders based on file type
                let fileType = 'obj';
                switch (Cast.toString(args.FILETYPE)) {
                    case '.glb / .gltf':
                        fileType = 'glb';
                        break;
                    case '.fbx':
                        fileType = 'fbx';
                        break;
                }
                // we need to do a promise here so that stack continues on load
                return new Promise((resolve) => {
                    let loader = MeshLoaders.OBJ;
                    switch (fileType) {
                        case 'glb':
                            loader = MeshLoaders.GLTF;
                            break;
                        case 'fbx':
                            loader = MeshLoaders.FBX;
                            break;
                    }
                    loader.load(url, (object) => {
                        // success
                        if (loader === MeshLoaders.GLTF) {
                            object = object.scene;
                        }
                        if (loader === MeshLoaders.OBJ) {
                            const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                            this.updateMaterialOfObjObject(object, material);
                        }
                        object.name = name;
                        this.existingSceneObjects.push(name);
                        object.isPenguinMod = true;
                        object.isMeshObj = true;
                        object.position.set(position.x, position.y, position.z);
                        this.scene.add(object);
                        resolve();
                    }, () => {}, (error) => {
                        console.warn('Failed to load 3D mesh obj;', error);
                        this.stackWarning(util, 'Failed to get the 3D mesh!');
                        resolve();
                    })
                });
            }
            case 'light': {
                const type = Cast.toString(args.LIGHTTYPE);
                // switch type because there are different types of lights
                let light;
                switch (type) {
                    default: {
                        light = new Three.PointLight(0xffffff, 1, 100);
                        break;
                    }
                }
                object = light;
                this.existingSceneLights.push(name);
                break;
            }
            default: {
                const geometry = new Three.BoxGeometry(1, 1, 1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const cube = new Three.Mesh(geometry, material);
                object = cube;
                break;
            }
        }
        object.name = name;
        this.existingSceneObjects.push(name);
        object.isPenguinMod = true;
        object.position.set(position.x, position.y, position.z);
        this.scene.add(object);
    }
    createCubeObject(args, util) {
        this.createGameObject(args, util, 'cube');
    }
    createSphereObject(args, util) {
        this.createGameObject(args, util, 'sphere');
    }
    createPlaneObject(args, util) {
        this.createGameObject(args, util, 'plane');
    }
    createMeshObject(args, util) {
        this.createGameObject(args, util, 'mesh');
    }
    createMeshObjectFileTyped(args, util) {
        this.createGameObject(args, util, 'mesh');
    }
    createLightObject(args, util) {
        this.createGameObject(args, util, 'light');
    }

    getMaterialOfObjObject(object) {
        let material;
        object.traverse((child) => {
            if (child instanceof Three.Mesh) {
                material = child.material;
            }
        });
        return material;
    }
    updateMaterialOfObjObject(object, material) {
        object.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.material = material;
            }
        });
    }

    setObjectPosition(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        object.position.set(position.x, position.y, position.z);
    }
    setObjectRotation(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const rotation = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        // const euler = new Three.Euler(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
        // object.setRotationFromEuler(euler);
        const euler = new Three.Euler(0, 0, 0);
        object.setRotationFromEuler(euler);
        object.rotateY(toRad(rotation.y));
        object.rotateX(toRad(rotation.x));
        object.rotateZ(toRad(rotation.z));
    }
    setObjectSize(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const size = {
            x: Cast.toNumber(args.X) / 100,
            y: Cast.toNumber(args.Y) / 100,
            z: Cast.toNumber(args.Z) / 100,
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        object.scale.set(size.x, size.y, size.z);
    }

    getObjectPosition(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(object.position[v]);
    }
    getObjectRotation(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        const rotation = Cast.toNumber(object.rotation[v]);
        // rotation is in radians, convert to degrees but round it
        // a bit so that we get 46 instead of 45.999999999999996
        return toDegRounding(rotation);
    }
    getObjectSize(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(object.scale[v]) * 100;
    }

    deleteObject(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        const isLight = object.isLight;
        object.clear();
        this.scene.remove(object);
        const idx = this.existingSceneObjects.indexOf(name);
        this.existingSceneObjects.splice(idx, 1);
        if (isLight) {
            const lidx = this.existingSceneLights.indexOf(name);
            this.existingSceneLights.splice(lidx, 1);
        }
    }
    setObjectColor(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const color = Cast.toNumber(args.COLOR);
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) {
            object.color.set(color);
            return
        }
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            material.color.set(color);
            this.updateMaterialOfObjObject(object, material);
            return;
        }
        object.material.color.set(color);
    }
    setObjectShading(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const on = Cast.toString(args.ONOFF) === 'on';
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) return;
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            const color = '#' + material.color.getHexString();
            let newMat;
            if (on) {
                newMat = new Three.MeshStandardMaterial({ color: color });
            } else {
                newMat = new Three.MeshBasicMaterial({ color: color });
            }
            newMat.color.set(color);
            this.updateMaterialOfObjObject(object, newMat);
            return;
        }
        const color = '#' + object.material.color.getHexString();
        if (on) {
            object.material = new Three.MeshStandardMaterial({ color: color });
        } else {
            object.material = new Three.MeshBasicMaterial({ color: color });
        }
    }
    setObjectWireframe(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const on = Cast.toString(args.ONOFF) === 'on';
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) return;
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            material.wireframe = on;
            this.updateMaterialOfObjObject(object, material);
            return;
        }
        object.material.wireframe = on;
    }

    existingObjectsArray(args) {
        const listType = Cast.toString(args.OBJECTLIST);
        const validOptions = ["objects", "physical objects", "lights"];
        if (!validOptions.includes(listType)) return '[]';
        switch (listType) {
            case 'objects':
                return JSON.stringify(this.existingSceneObjects);
            case 'lights':
                return JSON.stringify(this.existingSceneLights);
            case 'physical objects': {
                const physical = this.existingSceneObjects.filter(objectName => {
                    return !this.existingSceneLights.includes(objectName);
                });
                return JSON.stringify(physical);
            }
            default:
                return '[]';
        }
    }

    objectTouchingObject(args) {
        return this.touching(Cast.toString(args.NAME1), Cast.toString(args.NAME2))
    }
}

module.exports = Jg3DBlocks;
