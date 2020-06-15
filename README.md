threevision
========

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![Dependencies][dependencies-img]][dependencies-url]

An interactive trivision display for [three.js]("https://threejs.org").

<b>[Demo](https://foxinsox.github.io/threevision/example/)</b>

Based on traditional [trivision billboards](https://en.wikipedia.org/wiki/Trivision), but this version allows for more than three different images to be displayed.
For an example integration in three.js, check out the [demo sourcecode](./example/index.html) from the examples directory.

![trivision-image](https://upload.wikimedia.org/wikipedia/commons/2/2f/Trivision_advertising_illustration.png)


## Quick start

```
import Threevision from 'threevision';
```
or
```
var Threevision = require('threevision');
```
or even
```
<script src="https://unpkg.com/threevision"></script>
```
then
```
//prepare some materials
var materials = []

var texture = new THREE.TextureLoader().load("someImage.jpg");
materials.push(new THREE.MeshBasicMaterial({ map: texture }));

var color = new THREE.Color("hsl(100, 75%, 50%)");
materials.push(new THREE.MeshBasicMaterial({ color: color }));

//create a threevision
var threevision = new Threevision(materials,100,100);
var myScene = new THREE.Scene();
myScene.add(threevision);

//make threevision shift avery 2 seconds
let stepCounter = setInterval(() => {threevision.step = step; step += 1;}, 2000);

//in animation loop
(function animate(){
    threevision.update();
    })();

```

## API reference

### Constructor

<b>Threevision</b> ([<i>materials</i>, <i>width</i>, <i>height</i>])

### Properties

| Property         | Description                                                                                                                   | Default |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | :-----: |
| <b>materials</b> | Array with containing Three.js textures. This is what will be displayed. See the example for how to display images, videos or colors. |         |
| <b>width</b>     | The width of the threevision display.                                                                                         |  `100`  |
| <b>height</b>    | The height of the threevision display.                                                                                        |  `100`  |
| <b>step</b>      | Index of the material to be facing frontwards. <b>Changing step makes the threevision display rotate.</b>                    |    `0`    |
| <b>prismCount</b>      | The amount of prism elements of the threevision display.                                                                      |  `24`   |
| <b>vertical</b>        | The orientation of the prisms.                                                                                                | `false` |
| <b>easing</b>          | The easing of the prisms rotation.                                                                                            | `0.05`  |
| <b>speed</b>           | The speed of the prisms rotation.                                                                                             |   `4`   |
| <b>mouseOverEffect</b> | Applies a mouse-over effect that adds a wave-like animation.                                                 | `false` |
| <b>shadows</b>         | If the THREE.Scene is prepared for shadows, the threevision displays shadow behavior can be manually switched on/off.         | `true`  |

### Animation update

<b>threevision.update</b>([<i>scene</i>,<i>camera</i>,<i>mousePos</i>])`

| Property        | Description                                                                           |     Type      |
| --------------- | ------------------------------------------------------------------------------------- | :-----------: |
| <b>scene</b>    | The main scene. Required only if <b>mouseOverEffect</b> is set to `true`.             |  `THREE.Scene`  |
| <b>camera</b>   | The main camera. Required only if <b>mouseOverEffect</b> is set to `true`.            | `THREE.Camera`  |
| <b>mousePos</b> | The current mouse position. Required only if <b>mouseOverEffect</b> is set to `true`. | `THREE.Vector2` |



[npm-img]: https://img.shields.io/npm/v/threevision.svg
[npm-url]: https://npmjs.org/package/threevision
[build-size-img]: https://img.shields.io/bundlephobia/minzip/threevision.svg
[build-size-url]: https://bundlephobia.com/result?p=threevision
[dependencies-img]: https://img.shields.io/david/foxinsox/threevision.svg
[dependencies-url]: https://david-dm.org/foxinsox/threevision