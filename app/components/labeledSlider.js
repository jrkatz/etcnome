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

const TRANSFORM = new WeakMap();
const REVERSE_TRANSFORM = new WeakMap();
const VALUE = new WeakMap();
const DEFAULT = new WeakMap();

const validate = (slider) => {
  if (!slider.text.readOnly && !slider.text.disabled) {
    const reversedVal = slider.reverseTransform
      ? slider.reverseTransform(slider.text.value)
      : Number(slider.text.value);
    if (Number.isNaN(reversedVal)) {
      // looks like we're out of bounds. Take a guess about which way we went out of bounds
      const boundaryVal =
        slider.text.value < slider.value ? slider.min : slider.max;
      slider.text.value = slider.transform
        ? slider.transform(boundaryVal)
        : boundaryVal;
      slider.slider.value = boundaryVal;
    } else if (reversedVal < slider.min || reversedVal > slider.max) {
      const constrainedVal = Math.max(
        slider.min,
        Math.min(slider.max, reversedVal)
      );
      slider.text.value = slider.transform
        ? slider.transform(constrainedVal)
        : constrainedVal;
    }
    slider.slider.value = slider.reverseTransform
      ? slider.reverseTransform(slider.text.value)
      : slider.text.value;
  } else {
    slider.text.value = slider.transform
      ? slider.transform(slider.slider.value)
      : slider.slider.value;
  }
  VALUE.set(slider, slider.text.value);
};

class LabeledSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const form = document.createElement("form");

    const label = document.createElement("label");
    const labelText = document.createTextNode("");

    const slider = document.createElement("input");
    slider.type = "range";

    const output = document.createElement("output");

    const text = document.createElement("input");
    text.type = "number";
    text.step = "any";
    text.readOnly = this.reverseTransform === null && this.transform !== null;

    output.appendChild(text);

    const resetButton = document.createElement("button");
    resetButton.type = "button"; // by default it is a submit button otherwise
    resetButton.innerText = "reset";
    resetButton.classList.add("hidden");
    resetButton.addEventListener("click", () => {
      if (this.default !== null && typeof this.default !== "undefined") {
        this.value = this.default;
        text.dispatchEvent(
          new Event("input", {
            bubbles: true,
            cancelable: true,
            composed: true,
          })
        );
      }
    });

    this.shadowRoot.appendChild(form);
    form.appendChild(label);
    label.className = "cols";
    const col1 = document.createElement("div");
    col1.className = "col";
    label.appendChild(col1);
    const col2 = document.createElement("div");
    col2.className = "col";
    label.appendChild(col2);

    col1.appendChild(labelText);
    col1.appendChild(resetButton);
    col2.appendChild(slider);
    col2.appendChild(output);

    slider.addEventListener("input", () => {
      text.value = this.transform ? this.transform(slider.value) : slider.value;
      validate(this);
    });

    text.addEventListener("input", (e) => {
      if (text.value === "") {
        e.stopPropagation();
        return;
      }
      if (this.reverseTransform) {
        slider.value = this.reverseTransform(text.value);
      } else if (!this.transform) {
        slider.value = text.value;
      }
      validate(this);
    });

    text.addEventListener("change", (e) => {
      if (text.value === "") {
        e.stopPropagation();
        text.value = this.transform
          ? this.transform(slider.value)
          : slider.value;
        return;
      }
      validate(this);
    });

    const style = document.createElement("style");
    style.innerText = `
    :host { display: inline-block; }
    form { display: inline-block; }
    .hidden { display: none; }
    .cols { display: flex; }
    .col { display: flex; flex-direction: column; }
    `;
    this.shadowRoot.appendChild(style);

    this.labelText = labelText;
    this.slider = slider;
    this.text = text;
    this.resetButton = resetButton;
  }

  set default(val) {
    DEFAULT.set(this, val);
    const { resetButton } = this;
    if (this.default !== null && typeof this.default !== "undefined") {
      resetButton.classList.remove("hidden");
    } else if (!resetButton.classList.contains("hidden")) {
      resetButton.classList.add("hidden");
    }
  }

  get default() {
    return DEFAULT.get(this);
  }

  set disabled(disabled) {
    this.slider.disabled = disabled;
    this.text.disabled = disabled;
    this.reset.disabled = disabled;
  }

  get disabled() {
    return this.slider.disabled;
  }

  set readOnly(readOnly) {
    this.slider.readOnly = readOnly;
    this.text.readOnly =
      readOnly || (this.reverseTransform === null && this.transform !== null);
  }

  get readOnly() {
    return this.slider.readOnly;
  }

  set transform(transform) {
    TRANSFORM.set(this, transform);
    validate(this);
    this.text.readOnly =
      this.readOnly ||
      (this.reverseTransform === null && this.transform !== null);
  }

  get transform() {
    return TRANSFORM.get(this);
  }

  set reverseTransform(reverseTransform) {
    REVERSE_TRANSFORM.set(this, reverseTransform);
    validate(this);
    this.text.readOnly =
      this.readOnly ||
      (this.reverseTransform === null && this.transform !== null);
  }

  get reverseTransform() {
    return REVERSE_TRANSFORM.get(this);
  }

  set name(name) {
    this.labelText.data = name;
  }

  get name() {
    return this.labelText.data;
  }

  set min(min) {
    this.slider.min = min;
  }

  get min() {
    return this.slider.min;
  }

  set max(max) {
    this.slider.max = max;
  }

  get max() {
    return this.slider.max;
  }

  set step(step) {
    this.slider.step = step;
  }

  get step() {
    return this.slider.step;
  }

  set value(value) {
    if (this.reverseTransform) {
      this.text.value = value;
      validate(this);
    } else if (!this.transform) {
      this.slider.value = value;
      this.text.value = value;
      validate(this);
    }
  }

  get value() {
    return VALUE.get(this);
  }
}

window.customElements.define("labeled-slider", LabeledSlider);
