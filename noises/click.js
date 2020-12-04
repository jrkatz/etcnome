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

// TODO set up packages and such so I can import w/out extensions,
// or change eslint rules. One or the other.
// eslint-disable-next-line import/extensions
import WhiteNoise from "./white-noise.js";

// for this click, we're going to:
// 1. shape white noise with a sine wave
// 2. shape _that_ with an attack and release
// 3. save that to a buffer.
// 4. export the buffer.

// I think this comes out more low-pass filter than anything else.
// TODO look into how vocoders work, do _that_ to apply the pitch
// to the white noise.

// While some verb, maybe with a hint of delay and panning would be nice, this is a first pass at making a pleasing click... so we're going to ignore all that and use a single channel.

// This can be parameterized with the tone, attack, and duration (implicitly release, because the release finishes at the end of the duration).

const click = (frequency, duration, attack, sampleRate) => {
  const length = duration * sampleRate;

  const audioCtx = new window.OfflineAudioContext({
    numberOfChannels: 1,
    length,
    sampleRate,
  });

  // define base white noise.
  const whiteNoise = WhiteNoise(audioCtx, length, sampleRate);
  const whiteNoiseSource = audioCtx.createBufferSource();
  whiteNoiseSource.buffer = whiteNoise;
  whiteNoiseSource.start();
  const tone = new window.OscillatorNode(audioCtx, { frequency });

  const whiteNoiseEnvelope = audioCtx.createGain();
  // control the gain with the tone. Why not?
  tone.connect(whiteNoiseEnvelope.gain);
  whiteNoiseSource.connect(whiteNoiseEnvelope);

  // send that through another gain that will be used to control attack and release:
  const attackReleaseEnvelope = audioCtx.createGain();
  whiteNoiseEnvelope.connect(attackReleaseEnvelope);

  attackReleaseEnvelope.gain.setValueAtTime(0, 0);
  attackReleaseEnvelope.gain.exponentialRampToValueAtTime(1, attack);
  attackReleaseEnvelope.gain.exponentialRampToValueAtTime(
    0.0001,
    duration - attack
  );

  attackReleaseEnvelope.connect(audioCtx.destination);
  tone.start();

  return audioCtx.startRendering();
};

export default click;
