/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      // 标准响应式断点
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // 横竖屏方向断点
      'portrait': { 'raw': '(orientation: portrait)' },
      'landscape': { 'raw': '(orientation: landscape)' },
      // 竖屏细分断点
      'portrait-sm': { 'raw': '(orientation: portrait) and (max-width: 640px)' },
      'portrait-md': { 'raw': '(orientation: portrait) and (min-width: 641px) and (max-width: 1024px)' },
      'portrait-lg': { 'raw': '(orientation: portrait) and (min-width: 1025px)' },
      // 横屏细分断点
      'landscape-sm': { 'raw': '(orientation: landscape) and (max-height: 640px)' },
      'landscape-md': { 'raw': '(orientation: landscape) and (min-height: 641px)' },
    },
    extend: {
      colors: {
        // 示例学校主题色系 (Aurora Teal)
        yuwen: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // 主色调
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // 深空背景色系
        space: {
          DEFAULT: '#050510',
          light: '#0f172a',
          dark: '#020608',
        },
        // 保留原有配色
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        dark: {
          100: '#1e293b',
          200: '#0f172a',
          300: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'aurora': '0 0 30px rgba(20, 184, 166, 0.15)',
        'aurora-lg': '0 0 60px rgba(20, 184, 166, 0.2)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 1s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        shine: {
          '0%': { left: '-100%' },
          '100%': { left: '125%' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(20, 184, 166, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
