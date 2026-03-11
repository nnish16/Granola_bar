import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import MeetingView from "./pages/MeetingView";
import SettingsPage from "./pages/Settings";
import { useSettingsStore } from "./store/settings.store";
import { useUiStore } from "./store/ui.store";

function applyTheme(theme: "system" | "light" | "dark"): void {
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDarkTheme = theme === "dark" || (theme === "system" && prefersDarkScheme);
  document.documentElement.classList.toggle("dark", shouldUseDarkTheme);
}

export default function App(): JSX.Element {
  const settings = useSettingsStore((state) => state.settings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const setTheme = useUiStore((state) => state.setTheme);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setTheme(settings.theme);
    applyTheme(settings.theme);
  }, [settings.theme, setTheme]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/meeting/:id" element={<MeetingView />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
