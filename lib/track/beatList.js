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

// This section represents a list of arbitrary beats.

import { Section } from "./section.js";
import SoundSpec from "./soundSpec.js";
import Sound from "./sound.js";

class BeatList extends Section {
  // TODO break this up. It's a monster.
  constructor({ bpm }, beats) {
    super();
    this.beats = beats;
    this.bpm = bpm;
    // can't make a relative duration if there is no bpm to act relative to.
    if (!bpm > 0) {
      if (
        beats
          .map((beat) => beat[1][0])
          .some((durationType) => durationType === "rel")
      ) {
        // each beat is a list like [intensity, [durationType, durationVal]]
        // extract duration type here:
        throw new Error(
          "beat list requires positive BPM to use relative durations"
        );
      }
    }
  }

  nextBeat(prevBeat) {
    const prevCount = prevBeat ? prevBeat.getMeta(this, -1) : -1;
    const count = prevCount + 1;
    if (count >= this.beats.length) {
      return null;
    }
    const [intensity, durationSpec] = this.beats[count];
    const [durationType, durationVal] = durationSpec;
    const duration =
      durationType === "exact" ? durationVal : (durationVal * 60) / this.bpm;
    let tone = null;
    switch (intensity) {
      case "HIGH":
        tone = 0;
        break;
      case "MID":
        tone = 1;
        break;
      default:
        tone = 2;
        break;
    }

    const beat = new Sound(
      duration,
      new SoundSpec({ tone, vol: 1, instr: 0 }),
      this,
      count
    );
    return beat;
  }
}
export default BeatList;
