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

const clean = (text) => {
  // replace all whitespace other than newlines with plain spaces.
  // This is mostly to turn non-breaking spaces into regular spaces,
  // but also strips tabs.
  if (typeof text === "undefined") {
    return undefined;
  }
  if (text === null) {
    return null;
  }
  return text.replace(/[^\S\n\r]/g, " ");
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

    const debouncedApply = () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
      inputTimeout = setTimeout(() => this.apply(), 200);
    };
    fld.addEventListener("input", debouncedApply);
    fld.addEventListener("blur", () => {
      if (this.selection) {
        // steal focus back to keep the selection visible - and to keep it from changing.
        this.fld.focus();
      }
    });

    document.addEventListener("selectionchange", () => {
      const selection = {
        start: this.fld.selectionStart,
        end: this.fld.selectionEnd,
      };
      const empty = selection.start === selection.end;
      const hasExisting = !!this.selection;
      const current =
        (empty && !hasExisting) ||
        (selection.start === this.selection?.start &&
          selection.end === this.selection?.end);

      if (current) {
        // nothing to do.
        return;
      }

      if (this.enabled) {
        if (empty) {
          if (hasExisting) {
            this.selection = null;
            debouncedApply();
          }
        } else {
          this.selection = selection;
          debouncedApply();
        }
      } else {
        this.fld.setSelectionRange(
          this.selection?.start || 0,
          this.selection?.end || 0
        );
      }
    });
  }

  setEnabled(enabled) {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    if (this.fld) {
      this.fld.readOnly = !this.enabled;
    }
    if (this.exampleSelector) {
      this.exampleSelector.disabled = !this.enabled;
    }
  }

  getRange() {
    if (!this.selection) {
      return null;
    }
    // The interpreter knows how to turn selected text into
    // a range
    const start = Math.min(this.selection.start, this.selection.end);
    const end = Math.max(this.selection.start, this.selection.end);
    const preselected = this.fld.value.substring(0, start);
    const selected = this.fld.value.substring(start, end);
    return this.interpreter.rangeFromSelection(preselected, selected);
  }

  apply() {
    const { track, errors } = this.parse(clean(this.fld.value));
    const range = this.getRange();
    this.track = track;
    this.dispatchEvent(
      new CustomEvent("trackChange", { detail: { track, range } })
    );
    this.errorFld.innerText = errors.join("\n");
  }
}

export default Editor;
