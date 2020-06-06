import {
    Mesh,
    TextureLoader,
    MeshBasicMaterial,
    Geometry,
    Vector3,
    Vector2,
    Face3,
    Group
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
        Group
    };


class Prism extends Mesh {
    constructor(index, prismCount, materials, prismWidth, prismHeight, shadows) {
        const geometry = new Geometry();
        super(geometry, materials);
        this.targetPos = 0;
        this.castShadow = shadows;
        this.receiveShadow = shadows;
        this.geometry = this._calculateGeometry(index, prismCount, prismWidth, prismHeight);
    }
    get targetPos() { return this._targetPos; };
    set targetPos(targetPos) { this._targetPos = targetPos; };

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
    constructor(content, size, easing = 0.035, prismCount = 24, speed = 4, shadows = true) {
        super();
        //init class fields
        this._content = content;   //array containing image files or color values. this array can contain different types!
        this._size = size; //vector2D
        this._easing = easing;
        this._prismCount = prismCount;
        this._speed = speed;
        this._shadows = shadows;

        this._init();
    }

    //Getters & Setters
    set content(content) { this._content = content; this._init(); };
    get content() { return this._content; };
    set size(size) { this._size = size; this._init(); };
    get size() { return this._size; };
    set easing(easing) { this._easing = easing; };
    get easing() { return this._easing; };
    set prismCount(prismCount) { this._prismCount = prismCount; this._init(); };
    get prismCount() { return this._prismCount; };
    set speed(speed) { this._speed = speed; };
    get speed() { return this._speed; };
    set shadows(shadows) { this._shadows = shadows; };
    get shadows() { return this._shadows; };

    _init() {
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


        const prismWidth = this.size.x * 0.5;
        const prismHeight = this.size.y * 0.5 / this.prismCount;
        for (let index = 0; index < this.prismCount; index++) {
            const prism = new Prism(index, this.prismCount, this.materials, prismWidth, prismHeight, this.shadows);
            // console.log(prism);

            //arrange position for trivision structure
            prism.rotation.y += Math.PI / 2
            prism.position.y -= (this.prismCount / 2 * prismHeight) - prismHeight / 2;
            prism.position.y += index * prismHeight;
            this.add(prism);
        }
        this.readyToRefresh = false;
        //array that contains all prism rotationsZ from previous animation frame
        this.previous_rotation_Z = [];
        this.clock = new THREE.Clock();
        this._target = 0;
    }


    //animation updates
    update(sc) {
        // const newMouse = new Vector3(m.current.x, m.current.y, m.current.z);

        /*
        console.log(event);
        var posX = event.clientX;
        var posY = event.clientY;
        const newMouse = new Vector3(posX, posY, 0);
        const deltaY = newMouse.y - mouse.y;
        if (!readyToRefresh && deltaY !== 0) {
            // update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, camera);
            // calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children);
            for (let i = 0; i < intersects.length; i++) {
                const uuid = intersects[i].object.uuid;
                const prism = prisms.find(prism => prism.mesh.uuid === uuid);
                if (prism) {
                    if (deltaY > 0) {
                        prism.targetPos -= 1;     // = mouse.y - newMouse.y;
                    } else {
                        prism.targetPos += 1;
                    }
                }
            }
            mouse = newMouse;
        }*/

        const delta = this.clock.getDelta();
        const stp = this.speed * delta;


        //on mouse clicked: set new target rotation
        if (sc.current != this._target) {
            this.children.map(prism => prism.targetPos = sc.current);
            this._target = sc.current;
            this.readyToRefresh = true;
        }
        const step = 2 * Math.PI / 3;  //since this is a triangle shaped prism, it's always 120deg until next position
        const target = step * sc.current;

        //if mouse clicked: get prism.targetPos and make all other prisms also flip to the same targetPos, so that it displays an entire image again

        let totalMovement = 0;
        this.children.map((prism, index) => {
            const dz = prism.rotation.z - prism.targetPos * step;
            totalMovement += Math.abs(Math.min(dz * this.easing, stp));
            prism.rotation.z -= Math.min(dz * this.easing, stp);
            //1) if previous rot exists and if previous rot was in different angle segment than current: change texture
            if (this.previous_rotation_Z[index]) {
                const angleSection = this._getAngleSection(prism.rotation.z);
                const _angleSection = this._getAngleSection(this.previous_rotation_Z[index]);
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
            this.previous_rotation_Z[index] = prism.rotation.z;
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

    // clone() {
    //     return new this.constructor(this.text, this.textHeight, this.color).copy(this);
    // }

    // copy(source) {
    //     return this;
    // }
}