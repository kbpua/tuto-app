/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#07090f',
        'brand-blue': '#39a0ff',
        'brand-green': '#3fff8f',
        'brand-violet': '#9b4dff',
      },
      fontFamily: {
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 10px 40px rgba(57, 160, 255, 0.18), 0 0 0 1px rgba(57, 160, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
