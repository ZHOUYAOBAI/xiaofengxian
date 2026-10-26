'use client';

import { HERO } from '@/lib/content';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: 'var(--ink)' }}>
      {/* 背景剧照：缓慢渐显 + 微弱视差（插槽：可替换为马家大院实拍夜景） */}
      <div
        data-reveal
        data-parallax="true"
        className="absolute inset-0 z-0"
        style={{ opacity: 0, transform: 'translateY(0)' }}
      >
        <img
          src="./assets/img-stage-night.webp"
          alt="舞台夜景 · 马家大院"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.62) saturate(0.85) sepia(0.12)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(14,26,36,0.72) 0%, rgba(14,26,36,0.38) 45%, rgba(14,26,36,0.9) 100%)',
          }}
        />
        {/* 胶片暗角 */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(14,26,36,0.5) 100%)' }}
        />
      </div>

      <div className="shell relative z-10 pt-32 pb-24 grid md:grid-cols-[1.2fr_0.8fr] gap-14 items-center">
        <div>
          <div data-reveal className="t-kicker on-dark mb-6">{HERO.kicker}</div>
          <h1
            data-reveal
            data-reveal-delay="0.1"
            className="font-cn text-[clamp(44px,7vw,76px)] leading-[1.16] text-paper"
          >
            蔡锷与<em className="not-italic" style={{ color: 'var(--gold-soft)' }}>小凤仙</em>
          </h1>
          <p data-reveal data-reveal-delay="0.2" className="mt-8 max-w-[520px] text-[17px] leading-[2] text-paper/70">
            {HERO.lede}
          </p>
          <div data-reveal data-reveal-delay="0.3" className="mt-10 flex flex-wrap gap-4">
            <a href="#showings" className="btn btn-gold">查看本月场次</a>
            <a href="#story" className="btn" style={{ borderColor: 'rgba(250,246,238,0.3)', color: 'var(--paper)' }}>
              认识这出戏
            </a>
          </div>

          <div data-reveal data-reveal-delay="0.4" className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-[560px]">
            {HERO.facts.map((f) => (
              <div key={f.k}>
                <div className="text-[11px] tracking-[0.3em] text-paper/40 mb-1.5">{f.k}</div>
                <div className="font-cn text-[20px] text-paper">
                  {f.v}
                  <span className="ml-1.5 text-[12px] tracking-[0.12em] text-paper/50">{f.s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 近期场次悬浮卡（数据由 Showings 板块共享状态注入，此处为骨架插槽） */}
        <aside data-reveal data-reveal-delay="0.25" className="hidden md:block">
          <div
            className="rounded-2xl p-7"
            style={{ background: 'rgba(14,26,36,0.66)', border: '1px solid rgba(201,162,75,0.22)', backdropFilter: 'blur(10px)' }}
          >
            <div className="flex items-baseline justify-between mb-5">
              <b className="font-cn text-[15px] tracking-[0.1em] text-paper">近期演出</b>
              <span className="text-[12px] tracking-[0.2em] text-gold/80">2026 · 11-12 月</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                ['11月07日', '周六 19:30', '余票充足'],
                ['11月14日', '周六 19:30', '仅余少量'],
                ['11月21日', '周六 19:30', '推荐场次'],
              ].map((r) => (
                <div
                  key={r[0]}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(250,246,238,0.05)', border: '1px solid rgba(201,162,75,0.12)' }}
                >
                  <span className="font-cn text-[14px] text-paper/85">{r[0]}</span>
                  <span className="text-[12px] text-paper/45">{r[1]}</span>
                  <span className="text-[12px]" style={{ color: 'var(--gold-soft)' }}>{r[2]}</span>
                </div>
              ))}
            </div>
            <a href="#showings" className="link-line inline-block mt-6 text-[13.5px]">全部场次与预约 →</a>
          </div>
        </aside>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" aria-hidden>
        <span className="text-[10px] tracking-[0.5em] text-paper/35">SCROLL</span>
        <span className="text-[14px] text-paper/45">↓</span>
      </div>
    </section>
  );
}
