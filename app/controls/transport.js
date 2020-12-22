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

import { State } from "../../lib/player/player.js";

const mediaSessionState = navigator?.mediaSession ? (state) => {
      navigator.mediaSession.playbackState = state;
} : () => {};

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
    this.stb.onclick = () => this.player.stop();

    this.toState(player.state);
    this.exportBtn.onclick = () => this.player.exportWav();

    player.setRepeat(repeatToggle.checked);
    repeatToggle.addEventListener("change", () => {
      player.setRepeat(repeatToggle.checked);
    });

		console.log('doing the thing');
		if (navigator?.mediaSession) {
			navigator.mediaSession.metadata = new MediaMetadata({
					title: 'etcnome',
					artist: 'you',
				});
    navigator.mediaSession.setActionHandler('play', () => this.player.play());
    navigator.mediaSession.setActionHandler('pause', () => this.player.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.player.stop());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.player.restart());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.player.restart());
		}

    console.log(navigator.mediaSession);
   document.addEventListener('keydown', (e) => console.log(e));
  }

  exportEnabled() {
    this.exportBtn.disabled = false;
  }

  exportDisabled() {
    this.exportBtn.disabled = true;
  }

  stopEnabled() {
    this.stb.disabled = false;
  }

  stopDisabled() {
    this.stb.disabled = true;
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
      mediaSessionState('playing');
    } else if (state === State.paused) {
      this.controlsPaused();
      mediaSessionState('paused');
    } else if (state === State.stopped) {
      this.controlsStopped();
      mediaSessionState('paused');
    } else if (state === State.exporting) {
      this.controlsExporting();
      mediaSessionState('paused');
    } else {
      // default to empty
      this.controlsEmpty();
      mediaSessionState('none');
    }
  }
}

export default Transport;
