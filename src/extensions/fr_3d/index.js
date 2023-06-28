const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const Ammo = require('./ammo.wasm');
const Icon = require('./icon.png');



/**
 * Class for 3d Physics blocks
 */
class Fr3DBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         */
        this.runtime = runtime;
        this.world = {}
        this._3d = {}
        this.Three = {}
        if (!vm.runtime.ext_jg3d) {
            vm.extensionManager.loadExtensionURL('jg3d')
                .then(() => {
                    this._3d = vm.runtime.ext_jg3d;
                    this.Three = this._3d.three;
                })
        } else {
            this._3d = vm.runtime.ext_jg3d;
            this.Three = this._3d.three
        }
    }
    /**
     * metadata for this extension and its blocks.
     * @returns {object}
     */
    getInfo() {
        return {
            id: 'fr3d',
            name: '3d Physics',
            color1: '#D066FE',
            color2: '#8000BC',
            blockIconURI: Icon,
            blocks: [
                {
                    opcode: 'setup',
                    text: 'setup simulation',
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'step',
                    text: 'step simulation',
                    blockType: BlockType.COMMAND,
                },
                {
                    opcode: 'enablep',
                    text: 'enable physics for [NAME1]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME1: { type: ArgumentType.STRING, defaultValue: "Cube1" }
                    }
                },
                {
                    opcode: 'disablep',
                    text: 'disable physics for [NAME1]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME1: { type: ArgumentType.STRING, defaultValue: "Plane1" }
                    }
                }
            ]
        };
    }
    animate() {
        if (!this.world) {
            console.error("Physics world has not been initialized.");
            return;
        }
    
        const deltaTime = 1 / 60;
    
        this.world.stepSimulation(deltaTime, 1);
    
        const numObjects = this._3d.scene.children.length;
        for (let i = 0; i < numObjects; i++) {
            const object = this._3d.scene.children[i];
    
            if (object.userData.physicsEnabled) {
                const rigidBody = object.userData.rigidBody;
                const motionState = rigidBody.getMotionState();
                const transform = new Ammo.btTransform();
                motionState.getWorldTransform(transform);
                const origin = transform.getOrigin();
                object.position.set(origin.x(), origin.y(), origin.z());
                object.quaternion.set(
                    transform.getRotation().x(),
                    transform.getRotation().y(),
                    transform.getRotation().z(),
                    transform.getRotation().w()
                );
            }
        }
    }
    
    addp(objectName) {
        if (!this.world) {
            console.error("Physics world has not been initialized.");
            return;
        }
    
        const object = this._3d.scene.getObjectByName(objectName);
        if (!object) {
            console.error(`Object "${objectName}" not found in the scene.`);
            return;
        }
    
        const geometry = object.isMesh ? object.geometry : null;
        if (!geometry) {
            console.error(`Object "${objectName}" is not a mesh.`);
            return;
        }
    
        const vertices = [];
        geometry.vertices.forEach((vertex) => {
            const position = new Ammo.btVector3(vertex.x, vertex.y, vertex.z);
            vertices.push(position);
        });
    
        const hullShape = new Ammo.btConvexHullShape();
        vertices.forEach((vertex) => {
            hullShape.addPoint(vertex, true);
        });
    
        const mass = 1;
        const startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        const localInertia = new Ammo.btVector3(0, 0, 0);
        hullShape.calculateLocalInertia(mass, localInertia);
        startTransform.setOrigin(
            new Ammo.btVector3(
                object.position.x,
                object.position.y,
                object.position.z
            )
        );
        const motionState = new Ammo.btDefaultMotionState(startTransform);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            hullShape,
            localInertia
        );
        const rigidBody = new Ammo.btRigidBody(rbInfo);
    
        this.world.addRigidBody(rigidBody);
    
        object.userData.physicsEnabled = true;
        object.userData.rigidBody = rigidBody;
    
        object.onBeforeRender = () => {
            const transform = new Ammo.btTransform();
            rigidBody.getMotionState().getWorldTransform(transform);
            const origin = transform.getOrigin();
            object.position.set(origin.x(), origin.y(), origin.z());
        };
    }
    
    rmp(name) {
        if (!this.world) {
            console.error("Physics world has not been initialized.");
            return;
        }
    
        const object = this._3d.scene.getObjectByName(name);
        if (!object) {
            console.error(`Object "${name}" not found in the scene.`);
            return;
        }
    
        if (object.userData.physicsEnabled) {
            this.world.removeRigidBody(object.userData.rigidBody);
            object.userData.physicsEnabled = false;
            object.userData.rigidBody = null;
            object.onBeforeRender = null;
        }
    }
    
    setupworld() {
        if (this.world) {
            console.error("Physics world has already been initialized.");
            return Promise.resolve();
        }
    
        return new Promise((resolve) => {
            Ammo().then(() => {
                const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
                const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
                const overlappingPairCache = new Ammo.btDbvtBroadphase();
                const solver = new Ammo.btSequentialImpulseConstraintSolver();
                this.world = new Ammo.btDiscreteDynamicsWorld(
                    dispatcher,
                    overlappingPairCache,
                    solver,
                    collisionConfiguration
                );
                this.world.setGravity(new Ammo.btVector3(0, -9.8, 0));
                resolve();
            });
        });
    }
    
    setup() {
        this.setupworld().then(() => {
            // Rest of the setup logic
        });
    }
    
    enablep(args) {
        this.addp(args.NAME1.toString());
    }
    
    disablep(args) {
        this.rmp(args.NAME1.toString());
    }
    
    step() {
        this.animate();
    }
    
    
}

module.exports = Fr3DBlocks;
