/** 物绘流光 PhysFlux - Tailwind 配置（国风莫兰迪色板） */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F5F2EC', 100: '#EDE8DF', 200: '#D9D2C5',
          300: '#A8B5B0', 400: '#8B9A94', 500: '#6B7B8C',
          600: '#5A6A78', 700: '#3E4A55', 800: '#2A323A', 900: '#1E2226',
        },
        ochre: { light: '#E0C9B0', DEFAULT: '#C9A88A', dark: '#B08D6A' },
        gold: { light: '#E6C49A', DEFAULT: '#D4A574', dark: '#B8895A' },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
