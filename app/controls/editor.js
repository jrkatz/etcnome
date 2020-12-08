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

class Editor extends EventTarget {
  constructor(interpreter) {
    super();
    this.value = null;
    this.errors = [];
    this.fld = null;
    this.errorFld = null;
    this.btn = null;
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

  init(fld, errorFld, btn) {
    this.fld = fld;
    this.btn = btn;
    this.errorFld = errorFld;
    this.value = fld.value;

    fld.addEventListener("input", () => this.updateState());
    btn.addEventListener("click", () => this.apply());
    this.apply();
  }

  apply() {
    const { track, errors } = this.parse(this.fld.value);
    if (errors.length === 0) {
      this.value = this.fld.value;
      this.dispatchEvent(new CustomEvent("trackChange", { detail: track }));
    }
    this.renderState(errors);
  }

  updateState() {
    const { errors } = this.parse(this.fld.value);
    this.renderState(errors);
  }

  renderState(errors) {
    this.errors = errors;
    this.btn.disabled = this.value === this.fld.value || this.errors.length > 0;
    this.errorFld.innerText = this.errors.join("\n");
  }
}

export default Editor;
