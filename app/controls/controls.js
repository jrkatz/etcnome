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

import Interpreter from "../../lib/interpreter/interpreter.js";
import Player from "../../lib/player/player.js";
import Transport from "./transport.js";
import Editor from "./editor.js";

const bindControls = (
  playPauseBtn,
  stopBtn,
  repeatToggle,
  exportBtn,
  editorFld,
  editorErrors,
  parser
) => {
  const transport = new Transport();
  const player = new Player();

  const editor = new Editor(new Interpreter(parser));
  editor.addEventListener("trackChange", (e) => player.setTrack(e.detail));
  editor.init(editorFld, editorErrors);
  player.setTrack(editor.track);

  transport.init(
    playPauseBtn,
    stopBtn,
    repeatToggle,
    exportBtn,
    editor,
    player
  );
};

if (window) {
  let toRun = [];
  if (Array.isArray(window.etcnome)) {
    toRun = window.etcnome;
  }
  window.etcnome = window.etcnome || {};
  window.etcnome.bindControls = bindControls;

  for (const fn of toRun) {
    fn();
  }
}
