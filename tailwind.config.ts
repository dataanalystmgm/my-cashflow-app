import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}", // Tambahkan ini agar aman
  ],
  theme: {
    extend: {
      colors: {
        // Anda bisa kustomisasi warna khusus di sini jika mau
      },
    },
  },
  plugins: [],
};
export default config;