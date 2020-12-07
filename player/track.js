// Electronome - A programmable metronome
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

// This should probably be extracted to an interface later to ease infinite play at a steady beat
// effectively a generator of scheduled audio buffer source nodes

import Click from "../noises/click.js";
import Beat from "./beat.js";

const clickHigh = Click(1000, 0.2, 0.03, 44100);
const clickLow = Click(440, 0.2, 0.03, 44100);

class Track extends EventTarget {
  constructor() {
    super();
    this.bpm = 140;
    this.period = 60 / this.bpm;
    this.sounds = [clickHigh, clickLow];

    this.firstBeat = new Beat(0, this.period, clickHigh, this, { count: 0 });
  }

  ready() {
    return Promise.all(this.sounds);
  }

  nextBeat(prevBeat) {
    if (!prevBeat) {
      return this.firstBeat;
    }

    const meta = prevBeat.getMeta(this, { count: 0 });

    const prevCount = meta.count;
    const { time: prevTime, duration: prevDuration } = prevBeat;

    const count = (prevCount + 1) % 4;
    const time = prevTime + prevDuration;

    const buffer = count === 0 ? clickHigh : clickLow;

    return new Beat(time, this.period, buffer, this, { count });
  }
}

export default Track;
