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
    this._castShadow = shadows;
    this._receiveShadow = shadows;
    this._index = index;
    this._prismCount = prismCount;
    this._prismWidth = prismWidth;
    this._prismHeight = prismHeight;
    this._shadows = shadows;
    this._vertical = vertical;
    super.geometry = this._calculateGeometry();
  }

  get step() { return this._step; }

  set step(step) { this._step = step; }

  _calculateGeometry() {
    /**
          *         2C                   5F
          *        /\                  /\
          *       /  \1B______________/__\4E
          *    0A/_________________3D/
          */

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


    const BAC = new three.Face3(1, 0, 2);
    const EDF = new three.Face3(3, 4, 5);
    const ADC = new three.Face3(0, 3, 2);
    const CDF = new three.Face3(2, 3, 5);
    const CFB = new three.Face3(2, 5, 1);
    const BFE = new three.Face3(1, 5, 4);
    const BEA = new three.Face3(1, 4, 0);
    const AED = new three.Face3(0, 4, 3);

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

    let SW; let SE; let NW; let
      NE;
    if (this._vertical) {
      SW = new three.Vector2(0, this._index / this._prismCount);
      SE = new three.Vector2(1, this._index / this._prismCount);
      NW = new three.Vector2(0, (this._index + 1) / this._prismCount);
      NE = new three.Vector2(1, (this._index + 1) / this._prismCount);
    } else {
      SW = new three.Vector2(this._index / this._prismCount, 1);
      SE = new three.Vector2(this._index / this._prismCount, 0);
      NW = new three.Vector2((this._index + 1) / this._prismCount, 1);
      NE = new three.Vector2((this._index + 1) / this._prismCount, 0);
    }
    const geometry = new three.Geometry();
    geometry.vertices = vertices;
    geometry.faces = [BAC, EDF, ADC, CDF, CFB, BFE, BEA, AED];
    geometry.computeFaceNormals();

    // sideLeft
    geometry.faceVertexUvs[0].push([SW, NW, SE]);
    // sideRight
    geometry.faceVertexUvs[0].push([SW, NW, SE]);
    // front3
    geometry.faceVertexUvs[0].push([SW, SE, NW]);
    geometry.faceVertexUvs[0].push([NW, SE, NE]);
    // front1
    geometry.faceVertexUvs[0].push([SW, SE, NW]);
    geometry.faceVertexUvs[0].push([NW, SE, NE]);
    // front2
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
