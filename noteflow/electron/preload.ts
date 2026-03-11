import { contextBridge, ipcRenderer } from "electron";
import type { NoteFlowApi } from "../src/types";

const api: NoteFlowApi = {
  meetings: {
    list: (input) => ipcRenderer.invoke("meetings:list", input),
    get: (id) => ipcRenderer.invoke("meetings:get", id),
    create: (input) => ipcRenderer.invoke("meetings:create", input),
    update: (input) => ipcRenderer.invoke("meetings:update", input),
    delete: (id) => ipcRenderer.invoke("meetings:delete", id),
    search: (query) => ipcRenderer.invoke("meetings:search", query),
    transcript: (id) => ipcRenderer.invoke("meetings:transcript", id),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partialSettings) => ipcRenderer.invoke("settings:set", partialSettings),
  },
  audio: {
    start: (meetingId) => ipcRenderer.invoke("audio:start", meetingId),
    stop: () => ipcRenderer.invoke("audio:stop"),
    status: () => ipcRenderer.invoke("audio:status"),
    onChunk: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) => callback(data);
      ipcRenderer.on("audio:chunk", listener);
      return () => {
        ipcRenderer.off("audio:chunk", listener);
      };
    },
    onError: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) => callback(data);
      ipcRenderer.on("audio:error", listener);
      return () => {
        ipcRenderer.off("audio:error", listener);
      };
    },
    onStopped: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("audio:stopped", listener);
      return () => {
        ipcRenderer.off("audio:stopped", listener);
      };
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners("audio:chunk");
      ipcRenderer.removeAllListeners("audio:error");
      ipcRenderer.removeAllListeners("audio:stopped");
    },
  },
  notion: {
    sync: (meetingId) => ipcRenderer.invoke("notion:sync", meetingId),
    status: () => ipcRenderer.invoke("notion:status"),
  },
};

contextBridge.exposeInMainWorld("noteflow", api);
