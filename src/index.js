/* eslint-disable no-underscore-dangle */
/* eslint-disable linebreak-style */
import {
  TextureLoader,
  MeshBasicMaterial,
  Vector3,
  Group,
  Clock,
  Raycaster,
} from 'three';
import Prism from './prism';

const three = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    TextureLoader,
    MeshBasicMaterial,
    Vector3,
    Group,
    Clock,
    Raycaster,
  };


export default class extends three.Group {
  constructor(content, width, height, vertical = false, easing = 0.05, prismCount = 24, speed = 4, shadows = true, mouseOver = false) {
    super();
    // init class fields

    // array containing image paths/urls or THREE.Color objects.
    // this array can contain different types!
    this._content = content;
    this._width = width;
    this._height = height;
    this._easing = easing;
    this._prismCount = prismCount;
    this._speed = speed;
    this._shadows = shadows;
    this._vertical = vertical;
    this._mouseOver = mouseOver;
    this._RADIANS_PER_STEP = 2 * (Math.PI / 3); // since this is a triangle shaped prism, it's always 120deg until next position

    if (content) this._init();
  }

  // Getters & Setters
  set content(content) { this._content = content; }

  get content() { return this._content; }

  set width(width) { this._width = width; this._init(); }

  get width() { return this._width; }

  set height(height) { this._height = height; this._init(); }

  get height() { return this._height; }

  set easing(easing) { this._easing = easing; }

  get easing() { return this._easing; }

  set prismCount(prismCount) { this._prismCount = prismCount; this._init(); }

  get prismCount() { return this._prismCount; }

  set speed(speed) { this._speed = speed; }

  get speed() { return this._speed; }

  set shadows(shadows) { this._shadows = shadows; }

  get shadows() { return this._shadows; }

  set vertical(vertical) { this._vertical = vertical; this._init(); }

  get vertical() { return this._vertical; }

  set mouseOver(mouseOver) { this._mouseOver = mouseOver; }

  get mouseOver() { return this._mouseOver; }

  _init() {
    // if re-initialization: remove old threevision from scene before creating a new one
    if (this.children) {
      this.children = [];
    }

    // prepare mesh materials
    this.materials = [];
    this.content.forEach((el) => {
      if (typeof (el) === 'string') {
        const texture = new three.TextureLoader().load(el);
        this.materials.push(new three.MeshBasicMaterial({ map: texture }));
      }
      if (typeof (el) === 'object') {
        this.materials.push(new three.MeshBasicMaterial({ color: el }));
      }
    });

    let prismWidth = this.width * 0.5;
    let prismHeight = (this.height * 0.5) / this.prismCount;
    if (this.vertical) {
      prismWidth = this.height * 0.5;
      prismHeight = (this.width * 0.5) / this.prismCount;
    }

    for (let index = 0; index < this.prismCount; index += 1) {
      const prism = new Prism(index, this.prismCount, this.materials, prismWidth, prismHeight, this.shadows, this.vertical);
      // arrange position for threevision structure
      prism.rotation.y += Math.PI / 2;
      prism.position.y -= ((this.prismCount / 2) * prismHeight) - prismHeight / 2;
      prism.position.y += index * prismHeight;
      this.add(prism);
    }
    if (this.vertical) {
      this.rotation.z += Math.PI / 2;
    }
    this.readyToRefresh = false;

    // array that contains all prism rotationsZ from previous animation frame
    this.prev_rotation = [];
    this.clock = new three.Clock();
    this.previousStep = 0;
    this.prev_mouse = new three.Vector3(0, 0, 0);
    this.raycaster = new three.Raycaster();
  }

  // animation updates
  update(step, mouse, scene, camera) {
    if (mouse && scene && camera && this.mouseOver) {
      const currentMousePos = new three.Vector3(mouse.x, mouse.y, mouse.z);
      const deltaMousePos = new three.Vector3().subVectors(this.prev_mouse, currentMousePos);

      let delta;
      if (this.vertical) delta = deltaMousePos.x;
      else delta = deltaMousePos.y;
      if (!this.readyToRefresh && delta !== 0) {
        // update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(mouse, camera);
        // calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(scene.children.filter((obj) => obj.type === 'Group'), true);
        for (let i = 0; i < intersects.length; i += 1) {
          const { uuid } = intersects[i].object;
          const prism = this.children.find((obj) => obj.uuid === uuid);
          if (prism) {
            prism.step += delta * 10;
          }
        }
      }
      this.prev_mouse = currentMousePos;
    }

    const deltaMousePos = this.clock.getDelta();
    const stp = this.speed * deltaMousePos;


    // on mouse clicked: set new step rotation
    const currentStep = step;
    if (currentStep !== this.previousStep) {
      this.children.map((p) => {
        const prism = p;
        prism.step = currentStep;
        return prism;
      });
      this.previousStep = currentStep;
      this.readyToRefresh = true;
    }

    // if mouse clicked: get prism.step and make all other prisms also flip to the same step, so that it displays an entire image again
    let totalMovement = 0;
    this.children.map((p, index) => {
      const prism = p;
      const dz = prism.rotation.z - Math.round(prism.step) * this._RADIANS_PER_STEP;
      totalMovement += Math.abs(Math.min(dz * this.easing, stp));
      prism.rotation.z -= Math.min(dz * this.easing, stp);


      // 1) if previous rot exists and if previous rot was in different angle segment than current: change texture
      if (this.prev_rotation[index]) {
        const angleSection = this.constructor._getAngleSection(prism.rotation.z);
        const _angleSection = this.constructor._getAngleSection(this.prev_rotation[index]);

        // if prism just rotated over into a new angle section: reload new texture in the back
        if (angleSection !== _angleSection) {
          // check direction of rotation based on if dz is positive or negative. if it rotates forward, shift 3 images ahead, if not shift 3 backwards
          let indexshift = 3;
          if (dz > 0) {
            indexshift = -3;
            if (angleSection === 'B') {
              console.log('B1: 2,3', `from ${prism.geometry.faces[2].materialIndex} to ${(this.materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this.materials.length}`);
              prism.geometry.faces[2].materialIndex = (this.materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[3].materialIndex = (this.materials.length + (prism.geometry.faces[3].materialIndex + indexshift)) % this.materials.length;
            }
            if (angleSection === 'C') {
              console.log('C1: 4,5 ', `from ${prism.geometry.faces[4].materialIndex} to ${(this.materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this.materials.length}`);
              prism.geometry.faces[4].materialIndex = (this.materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[5].materialIndex = (this.materials.length + (prism.geometry.faces[5].materialIndex + indexshift)) % this.materials.length;
            }
            if (angleSection === 'A') {
              console.log('A1: 6,7 ', `from ${prism.geometry.faces[6].materialIndex} to ${(this.materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this.materials.length}`);
              prism.geometry.faces[6].materialIndex = (this.materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[7].materialIndex = (this.materials.length + (prism.geometry.faces[7].materialIndex + indexshift)) % this.materials.length;
            }
          } else {
            if (angleSection === 'A') {
              console.log('A2: 2,3 ', `from ${prism.geometry.faces[2].materialIndex} to ${(prism.geometry.faces[2].materialIndex + 3) % this.materials.length}`);
              prism.geometry.faces[2].materialIndex = (this.materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[3].materialIndex = (this.materials.length + (prism.geometry.faces[3].materialIndex + indexshift)) % this.materials.length;
            }
            if (angleSection === 'B') {
              console.log('B2: 4,5 ', `from ${prism.geometry.faces[4].materialIndex} to ${(prism.geometry.faces[4].materialIndex + 3) % this.materials.length}`);
              prism.geometry.faces[4].materialIndex = (this.materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[5].materialIndex = (this.materials.length + (prism.geometry.faces[5].materialIndex + indexshift)) % this.materials.length;
            }
            if (angleSection === 'C') {
              console.log('C2: 6,7 ', `from ${prism.geometry.faces[6].materialIndex} to ${(prism.geometry.faces[6].materialIndex + 3) % this.materials.length}`);
              prism.geometry.faces[6].materialIndex = (this.materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this.materials.length;
              prism.geometry.faces[7].materialIndex = (this.materials.length + (prism.geometry.faces[7].materialIndex + indexshift)) % this.materials.length;
            }
          }
          prism.geometry.groupsNeedUpdate = true;
        }
      }
      this.prev_rotation[index] = prism.rotation.z;
      return prism;
    });

    if (this.readyToRefresh && totalMovement < 0.01) {
      this.readyToRefresh = false;
    }
  }

  static _getAngleSection(rotation) {
    const angle = rotation % (2 * Math.PI);
    if (angle > 5 * (Math.PI / 3) || angle <= 1 * (Math.PI / 3)) return 'A';
    if (angle > 1 * (Math.PI / 3) && angle <= 3 * (Math.PI / 3)) return 'B';
    return 'C';
  }
}
