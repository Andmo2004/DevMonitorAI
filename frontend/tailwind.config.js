/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        dm: {
          background: "var(--background)",
          foreground: "var(--foreground)",
          card: "var(--card)",
          popover: "var(--popover)",
          primary: "var(--primary)",
          secondary: "var(--secondary)",
          "muted-foreground": "var(--muted-foreground)",
          accent: "var(--accent)",
          destructive: "var(--destructive)",
          border: "var(--border)",
          "glass-border": "var(--glass-border)",
          ring: "var(--ring)",
          success: "var(--success)",
          warning: "var(--warning)",
          info: "var(--info)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
          6: "var(--chart-6)",
          7: "var(--chart-7)",
          8: "var(--chart-8)",
          9: "var(--chart-9)",
        },
      },
      /* Unified border-radius scale: 12 → 16 → 20 → 24px (mathematical progression) */
      borderRadius: {
        lg: "0.75rem",     /* 12px — inputs, badges, icon containers */
        xl: "1rem",        /* 16px — buttons, pills, internal elements */
        "2xl": "1.25rem",  /* 20px — secondary cards, dropdowns */
        "3xl": "1.5rem",   /* 24px — primary cards, panels */
      },
      /* Z-index token system — no more magic values */
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      animation: {
        "float-in": "float-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
