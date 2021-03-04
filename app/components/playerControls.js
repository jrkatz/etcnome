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

import "./playerButton.js";
import "./labeledSlider.js";
import { State as PlayerState } from "../../lib/player/player.js";

const PLAYER = new WeakMap();

const update = (controls) => {
  const {
    player,
    firstButton,
    playButton,
    pauseButton,
    stopButton,
    repeatCheckbox,
  } = controls;
  const { state: playerState, repeat } = player || {};

  const setFirst =
    playerState === PlayerState.playing ? pauseButton : playButton;
  firstButton.replaceWith(setFirst);
  controls.firstButton = setFirst;

  repeatCheckbox.checked = repeat || false;
  switch (playerState) {
    case PlayerState.stopped:
      playButton.disabled = false;
      pauseButton.disabled = true;
      stopButton.disabled = true;
      break;
    case PlayerState.paused:
      playButton.disabled = false;
      pauseButton.disabled = true;
      stopButton.disabled = false;
      break;
    case PlayerState.playing:
      playButton.disabled = true;
      pauseButton.disabled = false;
      stopButton.disabled = false;
      break;
    case PlayerState.empty:
    default:
      playButton.disabled = true;
      pauseButton.disabled = true;
      stopButton.disabled = true;
  }
};

class PlayerControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.updateCallback = () => update(this);

    this.playButton = document.createElement("player-button");
    this.playButton.label = "play";
    this.playButton.symbol = "|>";

    this.firstButton = this.playButton;

    this.pauseButton = document.createElement("player-button");
    this.pauseButton.label = "pause";
    this.pauseButton.symbol = "||";

    this.stopButton = document.createElement("player-button");
    this.stopButton.label = "stop";
    this.stopButton.symbol = "[]";

    const repeatLabel = document.createElement("label");
    repeatLabel.innerText = "repeat";
    this.repeatCheckbox = document.createElement("input");
    this.repeatCheckbox.type = "checkbox";
    repeatLabel.appendChild(this.repeatCheckbox);

    this.speedControl = document.createElement("labeled-slider");
    this.speedControl.name = "speed";
    this.speedControl.min = -2;
    this.speedControl.max = 2;
    this.speedControl.step = 0.1;
    this.speedControl.value = 1;
    this.speedControl.default = 1;
    this.speedControl.transform = (x) => 2 ** x;
    this.speedControl.reverseTransform = (x) => Math.log2(x);

    this.speedControl.addEventListener("input", () =>
      this.player?.setSpeed(this.speedControl.value)
    );

    this.shadowRoot.appendChild(this.firstButton);
    this.shadowRoot.appendChild(this.stopButton);
    this.shadowRoot.appendChild(this.speedControl);
    this.shadowRoot.appendChild(repeatLabel);

    update(this);

    this.playButton.addEventListener("click", () => this.player?.play());
    this.pauseButton.addEventListener("click", () => this.player?.pause());
    this.stopButton.addEventListener("click", () => this.player?.stop());
    this.repeatCheckbox.addEventListener("change", () =>
      this.player?.setRepeat(this.repeatCheckbox.checked)
    );
  }

  get player() {
    return PLAYER.get(this);
  }

  set player(player) {
    this.player?.removeEventListener("stateChange", this.updateCallback);
    PLAYER.set(this, player);
    this.player?.addEventListener("stateChange", this.updateCallback);
    this.player?.setSpeed(this.speedControl?.value || 1);
    update(this);
  }
}

window.customElements.define("player-controls", PlayerControls);
