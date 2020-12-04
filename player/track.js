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

// eslint-disable-next-line import/extensions
import Click from "../noises/click.js";

const clickHigh = Click(1000, 0.2, 0.03, 44100);
const clickLow = Click(440, 0.2, 0.03, 44100);

class Track extends EventTarget {
  constructor() {
    super();
    this.bpm = 140;
    this.period = 60 / this.bpm;
    this.sounds = [clickHigh, clickLow];

    this.firstBeat = () => ({
      time: 0,
      buffer: clickHigh,
      meta: {
        count: 0,
      },
    });
  }

  ready() {
    return Promise.all(this.sounds);
  }

  nextBeat(prevBeat) {
    if (!prevBeat) {
      return this.firstBeat();
    }

    const prevCount = prevBeat.meta.count;
    const { time: prevTime } = prevBeat;

    const count = (prevCount + 1) % 4;
    const time = prevTime + this.period;

    const buffer = count === 0 ? clickHigh : clickLow;

    return {
      time,
      buffer,
      meta: { count },
    };
  }
}

export default Track;
