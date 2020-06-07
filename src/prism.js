/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
import {
  Mesh,
  TextureLoader,
  MeshBasicMaterial,
  Geometry,
  Vector3,
  Vector2,
  Face3,
  Group,
  Clock,
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
    Clock,
  };


export default class Prism extends three.Mesh {
  constructor(index, prismCount, materials, prismWidth, prismHeight, shadows, vertical) {
    super(new three.Geometry(), materials);
    this._step = 0;
    this._motion = 0;
    this.castShadow = shadows;
    this.receiveShadow = shadows;
    this._index = index;
    this._prismCount = prismCount;
    this._prismWidth = prismWidth;
    this._prismHeight = prismHeight;
    this._vertical = vertical;
    this._materials = materials;
    super.geometry = this._calculateGeometry();
    this._RADIANS_PER_STEP = 2 * (Math.PI / 3); // since each prism is based on an equilateral triangle, we need to rotate the prism 120deg until next position
  }

  get step() { return this._step; }

  set step(step) { this._step = step; }

  get motion() { return this._motion; }

  _calculateVertices() {
    // calculate equilateral triangle coordinates for two triangles (3D)
    const vertices = []; const parts = 3; const
      triangleAmount = 2;
    const triangleRadius = (this._prismHeight * Math.sqrt(3)) / 3;
    for (let j = 0; j < triangleAmount; j += 1) {
      for (let i = 0; i < parts; i += 1) {
        const a = 2 * (i / parts) * Math.PI;
        // eslint-disable-next-line max-len
        const v = new three.Vector3(Math.cos(a) * triangleRadius, Math.sin(a) * triangleRadius, (j * this._prismWidth) - (this._prismWidth / 2));
        vertices.push(v);
      }
    }
    return vertices;
  }

  static _defineFaces() {
    /**
     *         2C                   5F
     *        /\                  /\
     *       /  \1B______________/__\4E
     *    0A/_________________3D/
     */
    const faces = {};
    faces.BAC = new three.Face3(1, 0, 2);
    faces.EDF = new three.Face3(3, 4, 5);
    faces.ADC = new three.Face3(0, 3, 2);
    faces.CDF = new three.Face3(2, 3, 5);
    faces.CFB = new three.Face3(2, 5, 1);
    faces.BFE = new three.Face3(1, 5, 4);
    faces.BEA = new three.Face3(1, 4, 0);
    faces.AED = new three.Face3(0, 4, 3);
    return faces;
  }

  _defineUVMapping() {
    /**
           *   NW ------- NE
           *   |          |
           *   |          |
           *   |          |
           *   SW ------ SE
           */

    // logic behind applying entire texture to vertex.
    //  SW = new Vector2(0, 0);
    //  SE = new Vector2(0, 1);
    //  NW = new Vector2(1, 0);
    //  NE = new Vector2(1, 1);

    // in case of our trivision prism: only apply the corresponding part of texture
    const uv = {};
    if (this._vertical) {
      uv.SW = new three.Vector2(this._index / this._prismCount, 1);
      uv.SE = new three.Vector2(this._index / this._prismCount, 0);
      uv.NW = new three.Vector2((this._index + 1) / this._prismCount, 1);
      uv.NE = new three.Vector2((this._index + 1) / this._prismCount, 0);
    } else {
      uv.SW = new three.Vector2(0, this._index / this._prismCount);
      uv.SE = new three.Vector2(1, this._index / this._prismCount);
      uv.NW = new three.Vector2(0, (this._index + 1) / this._prismCount);
      uv.NE = new three.Vector2(1, (this._index + 1) / this._prismCount);
    }
    return uv;
  }

  _initGeometry(vertices, faces, uv) {
    // generate geometry
    const geometry = new three.Geometry();
    geometry.vertices = vertices;
    geometry.faces = [faces.BAC, faces.EDF, faces.ADC, faces.CDF, faces.CFB, faces.BFE, faces.BEA, faces.AED];
    geometry.computeFaceNormals();

    // apply UV mapping to faces
    // sideLeft
    geometry.faceVertexUvs[0].push([uv.SW, uv.NW, uv.SE]);
    // sideRight
    geometry.faceVertexUvs[0].push([uv.SW, uv.NW, uv.SE]);
    // front1
    geometry.faceVertexUvs[0].push([uv.SW, uv.SE, uv.NW]);
    geometry.faceVertexUvs[0].push([uv.NW, uv.SE, uv.NE]);
    // front2
    geometry.faceVertexUvs[0].push([uv.SW, uv.SE, uv.NW]);
    geometry.faceVertexUvs[0].push([uv.NW, uv.SE, uv.NE]);
    // front3
    geometry.faceVertexUvs[0].push([uv.SW, uv.SE, uv.NW]);
    geometry.faceVertexUvs[0].push([uv.NW, uv.SE, uv.NE]);

    geometry.computeVertexNormals();

    // apply modulo operation in case materials.length < 3
    geometry.faces[2].materialIndex = 0 % this._materials.length;
    geometry.faces[3].materialIndex = 0 % this._materials.length;
    geometry.faces[4].materialIndex = 1 % this._materials.length;
    geometry.faces[5].materialIndex = 1 % this._materials.length;
    geometry.faces[6].materialIndex = 2 % this._materials.length;
    geometry.faces[7].materialIndex = 2 % this._materials.length;

    return geometry;
  }

  _calculateGeometry() {
    const vertices = this._calculateVertices();
    const faces = this.constructor._defineFaces();
    const uv = this._defineUVMapping();
    const geometry = this._initGeometry(vertices, faces, uv);
    return geometry;
  }

  update(maxRotation, easing) {
    const deltaRotationZ = this.rotation.z - Math.round(this.step) * this._RADIANS_PER_STEP;
    this._motion = Math.abs(Math.min(deltaRotationZ * easing, maxRotation));
    this.rotation.z -= Math.min(deltaRotationZ * easing, maxRotation);


    // if previous rot exists and if previous rot was in different angle segment than current: change texture
    if (this._previousRotationAngle) {
      const angleSection = this.constructor._getAngleSection(this.rotation.z);
      const _angleSection = this.constructor._getAngleSection(this._previousRotationAngle);

      // if prism just rotated over into a new angle section: reload new texture in the back
      if (angleSection !== _angleSection) {
        // check direction of rotation based on if deltaRotationZ is positive or negative. if it rotates forward, shift 3 images ahead, if not shift 3 backwards
        if (deltaRotationZ < 0) {
          this._refreshOnLeftOrUpRotation(angleSection);
        } else {
          this._refreshOnRightOrDownRotation(angleSection);
        }
        this.geometry.groupsNeedUpdate = true;
      }
    }
    this._previousRotationAngle = this.rotation.z;
  }

  _refreshOnLeftOrUpRotation(angleSection) {
    const indexshift = -3;
    if (angleSection === 'B') {
      // if (index === 0) console.log('A1: 2,3', `from ${prism.geometry.faces[2].materialIndex} to ${(this._materials.length + (prism.geometry.faces[2].materialIndex + indexshift)) % this._materials.length}`);
      this.geometry.faces[2].materialIndex = (this._materials.length + (this.geometry.faces[2].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[3].materialIndex = (this._materials.length + (this.geometry.faces[3].materialIndex + indexshift)) % this._materials.length;
    }
    if (angleSection === 'C') {
      // if (index === 0) console.log('C1: 4,5 ', `from ${prism.geometry.faces[4].materialIndex} to ${(this._materials.length + (prism.geometry.faces[4].materialIndex + indexshift)) % this._materials.length}`);
      this.geometry.faces[4].materialIndex = (this._materials.length + (this.geometry.faces[4].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[5].materialIndex = (this._materials.length + (this.geometry.faces[5].materialIndex + indexshift)) % this._materials.length;
    }
    if (angleSection === 'A') {
      // if (index === 0) console.log('B1: 6,7 ', `from ${prism.geometry.faces[6].materialIndex} to ${(this._materials.length + (prism.geometry.faces[6].materialIndex + indexshift)) % this._materials.length}`);
      this.geometry.faces[6].materialIndex = (this._materials.length + (this.geometry.faces[6].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[7].materialIndex = (this._materials.length + (this.geometry.faces[7].materialIndex + indexshift)) % this._materials.length;
    }
  }

  _refreshOnRightOrDownRotation(angleSection) {
    const indexshift = 3;
    if (angleSection === 'A') {
      // if (index === 0) console.log('B2: 2,3 ', `from ${prism.geometry.faces[2].materialIndex} to ${(prism.geometry.faces[2].materialIndex + 3) % this._materials.length}`);
      this.geometry.faces[2].materialIndex = (this._materials.length + (this.geometry.faces[2].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[3].materialIndex = (this._materials.length + (this.geometry.faces[3].materialIndex + indexshift)) % this._materials.length;
    }
    if (angleSection === 'B') {
      // if (index === 0) console.log('C2: 4,5 ', `from ${prism.geometry.faces[4].materialIndex} to ${(prism.geometry.faces[4].materialIndex + 3) % this._materials.length}`);
      this.geometry.faces[4].materialIndex = (this._materials.length + (this.geometry.faces[4].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[5].materialIndex = (this._materials.length + (this.geometry.faces[5].materialIndex + indexshift)) % this._materials.length;
    }
    if (angleSection === 'C') {
      // if (index === 0) console.log('A2: 6,7 ', `from ${prism.geometry.faces[6].materialIndex} to ${(prism.geometry.faces[6].materialIndex + 3) % this._materials.length}`);
      this.geometry.faces[6].materialIndex = (this._materials.length + (this.geometry.faces[6].materialIndex + indexshift)) % this._materials.length;
      this.geometry.faces[7].materialIndex = (this._materials.length + (this.geometry.faces[7].materialIndex + indexshift)) % this._materials.length;
    }
  }

  static _getAngleSection(rotation) {
    const angle = rotation % (2 * Math.PI);
    if (angle > 5 * (Math.PI / 3) || angle <= 1 * (Math.PI / 3)) return 'A';
    if (angle > 1 * (Math.PI / 3) && angle <= 3 * (Math.PI / 3)) return 'B';
    return 'C';
  }
}
