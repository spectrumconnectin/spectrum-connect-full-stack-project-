/** @type {import('tailwindcss').Config} */
module.exports = {
  // Preview files are scanned too: they compose the components with layout and
  // tint classes that appear nowhere in src/, and Tailwind only emits what it
  // sees. Without this the cards render un-gridded and untinted while the
  // components themselves look fine — which is exactly how it presented.
  content: [
    './src/**/*.{ts,tsx}',
    './dist/**/*.js',
    './.design-sync/previews/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        cobalt: '#195ad7',
        'cobalt-deep': '#103a8c',
        'cobalt-2': '#1449b0',
        'off-white': '#FAFAFA',
        'light-gray': '#636363',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
