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

// a click is a mix between a beep and white noise.... I guess

import WhiteNoise from "./white-noise.js";

const attackRelease = (audioCtx, source, attackTime, duration, start = 0) => {
  const envelope = audioCtx.createGain();
  const { gain } = envelope;
  gain.setValueAtTime(start, 0);
  gain.exponentialRampToValueAtTime(1, attackTime + start);
  gain.exponentialRampToValueAtTime(0.0001, duration - (attackTime + start));
  source.connect(envelope);
  return envelope;
};

const normalize = (buffer) => {
  // pretend we did anything.
  let max = 0;
  for (let i = 0; i < buffer.numberOfChannels; i += 1) {
    const channel = buffer.getChannelData(i);
    max = Math.max(
      max,
      channel.map((val) => Math.abs(val)).reduce((a, b) => Math.max(a, b))
    );
  }

  if (max !== 1) {
    // normalize stuff:
    for (let i = 0; i < buffer.numberOfChannels; i += 1) {
      const channel = buffer.getChannelData(i);
      for (let j = 0; j < channel.length; j += 1) {
        channel[j] *= max / 1;
      }
    }
  }

  return buffer;
};

const click = (frequency, duration, attack, sampleRate) => {
  const length = duration * sampleRate;

  const audioCtx = new OfflineAudioContext({
    numberOfChannels: 1,
    length,
    sampleRate,
  });

  // define base white noise & tone
  const whiteNoise = new AudioBufferSourceNode(audioCtx, {
    buffer: WhiteNoise(audioCtx, length, sampleRate),
  });
  const tone = new OscillatorNode(audioCtx, { frequency });
  // make the tone quieter:
  const toneGain = audioCtx.createGain();
  toneGain.gain.setValueAtTime(0, 0.035);

  // give them both attacks and connect those to the context
  attackRelease(audioCtx, tone, attack, duration).connect(toneGain);
  attackRelease(audioCtx, whiteNoise, attack, duration).connect(
    audioCtx.destination
  );
  toneGain.connect(audioCtx.destination);

  tone.start();
  whiteNoise.start();

  return audioCtx.startRendering().then(normalize);
};

export const clickHigh = click(2000, 0.1, 0.03, 44100);
export const clickMid = click(1000, 0.1, 0.03, 44100);
export const clickLow = click(500, 0.1, 0.03, 44100);