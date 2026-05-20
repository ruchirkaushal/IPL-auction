import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        "error-container": "#93000a",
        "inverse-on-surface": "#2c3136",
        "on-tertiary-container": "#ffad68",
        "on-secondary-fixed-variant": "#574500",
        "on-primary-container": "#a1bfff",
        "surface-variant": "#30353b",
        "on-primary": "#002e68",
        "primary-container": "#004ba0",
        "outline": "#8d909d",
        "surface-bright": "#353a3f",
        "tertiary-fixed-dim": "#ffb77d",
        "on-error-container": "#ffdad6",
        "inverse-primary": "#235cb2",
        "on-background": "#dee3ea",
        "secondary-fixed": "#ffe088",
        "surface-container-low": "#171c21",
        "outline-variant": "#424752",
        "surface-container-highest": "#30353b",
        "on-tertiary-fixed": "#2f1500",
        "surface-container-high": "#252a30",
        "background": "#050B14", /* Deep Navy */
        "on-surface": "#dee3ea",
        "on-tertiary": "#4d2600",
        "on-error": "#690005",
        "primary-fixed": "#d8e2ff",
        "tertiary-fixed": "#ffdcc3",
        "on-secondary-container": "#342800",
        "surface-container-lowest": "#03060A",
        "primary-fixed-dim": "#acc7ff",
        "surface-tint": "#acc7ff",
        "secondary": "#e9c349", /* Gold */
        "secondary-container": "#af8d11",
        "on-tertiary-fixed-variant": "#6e3900",
        "on-primary-fixed": "#001a41",
        "tertiary-container": "#783f00",
        "surface": "#08111D",
        "surface-dim": "#08111D",
        "secondary-fixed-dim": "#e9c349",
        "on-secondary-fixed": "#241a00",
        "tertiary": "#ffb77d",
        "primary": "#004ba0", /* IPL Blue */
        "surface-container": "#0A1526",
        "on-secondary": "#3c2f00",
        "on-surface-variant": "#c3c6d4",
        "error": "#ffb4ab",
        "on-primary-fixed-variant": "#004492",
        "inverse-surface": "#dee3ea"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.5rem",
        "xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        "margin-desktop": "48px",
        "section-gap": "64px",
        "unit": "4px",
        "margin-mobile": "24px",
        "gutter": "24px"
      },
      fontFamily: {
        "headline-xl": ["Anton", "sans-serif"],
        "headline-lg-mobile": ["Anton", "sans-serif"],
        "body-lg": ["Lexend", "sans-serif"],
        "headline-md": ["Anton", "sans-serif"],
        "headline-lg": ["Anton", "sans-serif"],
        "label-bold": ["Lexend", "sans-serif"],
        "body-md": ["Lexend", "sans-serif"]
      },
      fontSize: {
        "headline-xl": ["80px", { lineHeight: "1.1", letterSpacing: "0.02em", fontWeight: "400" }],
        "headline-lg-mobile": ["48px", { lineHeight: "1.1", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-md": ["28px", { lineHeight: "1.2", fontWeight: "400" }],
        "headline-lg": ["56px", { lineHeight: "1.2", fontWeight: "400" }],
        "label-bold": ["14px", { lineHeight: "1.2", letterSpacing: "0.1em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }]
      }
    },
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/forms'),
  ],
};

export default config;
