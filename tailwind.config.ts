import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "background-subtle": "var(--background-subtle)",
        "surface-muted": "var(--surface-muted)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
