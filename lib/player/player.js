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
// - If there is no running audio context, a new one is created and the section played through it.
// - If there is a running audio context, it is resumed.
// The play button is then transformed into a pause button.
//
// When the pause control is exercised, the audio context is suspended.
// When the stop button is exercised, the audio context is discarded.
// When the section ends, the audio context is discarded.

// TODO what are js best practices w/r/t enum-like values?
// Should the values be 'new Object()' so they aren't
// inspectable and/or fakeable?
export const State = {
  empty: "empty", // stopped and unable to transition to playing
  stopped: "stopped",
  playing: "playing",
  paused: "paused",
};

class Player extends EventTarget {
  constructor() {
    super();
    this.section = null;
    this.state = State.empty;
    this.repeat = false;
    this.reset();
  }

  setRepeat(repeat) {
    this.repeat = repeat;
  }

  setTrack(section) {
    this.section = section;
    // determine whether or not
    // the track is playable
    if (this?.section?.nextBeat()) {
      // it has at least one beat. It plays
      this.stop(); // transition to stopped state
    } else {
      this.empty();
    }
  }

  reset(audioCtx) {
    this.queued = 0;
    this.audioCtx?.suspend();
    this.audioCtx = audioCtx;
    this.lastBeat = null;
    this.nextTime = 0;
    this.lastSource = null;
  }

  messageState(state) {
    this.dispatchEvent(new CustomEvent("stateChange", { detail: state }));
  }

  changeState(state, action) {
    if (this.state === state) {
      return;
    }
    if (action()) {
      this.state = state;
      this.messageState(state);
    }
  }

  empty() {
    this.changeState(State.empty, () => {
      this.reset();
      return true;
    });
  }

  stop() {
    this.changeState(State.stopped, () => {
      this.reset();
      return true;
    });
  }

  play() {
    this.changeState(State.playing, () => {
      if (this.audioCtx) {
        this.audioCtx.resume();
      } else if (this.section) {
        this.reset(new AudioContext());
        this.section.ready().then(this.queue.bind(this));
      } else {
        return false;
      }
      return true;
    });
  }

  pause() {
    this.changeState(State.paused, () => {
      this.audioCtx.suspend();
      return true;
    });
  }

  // at the end, we either stop or start over.
  end() {
    if (!this.repeat) {
      this.stop();
    } else {
      // no last beat, no source
      this.lastBeat = null;
      this.lastSource = null;
      this.queue();
    }
  }

  queue() {
    try {
      while (this.queued < 2) {
        const nextBeat = this.section?.nextBeat(this.lastBeat) || null;
        if (nextBeat === null) {
          // there's no beat.
          if (this.lastBeat === null) {
            // no first beat, no last beat...
            // nothing we can do.
            this.stop();
          } else if (this.lastSource !== null) {
            // there is a last beat but it has not played yet.
            // Wait for it to stop, then end.
            this.lastSource.addEventListener("ended", this.end.bind(this));
          } else if (this.queued === 0) {
            // the last beat has already played. End immediately.
            this.end();
          }
          return;
        }
        this.lastBeat = nextBeat;
        const { buffer } = nextBeat;
        this.queued += 1;

        const time = this.nextTime;
        this.nextTime += nextBeat.duration;
        buffer.then((buf) => {
          const nextSource = new AudioBufferSourceNode(this.audioCtx, {
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
    } catch (e) {
      console.log("error: stopping player");
      console.log(e);
      this.stop();
    }
  }
}

export default Player;
