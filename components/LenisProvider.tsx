'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis 全局平滑滚动 —— 只在根 layout 挂载一次（规范硬性约束）
 * 与 GSAP ScrollTrigger 通过 gsap.ticker 同频联动
 */
export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // 锚点跳转走 Lenis
    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
    const onClick = (e: MouseEvent) => {
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6 });
      }
    };
    anchors.forEach((a) => a.addEventListener('click', onClick));

    return () => {
      gsap.ticker.remove(raf);
      anchors.forEach((a) => a.removeEventListener('click', onClick));
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
