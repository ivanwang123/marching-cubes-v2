/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      gridTemplateColumns: {
        "2-auto": "auto auto",
        "right-auto": "1fr auto",
        "mid-auto": "1fr minmax(auto,56rem) 1fr",
      },
      gridTemplateRows: {
        "fr-auto-auto": "1fr auto auto",
      },
    },
  },
  plugins: [],
};
