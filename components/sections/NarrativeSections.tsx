'use client';

import { STORY_HEAD, ACTS, SPACES, CAST_HEAD, ROLES, PULL_QUOTE } from '@/lib/content';

/* ============ THE STORY 八幕叙事 ============ */
export function StorySection() {
  return (
    <section id="story" className="section relative z-10" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">{STORY_HEAD.kicker}</span>
          <h2 className="t-title font-cn">
            八大胡同里的<span style={{ color: 'var(--vermilion)' }}>护国棋局</span>
          </h2>
          <p className="t-lead">{STORY_HEAD.lead}</p>
        </div>

        <div className="flex flex-col gap-4">
          {ACTS.map((a, i) => (
            <div
              key={a.num}
              data-reveal
              data-reveal-delay={String(Math.min(i * 0.05, 0.3))}
              className="grid md:grid-cols-[190px_1fr] gap-6 md:gap-10 items-start py-7 border-b"
              style={{ borderColor: 'rgba(139, 123, 107, 0.18)' }}
            >
              <div>
                <div className="font-cn text-[24px] text-[#16302A]">{a.num}</div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="font-cn text-[15px] tracking-[0.2em]" style={{ color: 'var(--vermilion)' }}>
                    {a.title}
                  </span>
                  <span className="text-[12px] text-[#8A7B6B]">{a.sceneCount} 场</span>
                </div>
              </div>
              <div>
                <p className="text-[15.5px] leading-[1.95] text-[#4A4038]">{a.intro}</p>
                {a.songs.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {a.songs.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-[12px] tracking-[0.08em]"
                        style={{ background: 'rgba(201,162,75,0.12)', color: '#8C6F2E', border: '1px solid rgba(201,162,75,0.3)' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ TWO SPACES 双空间（全幅图叠加） ============ */
export function SpacesSection() {
  return (
    <section className="relative overflow-hidden">
      {/* 插槽：庭院排练实景，可替换为马家大院实拍 */}
      <div data-reveal className="relative">
        <img
          src="./assets/img-courtyard-scene.webp"
          alt="马家大院庭院 · 排练灯光与布景"
          className="w-full h-[72vh] object-cover"
          style={{ filter: 'brightness(0.7) saturate(0.85) sepia(0.1)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(14,26,36,0.55), rgba(14,26,36,0.82))' }} />
        <div className="absolute inset-0 flex items-center">
          <div className="shell">
            <div data-reveal className="t-kicker on-dark mb-6">{SPACES.kicker}</div>
            <h2 data-reveal data-reveal-delay="0.12" className="font-cn text-[clamp(28px,4.4vw,46px)] leading-[1.3] text-paper max-w-[680px]">
              {SPACES.titleA}
              <br />
              <span style={{ color: 'var(--gold-soft)' }}>{SPACES.titleB}</span>
            </h2>
            <p data-reveal data-reveal-delay="0.24" className="mt-7 max-w-[560px] text-[16px] leading-[2] text-paper/70">
              {SPACES.lead}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ THE CAST 人物谱 ============ */
export function CastSection() {
  const lead = ROLES.filter((r) => r.lead);
  const rest = ROLES.filter((r) => !r.lead);

  return (
    <section id="cast" className="section relative z-10" style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}>
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">{CAST_HEAD.kicker}</span>
          <h2 className="t-title font-cn">
            八个人，一盘<span style={{ color: 'var(--vermilion)' }}>没下完的棋</span>
          </h2>
          <p className="t-lead">{CAST_HEAD.lead}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {lead.map((r) => (
            <div
              key={r.name}
              data-reveal
              className="p-8 rounded-2xl relative overflow-hidden"
              style={{ background: 'var(--ink)', color: 'var(--paper)', minHeight: 240 }}
            >
              <span className="absolute right-6 top-6 w-3 h-3 rounded-full" style={{ background: r.color }} />
              <div className="font-cn text-[34px]">{r.name}</div>
              <div className="mt-3 text-[13px] tracking-[0.14em]" style={{ color: 'var(--gold-soft)' }}>
                {r.name === '蔡锷' ? '执棋者，却从未算到她' : '唯一没算到的变数'}
              </div>
              <p className="mt-5 text-[15px] leading-[1.95] text-paper/70">{r.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((r) => (
            <div
              key={r.name}
              data-reveal
              className="p-7 rounded-2xl"
              style={{ background: 'var(--paper)', border: '1px solid rgba(139,123,107,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                <div className="font-cn text-[19px] text-[#16302A]">{r.name}</div>
              </div>
              <p className="mt-4 text-[14.5px] leading-[1.9] text-[#4A4038]">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* 卡司区附图插槽（可替换为演员合影） */}
        <div data-reveal className="mt-10 relative rounded-2xl overflow-hidden h-[340px]">
          <img src="./assets/img-cast.webp" alt="卡司合影 · 插槽" className="w-full h-full object-cover" style={{ filter: 'brightness(0.78) sepia(0.1)' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1A24]/80 to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ============ 引言 ============ */
export function PullQuote() {
  return (
    <section className="py-24 relative z-10 overflow-hidden" style={{ background: 'var(--ink)' }}>
      <div className="shell text-center" data-reveal>
        <p className="font-cn text-[clamp(28px,4.5vw,46px)] leading-[1.5] text-paper/90">
          {PULL_QUOTE.q1}
          <br />
          <span style={{ color: 'var(--gold-soft)' }}>{PULL_QUOTE.q2}</span>
        </p>
        <p className="mt-6 text-[13px] tracking-[0.3em] text-paper/40">{PULL_QUOTE.by}</p>
      </div>
    </section>
  );
}
