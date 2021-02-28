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

import { State as ExporterState } from "../../lib/export/exporter.js";

const EXPORTER = new WeakMap();

const update = (controls) => {
  const { button, exporter } = controls;
  const { state: exporterState, type } = exporter || {};

  button.innerText = type ? `Export ${type}` : "Export";

  switch (exporterState) {
    case ExporterState.ready:
      button.disabled = false;
      break;
    case ExporterState.exporting:
    case ExporterState.empty:
    default:
      button.disabled = true;
  }
};

class ExportControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.button = document.createElement("button");
    this.button.addEventListener("click", () => this.exporter?.export());
    this.shadowRoot.appendChild(this.button);

    this.updateCallback = () => update(this);
    update(this);
  }

  get exporter() {
    return EXPORTER.get(this);
  }

  set exporter(exporter) {
    this.exporter?.removeEventListener("stateChange", this.updateCallback);
    EXPORTER.set(this, exporter);
    this.exporter?.addEventListener("stateChange", this.updateCallback);
    update(this);
  }
}

window.customElements.define("export-controls", ExportControls);
