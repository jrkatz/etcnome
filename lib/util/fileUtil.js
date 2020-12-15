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

const withPermission = (handle) => {
  return handle
    .queryPermission({ mode: "readwrite" })
    .then((perm) => {
      switch (perm) {
        case "granted":
          // permission alraedy granted.
          return perm;
        case "denied":
          // permission can _not_ be granted
          return perm;
        default:
          // prompt for permission
          return handle.requestPermission({ mode: "readwrite" });
      }
    })
    .then((perm) => {
      return { handle, perm };
    });
};

const writeToHandle = (handle, blob) => {
  return handle
    .createWritable()
    .then((writable) => writable.write(blob).then(() => writable.close()));
};

// this is crummy, but it will work fairly reliably.
const writeAsDownload = (blob, mimetype) => {
  const url = URL.createObjectURL(new Blob([blob], { type: mimetype }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "untitled.wav";
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const saveFile = (blob, description, mimetype, extensions) => {
  if (
    !window.showSaveFilePicker ||
    navigator.userAgent.toLowerCase().indexOf(" electron/") >= 0
  ) {
    // cool new file saving APIs don't seem to work in electron.
    writeAsDownload(blob);
    return Promise.resolve();
  }
  const accept = {};
  accept[mimetype] = extensions;
  return window
    .showSaveFilePicker({ types: [{ description, accept }] })
    .then((handle) => withPermission(handle))
    .then(({ handle, perm }) =>
      perm === "granted"
        ? writeToHandle(handle, blob)
        : // fall back to old school garbage.
          writeAsDownload(blob, mimetype)
    );
};

export default { saveFile };
