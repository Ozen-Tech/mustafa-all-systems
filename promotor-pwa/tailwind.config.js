/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#411A59',
          50: '#E8DFF0',
          100: '#D9CDE5',
          200: '#BBA8D0',
          300: '#9D84BB',
          400: '#7F5FA6',
          500: '#613A91',
          600: '#411A59',
          700: '#351549',
          800: '#291039',
          900: '#1D0B29',
        },
        accent: {
          DEFAULT: '#FBB03B',
          50: '#FFF8EC',
          100: '#FEF0D8',
          200: '#FDE1B1',
          300: '#FCD28A',
          400: '#FCC263',
          500: '#FBB03B',
          600: '#E99A1A',
          700: '#B67615',
          800: '#835510',
          900: '#50340A',
        },
        dark: {
          bg: '#0F0A1A',
          card: '#1A1225',
          elevated: '#241B32',
          border: '#2D2440',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
