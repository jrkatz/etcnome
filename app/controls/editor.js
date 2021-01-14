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

const makeOpt = (value) => {
  const opt = document.createElement("option");
  opt.value = value;
  opt.text = value;
  return opt;
};
class Editor extends EventTarget {
  constructor(interpreter) {
    super();
    this.track = null;
    this.errors = [];
    this.locks = 0;
    this.fld = null;
    this.errorFld = null;
    this.exampleSelector = null;
    this.interpreter = interpreter;
  }

  parse(text) {
    if (!text) {
      return {
        errors: [],
        track: null,
      };
    }
    let track = null;
    try {
      track = this.interpreter.interpret(text);
      return { track, errors: [] };
    } catch (e) {
      return {
        errors: [`${e.name}: ${e.message}`],
        track,
      };
    }
  }

  init(fld, errorFld, exampleSelector) {
    this.fld = fld;
    this.exampleSelector = exampleSelector;
    for (let i = 0; i < exampleSelector.length; i += 1) {
      exampleSelector.remove(0); // remove the first element
    }
    Object.keys(this?.interpreter?.examples || {})
      .map(makeOpt)
      .forEach((name) => exampleSelector.add(name));
    exampleSelector.addEventListener("change", (event) => {
      const program = this?.interpreter?.examples[event.target.value];
      if (program) {
        this.fld.value = program;
        this.apply();
      }
    });

    if (this.interpreter.demoTxt) {
      this.fld.value = this.interpreter.demoTxt;
    }
    if (this.interpreter.placeholderTxt) {
      this.fld.placeholder = this.interpreter.placeholderTxt;
    }
    this.errorFld = errorFld;

    let inputTimeout = null;
    fld.addEventListener("input", () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
      inputTimeout = setTimeout(() => this.apply(), 200);
    });
    this.apply();
    if (this.fld) {
      this.fld.disabled = !this.enabled;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.fld) {
      this.fld.disabled = !this.enabled;
    }
    if (this.exampleSelector) {
      this.exampleSelector.disabled = !this.enabled;
    }
  }

  apply() {
    const { track, errors } = this.parse(this.fld.value);
    this.track = track;
    this.dispatchEvent(new CustomEvent("trackChange", { detail: track }));
    this.errorFld.innerText = errors.join("\n");
  }
}

export default Editor;
