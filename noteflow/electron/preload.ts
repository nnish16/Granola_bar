import { contextBridge, ipcRenderer } from "electron";
import type { NoteFlowApi } from "../src/types";

const api: NoteFlowApi = {
  meetings: {
    list: () => ipcRenderer.invoke("meetings:list"),
    get: (id) => ipcRenderer.invoke("meetings:get", id),
    create: (input) => ipcRenderer.invoke("meetings:create", input),
    update: (input) => ipcRenderer.invoke("meetings:update", input),
    delete: (id) => ipcRenderer.invoke("meetings:delete", id),
    search: (query) => ipcRenderer.invoke("meetings:search", query),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partialSettings) => ipcRenderer.invoke("settings:set", partialSettings),
  },
};

contextBridge.exposeInMainWorld("noteflow", api);
