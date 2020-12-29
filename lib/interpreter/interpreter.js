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
import { SectionList, RepeatingSection } from "../track/section.js";

const placeholderTxt = `bpm 120
4/4
// Try this`;

const demoTxt = `// Every track starts with a tempo,
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

// Lines starting with // are ignored as
// comments.
// To play another bar, perhaps with a
// different meter, after the first,
// unignore - or 'uncomment' the next line:

// 5/4 // Delete the first '//' in this line.

// Press 'play' again and hear the difference!

// Now let's do a third bar, at a different
// pace.

// bpm 140.5 // Uncomment me
// 6/4 // Uncomment me too

// To repeat a bar more than once, try
// multiplying with 'x' or '*':

// 2/4 x 3 // Uncomment me

// You can also repeat a set of bars, even
// with tempo change instructions. At the end
// the original tempo will be restored:

// bpm 130 // Set original tempo
// ( // Begin listing bars to repeat
//   4/4 x 2 // two bars of 4
//   BPM 160 //speed up
//   5/4 * 3 // three bars of 5
// ) x 2 // do it all twice
// 4/4 // this bar of 4 will play at 130bpm

// Additionally, this metronome is capable of
// playing at extreme tempos, which is not
// useful in most cases. However, it allows
// you to have a little fun. For example, if
// you need to tune to an A, just do the
// math: 440beats/second * 60 seconds/minute
// becomes 26400 beats/minute. That sounds
// familiar.... Try this:

// bpm 26400
// 1/4 * 100

// Note the tone that comes out is not a 440hz
// A (it is an octave higher, see if you can
// figure out why) - but it is _an_ A.
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

    this.demoTxt = demoTxt;
    this.placeholderTxt = placeholderTxt;
  }

  readSection(section, params) {
    const { namedSections } = params;
    switch (section[0]) {
      case "Measure":
        return new Measure(params, section[1], section[2]);
      case "BeatList":
        return new BeatList(params, section[1]);
      case "RepeatingSection":
        return new RepeatingSection(
          this.readSection(section[1], params),
          section[2]
        );
      case "instrs":
        return this.readInstructions(section, params);
      case "play":
        return read(namedSections, section[1]).section;
      case "reinterpret":
        return this.readSection(read(namedSections, section[1]).instrs, params);
      default:
        throw new Error(`unrecognized section: ${section[0]}`);
    }
  }

  readInstructions(
    instrs,
    params = { bpm: null, swing: null, namedSections: [] }
  ) {
    const sectionList = [];
    const { namedSections } = params;
    let { bpm, swing } = params;
    push(namedSections);
    for (const instr of instrs.slice(1)) {
      switch (instr[0]) {
        case "bpm": {
          const [, tgt] = instr;
          const [type, val] = tgt;
          if (type === "exact") {
            bpm = val;
          } else if (type === "rel") {
            bpm *= val;
          } else {
            throw new Error(`unrecognized bpm type: ${type}`);
          }
          if (!bpm > 0) {
            throw new Error("bpm must be a positive number");
          }
          break;
        }
        case "swing": {
          [, swing] = instr;
          break;
        }
        case "assign": {
          const [, name, assignInstrs] = instr;
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
