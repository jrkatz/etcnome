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

// records a section (typically a whole track) to an AudioBuffer
import Ensemble from "../noises/ensemble.js";

const record = (track) => {
  const beaterator = track?.makeBeaterator();
  const sounds = [];
  let next = beaterator?.next();
  while (next !== null) {
    sounds.push(next);
    next = beaterator.next();
  }

  if (sounds.length === 0) {
    return Promise.resolve(null);
  }

  beaterator.toStart();
  // the start of the first beat on repeat is
  // the end time of the last beat.
  const { time: trackTime } = beaterator.next();
  const sampleRate = 44100;

  const audioCtx = new OfflineAudioContext(
    1,
    trackTime * sampleRate,
    sampleRate
  );

  const ensemble = new Ensemble();

  const scheduled = sounds.map(({ soundSpec, time }) =>
    ensemble.getSound(soundSpec, sampleRate).then((buf) => {
      const source = audioCtx.createBufferSource();
      source.buffer = buf;
      source.connect(audioCtx.destination);

      source.start(time);
    })
  );

  return Promise.all(scheduled).then(
    () =>
      new Promise((resolve) => {
        const renderPromise = audioCtx.startRendering();
        if (renderPromise) {
          resolve(renderPromise);
        } else {
          audioCtx.oncomplete = (result) => resolve(result.renderedBuffer);
        }
      })
  );
};

export default { record };
