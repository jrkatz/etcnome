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

import { State } from "../../lib/export/exporter.js";

class Export {
  init(exportBtn, exporter) {
    this.exportBtn = exportBtn;
    this.exporter = exporter;
    this.toState(exporter.state);
    exporter.addEventListener("stateChange", (e) => this.toState(e.detail));
  }

  exportEnabled() {
    this.exportBtn.disabled = false;
    this.exportBtn.onclick = () => this.exporter.exportWav();
  }

  exportDisabled() {
    this.exportBtn.disabled = true;
  }

  toState(state) {
    if (state === State.ready) {
      this.exportEnabled();
    } else {
      this.exportDisabled();
    }
  }
}

export default Export;
