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

// When play control is exercised:
// - If there is no running audio context, a new one is created and the track played through it.
// - If there is a running audio context, it is resumed.
// The play button is then transformed into a pause button.
//
// When the pause control is exercised, the audio context is suspended.
// When the stop button is exercised, the audio context is discarded.
// When the track ends, the audio context is discarded.

// TODO what are js best practices w/r/t enum-like values?
// Should the values be 'new Object()' so they aren't
// inspectable and/or fakeable?
export const State = {
  stopped: "stopped",
  playing: "playing",
  paused: "paused",
};

class Player extends EventTarget {
  constructor(track) {
    super();
    this.queued = 0;
    this.lastBeat = null;
    this.lastSource = null;
    this.track = track;
    this.state = State.stopped;
    this.audioCtx = null;
    // Always stop when the track ends.
    // This can be extended later with configuration to repeat and the like.
    this.track.addEventListener("ended", this.stop);
  }

  messageState(state) {
    this.dispatchEvent(new CustomEvent("stateChange", { detail: state }));
  }

  changeState(state, action) {
    if (this.state === state) {
      return;
    }
    action();
    this.state = state;
    this.messageState(state);
  }

  stop() {
    this.changeState(State.stopped, () => {
      this.audioCtx.suspend();
      this.audioCtx = null;
    });
  }

  play() {
    this.changeState(State.playing, () => {
      if (this.audioCtx) {
        this.audioCtx.resume();
      } else {
        this.audioCtx = new window.AudioContext();
        this.queued = 0;
        this.lastBeat = null;
        this.lastSource = null;
        this.track.ready().then(this.queue.bind(this));
      }
    });
  }

  pause() {
    this.changeState(State.paused, () => {
      this.audioCtx.suspend();
    });
  }

  queue() {
    while (this.queued < 2) {
      const nextBeat = this.track.nextBeat(this.lastBeat);
      if (nextBeat === null) {
        // the last beat has already played
        if (this.queued === 0) {
          this.stop();
        } // there is a last beat but it has not played yet.
        else if (this.lastSource !== null) {
          this.lastSource.addEventListener("ended", this.stop.bind(this));
        } else {
          // there was never a beat (empty track). Just stop anyhow.
          this.stop();
        }
        return;
      }
      this.lastBeat = nextBeat;
      const { buffer, time } = nextBeat;
      this.queued += 1;

      buffer.then((buf) => {
        const nextSource = new window.AudioBufferSourceNode(this.audioCtx, {
          buffer: buf,
        });
        this.lastSource = nextSource;
        nextSource.addEventListener("ended", () => {
          this.queued -= 1;
          this.queue();
        });
        nextSource.connect(this.audioCtx.destination);
        nextSource.start(time);
      });
    }
  }
}

export default Player;
