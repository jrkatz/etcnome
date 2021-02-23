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

// When play control is exercised:
// - If there is no running audio context, a new one is created and the
// section played through it.
// - If there is a running audio context, it is resumed.
// The play button is then transformed into a pause button.
//
// When the pause control is exercised, the audio context is suspended.
// When the stop button is exercised, the audio context is discarded.
// When the section ends, the audio context is discarded.

import Beaterator from "../track/beaterator.js";
import Ensemble from "../noises/ensemble.js";

// Delay the start of playback this long. Necessary because some browsers can't
// successfully play the first few milliseconds of audio, even if it scheduled
// for time 0 with the audio context suspended at time zero. We want to keep
// this value small so pressing 'play' feels responsive, but large enough
// the first beat is heard. The timing issue currently exists in firefox
// v 81.0.2 (64-bit) and safari v 14.0 (15610.1.28.1.9, 15610) - at least on my
// macbook. Frankly, my feeling is that although it works in chrome, we are in
// fact taking advantage of undefined behavior if we set the delay to 0 in
// chrome, and it could regress at any time. Ergo, we will not do browser
// detection here to shorten/remove the delay for chrome.
// .1s seems to be working fine for me, and still feels snappy. This is worth
// keeping an eye on, though.
const START_DELAY = 0.1;

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
    this.beaterator = new Beaterator(this.section, START_DELAY);
    this.state = State.empty;
    this.repeat = false;
    this.reset();
  }

  setRepeat(repeat) {
    this.repeat = repeat;
  }

  setTrack(section) {
    this.ensemble = new Ensemble();
    this.section = section;
    this.beaterator = new Beaterator(section, START_DELAY);
    // determine whether or not
    // the track is playable
    if (this.beaterator.hasNext()) {
      // it has at least one beat. It plays
      this.stop(); // transition to stopped state
    } else {
      this.empty();
    }
  }

  reset() {
    this.audioCtx?.close()?.catch(() => {
      // close inexplicably fails instead of doing nothing if the context is
      // already stopped. We 'handle' this by ignoring it.
    });
    this.beaterator = new Beaterator(this.section, START_DELAY);
  }

  messageState(state) {
    this.dispatchEvent(new CustomEvent("stateChange", { detail: state }));
  }

  changeState(state, action) {
    if (this.state === state) {
      this.messageState(state);
      return Promise.resolve(state);
    }
    return action(this.state)
      .then(() => {
        this.state = state;
        this.messageState(state);
        return state;
      })
      .catch((err) => {
        console.error(err);
        return this.stop();
      });
  }

  empty() {
    // ensure this always stops player, regardless
    // the state the player thinks it is in.
    this.reset();
    this.changeState(State.empty, () => {
      return Promise.resolve();
    });
  }

  stop() {
    // ensure that stop _always_ stops, regardless
    // the state the player thinks it is in.
    this.reset();
    this.changeState(State.stopped, () => {
      return Promise.resolve();
    });
  }

  play() {
    this.changeState(State.playing, (prevState) => {
      if (!this.section) {
        return Promise.reject(new Error(`Nothing to play`));
      }
      if (prevState !== State.paused) {
        // queue something up
        this.audioCtx = new AudioContext();
        // to appease safari, we call resume right away in the event handler.
        // The first time 'resume' is called cannot be in a callback, as then
        // safari can't tie it to a user action and it trips the autoplay
        // blockers. Other browsers are better at handling this.
        // However, we also want to wait until we've queued beats to _actually_
        // play audio:
        return this.audioCtx
          .resume()
          .then(() => this.audioCtx.suspend())
          .then(() => this.queue())
          .then(() => this.audioCtx.resume());
      }
      return this.audioCtx.resume();
    });
  }

  pause() {
    this.changeState(State.paused, () => {
      return this.audioCtx.suspend();
    });
  }

  schedule({ soundSpec, time }) {
    const click = this.ensemble.getSound(soundSpec, this.audioCtx.sampleRate);
    return click.then((buffer) => {
      if (!this.audioCtx) {
        // handle race condition when player has stopped
        return null;
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);
      source.start(time);
      return source;
    });
  }

  // if we run out, we need to handle the possibility
  // that we are repeating, but we can't check whether
  // the repeat button is toggled _now_. We have to check
  // its status at the end of the last beat of the track,
  // and we may need the first few beats queued up
  // already. Set a listener for the end of the last beat,
  // and if repeat is not toggled then, call stop (which
  // will kill playback of any beats we've scheduled too far
  // in advance.
  // This causes a small audio glitch when the duration
  // of the last beat audio + the time of the event loop
  // tick extends beyond the nominal end of the track and
  // repeat is disabled, because we end up hearing at least
  // part of the first beat of the bar again before the
  // 'ended' message is recieved and we call stop.
  wrap(lastSource) {
    this.beaterator.toStart();
    const next = this.beaterator.next();
    lastSource.then((source) =>
      source.addEventListener("ended", () => {
        // if we're not repeating (or we are, but there was nothing next) stop.
        if (!this.repeat || !next) {
          this.stop();
        }
      })
    );
    return next;
  }

  // handle the base case by retrieving the next beat as a default argument.
  queue(beat = this.beaterator.next()) {
    try {
      if (!beat) {
        // if somehow we pass a non-beat here, there is very little we can do -
        // either it is the start of a track with no beats (so stopping is
        // correct), or something has gone very wrong elsewhere. Stopping makes
        // sense then, too.
        this.stop();
      }
      const { time } = beat;
      let sourcePromise = this.schedule(beat);
      return sourcePromise.then((source) => {
        const realDuration = source.buffer.length / this.audioCtx.sampleRate;
        let next = this.beaterator.next() || this.wrap(sourcePromise);
        // schedule up any beats that need to start before this sample
        // finishes. It's a dumb edge case, but possible if a click
        // sample with long silence is used, or if an extreme tempo
        // is selected as a joke. (Rather than fail, we should make
        // sure the joke works.)
        // Pad the duration considerably - using the exact number falls apart
        // when the time between beats is very small because we may still
        // run out of audio after playback ends, but before the next tick
        // returns control to t he 'ended' handler.
        // Using a higher duration also keeps this code path a bit hotter
        // which keeps it _tested_, and that has value in itself.
        while (next?.time < time + realDuration * 5) {
          sourcePromise = this.schedule(next);
          next = this.beaterator.next() || this.wrap(sourcePromise);
        }

        // normal path: when this beat is done playing, prepare the next one.
        if (next) {
          source.addEventListener("ended", () => {
            this.queue(next);
          });
        }
      });
    } catch (e) {
      console.error("error: stopping player");
      console.error(e);
      this.stop();
      return null;
    }
  }
}

export default Player;
