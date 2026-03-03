/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#111118',
        surface2: '#18181f',
        border: '#222230',
        text: '#e8e8f0',
        muted: '#5a5a70',
        accent: '#7fff9e',
        accent2: '#ff7eb3',
        accent3: '#7eb8ff',
        task: '#7eb8ff',
        note: '#ffd97e',
        reminder: '#ff7eb3',
      },
      fontFamily: {
        sans: ['DMSans_400Regular', 'DMSans_500Medium', 'DMSans_700Bold'],
        mono: ['SpaceMono_400Regular', 'SpaceMono_700Bold'],
      },
    },
  },
  plugins: [],
};
