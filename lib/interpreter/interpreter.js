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

import Measure from "../player/measure.js";
import { SectionList, RepeatingSection } from "../player/section.js";

class Interpreter {
  constructor(parser) {
    this.parser = parser;
  }

  readSection(section, bpm = null) {
    switch (section[0]) {
      case "Measure":
        return new Measure(bpm, section[1], section[2]);
      case "RepeatingSection":
        return new RepeatingSection(
          this.readSection(section[1], bpm),
          section[2]
        );
      case "instrs":
        return this.readInstructions(section, bpm);
      default:
        throw new Error(`unrecognized section: ${section[0]}`);
    }
  }

  readInstructions(instrs, initBpm = null) {
    let bpm = initBpm;
    const sectionList = [];
    for (const instr of instrs.slice(1)) {
      switch (instr[0]) {
        case "bpm": {
          [, bpm] = instr;
          break;
        }
        // if it's not a bpm, it's a section:
        default: {
          sectionList.push(this.readSection(instr, bpm));
        }
      }
    }
    return new SectionList(sectionList);
  }

  interpret(text) {
    const ast = this.parser.parse(text);
    // we are gauranteed the parser produces ["instr", instruction1, ...instructionN]
    const track = this.readInstructions(ast);
    return track;
  }
}

export default Interpreter;
