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

// A Section provides a nextBeat function to derive the next beat
// from the previous beat. Sections must be extended to provide
// anything useful.
// Sections can be composed using the RepeatingSection or SectionList
// classes, which also extend Section.

import { Section } from "./section.js";
import SoundSpec from "./soundSpec.js";
import Sound from "./sound.js";

const sum = (a, b) => a + b;

const compoundToAdditive = (rhythm, denom) => {
  // transform a compound rhythm to an additive rhythm
  // of the implied emphasis. Non-compound rhythms or
  // rhythms that are already additive are not touched.

  if (
    // it is already additive
    rhythm.length > 1 ||
    // the bottom number is not a power of 2
    // (the '&' is not a typo for '&&' here)
    // eslint-disable-next-line no-bitwise
    (denom & (denom - 1)) !== 0 ||
    // the top number is not a multiple of 3
    rhythm[0] % 3 !== 0
  ) {
    // this is not a compound time, so we return it and do nothing:
    return rhythm;
  }
  // turns 9 beats into 3 + 3 + 3, and so forth.
  const compound = Array(rhythm[0] / 3);
  compound.fill(3, 0, compound.length);
  return compound;
};

const getChunkBeats = ({ rhythms, denom }) => {
  // get a small common multiple* of the number of beats in each rhythm.
  // ideally this is always a small number, but finding the proven least
  // common multiple can be expensive so we settle for small.
  const totalChunks = rhythms
    .map((rhythm) => rhythm.reduce(sum))
    .reduce((a, b) => (a % b === 0 ? a : a * b));
  const defaultTone = 2;
  let instr = 0;
  let emphasizedToneDiff = 1;
  let nonEmphasizedToneDiff = -1 * (1 - 0.9 ** instr);
  let vol = 1;
  const volModifier = 0.5 / rhythms.length;

  const chunkBeats = new Map();
  // for each rhythm
  for (const rhythm of rhythms.map((r) => compoundToAdditive(r, denom))) {
    const numBeats = rhythm.reduce(sum);
    const beatChunks = totalChunks / numBeats;
    let chunk = 0;
    // for each phrase
    for (const phrase of rhythm) {
      // for each beat
      for (let i = 0; i < phrase; i += 1) {
        let chunkBeat = chunkBeats.get(chunk);
        if (!chunkBeat) {
          chunkBeat = {
            instr,
            vol,
            tone: defaultTone,
          };
          chunkBeats.set(chunk, chunkBeat);
        }
        // the first beat of each phrase is emphasized
        chunkBeat.tone -= i === 0 ? emphasizedToneDiff : nonEmphasizedToneDiff;
        chunk += beatChunks;
      }
    }

    instr += 1;
    emphasizedToneDiff /= 2;
    nonEmphasizedToneDiff = -1 * (1 - 0.9 ** instr);
    vol -= volModifier;
  }
  // finally, make the first beat the most emphasized:
  chunkBeats.get(0).tone = 0;
  return chunkBeats;
};

const getBeats = ({ bpm, rhythms, denom }) => {
  const barDuration = rhythms[0].reduce(sum) * (60 / bpm) * (4 / denom);
  const totalChunks = rhythms
    .map((rhythm) => rhythm.reduce(sum))
    .reduce((a, b) => a * b);
  const chunkDuration = barDuration / totalChunks;

  const chunkBeats = getChunkBeats({ bpm, rhythms, denom });
  const playedChunks = Array.from(chunkBeats.keys()).sort((a, b) => a - b);
  const beats = [];
  let sound = chunkBeats.get(0);
  let chunk = 0;
  for (const nextChunk of playedChunks.slice(1)) {
    beats.push({
      soundSpec: sound,
      duration: (nextChunk - chunk) * chunkDuration,
    });
    sound = chunkBeats.get(nextChunk);
    chunk = nextChunk;
  }
  beats.push({
    soundSpec: sound,
    duration: (totalChunks - chunk) * chunkDuration,
  });
  return beats;
};

const addSwing = (swing, beats) => {
  if (!swing) {
    return;
  }
  const { ratios } = swing;
  // apply a little time dilation to the table
  // This is basically nonsense if polyrhythms are involved...
  // but why fail if you don't have to?
  const phrase = swing.phrase || ratios.length + 1;
  if (ratios.length >= phrase) {
    // TODO I know this error message is bad. Someone, anyone, me, please, figure out a better one.
    throw new Error(
      "Overswung - swing has too many ratios and not enough phrase"
    );
  }
  if (ratios.reduce(sum) >= phrase) {
    throw new Error("Overswung - too much swing, not enough beat");
  }
  if (ratios.some((x) => x <= 0)) {
    throw new Error("Swing ratios must be > 0.");
  }
  // swung phrases must divide into the number of beats in the bar.
  if (beats.length % phrase !== 0) {
    throw new Error(
      `Swing phrase doesn't divide evenly into total number of beats`
    );
  }
  const allRatios = [...ratios];
  const remaining = phrase - allRatios.reduce(sum);
  const ratPerRemaining = remaining / (phrase - allRatios.length);
  for (let i = allRatios.length; i < phrase; i += 1) {
    allRatios.push(ratPerRemaining);
  }

  for (let i = 0; i < beats.length; i += phrase) {
    const phraseDurations = beats
      .slice(i, i + phrase)
      .map((beat) => beat.duration);
    const totalDuration = phraseDurations.reduce(sum);
    const swungDurations = phraseDurations.map(
      (dur, phraseIdx) => allRatios[phraseIdx] * dur
    );
    const swungTotalDuration = swungDurations.reduce(sum);
    const adjustmentRatio = totalDuration / swungTotalDuration;
    const adjustedDurations = swungDurations.map(
      (dur) => dur * adjustmentRatio
    );
    for (let j = 0; j < phrase; j += 1) {
      const beat = beats[i + j];
      beat.duration = adjustedDurations[j];
    }
  }
};

class Measure extends Section {
  constructor({ bpm, swing }, rhythms, denom, range) {
    super(range);
    this.beats = getBeats({ bpm: bpm.get(), rhythms, denom });
    addSwing(swing, this.beats);
    // only after adding swing do we decide if we're doing
    // any speeding up or slowing down:
    if (bpm.currentlyAdjusting()) {
      for (const beat of this.beats) {
        beat.duration = bpm.adjust(beat.duration);
      }
    }
  }

  nextBeat(prevBeat) {
    const prevCount = prevBeat ? prevBeat.getMeta(this, -1) : -1;
    const count = prevCount + 1;
    if (count >= this.beats.length) {
      return null;
    }
    const { duration, soundSpec } = this.beats[count];
    const sound = new Sound(
      duration,
      this.range,
      new SoundSpec(soundSpec),
      this,
      count
    );
    return sound;
  }
}
export default Measure;
