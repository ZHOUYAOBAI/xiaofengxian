'use client';

import { useEffect, useState } from 'react';
import { anchorClick, homeClick } from './nav-utils';

const LINKS = [
  { href: '#story', label: '这出戏' },
  { href: '#cast', label: '角色' },
  { href: '#guide', label: '来看戏' },
  { href: '#listen', label: '原声' },
  { href: '#join', label: '加入我们' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? 'rgba(14, 26, 36, 0.86)'
          : 'linear-gradient(to bottom, rgba(14,26,36,0.7), transparent)',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(201,162,75,0.14)' : 'none',
      }}
    >
      <div className="shell flex items-center justify-between h-20">
        <a href="#" onClick={homeClick} className="font-cn text-[19px] tracking-[0.14em] text-paper no-underline">
          蔡锷与小凤仙
          <span className="block text-[11px] tracking-[0.3em] text-gold/80 mt-0.5">庭院音乐剧</span>
        </a>

        <nav className="hidden md:flex items-center gap-9" aria-label="主导航">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={anchorClick(l.href)}
              className="text-[13.5px] tracking-[0.16em] text-paper/75 hover:text-gold-soft transition-colors no-underline"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#studio"
            onClick={anchorClick('#studio')}
            className="px-5 py-2 rounded-full text-[13px] tracking-[0.14em] no-underline transition-all"
            style={{
              border: '1px solid rgba(201,162,75,0.35)',
              color: '#D8BC7E',
            }}
          >
            我的剧场
          </a>
        </nav>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-expanded={open}
          aria-label="展开导航"
          onClick={() => setOpen(!open)}
        >
          <span className="block w-6 h-px bg-paper/80" />
          <span className="block w-6 h-px bg-paper/80" />
          <span className="block w-4 h-px bg-paper/80 ml-auto" />
        </button>
      </div>

      {open && (
        <nav className="md:hidden px-6 pb-6 flex flex-col gap-4 bg-ink/95" aria-label="移动端导航">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                anchorClick(l.href)(e);
                setOpen(false);
              }}
              className="text-[15px] tracking-[0.16em] text-paper/85 no-underline"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#studio"
            onClick={(e) => {
              anchorClick('#studio')(e);
              setOpen(false);
            }}
            className="text-[15px] tracking-[0.14em] text-gold-soft no-underline"
          >
            我的剧场
          </a>
        </nav>
      )}
    </header>
  );
}
