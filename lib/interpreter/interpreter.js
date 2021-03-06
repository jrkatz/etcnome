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

import Track from "../track/track.js";
import Measure from "../track/measure.js";
import BeatList from "../track/beatList.js";
import { Range, Location } from "./range.js";
import BPM from "../track/bpm.js";
import { SectionList } from "../track/section.js";
import examples from "./examples.js";
import parser from "./parser.js";

const placeholderTxt = `// Every track starts with a tempo,
// which is a number preceded by BPM
// (It's not case sensitive)

120 bpm

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

const assign = (namedSectionsStack, name, section) => {
  const scope = namedSectionsStack[namedSectionsStack.length - 1];
  scope.set(name, section);
};

const lastLineAndOffset = (text) => {
  const lines = text.split("\n");
  const line = lines.length - 1;
  return {
    line,
    col: lines[line].length - 1,
  };
};

const getRange = (text, selection) => {
  if (!selection || text === null) {
    return null;
  }

  // we don't care about the direction of the selection.
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  const preSelected = text.substring(0, start);
  const selected = text.substring(start, end);
  const offsetToFirst = lastLineAndOffset(preSelected.concat(selected[0]));
  const offsetToLast = lastLineAndOffset(preSelected.concat(selected));
  return new Range(
    new Location(offsetToFirst.line, offsetToFirst.col),
    new Location(offsetToLast.line, offsetToLast.col + 1) // plus one for exclusive end.
  );
};

const pickSection = (range, ...sections) => {
  if (!range) {
    // we're playing everything - and we expect the first section to be everything.
    return sections[0];
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
  return sections
    .filter((sec) => sec.range.contains(range))
    .reduce(
      (accum, cur) => (accum.range.contains(cur.range) ? cur : accum),
      sections[0]
    );
};

const read = (namedSectionsStack, name) => {
  // go up the stack backward, looking for the name.
  for (let i = namedSectionsStack.length - 1; i >= 0; i -= 1) {
    const scope = namedSectionsStack[i];
    if (scope.has(name)) {
      return scope.get(name);
    }
  }
  throw new Error(`Unknown section: ${name}`);
};

const push = (namedSectionsStack) => {
  namedSectionsStack.push(new Map());
};
const pop = (namedSectionsStack) => {
  namedSectionsStack.pop();
};

class Interpreter {
  constructor() {
    this.placeholderTxt = placeholderTxt;
    this.examples = examples;
  }

  readSection([section, sectionLoc], params, forceRange) {
    const { namedSectionsStack, bpm } = params;
    const range = forceRange || Range.fromParserLoc(sectionLoc);
    switch (section[0]) {
      case "Measure":
        return new Measure(params, section[1], section[2], range);
      case "BeatList":
        return new BeatList(params, section[1], range);
      case "RepeatingSection": {
        const sectionGenerator = (repeatRange) =>
          this.readSection(section[1], params, repeatRange);
        const repeats = section[2];
        const sections = new Array(repeats);
        let repeatRange = forceRange;
        for (let i = 0; i < repeats; i += 1) {
          sections.push(sectionGenerator(repeatRange));
          repeatRange = range; // subsections of the first pass through the contents of a repeated section
          // have their own ranges, but on subsequent passes are forced to use the _entire repeating
          // block's range_, ergo repeats are only played if the whole block is selected.
        }
        return new SectionList(sections, range);
      }
      case "instrs":
        return this.readInstructions(
          section,
          params,
          forceRange,
          Range.fromParserLoc(sectionLoc)
        );
      case "play":
        // can't exactly play something while also changing bpm
        bpm.assertNotAdjusting();
        return read(namedSectionsStack, section[1]).section.withRange(range);
      case "reinterpret":
        return this.readSection(
          read(namedSectionsStack, section[1]).instrs,
          params,
          range
        );
      default:
        throw new Error(`unrecognized section: ${section[0]}`);
    }
  }

  readInstructions(
    instrs,
    params = {
      bpm: new BPM(),
      swing: null,
      namedSectionsStack: [],
      namedSectionsList: [],
    },
    forceRange,
    sectionRange
  ) {
    const sectionList = [];
    let range = forceRange || sectionRange || null;
    const { bpm, namedSectionsStack, namedSectionsList } = params;
    let { swing } = params;
    push(namedSectionsStack);
    for (const instrWithLoc of instrs.slice(1)) {
      const [instr, instrLoc] = instrWithLoc;
      if (!forceRange) {
        const instrRange = Range.fromParserLoc(instrLoc);
        range = instrRange.merge(range);
      }
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
          const section = this.readSection(
            assignInstrs,
            {
              bpm,
              swing,
              namedSectionsStack,
              namedSectionsList,
            },
            forceRange
          );
          namedSectionsList.push(section);
          assign(namedSectionsStack, name, { section, instrs: assignInstrs });
          break;
        }
        // must be a section
        default:
          sectionList.push(
            this.readSection(
              instr,
              { bpm, swing, namedSectionsStack, namedSectionsList },
              forceRange
            )
          );
      }
    }
    pop(namedSectionsStack);
    return new SectionList(sectionList, range);
  }

  interpret(text, selection) {
    const ast = parser.parse(text);
    const range = getRange(text, selection);
    // we are gauranteed the parser produces
    // ["instr", instruction1, ...instructionN]
    const namedSectionsList = [];
    const params = {
      bpm: new BPM(),
      swing: null,
      namedSectionsStack: [],
      namedSectionsList,
    };
    const defaultSection = this.readInstructions(ast, params);
    const section = pickSection(range, defaultSection, ...namedSectionsList);
    return new Track(section, range);
  }
}

export default Interpreter;
