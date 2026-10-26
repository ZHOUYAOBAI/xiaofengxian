'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 全局叙事淡入：接管所有 [data-reveal] 元素
 * 图片缓慢渐显 + 微弱视差；文字分块渐进淡入，节奏舒缓克制
 */
export default function Narrative() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');

      items.forEach((el, i) => {
        const isImage = el.tagName === 'IMG' || el.querySelector('img');
        const delay = Math.min(Number(el.dataset.revealDelay || 0), 0.4);
        const parallax = el.dataset.parallax === 'true' ? 14 : 0;

        gsap.fromTo(
          el,
          { opacity: 0, y: isImage ? 30 : 26, filter: parallax ? 'blur(0px)' : 'blur(0px)' },
          {
            opacity: 1,
            y: 0,
            duration: 1.5,
            delay: 0.08 + delay,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          }
        );

        if (parallax) {
          gsap.to(el, {
            y: -parallax,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          });
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
