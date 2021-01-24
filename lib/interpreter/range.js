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

// Represents a single locaiton in the source program.
export class Location {
  constructor(line, col) {
    this.line = line;
    this.col = col;
  }

  before(other) {
    return (
      this.line < other.line ||
      (this.line === other.line && this.col <= other.col)
    );
  }

  after(other) {
    return (
      this.line > other.line ||
      (this.line === other.line && this.col >= other.col)
    );
  }
}

// Represents a range in the source program.
// End locations are exclusive.
export class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  static fromParserLoc(loc) {
    const result = new Range(
      new Location(loc.first_line, loc.first_column),
      new Location(loc.last_line, loc.last_column)
    );
    return result;
  }

  contains(other) {
    return this.start.before(other.start) && this.end.after(other.end);
  }

  merge(other) {
    return !other
      ? this
      : new Range(
          this.start.before(other.start) ? this.start : other.start,
          this.end.after(other.end) ? this.end : other.end
        );
  }
}
