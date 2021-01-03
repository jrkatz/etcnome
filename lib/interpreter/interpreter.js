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

// To return to the previous tempo, use 'a tempo':

// a tempo // uncomment me
// 4/4 //this will play at 120 bpm.

// You can also repeat a set of bars, even
// with tempo change instructions.

// bpm 130 // Set original tempo
// ( // Begin listing bars to repeat
//   4/4 x 2 // two bars of 4
//   BPM 160 //speed up
//   5/4 * 3 // three bars of 5
//   a tempo //return to 130 bpm
// ) x 2 // do it all twice
// 4/4

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
