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

class Editor extends EventTarget {
  constructor(interpreter) {
    super();
    this.track = null;
    this.errors = [];
    this.fld = null;
    this.errorFld = null;
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

  init(fld, errorFld) {
    this.fld = fld;
    if (this.interpreter.demoTxt) {
      this.fld.value = this.interpreter.demoTxt;
    }
    if (this.interpreter.placeholderTxt) {
      this.fld.placeholder = this.interpreter.placeholderTxt;
    }
    this.errorFld = errorFld;

    fld.addEventListener("input", this.apply.bind(this));
    this.apply();
  }

  setEnabled(enabled) {
    this.fld.disabled = !enabled;
  }

  apply() {
    const { track, errors } = this.parse(this.fld.value);
    this.track = track;
    this.dispatchEvent(new CustomEvent("trackChange", { detail: track }));
    this.errorFld.innerText = errors.join("\n");
  }
}

export default Editor;
