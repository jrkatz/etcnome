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

// TODO go over this with an eye to efficiency.
// There's definitely useless copying and
// allocation in here.

// TODO docs, too

// TODO It's trivial, using repitition, to describe a track
// long enough it does not fit in a wav file (max ~4GB), so
// we should detect that and fail gracefully, with some
// message (and possibly the option to break it up into
// multiple smaller files?) instead of failing with
// undefined behavior or by producing a giant, but unusable
// file.

const samplingResolutionBytes = 4; // 4 bytes, 32-bit.

function* itSamples(buffer) {
  const channels = [];
  for (let chan = 0; chan < buffer.numberOfChannels; chan += 1) {
    channels.push(buffer.getChannelData(chan));
  }

  for (let i = 0; i < buffer.length; i += 1) {
    yield channels.map((channel) => channel[i]);
  }
}

function* itFlat(iterable) {
  for (const x of iterable) {
    for (const y of x) {
      yield y;
    }
  }
}
const uint32 = (number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setUint32(0, number, true);
  return view.buffer;
};

const uint16 = (number) => {
  const view = new DataView(new ArrayBuffer(2));
  view.setUint16(0, number, true);
  return view.buffer;
};

const toDataChunk = (samples) => {
  // use 32 bit audio (float32) to skip conversion here. "CD
  // quality" audio is 16 bit, but for that samples are
  // converted to signed 16 bit integers... that sounds like
  // a pain. Plus, this way the exported audio is identical
  // to the buffer audio. We expect our files to be small
  // and full of silence anyhow, so large file size is
  // hardly an issue.
  // Could be compatibility issues here for some users, but
  // all the players I've tried are fine w/ this format, at
  // least.
  const float32Data = Float32Array.from(itFlat(samples));
  return new Blob(["data", uint32(float32Data.size), float32Data]);
};

const bufferToDataChunk = (buffer) => {
  return toDataChunk(itSamples(buffer));
};

const bufferToWavBlob = (buffer) => {
  const { numberOfChannels } = buffer;
  const bytesPerSample = numberOfChannels * samplingResolutionBytes;
  const dataChunk = bufferToDataChunk(buffer);
  const formatChunk = new Blob([
    "fmt ",
    uint32(16), // size,
    uint16(3), // type - IEEE float
    uint16(buffer.numberOfChannels),
    uint32(buffer.sampleRate),
    uint32(buffer.sampleRate * bytesPerSample), // avg bytes per second.
    uint16(bytesPerSample), // block align. Put each sample in its own block.
    uint16(samplingResolutionBytes * 8), // bits per channel-sample
  ]);

  const fileBlob = new Blob([
    "RIFF",
    uint32(
      formatChunk.size + dataChunk.size + 4 // for 'WAVE' header
    ), // size
    "WAVE",
    formatChunk,
    dataChunk,
  ]);

  return fileBlob;
};

export default { bufferToWavBlob };
