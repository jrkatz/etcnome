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

class Measure extends Section {
  // TODO break this up. It's a monster.
  constructor({ bpm, swing }, rhythms, denom = 4, subdivision = 1) {
    super();
    // something totally different for polyrhythms
    // total each count,
    const polyCounts = rhythms.map((phrases) =>
      phrases.reduce((a, b) => a + b)
    );
    // divide the bar into chunks the size of the multiple of all the rhythms,
    // e.g. for a 4:5 polyrhythm, we divide the bar into 20 sections. This
    // way, a beat from the '4' measure is played every 5th chunk, and from
    // the '5' measure every 4th chunk. Basically, we're picking a number
    // that every count divides evenly into.
    const chunks = polyCounts.reduce((a, b) => a * b, 1) * subdivision;
    const playChunks = polyCounts.map((count) => chunks / count);
    // the duration of the bar is figured from the first (primary) rhythm
    const barDuration = polyCounts[0] * (60 / bpm) * (4 / denom);
    const chunkTime = barDuration / chunks;

    const beatRhythms = [];
    const beatChunks = [];
    // go through the chunks and record some information about them
    for (let chunk = 0; chunk < chunks; chunk += 1) {
      const plays = [];
      for (let rhythm = 0; rhythm < rhythms.length; rhythm += 1) {
        if (chunk % playChunks[rhythm] === 0) {
          plays.push(rhythm);
        }
      }
      if (plays.length > 0) {
        beatRhythms.push(plays);
        beatChunks.push(chunk);
      }
    }
    const beatDurations = [];
    for (let nextIdx = 1; nextIdx < beatChunks.length; nextIdx += 1) {
      beatDurations.push(
        chunkTime * (beatChunks[nextIdx] - beatChunks[nextIdx - 1])
      );
    }
    // and a special one for the last duration:
    beatDurations.push(
      chunkTime * (chunks - beatChunks[beatChunks.length - 1])
    );

    if (swing) {
      // apply a little time dilation to the table
      // This is basically nonsense if polyrhythms are involved...
      // but why fail if you don't have to?
      const { ratios } = swing;
      const phrase = swing.phrase || ratios.length + 1;
      if (ratios.length >= phrase) {
        // TODO I know this error message is bad. Someone, anyone, me, please, figure out a better one.
        throw new Error(
          "Overswung - swing has too many ratios and not enough phrase"
        );
      }
      if (ratios.reduce((a, b) => a + b) >= phrase) {
        throw new Error("Overswung - too much swing, not enough beat");
      }
      if (ratios.some((x) => x <= 0)) {
        throw new Error("Swing ratios must be > 0.");
      }
      // swung phrases must divide into the number of beats in the bar.
      if (beatDurations.length % phrase !== 0) {
        throw new Error(
          `Swing phrase doesn't divide evenly into total number of beats`
        );
      }
      const allRatios = [...ratios];
      const remaining = phrase - allRatios.reduce((a, b) => a + b);
      const ratPerRemaining = remaining / (phrase - allRatios.length);
      for (let i = allRatios.length; i < phrase; i += 1) {
        allRatios.push(ratPerRemaining);
      }

      for (let i = 0; i < beatDurations.length; i += phrase) {
        const phraseDurations = beatDurations.slice(i, i + phrase);
        const totalDuration = phraseDurations.reduce((a, b) => a + b);
        const swungDurations = phraseDurations.map(
          (dur, phraseIdx) => allRatios[phraseIdx] * dur
        );
        const swungTotalDuration = swungDurations.reduce((a, b) => a + b);
        const adjustmentRatio = totalDuration / swungTotalDuration;
        const adjustedDurations = swungDurations.map(
          (dur) => dur * adjustmentRatio
        );
        beatDurations.splice(i, phrase, ...adjustedDurations);
      }
    }

    // beatdurations has the duration of each beat
    // beatRhythms has which rhythms the beat is in (it may be in more than
    // one) for now we'll emphasize any beat that is in more than one rhythm
    // or is a downbeat in any one rhythm.
    const beatClicks = beatRhythms.map((beatRs, beatIdx) => {
      // first beat is always a high click in the main instrument
      if (beatIdx === 0) {
        return new SoundSpec({ tone: 0, vol: 1, instr: 0 });
      }
      // by default beats have tone 2. To add emphasis, we bring the tone closer
      // to 0.
      let tone = 2;
      // go down to half volume for the last rhythm.
      const volPerRhythm = 0.5 / rhythms.length;

      const firstRhythm = beatRs.reduce((a, b) => Math.min(a, b));
      // detune slightly to make rhythms more distinguishable
      tone *= 1.1 ** firstRhythm;
      // pick instrument and volume based on the _first_ rhythm we appear in
      const vol = 1 - firstRhythm * volPerRhythm;
      const instr = firstRhythm;

      const beatRhythmEmphasis = beatRs.map((r) => {
        const counts = rhythms[r];

        const chunk = beatChunks[beatIdx];
        // work out chunks per beat of this rhythm, then divide that into the
        // current chunk to see which beat of this rhythm we are on.
        const idxInRhythm = chunk / (chunks / polyCounts[r]);
        // decide if the beat is a downbeat in its rhythm
        if (counts.length === 1) {
          // For once '&' is not a typo for '&&'
          // eslint-disable-next-line no-bitwise
          if (counts[0] % 3 === 0 && denom > 4 && (denom & (denom - 1)) === 0) {
            // the numerator is divisible by three and the bottom is a power of
            // 2 greater than 4. Traditionally, this suggests a compound time,
            // i.e. beats are played in groups of 3.
            // Figure out if this beat is a third beat in its count:

            return idxInRhythm % (3 * subdivision) === 0
              ? [r, true]
              : [r, false];
          }
        } else {
          const downbeats = new Set();
          let sofar = 0;
          for (const count of counts) {
            sofar += count;
            downbeats.add(sofar);
          }
          if (downbeats.has(idxInRhythm)) {
            return [r, true];
          }
        }
        return [r, false];
      });

      const baseTone = tone;
      for (const rhythmEm of beatRhythmEmphasis) {
        const [rhythm, emphasized] = rhythmEm;
        const ratio = emphasized ? 2 : 1 + (1 - 0.9 ** rhythm);
        const diff = baseTone - baseTone / ratio;
        // apply the difference, but weaken it based on which rhythm is used:
        tone -= diff / 2 ** rhythm;
      }

      return new SoundSpec({ tone, vol, instr });
    });
    this.beatClicks = beatClicks;
    this.beatDurations = beatDurations;
  }

  nextBeat(prevBeat) {
    const prevCount = prevBeat ? prevBeat.getMeta(this, -1) : -1;
    const count = prevCount + 1;
    if (count >= this.beatDurations.length) {
      return null;
    }

    const beat = new Sound(
      this.beatDurations[count],
      this.beatClicks[count],
      this,
      count
    );
    return beat;
  }
}
export default Measure;
