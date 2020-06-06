import {
    Mesh,
    TextureLoader,
    MeshBasicMaterial,
    Geometry,
    Vector3,
    Vector2,
    Face3,
    Group,
    Clock
} from 'three';

const three = window.THREE
    ? window.THREE // Prefer consumption from global THREE, if exists
    : {
        Mesh,
        TextureLoader,
        MeshBasicMaterial,
        Geometry,
        Vector3,
        Vector2,
        Face3,
        Group,
        Clock
    };


class Prism extends Mesh {
    constructor(index, prismCount, materials, prismWidth, prismHeight, shadows) {
        const geometry = new Geometry();
        super(geometry, materials);
        this._step = 0;
        this.castShadow = shadows;
        this.receiveShadow = shadows;
        this.geometry = this._calculateGeometry(index, prismCount, prismWidth, prismHeight);
    }
    get step() { return this._step; };
    set step(step) { this._step = step; };

    _calculateGeometry(index, prismCount, prismWidth, prismHeight) {
        /**
        *         2C                   5F
        *        /\                  /\
        *       /  \1B______________/__\4E
        *    0A/_________________3D/
        */

        //calculate equilateral triangle coordinates for two triangles (3D)
        const vertices = [], parts = 3, triangleAmount = 2
        const triangleRadius = prismHeight * Math.sqrt(3) / 3;
        for (let j = 0; j < triangleAmount; j++) {
            for (let i = 0; i < parts; i++) {
                const a = 2 * i / parts * Math.PI;
                const v = new Vector3(Math.cos(a) * triangleRadius, Math.sin(a) * triangleRadius, (j * prismWidth) - (prismWidth / 2));
                vertices.push(v);
            }
        }

        const BAC = new Face3(1, 0, 2);
        const EDF = new Face3(3, 4, 5);
        const ADC = new Face3(0, 3, 2);
        const CDF = new Face3(2, 3, 5);
        const CFB = new Face3(2, 5, 1);
        const BFE = new Face3(1, 5, 4);
        const BEA = new Face3(1, 4, 0);
        const AED = new Face3(0, 4, 3);

        /**
         *   NW ------- NE
         *   |          |
         *   |          |
         *   |          |
         *   SW ------ SE
         */


        // const SW = new Vector2(0, 0);
        // const SE = new Vector2(0, 1);
        // const NW = new Vector2(1, 0);
        // const NE = new Vector2(1, 1);

        const SW = new Vector2(0, index / prismCount);
        const SE = new Vector2(1, index / prismCount);
        const NW = new Vector2(0, (index + 1) / prismCount);
        const NE = new Vector2(1, (index + 1) / prismCount);

        const geometry = new Geometry();
        geometry.vertices = vertices;
        geometry.faces = [BAC, EDF, ADC, CDF, CFB, BFE, BEA, AED];
        geometry.computeFaceNormals();

        //sideLeft
        geometry.faceVertexUvs[0].push([SW, NW, SE]);
        //sideRight
        geometry.faceVertexUvs[0].push([SW, NW, SE]);
        //front3
        geometry.faceVertexUvs[0].push([SW, SE, NW]);
        geometry.faceVertexUvs[0].push([NW, SE, NE]);
        //front1
        geometry.faceVertexUvs[0].push([SW, SE, NW]);
        geometry.faceVertexUvs[0].push([NW, SE, NE]);
        //front2
        geometry.faceVertexUvs[0].push([SW, SE, NW]);
        geometry.faceVertexUvs[0].push([NW, SE, NE]);

        geometry.computeVertexNormals();
        geometry.faces[2].materialIndex = 2;
        geometry.faces[3].materialIndex = 2;
        geometry.faces[4].materialIndex = 0;
        geometry.faces[5].materialIndex = 0;
        geometry.faces[6].materialIndex = 1;
        geometry.faces[7].materialIndex = 1;

        return geometry;
    }
}

export default class extends Group {
    constructor(content, width, height, easing = 0.035, prismCount = 24, speed = 4, shadows = true) {
        super();
        //init class fields
        this._content = content;   //array containing image paths/urls or THREE.Color objects. this array can contain different types!
        this._width = width;
        this._height = height;
        this._easing = easing;
        this._prismCount = prismCount;
        this._speed = speed;
        this._shadows = shadows;
        if (content) this._init();
    }

    //Getters & Setters
    set content(content) { this._content = content; this._init(); };
    get content() { return this._content; };
    set width(width) { this._width = width; this._init(); };
    get width() { return this._width; };
    set height(height) { this._height = height; this._init(); };
    get height() { return this._height; };
    set easing(easing) { this._easing = easing; };
    get easing() { return this._easing; };
    set prismCount(prismCount) { this._prismCount = prismCount; this._init(); };
    get prismCount() { return this._prismCount; };
    set speed(speed) { this._speed = speed; };
    get speed() { return this._speed; };
    set shadows(shadows) { this._shadows = shadows; };
    get shadows() { return this._shadows; };

    _init() {

        //if re-initialization: remove old threevision from scene before creating a new one
        if (this.children) {
            this.children = [];
        }

        //prepare mesh materials
        this.materials = [];
        this.content.map(el => {
            if (typeof (el) === "string") {
                const texture = new TextureLoader().load(el);
                this.materials.push(new MeshBasicMaterial({ map: texture }));
            }
            if (typeof (el) === "object") {
                this.materials.push(new MeshBasicMaterial({ color: el }));
            }
        })


        const prismWidth = this.width * 0.5;
        const prismHeight = this.height * 0.5 / this.prismCount;
        for (let index = 0; index < this.prismCount; index++) {
            const prism = new Prism(index, this.prismCount, this.materials, prismWidth, prismHeight, this.shadows);
            //arrange position for threevision structure
            prism.rotation.y += Math.PI / 2
            prism.position.y -= (this.prismCount / 2 * prismHeight) - prismHeight / 2;
            prism.position.y += index * prismHeight;
            this.add(prism);
        }
        this.readyToRefresh = false;

        //array that contains all prism rotationsZ from previous animation frame
        this.prev_rotation_Z = [];
        this.clock = new Clock();
        this.prev_step = 0;
        this.prev_mouse = new Vector3(0, 0, 0);
        this.raycaster = new THREE.Raycaster();
    }

    //animation updates
    update(step, mouse, scene, camera) {
        if (mouse && scene && camera) {
            const cur_mouse = new Vector3(mouse.x, mouse.y, mouse.z);
            const delta_mouse = new Vector3().subVectors(cur_mouse, this.prev_mouse);
            if (!this.readyToRefresh && delta_mouse.y !== 0) {
                // update the picking ray with the camera and mouse position
                this.raycaster.setFromCamera(mouse, camera);
                // calculate objects intersecting the picking ray
                const intersects = this.raycaster.intersectObjects(scene.children.filter(obj => obj.type === "Group"), true);
                for (let i = 0; i < intersects.length; i++) {
                    const uuid = intersects[i].object.uuid;
                    const prism = this.children.find(prism => prism.uuid === uuid);
                    if (prism) {
                        if (delta_mouse.y > 0) {
                            prism.step -= 1;     // = mouse.y - newMouse.y;
                        } else {
                            prism.step += 1;
                        }
                    }
                }
            }
            this.prev_mouse = cur_mouse;
        }

        const delta_mouse = this.clock.getDelta();
        const stp = this.speed * delta_mouse;


        //on mouse clicked: set new step rotation
        const cur_step = step;
        if (cur_step != this.prev_step) {
            this.children.map(prism => prism.step = cur_step);
            this.prev_step = cur_step;
            this.readyToRefresh = true;
        }
        const radians_per_step = 2 * Math.PI / 3;  //since this is a triangle shaped prism, it's always 120deg until next position

        //if mouse clicked: get prism.step and make all other prisms also flip to the same step, so that it displays an entire image again

        let totalMovement = 0;
        this.children.map((prism, index) => {
            const dz = prism.rotation.z - prism.step * radians_per_step;
            totalMovement += Math.abs(Math.min(dz * this.easing, stp));
            prism.rotation.z -= Math.min(dz * this.easing, stp);
            //1) if previous rot exists and if previous rot was in different angle segment than current: change texture
            if (this.prev_rotation_Z[index]) {
                const angleSection = this._getAngleSection(prism.rotation.z);
                const _angleSection = this._getAngleSection(this.prev_rotation_Z[index]);
                //if prism just rotated over into a new angle section: reload new texture in the back
                if (angleSection !== _angleSection) {
                    //check direction of rotation based on if dz is positive or negative. if it rotates forward, shift 3 images ahead, if not shift 3 backwards
                    let indexshift = 3
                    if (dz < 0) {
                        indexshift = -3
                        if (angleSection === "B") {
                            // console.log("C: ", `from ${prism.geometry.faces[2].materialIndex} to ${(prism.geometry.faces[2].materialIndex + 3) % materials.length}`)
                            prism.geometry.faces[2].materialIndex = (this.materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[3].materialIndex = (this.materials.length + (prism.geometry.faces[3].materialIndex + indexshift)) % this.materials.length;
                        }
                        if (angleSection === "C") {
                            // console.log("A: ", `from ${prism.geometry.faces[4].materialIndex} to ${(prism.geometry.faces[4].materialIndex + 3) % this.materials.length}`)
                            prism.geometry.faces[4].materialIndex = (this.materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[5].materialIndex = (this.materials.length + (prism.geometry.faces[5].materialIndex + indexshift)) % this.materials.length;
                        }
                        if (angleSection === "A") {
                            // console.log("B: ", `from ${prism.geometry.faces[6].materialIndex} to ${(prism.geometry.faces[6].materialIndex + 3) % this.materials.length}`)
                            prism.geometry.faces[6].materialIndex = (this.materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[7].materialIndex = (this.materials.length + (prism.geometry.faces[7].materialIndex + indexshift)) % this.materials.length;
                        }
                    } else {
                        if (angleSection === "A") {
                            // console.log("C: ", `from ${prism.geometry.faces[2].materialIndex} to ${(prism.geometry.faces[2].materialIndex + 3) % this.materials.length}`)
                            prism.geometry.faces[2].materialIndex = (this.materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[3].materialIndex = (this.materials.length + (prism.geometry.faces[3].materialIndex + indexshift)) % this.materials.length;
                        }
                        if (angleSection === "B") {
                            // console.log("A: ", `from ${prism.geometry.faces[4].materialIndex} to ${(prism.geometry.faces[4].materialIndex + 3) % this.materials.length}`)
                            prism.geometry.faces[4].materialIndex = (this.materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[5].materialIndex = (this.materials.length + (prism.geometry.faces[5].materialIndex + indexshift)) % this.materials.length;
                        }
                        if (angleSection === "C") {
                            // console.log("B: ", `from ${prism.geometry.faces[6].materialIndex} to ${(prism.geometry.faces[6].materialIndex + 3) % this.materials.length}`)
                            prism.geometry.faces[6].materialIndex = (this.materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this.materials.length;
                            prism.geometry.faces[7].materialIndex = (this.materials.length + (prism.geometry.faces[7].materialIndex + indexshift)) % this.materials.length;
                        }
                    }
                    prism.geometry.groupsNeedUpdate = true;
                }
            }
            this.prev_rotation_Z[index] = prism.rotation.z;
        })

        if (this.readyToRefresh && totalMovement < 0.01) {
            this.readyToRefresh = false;
        }
    }

    _getAngleSection(rotation) {
        const angle = rotation % (2 * Math.PI);
        // console.log(radians_to_degrees(angle));
        if (angle > 5 * Math.PI / 3 || angle <= 1 * Math.PI / 3) return "A";
        if (angle > 1 * Math.PI / 3 && angle <= 3 * Math.PI / 3) return "B";
        if (angle > 3 * Math.PI / 3 && angle <= 5 * Math.PI / 3) return "C";
    }
}