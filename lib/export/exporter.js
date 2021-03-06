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

import recorder from "./recorder.js";
import wavExport from "./wavExport.js";
import fileUtil from "../util/fileUtil.js";

// between this and player we are circling around
// the concept of event driven state machines.
// TODO extract that concept to util class, let both employ it.
export const State = Object.freeze({
  empty: "empty", // unable to transition to exporting
  ready: "ready", // ready to export
  exporting: "exporting", // exporting right now.
});

class Exporter extends EventTarget {
  constructor() {
    super();
    this.track = null;
    this.state = State.empty;
    this.type = ".wav";
  }

  // event - set track
  setTrack(track) {
    this.track = track;
    const beaterator = track?.makeBeaterator();
    if (beaterator?.hasNext()) {
      this.toReady();
    } else {
      this.toEmpty();
    }
  }

  // event - export complete
  exportComplete() {
    // reset.
    this.toReady();
  }

  messageState(state) {
    this.dispatchEvent(new CustomEvent("stateChange", { detail: state }));
  }

  changeState(state, action) {
    if (this.state === state || !action) {
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
        this.setTrack(this.track);
      });
  }

  export() {
    return this.changeState(State.exporting)
      .then(() => {
        if (!this.track?.makeBeaterator()?.hasNext()) {
          return Promise.reject(new Error("Nothing to export"));
        }
        return recorder
          .record(this.track)
          .then((buffer) => wavExport.bufferToWavBlob(buffer))
          .then((blob) =>
            fileUtil.saveFile(blob, ".wav file(s)", "audio/wav", [".wav"])
          );
      })
      .finally(() => this.exportComplete());
  }

  toReady() {
    this.changeState(State.ready, () => {
      return Promise.resolve();
    });
  }

  toEmpty() {
    this.changeState(State.empty);
  }
}

export default Exporter;
