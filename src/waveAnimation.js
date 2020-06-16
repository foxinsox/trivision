/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
export default class WaveAnimation {
  constructor(initPrismId, prisms, step, speed) {
    this._prisms = this._initQueue(prisms, initPrismId, speed);
    this._step = step;
    this._speed = speed;
    this._time = 0;
  }

  get queueHead() {
    return this._prisms[0];
  }


  _initQueue(prisms, initPrismId, speed) {
    const queue = [];
    const isIndex = (prism) => prism.uuid === initPrismId;
    const index = prisms.findIndex(isIndex);
    if (speed <= 0) {
      for (let i = index; i < prisms.length; i += 1)queue.push(prisms[i]);
      for (let i = 0; i < index; i += 1)queue.push(prisms[i]);
    } else {
      for (let i = index; i >= 0; i -= 1)queue.push(prisms[i]);
      for (let i = prisms.length - 1; i > index; i -= 1)queue.push(prisms[i]);
    }
    return queue;
  }


  update(clockDelta) {
    this._time += clockDelta * Math.abs(this._speed * 500);
    let currentPrism = this.queueHead;
    if (this._time >= 0.5) {
      // apply some easing to wave, relative to prism amount
      this._speed *= 1 - 1 / this._prisms.length / 1.4;

      currentPrism = this._prisms.shift();
      if (currentPrism) currentPrism.step = this._step;
      this._time = 0;
    }
    return currentPrism;
  }
}
