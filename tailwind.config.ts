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
        cream: "#FFFDF7",
        mocha: "#4A3F35",
        "mocha-light": "#8C7E72",
        peach: "#FF9EAA",
        "peach-dark": "#FF8093",
        mint: "#A8E6CF",
        butter: "#FFE599",
        lavender: "#E2D4F0",
      },
    },
  },
  plugins: [],
};
export default config;
