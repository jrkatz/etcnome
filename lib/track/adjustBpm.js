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

export default class AdjustBpm {
  constructor(initialBpm, targetBpm, numBeats, delay) {
    if (delay > numBeats) {
      throw new Error(
        "Cannot the onset of a tempo change beyond the end of the change"
      );
    }
    this.delay = delay;
    this.beatsRemaining = numBeats - delay;
    this.initialBpm = initialBpm;
    this.bpm = initialBpm;
    this.targetBpm = targetBpm;
  }

  complete() {
    return this.beatsRemaining <= 0;
  }

  incomplete() {
    return !this.complete();
  }

  adjust(duration) {
    // Ready for calculus? Me neither.
    // "real time passed" can be defined in terms of the bpm and the number of
    // beats by this equation:
    // minutes = beats * (1 / bpm)
    // That is easy to calculate when the bpm is not changing.Thinking back to
    // calc 101, we note that any a * b resembles an area function, and draw
    // a graph:
    //
    //       |
    //       |
    // 1/bpm |
    //       |--------------|     1/60
    //       |              |
    //       0----1----2----3----4
    //               beats
    //
    // To confirm our suspicions, we quickly calculate: 3 beats at 60 bpm has
    // a duration of 3 seconds, or .05 minutes.
    // The area under the curve (which happens to be a line) in this graph is
    // also 1/60 * 3 = .05 minutes
    //
    // Things get interesting when we want to vary the bpm over a number of
    // beats. Suppose a simple case:
    // we want, over 4 beats, to accelerate from 60 bpm to 120 bpm at an
    // even pace (e.g. our bpm should be halfway to 120 at the halfway point,
    // so by the start of the second beat we should be going 90bpm)
    // know the amount of time that passes:
    //
    //        (pretend the line is smooth)
    //
    //       |\    ------------ 1/60
    //       | \
    //       |   _
    // 1/bpm |     - . __  ---- 1/90
    //       |           | ---- 1/120
    //       |           |
    //       |           |
    //       |           |
    //       0--1--2--3--4···
    //          x   (beats)
    //
    // It will be a bit harder to find the area under _this_ curve. Thankfully,
    // I once upon a time earned a degree in mathematics, so though I have spent
    // far too long as a software engineer to do integration easily, I recognize
    // that this is a problem of integration. We will build off a base equation:
    // y = 1 / bpm
    // and another equation, defining bpm in terms of beats (aka 'x'):
    // bpm(x) = bpm_0 + x ((bpm_n - bpm_x) / n)
    // wherein:
    // bpm_0 = the initial bpm,
    // bpm_n = the end bpm
    // n = the number of beats until we reach the end bpm
    // ergo
    // bpm(x) is the function defining the bpm at beat x
    //
    // Let's plug in a few numbers to make sure we modeled that correctly:
    // bpm_0 = 60
    // bpm_n = 120
    // n=4
    // bpm(x) = 60 + x * ((120 - 60) / 4)
    // bpm(x) = 60 + 15x
    // Sure enough, then, bpm(0) = 60, bpm(1) = 75, bpm(2) = 90, bpm(3) = 105,
    // and bpm(4) = 120
    //
    // So we'll put it all together:
    // y(x) = 1 / (bpm(x))
    // y(x) = 1 / (bpm_0 + x((bpm_n - bpm_0) / n))
    // is a curve of the inverse of bpm over beats (x), and the area under the
    // curve from 0 to n is the duration in minutes of n beats. That is, the
    // duration `duration(x)` of the first x beats of the acceleration or
    // deceleration from an initial bpm (bpm_0) to another bpm (bpm_n) over x
    // beats is described by the definite integral
    //
    // duration(x) = ∫_0^x  1 / (bpm_0 + x((bpm_n - bpm_0) / n))dx
    // We can plug that integral into our favorite symbolic calculus system (or
    // crack open a calc 1 book) and transform it into an indefinite integral,
    // which follows in code:

    const n = this.beatsRemaining;
    const bpm0 = this.bpm;
    const bpmN = this.targetBpm;

    const indefiniteIntegral = (x) =>
      (n * Math.log(bpm0 * n - bpm0 * x + bpmN * x)) / (bpmN - bpm0);

    // The indefinite integral gives us the entire area under the curve, but we
    // are interested in the area between 0 and x - the definite integral given
    // in the comment above, which is easy to calculate from the indefinite
    // integral.

    const durationMinutes = (x) =>
      indefiniteIntegral(x) - indefiniteIntegral(0);

    // We are passed a duration of time from something that assumes we are
    // playing at the _initial bpm_, which we can turn into a number of beats
    // like so:
    let totalBeats = duration / (60 / this.initialBpm);

    // If there is any delay, we will actually play at the initial bpm for a
    // while, so subtract those beats from totalBeats and note the time spent
    // before the accelration starts in delayTime
    let delayTime = 0;
    if (this.delay > 0) {
      const delayBeats = Math.min(this.delay, totalBeats);
      this.delay -= delayBeats;
      totalBeats -= delayBeats;
      delayTime = (60 / this.initialBpm) * delayBeats;
    }

    // If we will finish changing bpm before these beats are over, we handle
    // that by assuming the remaining beats play at the target bpm, storing that
    // duration in postTime, and subtracting those beats from x:
    let postTime = 0;
    if (totalBeats > this.beatsRemaining) {
      const extraBeats = totalBeats - this.beatsRemaining;
      postTime = (60 / this.targetBpm) * extraBeats;
      totalBeats = this.beatsRemaining;
    }

    // convert from duration in minutes to duration in seconds.
    const adjustedDuration = durationMinutes(totalBeats) * 60;

    const bpmPerBeat = (this.targetBpm - this.bpm) / this.beatsRemaining;
    // calculate the bpm at the end of this duration
    this.bpm += bpmPerBeat * totalBeats;
    this.beatsRemaining -= totalBeats;

    return delayTime + adjustedDuration + postTime;
  }
}
