import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";

let mainWindow = null;
let apiServer = null;

async function bootApp() {
  const userDataDir = app.getPath("userData");
  process.env.DATA_FILE = path.join(userDataDir, "state.json");
  process.env.SEED_DATA_FILE = path.join(app.getAppPath(), "data", "state.json");
  process.env.STATIC_DIR = path.join(app.getAppPath(), "ui", "dist");
  process.env.LOCALEWEAVE_ENV_DIR = path.dirname(process.execPath);
  process.env.PORT = process.env.PORT || "4010";

  const { startServer } = await import("../src/server.mjs");
  apiServer = await startServer({
    port: Number(process.env.PORT),
    host: "127.0.0.1",
  });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: "#f4f1f9",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(`http://127.0.0.1:${process.env.PORT}`);
}

app.whenReady().then(() => (
  bootApp().catch(async error => {
    const message = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
    await dialog.showErrorBox("LocaleWeave failed to start", message);
    app.quit();
  })
));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootApp().catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      dialog.showErrorBox("LocaleWeave failed to reopen", message);
    });
  }
});

app.on("before-quit", async () => {
  if (apiServer) {
    await new Promise(resolve => apiServer.close(resolve));
    apiServer = null;
  }
});
