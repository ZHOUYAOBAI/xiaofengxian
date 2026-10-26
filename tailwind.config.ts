import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1A24',
        ink2: '#16242E',
        ink3: '#1E303C',
        gold: '#C9A24B',
        goldSoft: '#D8BC7E',
        paper: '#FAF6EE',
        paper2: '#F1EADC',
        tea: '#8A7B6B',
        vermilion: '#B23A2E',
      },
      fontFamily: {
        serifcn: ['"Songti SC"', '"STSong"', '"Noto Serif SC"', '"Source Han Serif SC"', 'SimSun', 'serif'],
        sanscn: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
