/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      gridTemplateColumns: {
        "2-auto": "auto auto",
        "right-auto": "1fr auto",
        "mid-auto": "1fr max(56rem) 1fr",
      },
    },
  },
  plugins: [],
};
