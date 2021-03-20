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

import Interpreter from "../../lib/interpreter/interpreter.js";
import Player, { State as PlayerState } from "../../lib/player/player.js";
import Exporter from "../../lib/export/exporter.js";

import "./programEditor.js";
import "./playerControls.js";
import "./exportControls.js";

class EtcnomeHome extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const player = new Player();
    const playerControls = document.createElement("player-controls");
    playerControls.player = player;
    playerControls.id = "controls";

    const exporter = new Exporter();
    const exportControls = document.createElement("export-controls");
    exportControls.exporter = exporter;

    const programEditor = document.createElement("program-editor");
    programEditor.rows = 30;
    programEditor.cols = 45;
    programEditor.addEventListener("programChange", ({ detail }) => {
      player.setTrack(detail);
      exporter.setTrack(detail);
    });

    player.addEventListener("stateChange", () => {
      switch (player.state) {
        case PlayerState.playing:
        case PlayerState.paused:
          programEditor.readOnly = true;
          break;
        default:
          programEditor.readOnly = false;
      }
    });

    programEditor.interpreter = new Interpreter(window.parser);

    const controlDiv = document.createElement("div");
    controlDiv.append(playerControls, exportControls);
    this.shadowRoot.append(programEditor, controlDiv);

    const style = document.createElement("style");
    style.innerText = `
      :host { display: flex; flex-direction: row; flex-wrap: wrap; }
      #controls { display: block };

    `;
    this.shadowRoot.appendChild(style);
  }
}

window.customElements.define("etcnome-home", EtcnomeHome);
