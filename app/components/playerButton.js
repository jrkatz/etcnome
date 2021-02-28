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

class PlayerButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const wrapper = document.createElement("div");
    this.buttonEl = document.createElement("button");
    this.labelEl = document.createElement("label");

    this.buttonEl.id = "button";
    this.labelEl.for = "button";

    wrapper.appendChild(this.buttonEl);
    wrapper.appendChild(this.labelEl);
    wrapper.className = "wrapper";

    this.shadowRoot.appendChild(wrapper);
    const style = document.createElement("style");
    style.innerText = `
    :host { display: inline-block;}
    .wrapper { display: flex; flex-direction: column; align-content: center; }
    button { font-family: monospace; }
    `;

    this.shadowRoot.appendChild(style);
  }

  set label(val) {
    this.labelEl.innerText = val;
  }

  get label() {
    return this.labelEl.innerText;
  }

  set symbol(val) {
    this.buttonEl.innerText = val;
  }

  get symbol() {
    return this.buttonEl.innerText;
  }

  set disabled(val) {
    this.buttonEl.disabled = val;
  }

  get disabled() {
    return this.buttonEl.disabled;
  }
}

window.customElements.define("player-button", PlayerButton);
