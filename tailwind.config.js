/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        field: '#f3f7fd',
        brand: '#2563eb',
        skybrand: '#38bdf8',
        paid: '#15803d',
        warning: '#d97706',
      },
      boxShadow: {
        soft: '0 10px 28px rgba(37, 99, 235, 0.10)',
      },
    },
  },
  plugins: [],
};
