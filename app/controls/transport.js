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

import { State } from "../../lib/player/player.js";

class Transport {
  constructor() {
    this.ppb = null;
    this.stb = null;
    this.player = null;
    this.editor = null;
  }

  init(playPauseBtn, stopBtn, repeatToggle, exportBtn, editor, player) {
    this.ppb = playPauseBtn;
    this.stb = stopBtn;
    this.exportBtn = exportBtn;
    this.stb.innerText = "[ ]";
    this.player = player;
    player.addEventListener("stateChange", (e) => this.toState(e.detail));
    this.editor = editor;

    this.toState(player.state);

    player.setRepeat(repeatToggle.checked);
    repeatToggle.addEventListener("change", () => {
      player.setRepeat(repeatToggle.checked);
    });
  }

  exportEnabled() {
    this.exportBtn.disabled = false;
    this.exportBtn.onclick = () => this.player.exportWav();
  }

  exportDisabled() {
    this.exportBtn.disabled = true;
  }

  stopEnabled() {
    this.stb.disabled = false;
    this.stb.onclick = this.player.stop.bind(this.player);
  }

  stopDisabled() {
    this.stb.disabled = true;
    this.stb.onclick = null;
  }

  playEnabled() {
    this.ppb.innerText = "|>";
    this.ppb.name = "play";
    this.ppb.onclick = this.player.play.bind(this.player);
    this.ppb.disabled = false;
  }

  playDisabled() {
    this.ppb.disabled = true;
    this.ppb.innerText = "|>";
    this.ppb.name = "play";
  }

  pauseEnabled() {
    this.ppb.innerText = "||";
    this.ppb.name = "pause";
    this.ppb.onclick = this.player.pause.bind(this.player);
    this.ppb.disabled = false;
  }

  controlsStopped() {
    this.player.stop();
    this.playEnabled();
    this.stopDisabled();
    this.editor.setEnabled(true);
    this.exportEnabled();
  }

  controlsPlaying() {
    this.pauseEnabled();
    this.stopEnabled();
    this.editor.setEnabled(false);
    this.exportDisabled();
  }

  controlsPaused() {
    this.stopEnabled();
    this.playEnabled();
    this.editor.setEnabled(false);
    this.exportDisabled();
  }

  controlsEmpty() {
    this.playDisabled();
    this.stopDisabled();
    this.exportDisabled();
    this.editor.setEnabled(true);
  }

  controlsExporting() {
    this.playDisabled();
    this.stopDisabled();
    this.exportDisabled();
    this.editor.setEnabled(false);
  }

  toState(state) {
    if (state === State.playing) {
      this.controlsPlaying();
    } else if (state === State.paused) {
      this.controlsPaused();
    } else if (state === State.stopped) {
      this.controlsStopped();
    } else if (state === State.exporting) {
      this.controlsExporting();
    } else {
      // default to empty
      this.controlsEmpty();
    }
  }
}

export default Transport;
