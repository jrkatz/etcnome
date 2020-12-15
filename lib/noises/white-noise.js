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

const makeNoise = (context, length, sampleRate) => {
  const buffer = context.createBuffer(1, length, sampleRate);

  // fill the buffer with white noise.
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
};
export default makeNoise;
