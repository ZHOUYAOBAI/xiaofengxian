import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Atmosphere from '@/components/Atmosphere';
import LenisProvider from '@/components/LenisProvider';
import Narrative from '@/components/Narrative';

export const metadata: Metadata = {
  metadataBase: new URL('https://zhouyaobai.github.io/xiaofengxian'),
  title: '蔡锷与小凤仙 · 庭院音乐剧 | 云南钟声音乐制作有限公司',
  description:
    '《蔡锷与小凤仙》庭院音乐剧，1915 年昆明，八大胡同的一场护国棋局。六幕二十八曲，驻场演出每月一场，观众可在线预约。',
  openGraph: {
    title: '蔡锷与小凤仙 · 庭院音乐剧',
    description: '从遇、识、计、机到离——六幕之间，一对水火难容的男女，演了一场惊天动地的革命。',
    type: 'website',
    images: ['/assets/img-finale.webp'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {/* 底层薄纱雾气氛围层（pointer-events:none，不挡交互） */}
        <Atmosphere />
        {/* 顶栏导航 */}
        <Nav />
        {/* Lenis 全局平滑滚动（根 layout 唯一初始化） */}
        <LenisProvider>
          {/* 全局叙事淡入（接管所有 [data-reveal]） */}
          <Narrative />
          <main className="relative z-10">{children}</main>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
