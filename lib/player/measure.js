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

// A Section provides a nextBeat function to derive the next beat
// from the previous beat. Sections must be extended to provide
// anything useful.
// Sections can be composed using the RepeatingSection or SectionList
// classes, which also extend Section.

import { Section } from "./section.js";
import { clickHigh, clickLow } from "../noises/click.js";
import Beat from "./beat.js";

class Measure extends Section {
  constructor(bpm, count, denom = 4) {
    super([clickHigh, clickLow]);
    this.beatDuration = (60 / bpm) * (4 / denom);
    this.count = count;

    this.firstBeat = new Beat(this.beatDuration, clickHigh, this, 0);
  }

  nextBeat(prevBeat) {
    if (!prevBeat) {
      return this.firstBeat;
    }

    const count = prevBeat.getMeta(this, 0) + 1;
    // TODO better names, please.
    if (count >= this.count) {
      return null;
    }

    const beat = new Beat(this.beatDuration, clickLow, this, count);
    return beat;
  }
}
export default Measure;
