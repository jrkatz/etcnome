const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
    },
    width: 900,
    height: 600,
  });

  win.webContents.openDevTools();
  win.loadFile("app/etcnome.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
