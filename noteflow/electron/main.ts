import { app, BrowserWindow } from "electron";
import path from "node:path";
import { initializeDatabaseWorker } from "./db/worker-client";
import { registerMeetingsIpcHandlers } from "./ipc/meetings.ipc";
import { registerNotesIpcHandlers } from "./ipc/notes.ipc";
import { registerSettingsIpcHandlers } from "./ipc/settings.ipc";

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: "#FFFFFF",
    title: "NoteFlow",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  return window;
}

function registerIpcHandlers(): void {
  registerMeetingsIpcHandlers();
  registerNotesIpcHandlers();
  registerSettingsIpcHandlers();
}

void app.whenReady().then(async () => {
  app.setName("NoteFlow");
  process.env.NOTEFLOW_ROOT_DIR = path.resolve(process.cwd());
  process.env.NOTEFLOW_DATA_DIR = app.getPath("userData");
  process.env.NOTEFLOW_IS_PACKAGED = app.isPackaged ? "true" : "false";

  await initializeDatabaseWorker();
  registerIpcHandlers();

  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
