import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'page-bg': '#f5f5f5',
        'card-bg': '#ffffff',
        'card-border': '#e2e8f0',
        'text-body': '#000000',
        'text-muted': '#000000',
      },
      fontFamily: {
        mono: ['var(--font-input-mono)', 'monospace'],
        sans: ['var(--font-nhaas)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
