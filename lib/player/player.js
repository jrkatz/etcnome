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

import Beaterator from "./beaterator.js";

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
    this.beaterator = new Beaterator(this.section);
    this.state = State.empty;
    this.repeat = false;
    this.reset();
  }

  setRepeat(repeat) {
    this.repeat = repeat;
  }

  setTrack(section) {
    this.section = section;
    this.beaterator = new Beaterator(section);
    // determine whether or not
    // the track is playable
    if (this.beaterator.hasNext()) {
      // it has at least one beat. It plays
      this.stop(); // transition to stopped state
    } else {
      this.empty();
    }
  }

  reset(audioCtx) {
    this.audioCtx?.suspend();
    this.audioCtx = audioCtx;
    this.beaterator = new Beaterator(this.section);
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
        this.section.ready().then(() => this.queue());
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

  queue(beat = this.beaterator.next()) {
    try {
      if (!beat) {
        this.stop();
      }
      const { buffer, time } = beat;

      buffer.then((buf) => {
        const source = new AudioBufferSourceNode(this.audioCtx, {
          buffer: buf,
        });
        this.lastSource = source;
        const next = this.beaterator.next();
        source.addEventListener("ended", () => {
          // TODO waiting until the end works up to a point,
          // but falls apart if beats overlap, which might happen
          // erroneously if for example a sample with a long
          // silent end is selected as a click. Or by somebody
          // fooling with extreme tempos. But we intend to
          // surprise that person - with functioning software.
          if (next) {
            this.queue(next);
          } else if (this.repeat) {
            this.beaterator.toStart();
            this.queue();
          } else {
            this.stop();
          }
        });
        source.connect(this.audioCtx.destination);
        source.start(time);
      });
    } catch (e) {
      console.log("error: stopping player");
      console.log(e);
      this.stop();
    }
  }
}

export default Player;
