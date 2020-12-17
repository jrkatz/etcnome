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

const makeSwingLookup = (swing, count, clickDuration) => {
  // maybe I should slap this into a function-making function...
  const phrase = swing.phrase || swing.ratios.length + 1;
  if (phrase > count) {
    throw new Error("Swing phrase too long");
  }
  if (count % phrase !== 0) {
    // TODO improve error message _or_ do away with the error
    // by working out some truncation logic.
    throw new Error("Swung phrases must divide into the bar");
  }

  const swingTable = [];
  let i = 0;
  let phraseDuration = phrase * clickDuration;
  for (; i < swing.ratios.length; i += 1) {
    const swungDuration = swing.ratios[i] * clickDuration;
    swingTable.push(swungDuration);
    phraseDuration -= swungDuration;
  }
  if (phraseDuration < 0) {
    throw new Error("Too much swing, not enough beats");
  }
  const remainingClicksDuration = phraseDuration / (phrase - i);
  if (remainingClicksDuration <= 0) {
    throw new Error("Swung phrase shorter than unswung version");
  }
  for (; i < phrase; i += 1) {
    swingTable.push(remainingClicksDuration);
  }

  return (clickCount) => swingTable[clickCount % phrase];
};

class Measure extends Section {
  constructor({ bpm, swing }, count, denom = 4, subdivision = 1) {
    super([clickHigh, clickLow]);
    this.count = count;

    this.count = subdivision * count;
    this.baseBeatDuration = (60 / bpm) * (4 / denom);
    const clickDuration = this.baseBeatDuration / subdivision;

    this.getClickDuration = swing
      ? makeSwingLookup(swing, count, clickDuration)
      : () => clickDuration;

    this.firstBeat = new Beat(this.getClickDuration(0), clickHigh, this, 0);
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

    const beat = new Beat(this.getClickDuration(count), clickLow, this, count);
    return beat;
  }
}
export default Measure;
