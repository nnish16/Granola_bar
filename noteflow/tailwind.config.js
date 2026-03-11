/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--color-accent)",
        "accent-dark": "var(--color-accent-dark)",
        border: "var(--color-border)",
        canvas: "var(--color-bg)",
        panel: "var(--color-sidebar-bg)",
        secondary: "var(--color-secondary)",
        user: "var(--color-user-text)",
        ai: "var(--color-ai-text)",
      },
      fontFamily: {
        sans: ["var(--font-ui)"],
        display: ["var(--font-display)"],
      },
      maxWidth: {
        editor: "var(--editor-max-width)",
      },
      spacing: {
        topbar: "var(--topbar-height)",
        sidebar: "var(--sidebar-width)",
        editor: "var(--editor-padding)",
      },
      boxShadow: {
        shell: "0 18px 60px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
