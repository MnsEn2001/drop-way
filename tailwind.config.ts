// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // สำคัญมาก! ต้องครอบ src/app และ src/components ทั้งหมด
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "linear-to-r": "linear-gradient(to right, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
