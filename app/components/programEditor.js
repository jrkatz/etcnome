// Etcnome - A codemable metronome
// Copyright (C) 2021  Jacob Katz
//
// This code is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This code is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this code.  If not, see <https://www.gnu.org/licenses/>.

// A self-contained code editor

import "./labeledSelect.js";

const enforceMaxErrorSize = (editor) => {
  const { textarea, exampleSelector, errorDiv } = editor;
  const width = Math.max(textarea.offsetWidth, exampleSelector.offsetWidth);
  errorDiv.style.maxWidth = `${width}px`;
};

const parse = (editor) => {
  const { code, selection } = editor;
  if (!code) {
    return {
      errors: [],
    };
  }

  let program = null;
  try {
    program = editor.interpreter.interpret(code, selection);
    return { program };
  } catch (e) {
    return {
      errors: [`${e.name}: ${e.message}`],
    };
  }
};

const apply = (editor) => {
  const { program, errors } = parse(editor);
  editor.errors = errors;
  if (program !== editor.program) {
    editor.program = program;
    editor.dispatchEvent(
      new CustomEvent("programChange", {
        detail: program,
      })
    );
  }
};

const debouncedApply = (editor) => {
  if (editor.timeout) {
    clearTimeout(editor.timeout);
  }
  editor.timeout = setTimeout(() => apply(editor), 200);
};

const handleSelect = (editor) => {
  const selection = {
    start: editor.textarea.selectionStart,
    end: editor.textarea.selectionEnd,
  };
  const empty = selection.start === selection.end;
  const hasExisting = !!editor.selection;
  const current =
    (empty && !hasExisting) ||
    (selection.start === editor.selection?.start &&
      selection.end === editor.selection?.end);

  if (current) {
    return;
  }

  if (!editor.readOnly) {
    if (empty) {
      if (hasExisting) {
        editor.selection = null;
        debouncedApply(editor);
      }
    } else {
      editor.selection = selection;
      debouncedApply(editor);
    }
  } else {
    editor.textarea.setSelectionRange(
      editor.selection?.start || 0,
      editor.selection?.end || 0
    );
  }
};

const ERRORS = new WeakMap();
const INTERPRETER = new WeakMap();
const READONLY = new WeakMap();

class ProgramEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.textarea = document.createElement("textarea");
    if (this.getAttribute("rows")) {
      this.rows = this.getAttribute("rows");
    }
    if (this.getAttribute("cols")) {
      this.cols = this.getAttribute("cols");
    }

    this.textarea.wrap = "off";

    this.exampleSelector = document.createElement("labeled-select");
    this.exampleSelector.setAttribute("label", "Load example");
    this.errorDiv = document.createElement("div");

    this.shadowRoot.append(this.exampleSelector, this.textarea, this.errorDiv);
    this.shadowRoot.appendChild(this.textarea);
    this.shadowRoot.append(this.exampleSelector);
    this.shadowRoot.append(this.errorDiv);

    this.exampleSelector.addEventListener("input", (event) => {
      const val = event?.target?.value;
      const code = this.interpreter?.examples[val];
      if (code) {
        this.code = code;
      }
    });

    // Chrome (at least) adds a margin when a resizable element shrinks to be smaller
    // than its container. It doesn't remove it as the element expands. This sorts
    // that out for us. Turns out the margin isn't exactly needed anyhow.
    const areaResizeObserver = new ResizeObserver(() => {
      this.textarea.style.margin = 0;
      enforceMaxErrorSize(this);
    });
    areaResizeObserver.observe(this.textarea);
    this.textarea.addEventListener("input", () => {
      this.exampleSelector.value = "";
      debouncedApply(this);
    });
    this.textarea.addEventListener("blur", () => {
      if (this.selection) {
        // steal focus back to keep the selection visible
        // and to keep it from changing.
        this.textarea.focus();
      }
    });

    document.addEventListener("selectionchange", () => handleSelect(this));

    const style = document.createElement("style");
    style.innerText = `
    :host { display: block; }
    textarea { display: block; }
    `;
    this.shadowRoot.appendChild(style);
  }

  get cols() {
    return this.textarea.cols;
  }

  set cols(cols) {
    this.textarea.cols = cols;
  }

  get rows() {
    return this.textarea.rows;
  }

  set rows(rows) {
    this.textarea.rows = rows;
  }

  get code() {
    return this.textarea.value;
  }

  set code(code) {
    this.textarea.value = code;
    apply(this);
  }

  get errors() {
    return ERRORS.get(this);
  }

  set errors(errors) {
    const errorsCopy = errors ? [...errors] : [];
    ERRORS.set(this, errorsCopy);

    enforceMaxErrorSize(this);
    this.errorDiv.innerText = errorsCopy?.join("\n") || "";
  }

  coalesceDisabled() {
    // decide from a combination of other props if we wish
    // to be disabled.
    const disabled = this.readOnly || !this.interpreter;

    this.textarea.readOnly = disabled;
    this.exampleSelector.disabled = disabled;
  }

  set readOnly(readOnly) {
    READONLY.set(this, !!readOnly);
    this.coalesceDisabled();
  }

  get readOnly() {
    return READONLY.get(this);
  }

  set interpreter(interpreter) {
    INTERPRETER.set(this, interpreter);

    this.textarea.placeholder = interpreter?.placeholderTxt || "";
    this.exampleSelector.options = [
      "",
      ...Object.keys(interpreter?.examples || {}),
    ];
    if (interpreter.demoTxt && !this.textarea.value) {
      this.textarea.value = interpreter.demoTxt;
    }
    this.coalesceDisabled();
    apply(this);
  }

  get interpreter() {
    return INTERPRETER.get(this);
  }
}

window.customElements.define("program-editor", ProgramEditor);
export default ProgramEditor;
