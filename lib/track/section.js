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

export class Section {
  constructor(range) {
    this.range = range;
  }

  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  nextBeat(prevBeat) {
    return null;
  }

  withRange(range) {
    const copyWithRange = { ...this, range };
    Object.setPrototypeOf(copyWithRange, Object.getPrototypeOf(this));
    return copyWithRange;
  }
}

export class SectionList extends Section {
  constructor(sections, range) {
    super(range);
    this.sections = sections || [];
  }

  withRange(range) {
    return new SectionList(
      this.sections.map((section) => section.withRange(range)),
      range
    );
  }

  nextBeat(prev) {
    let prevBeat = (prev?.hasMeta(this) && prev) || null;

    let sectionIdx = prevBeat?.getMeta(this) || 0;
    if (sectionIdx > this.sections.length) {
      return null;
    }
    let section = this.sections[sectionIdx];
    let nextBeat = section?.nextBeat(prevBeat);
    while (!nextBeat && sectionIdx < this.sections.length - 1) {
      sectionIdx += 1;
      prevBeat = null;
      section = this.sections[sectionIdx];
      nextBeat = section?.nextBeat(prevBeat?.hasMeta(this) && prevBeat);
    }

    if (nextBeat) {
      nextBeat.setMeta(this, sectionIdx);
    }
    return nextBeat;
  }
}
