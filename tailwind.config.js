/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        belt: {
          amber: '#f59e0b',
          orange: '#f97316',
          glow: 'rgba(245,158,11,0.15)',
        },
      },
    },
  },
  plugins: [],
}
