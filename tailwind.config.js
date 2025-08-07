/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        iosBlue: '#0a84ff',
        iosGray: '#1c1c1e'
      },
      screens: {
        xs: '360px'
      }
    }
  },
  plugins: []
}
