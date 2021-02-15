// Etcnome - A programmable metronome
// Copyright (C) 2020  Jacob Katz
//
// This program is free` software: you can redistribute it and/or modify
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

const filteredNext = (beaterator) => {
  let nextBeat = beaterator.section?.nextBeat(beaterator.lastBeat) || null;
  while (
    beaterator.range &&
    nextBeat != null &&
    !beaterator.range.contains(nextBeat.range)
  ) {
    nextBeat = beaterator.section?.nextBeat(nextBeat) || null;
  }
  return nextBeat;
};

class Beaterator {
  constructor(section, range, delay = 0) {
    this.section = section;
    this.lastBeat = null;
    this.nextTime = delay;
    this.range = range;
  }

  toStart() {
    this.lastBeat = null;
  }

  hasNext() {
    return !!filteredNext(this);
  }

  next() {
    const nextBeat = filteredNext(this);
    if (nextBeat === null) {
      return null;
    }
    this.lastBeat = nextBeat;
    const { soundSpec, duration } = nextBeat;
    const time = this.nextTime;
    this.nextTime += duration;
    return { soundSpec, time };
  }
}

export default Beaterator;
