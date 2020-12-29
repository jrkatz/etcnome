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

import Click from "./click.js";

export default class Ensemble {
  constructor() {
    this.clicks = new Map();
  }

  getSound(soundSpec, sampleRate) {
    const { tone, vol, instr } = soundSpec;
    const key = `${tone}|${vol}|${instr}|${sampleRate}`;
    let click = this.clicks.get(key);
    if (!click) {
      const pitch = 2000 / 2 ** tone;
      click = Click(pitch, 0.0001, 0.04, sampleRate);
      this.clicks.set(key, click);
    }
    return click;
  }
}
