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

const validateBpm = (bpm) => {
  if (!bpm.vals[bpm.vals.length - 1] > 0) {
    throw new Error("BPM must be a positive number");
  }
};

export default class BPM {
  constructor() {
    this.vals = [];
  }

  set(val) {
    this.vals.push(val);
    validateBpm(this);
  }

  get() {
    validateBpm(this);
    return this.vals[this.vals.length - 1];
  }

  aTempo() {
    this.vals.pop();
    return this.get();
  }
}
