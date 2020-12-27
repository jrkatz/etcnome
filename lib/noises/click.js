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

// a click is a mix between a beep and white noise.... I guess

import WhiteNoise from "./white-noise.js";

const attackRelease = (audioCtx, source, attack, decay, start = 0) => {
  const envelope = audioCtx.createGain();
  const { gain } = envelope;
  gain.setValueAtTime(0, 0);
  gain.setValueAtTime(0.0001, start);
  gain.exponentialRampToValueAtTime(1, start + attack);
  gain.exponentialRampToValueAtTime(0.00001, start + attack + decay);
  source.connect(envelope);
  return envelope;
};

const normalize = (buffer, norm) => {
  // pretend we did anything.
  let max = 0;
  for (let i = 0; i < buffer.numberOfChannels; i += 1) {
    const channel = buffer.getChannelData(i);
    max = Math.max(
      max,
      channel.map((val) => Math.abs(val)).reduce((a, b) => Math.max(a, b))
    );
  }

  if (max !== norm) {
    // normalize stuff:
    for (let i = 0; i < buffer.numberOfChannels; i += 1) {
      const channel = buffer.getChannelData(i);
      for (let j = 0; j < channel.length; j += 1) {
        channel[j] *= norm / max;
      }
    }
  }

  return buffer;
};

const click = (frequency, attack, decay, sampleRate, vol = 1) => {
  const length = (attack + decay) * sampleRate;

  const audioCtx = new OfflineAudioContext(1, length, sampleRate);

  // define base white noise & tone
  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = WhiteNoise(audioCtx, length, sampleRate);
  const tone = audioCtx.createOscillator();
  tone.frequency.setValueAtTime(frequency, 0);
  attackRelease(audioCtx, tone, attack, decay).connect(audioCtx.destination);
  attackRelease(audioCtx, whiteNoise, attack, decay).connect(
    audioCtx.destination
  );

  tone.start();
  whiteNoise.start();

  return new Promise((resolve) => {
    const renderPromise = audioCtx.startRendering();

    if (renderPromise) {
      resolve(renderPromise);
    } else {
      audioCtx.oncomplete = (result) => resolve(result.renderedBuffer);
    }
  }).then((buf) => normalize(buf, vol));
};

export default click;
