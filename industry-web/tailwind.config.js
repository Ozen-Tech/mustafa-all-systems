/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          950: '#0B1F1C',
          900: '#12302B',
          800: '#1A3F38',
          700: '#24564C',
          100: '#E6F2EF',
          50: '#F3FAF7',
        },
        sand: {
          100: '#F4EDE3',
          50: '#FAF6F0',
        },
        accent: {
          500: '#C45C26',
          600: '#A84A1A',
        },
      },
    },
  },
  plugins: [],
};
