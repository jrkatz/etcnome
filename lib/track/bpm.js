// Etcnome - A programmable metronome
// Copyright (C) 2020  Jacob Katz
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import AdjustBpm from "./adjustBpm.js";

const validateBpm = (bpm) => {
  if (!bpm.vals[bpm.vals.length - 1] > 0) {
    const err = Error("BPM must be a positive number");
    console.error(err);
    throw err;
  }
};

export default class BPM {
  constructor() {
    this.vals = [];
    this.adjustment = null;
  }

  currentlyAdjusting() {
    return this.adjustment?.incomplete();
  }

  assertNotAdjusting() {
    if (this.adjustment) {
      if (this.adjustment.incomplete()) {
        throw new Error("Incomplete this change");
      }
      this.vals.push(this.adjustment.targetBpm);
      this.adjustment = null;
    }
  }

  set(val) {
    this.assertNotAdjusting(this);
    this.vals.push(val);
    validateBpm(this);
  }

  setAdjustment(targetBpm, numBeats, delay) {
    this.assertNotAdjusting(this);
    this.adjustment = new AdjustBpm(this.get(), targetBpm, numBeats, delay);
  }

  adjust(duration) {
    return this.adjustment?.adjust(duration) || duration;
  }

  get() {
    if (this.adjustment?.complete()) {
      this.set(this.adjustment.targetBpm);
      this.adjustment = null;
    }
    validateBpm(this);
    return this.vals[this.vals.length - 1];
  }

  aTempo() {
    this.assertNotAdjusting(this);
    this.vals.pop();
    return this.get();
  }
}
