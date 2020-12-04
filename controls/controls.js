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

// TODO set up packages and such so I can import w/out extensions,
// or change eslint rules. One or the other.
// eslint-disable-next-line import/extensions
import Track from "../player/track.js";
// eslint-disable-next-line import/extensions
import Player, { State } from "../player/player.js";

class Controls {
  constructor(playPauseBtn, stopBtn, player) {
    this.ppb = null;
    this.stb = null;
    this.player = player;
  }

  init(playPauseBtn, stopBtn, player) {
    this.ppb = playPauseBtn;
    this.stb = stopBtn;
    this.player = player;
    player.addEventListener("stateChange", (e) => this.toState(e.detail));
    this.toState(player.state);
  }

  stopEnabled() {
    this.stb.disabled = false;
    this.stb.innerText = "⏹";
    this.stb.onclick = this.player.stop.bind(this.player);
  }

  stopDisabled() {
    this.stb.disabled = true;
    this.stb.innerText = "⏹";
    this.stb.onclick = null;
  }

  playEnabled() {
    this.ppb.innerText = "▶️";
    this.ppb.onclick = this.player.play.bind(this.player);
  }

  pauseEnabled() {
    this.ppb.innerText = "⏸";
    this.ppb.onclick = this.player.pause.bind(this.player);
  }

  controlsStopped() {
    this.player.stop();
    this.playEnabled();
    this.stopDisabled();
  }

  controlsPlaying() {
    this.pauseEnabled();
    this.stopEnabled();
  }

  controlsPaused() {
    this.stopEnabled();
    this.playEnabled();
  }

  toState(state) {
    if (state === State.playing) {
      this.controlsPlaying();
    } else if (state === State.paused) {
      this.controlsPaused();
    } else {
      this.controlsStopped();
    }
  }
}

const bindControls = (playPauseBtn, stopBtn) => {
  const controls = new Controls();
  controls.init(playPauseBtn, stopBtn, new Player(new Track()));
};

if (window) {
  let toRun = [];
  if (Array.isArray(window.electronome)) {
    toRun = window.electronome;
  }
  window.electronome = window.electronome || {};
  window.electronome.bindControls = bindControls;

  for (const fn of toRun) {
    fn();
  }
}