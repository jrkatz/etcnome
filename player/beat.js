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

class Beat {
  constructor(duration, buffer, owner, meta) {
    this.duration = duration;
    this.buffer = buffer;

    this.metaMap = new WeakMap();
    if (owner && meta) {
      this.metaMap.set(owner, meta);
    }
  }

  getMeta(owner, defaultVal) {
    const existing = this.metaMap.get(owner);
    if (existing) {
      return existing;
    }
    return defaultVal;
  }

  setMeta(owner, meta) {
    this.metaMap.set(owner, meta);
  }
}

export default Beat;
