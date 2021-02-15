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

export default class Track {
  constructor(...sections) {
    this.sections = sections;
  }

  pickSection(range) {
    if (!range) {
      // we're playing everything - and we expect the first section to be everything.
      return this.sections[0];
    }

    // Pick the most specific section that entirely contains range.
    // This is hard to determine in the general case but our special case is
    // that no section can start in one section and end outside of it; ergo
    // if a range is within 3 sections it is implied they are nested and the
    // shortest section is the one most deeply nested
    //
    // This is quite inefficient - we could make a tree out of the sections
    // we are passed at construction time walk it for a more efficient search...
    // but I am lazy and this is good enough for now - a 2n operation

    // Filter to sections containing the range, then reduce.
    // the accumulator holds the most specific section so far, and we update it
    // to be the current section if the current section is more specific (by
    // virtue of containing range AND being contained by the accumulated section)
    return this.sections
      .filter((sec) => sec.range.contains(range))
      .reduce(
        (accum, cur) => (accum.range.contains(cur.range) ? cur : accum),
        this.sections[0]
      );
  }
}
