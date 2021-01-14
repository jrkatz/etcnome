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

import Measure from "../track/measure.js";
import BeatList from "../track/beatList.js";
import BPM from "../track/bpm.js";
import { SectionList } from "../track/section.js";
import examples from "./examples.js";

const placeholderTxt = `// Every track starts with a tempo,
// which is a number preceded by BPM
// (It's not case sensitive)

bpm 120

// and needs something to play.
// How about a bar of 4/4

4/4

// Press the play button ("|>") to see how
// it sounds.

// That's pretty short, so check the 'Repeat'
// box above to let it go forever.
// Uncheck 'repeat' or press 'stop'("[ ]")
// to... stop.
// You can also pause with the pause ("||")
// button and press play again to resume.
`;

const assign = (namedSections, name, section) => {
  const scope = namedSections[namedSections.length - 1];
  scope.set(name, section);
};

const read = (namedSections, name) => {
  // go up the stack backward, looking for the name.
  for (let i = namedSections.length - 1; i >= 0; i -= 1) {
    const scope = namedSections[i];
    if (scope.has(name)) {
      return scope.get(name);
    }
  }
  throw new Error(`Unknown section: ${name}`);
};

const push = (namedSections) => {
  namedSections.push(new Map());
};
const pop = (namedSections) => {
  namedSections.pop();
};

class Interpreter {
  constructor(parser) {
    this.parser = parser;

    this.placeholderTxt = placeholderTxt;
    this.examples = examples;
  }

  readSection(section, params) {
    const { namedSections, bpm } = params;
    switch (section[0]) {
      case "Measure":
        return new Measure(params, section[1], section[2]);
      case "BeatList":
        return new BeatList(params, section[1]);
      case "RepeatingSection": {
        const sectionProvider = () => this.readSection(section[1], params);
        const repeats = section[2];
        const sections = new Array(repeats);
        for (let i = 0; i < repeats; i += 1) {
          sections.push(sectionProvider());
        }
        return new SectionList(sections);
      }
      case "instrs":
        return this.readInstructions(section, params);
      case "play":
        // can't exactly play something while also changing bpm
        bpm.assertNotAdjusting();
        return read(namedSections, section[1]).section;
      case "reinterpret":
        return this.readSection(read(namedSections, section[1]).instrs, params);
      default:
        throw new Error(`unrecognized section: ${section[0]}`);
    }
  }

  readInstructions(
    instrs,
    params = { bpm: new BPM(), swing: null, namedSections: [] }
  ) {
    const sectionList = [];
    const { bpm, namedSections } = params;
    let { swing } = params;
    push(namedSections);
    for (const instr of instrs.slice(1)) {
      switch (instr[0]) {
        case "bpm": {
          const [, tgt] = instr;
          const [type, val] = tgt;
          if (type === "exact") {
            bpm.set(val);
          } else if (type === "rel") {
            bpm.set(bpm.get() * val);
          } else {
            throw new Error(`unrecognized bpm type: ${type}`);
          }
          break;
        }
        case "adjust_bpm": {
          const [, tgt, numBeats, delay] = instr;
          const [type, val] = tgt;
          let targetBpm = 0;
          if (type === "exact") {
            targetBpm = val;
          } else if (type === "rel") {
            targetBpm = bpm.get() * val;
          } else {
            throw new Error(`unrecognized bpm type: ${type}`);
          }
          bpm.setAdjustment(targetBpm, numBeats, delay || 0);
          break;
        }
        case "a_tempo": {
          bpm.aTempo();
          break;
        }
        case "swing": {
          [, swing] = instr;
          break;
        }
        case "assign": {
          const [, name, assignInstrs] = instr;
          // a bpm change can't cross into an assigment
          bpm.assertNotAdjusting();
          // parse the section:
          const section = this.readSection(assignInstrs, {
            bpm,
            swing,
            namedSections,
          });
          assign(namedSections, name, { section, instrs: assignInstrs });
          break;
        }
        // must be a section
        default:
          sectionList.push(
            this.readSection(instr, { bpm, swing, namedSections })
          );
      }
    }
    pop(namedSections);
    return new SectionList(sectionList);
  }

  interpret(text) {
    const ast = this.parser.parse(text);
    // we are gauranteed the parser produces
    // ["instr", instruction1, ...instructionN]
    const track = this.readInstructions(ast);
    return track;
  }
}

export default Interpreter;
