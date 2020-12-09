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

import { RepeatingSection, SectionList } from "../../lib/player/section.js";
import Measure from "../../lib/player/measure.js";
import Player from "../../lib/player/player.js";
import Transport from "./transport.js";

const reusedMeasure = new Measure(200, 5);
const track = new SectionList([
  new Measure(120, 4),
  new RepeatingSection(new Measure(100, 3), 2),
  reusedMeasure,
  reusedMeasure,
]);

const bindControls = (playPauseBtn, stopBtn) => {
  const transport = new Transport();
  const player = new Player();
  player.setTrack(track);
  transport.init(playPauseBtn, stopBtn, player);
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
