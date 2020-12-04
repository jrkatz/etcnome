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
import Click from "./click.js";

const audioCtx = new window.AudioContext();

const playNow = (buffer) => {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
};

Click(440, 0.2, 0.03, 44100).then(playNow);
setTimeout(() => {
  Click(1000, 0.2, 0.03, 44100).then(playNow);
}, 1000);
