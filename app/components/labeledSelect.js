// Etcnome - A programmable metronome
// Copyright (C) 2021  Jacob Katz
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

// A component for a select dropdown with label.

const makeOpt = (value) => {
  const opt = document.createElement("option");
  opt.value = value;
  opt.text = value;
  return opt;
};

const applyLabel = (labeledSelect) => {
  const { label } = labeledSelect;
  label.innerText = labeledSelect.getAttribute("label");
  // the above will have wiped out our selector
  label.appendChild(labeledSelect.select);
};

class LabeledSelect extends HTMLElement {
  static get observedAttributes() {
    return ["label"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.label = document.createElement("label");

    this.select = document.createElement("select");
    this.select.appendChild(document.createElement("slot"));

    this.label.appendChild(this.select);
    this.shadowRoot.appendChild(this.label);
  }

  set value(value) {
    this.select.value = value;
  }

  get value() {
    return this.select.value;
  }

  set options(value) {
    while (this.select.firstChild) {
      this.select.removeChild(this.select.firstChild);
    }
    value.map(makeOpt).forEach((opt) => this.select.add(opt));
  }

  get options() {
    const result = [];
    this.select.childNodes.forEach((node) => result.push(node.value));
    return result;
  }

  set disabled(disabled) {
    this.select.disabled = disabled;
  }

  get disabled() {
    return this.select.disabled;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "label":
        applyLabel(this, newValue);
        break;
      default:
      // do nothing
    }
  }
}

window.customElements.define("labeled-select", LabeledSelect);
