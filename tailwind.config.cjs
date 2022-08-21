/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      gridTemplateColumns: {
        "right-auto": "1fr auto",
        "left-auto": "auto 1fr",
        "mid-auto": "1fr minmax(auto,56rem) 1fr",
      },
      gridTemplateRows: {
        "fr-auto-auto": "1fr auto auto",
      },
    },
  },
  plugins: [],
};
