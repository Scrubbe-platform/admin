import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ibm: ["var(--font-ibm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        canvas: "#FFFFFF",
        surface: "#FFFFFF",
        raised: "#F3F6F4",
        line: "#E2E8E4",
        "line-strong": "#C7D1CB",
        ink: "#102018",
        "ink-muted": "#55635B",
        "ink-faint": "#6B7871",
        // Primary brand colour. The base shade falls short of 4.5:1 against white,
        // so `strong` is used wherever green meets text: green text on white, or
        // white text on a green fill. `hover` is the pressed/hover state of that fill.
        signal: {
          DEFAULT: "#0F9E31",
          strong: "#0C8429",
          hover: "#0A6F22",
          soft: "#E8F6EB",
        },
        // Warnings and unwired-endpoint notices, kept apart from the brand green
        // so a blocked state never reads as a success.
        caution: {
          DEFAULT: "#B45309",
          soft: "#FEF5E6",
        },
        // In-progress and informational states, distinct from success green.
        info: {
          DEFAULT: "#1D4FB8",
          soft: "#E8EFFC",
        },
        live: "#0B7A26",
        draft: "#5B6B82",
        danger: {
          DEFAULT: "#D92D20",
          soft: "#FDEDEC",
        },
      },
      borderRadius: {
        card: "10px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 140ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
