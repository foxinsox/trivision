/* eslint-disable no-underscore-dangle */
/* eslint-disable linebreak-style */
import {
  TextureLoader,
  MeshBasicMaterial,
  Vector3,
  Vector2,
  Group,
  Clock,
  Raycaster,
} from 'three';
import Prism from './prism';
import WaveAnimation from './waveAnimation';

const three = typeof window !== 'undefined' && window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    TextureLoader,
    MeshBasicMaterial,
    Vector3,
    Vector2,
    Group,
    Clock,
    Raycaster,
  };


export default class extends three.Group {
  constructor(materials, width = 100, height = 100) {
    super();
    this._materials = materials;
    this._width = width;
    this._height = height;
    this._step = 0;
    this._easing = 0.05;
    this._prismCount = 12;
    this._speed = 1;
    this._shadows = true;
    this._vertical = false;
    this._mouseOverEffect = false;
    this._readyToRefresh = false;
    this._clock = new three.Clock();
    this._previousStep = 0;
    this._previousMousePos = new three.Vector2(0, 0);
    this._previousIntersectsUuid = 0;
    this._raycaster = new three.Raycaster();
    this._waveAnimations = [];
    this._previousDelta = 0;
    if (!this._materials || this._materials.length === 0) this._materials = [new three.Color(0xaaaaaa)];
    this._init();
  }

  // Getters & Setters
  set materials(materials) { this._materials = materials; this._init(); }

  get materials() { return this._materials; }

  set width(width) { this._width = width; this._init(); }

  get width() { return this._width; }

  set height(height) { this._height = height; this._init(); }

  get height() { return this._height; }

  set step(step) { this._step = step; }

  get step() { return this._step; }

  set easing(easing) { this._easing = easing; }

  get easing() { return this._easing; }

  set prismCount(prismCount) { this._prismCount = prismCount; this._init(); }

  get prismCount() { return this._prismCount; }

  set speed(speed) { this._speed = speed; }

  get speed() { return this._speed; }

  set shadows(shadows) { this._shadows = shadows; this._init(); }

  get shadows() { return this._shadows; }

  set vertical(vertical) { this._vertical = vertical; this._init(); }

  get vertical() { return this._vertical; }

  set mouseOverEffect(mouseOverEffect) { this._mouseOverEffect = mouseOverEffect; }

  get mouseOverEffect() { return this._mouseOverEffect; }

  _init() {
    // if re-initialization: remove old threevision from scene before creating a new one
    if (this.children) {
      this.children = [];
    }

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
    if (this.vertical && this.rotation.z === 0) {
      this.rotation.z -= Math.PI / 2;
    } else {
      this.rotation.z = 0;
    }
  }


  _applyMouseOverEffect(scene, camera, mousePos) {
    const currentMousePos = new three.Vector2(mousePos.x, mousePos.y);
    const deltaMousePos = new three.Vector2().subVectors(this._previousMousePos, currentMousePos);

    let delta;
    if (this.vertical) delta = deltaMousePos.x;
    else delta = deltaMousePos.y;
    if (!this._readyToRefresh && Math.abs(delta) >= 0.01) {
      // update the picking ray with the camera and mousePos position
      this._raycaster.setFromCamera(currentMousePos, camera);
      // calculate group (=trivison) objects intersecting the picking ray
      const intersects = this._raycaster.intersectObjects(scene.children.filter((obj) => obj.type === 'Group'), true);
      if (intersects.length === 1) {
        for (let i = 0; i < intersects.length; i += 1) {
          const { uuid } = intersects[i].object;
          const prism = this.children.find((obj) => obj.uuid === uuid);
          if (prism) {
            // act only if mouse/tap is on a different prism than before of if delta direction has changed
            if (this._previousIntersectsUuid !== uuid || (delta >= 0 !== this._previousDelta >= 0)) {
              const nextStep = prism.step + (delta >= 0 ? 1 : -1);
              this._waveAnimations.push(new WaveAnimation(uuid, this.children, nextStep, delta));
              // limit amount of queued wave animations in order to make movement not appear too chaotic
              if (this._waveAnimations.length > 2) this._waveAnimations.shift();
            }
            this._previousIntersectsUuid = uuid;
          }
        }
      }
      this._previousDelta = delta;
      this._previousMousePos = currentMousePos;
    }
  }

  _updateWaveAnimations() {
    // console.log("animations length", this._waveAnimations.length);
    let _currentPrism;
    for (let i = this._waveAnimations.length - 1; i >= 0; i -= 1) {
      if ((_currentPrism && this._waveAnimations[i].queueHead && this._waveAnimations[i].queueHead.uuid === _currentPrism.uuid) || this._waveAnimations[i].queueHead === undefined) {
        this._waveAnimations.splice(i, 1);
      } else {
        // console.log(`totalAnimations: ${this._waveAnimations.length} updating waveAnim ${i}`);
        _currentPrism = this._waveAnimations[i].update(this._clock.getDelta());
      }
    }
  }

  _updatePrismsStep() {
    // set new global step rotation for all prisms
    if (this._step !== this._previousStep) {
      this._waveAnimations = [];
      this.children.map((p) => {
        const prism = p;
        prism.step = this._step;
        return prism;
      });
      this._previousStep = this._step;
      this._readyToRefresh = true;
    }
  }

  _updatePrismsRotation() {
    let totalMovement = 0;
    const maxRotation = this.speed / 10; // * this._clock.getDelta();

    this.children.map((prism) => {
      totalMovement += prism.motion;
      return prism.update(maxRotation, this.easing);
    });

    if (this._readyToRefresh && totalMovement < 0.01) {
      this._readyToRefresh = false;
    }
  }

  // animation updates
  update(scene, camera, mousePos) {
    if (mousePos && scene && camera && this.mouseOverEffect) {
      this._applyMouseOverEffect(scene, camera, mousePos);
    }
    this._updateWaveAnimations();
    this._updatePrismsStep();
    this._updatePrismsRotation();
  }
}
