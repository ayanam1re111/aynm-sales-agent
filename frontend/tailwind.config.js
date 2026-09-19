/** @type {import('tailwindcss').Config} */
// 设计令牌全部来自 docs/DESIGN-SPEC.md，改色值请先改文档再改这里
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F7FF',
        sidebar: '#F1F5FF',
        surface: '#FFFFFF',
        line: '#DCE6F7',
        glass: 'rgba(255, 255, 255, 0.72)',
        ink: {
          DEFAULT: '#182451', // text-primary
          soft: '#7B88AE', // text-secondary
          mute: '#9AA5C2', // text-muted（时间、耗时）
        },
        brand: {
          DEFAULT: '#5964F5',
          deep: '#4D8BF5',
          cyan: '#39BDEB',
        },
        danger: '#E5484D',
        warning: '#E9A23B',
        info: '#3B82F6',
        chart: {
          line: '#5B68F6',
          grid: '#E9ECF7',
          axis: '#7A83A6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        // 标题专用：拉丁走 Sora，中文回落到思源宋体（本机已装，无需下载）
        display: ['Sora', 'Noto Serif SC', 'Source Han Serif SC', 'serif'],
      },
      // [fontSize, lineHeight]
      fontSize: {
        product: ['24px', '32px'],
        session: ['18px', '26px'],
        chart: ['16px', '24px'],
        body: ['15px', '26px'],
        ui: ['14px', '22px'],
        hint: ['13px', '20px'],
        meta: ['12px', '18px'],
      },
      borderRadius: {
        btn: '12px',
        bubble: '16px',
        chart: '14px',
        card: '24px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(64, 87, 150, 0.08)',
        loginCard: '0 24px 70px rgba(74, 102, 190, 0.16)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #5964F5 0%, #39BDEB 100%)',
        'page-gradient': 'linear-gradient(160deg, #F4F7FF 0%, #EEF4FF 100%)',
      },
      spacing: {
        sidebar: '272px',
        brand: '280px',
        header: '72px',
      },
      keyframes: {
        'agent-float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        'dot-pulse': {
          '0%,80%,100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'agent-float': 'agent-float 3.8s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
