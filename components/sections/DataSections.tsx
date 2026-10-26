'use client';

import { useState } from 'react';
import { SITE_DATA, fmtDate } from '@/lib/site-data';

/* ============ SHOWINGS 演出场次（含预约，localStorage） ============ */
export function ShowingsSection({ variant = 'full' }: { variant?: 'recent' | 'full' }) {
  const [booked, setBooked] = useState<Record<string, number>>({});
  const [toast, setToast] = useState('');

  const showings = variant === 'recent' ? SITE_DATA.showings.slice(0, 3) : SITE_DATA.showings;

  const reserve = (id: string, name: string, date: string) => {
    const cur = JSON.parse(localStorage.getItem('xfx-bookings') || '[]') as {
      id: string;
      date: string;
      name: string;
    }[];
    if (cur.some((b) => b.id === id)) {
      setToast('这场你已经预约过了');
    } else {
      cur.push({ id, date, name });
      localStorage.setItem('xfx-bookings', JSON.stringify(cur));
      setToast(`已预约 ${name} · 可在「我的剧场 · 我的预约」查看`);
    }
    const next: Record<string, number> = { ...booked };
    next[id] = (next[id] || 0) + 1;
    setBooked(next);
    window.setTimeout(() => setToast(''), 3600);
  };

  return (
    <section
      id={variant === 'recent' ? 'recent-shows' : 'showings'}
      className="section relative z-10"
      style={variant === 'recent' ? { background: 'var(--ink)', color: 'var(--paper)' } : { background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">{variant === 'recent' ? 'UPCOMING' : 'SHOWINGS'}</span>
          <h2 className="t-title font-cn">
            {variant === 'recent' ? (
              <>近期<span style={{ color: 'var(--gold-soft)' }}>演出场次</span></>
            ) : (
              <>本月<span style={{ color: 'var(--vermilion)' }}>演出场次</span></>
            )}
          </h2>
          <p className="t-lead">
            {variant === 'recent'
              ? '11-12 月马家大院排期。驻场演出，每月一场。'
              : '驻场演出，每月一场。选一场，把这出戏看完。'}
          </p>
        </div>

        <div className={`grid gap-6 ${variant === 'recent' ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {showings.map((s) => {
            const f = fmtDate(s.date);
            const left = s.seats - s.booked - (booked[s.id] || 0);
            const pct = Math.round((s.booked / s.seats) * 100);
            const dark = variant === 'recent';
            return (
              <div
                key={s.id}
                data-reveal
                className="p-7 rounded-2xl relative"
                style={{
                  background: s.highlight ? 'var(--paper-2)' : dark ? 'rgba(250,246,238,0.05)' : 'var(--paper-2)',
                  border: '1px solid rgba(201,162,75,0.25)',
                  color: dark && !s.highlight ? 'var(--paper)' : s.highlight && dark ? 'var(--ink)' : 'var(--ink)',
                }}
              >
                {s.highlight && (
                  <span
                    className="absolute -top-2.5 right-6 px-3 py-0.5 rounded-full text-[11px] tracking-[0.14em]"
                    style={{ background: 'var(--vermilion)', color: '#FAF6EE' }}
                  >
                    推荐场次
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="font-cn text-[26px]">{f.m}{f.d}</span>
                  <span className="text-[13px]" style={{ opacity: 0.55 }}>{f.wd} · {s.time}</span>
                </div>
                <p className="mt-2 text-[13px]" style={{ opacity: 0.55 }}>{s.venue}</p>

                <div className="mt-5 h-1.5 rounded-full overflow-hidden" style={{ background: dark && !s.highlight ? 'rgba(250,246,238,0.12)' : 'rgba(139,123,107,0.18)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--gold)' }}
                  />
                </div>
                <div className="mt-2.5 flex justify-between text-[12.5px]" style={{ opacity: 0.6 }}>
                  <span>余票 {Math.max(left, 0)} 席</span>
                  <span>
                    {s.status === 'low' ? '仅余少量' : left <= 10 ? '即将售罄' : '余票充足'}
                  </span>
                </div>

                <button
                  onClick={() => reserve(s.id, `${f.m}${f.d}`, s.date)}
                  className={`mt-6 w-full py-3 rounded-full text-[13.5px] tracking-[0.14em] transition-all ${variant === 'recent' ? 'btn-gold' : ''}`}
                  style={
                    variant === 'recent'
                      ? undefined
                      : {
                          background: s.highlight ? 'linear-gradient(120deg, rgba(201,162,75,0.2), rgba(201,162,75,0.34))' : 'var(--ink)',
                          color: s.highlight ? 'var(--gold-soft)' : 'var(--paper)',
                          border: s.highlight ? '1px solid rgba(201,162,75,0.4)' : 'none',
                        }
                  }
                >
                  预约这场
                </button>
              </div>
            );
          })}
        </div>

        {variant === 'recent' && (
          <div className="mt-10 text-center" data-reveal>
            <a href="#showings" className="link-line text-[14px]">查看全部场次与预约 →</a>
          </div>
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] px-6 py-3 rounded-full text-[13.5px]"
          style={{ background: 'var(--ink)', border: '1px solid rgba(201,162,75,0.4)', color: 'var(--gold-soft)' }}
        >
          {toast}
        </div>
      )}
    </section>
  );
}

/* ============ GUIDE 观演指南 ============ */
export function GuideSection() {
  const v = SITE_DATA.venue;
  return (
    <section id="guide" className="section relative z-10" style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}>
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">GUIDE</span>
          <h2 className="t-title font-cn">来看戏之前</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div data-reveal>
            <h3 className="font-cn text-[20px] text-[#16302A] mb-5">剧场</h3>
            <p className="text-[15.5px] text-[#4A4038] mb-2">{v.address}</p>
            <p className="text-[13.5px] text-[#8A7B6B] mb-6">时长：{v.duration}</p>
            <div className="flex flex-col gap-3">
              {v.transport.map((t) => (
                <div key={t.mode} className="flex gap-3 items-baseline">
                  <span
                    className="shrink-0 w-14 text-center px-2 py-1 rounded-full text-[12px] tracking-[0.08em]"
                    style={{ background: 'rgba(201,162,75,0.16)', color: '#8C6F2E' }}
                  >
                    {t.mode}
                  </span>
                  <span className="text-[14.5px] text-[#4A4038]">{t.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal data-reveal-delay="0.12">
            <h3 className="font-cn text-[20px] text-[#16302A] mb-5">票价</h3>
            <div className="flex flex-col gap-3 mb-8">
              {v.price.map((p) => (
                <div
                  key={p.tier}
                  className="flex items-center justify-between px-6 py-4 rounded-xl"
                  style={{ background: 'var(--paper)', border: '1px solid rgba(139,123,107,0.2)' }}
                >
                  <div>
                    <div className="font-cn text-[16px] text-[#16302A]">{p.tier}</div>
                    <div className="text-[12.5px] text-[#8A7B6B] mt-0.5">{p.note}</div>
                  </div>
                  <span className="font-cn text-[22px]" style={{ color: 'var(--vermilion)' }}>{p.price}</span>
                </div>
              ))}
            </div>

            <h3 className="font-cn text-[20px] text-[#16302A] mb-4">观演须知</h3>
            <ul className="flex flex-col gap-2.5">
              {v.notice.map((n) => (
                <li key={n} className="text-[14px] text-[#4A4038] pl-5 relative">
                  <span className="absolute left-0 top-[0.62em] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ JOIN US 演员招募 ============ */
export function JoinSection() {
  const a = SITE_DATA.audition;
  const openRoles = a.roles.filter((r) => r.open);
  const [form, setForm] = useState({ name: '', contact: '', role: '', video: '', note: '' });
  const [sent, setSent] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contact || !form.role) {
      setSent('请填写姓名、联系方式与应聘角色');
      return;
    }
    const list = JSON.parse(localStorage.getItem('xfx-applications') || '[]') as unknown[];
    list.push({ ...form, at: Date.now() });
    localStorage.setItem('xfx-applications', JSON.stringify(list));
    setSent('投递成功 · 制作组将在 7 个工作日内回复');
    setForm({ name: '', contact: '', role: '', video: '', note: '' });
  };

  return (
    <section id="join" className="section relative z-10" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
      <div className="shell">
        <div className="sec-head on-dark" data-reveal>
          <span className="t-kicker on-dark">JOIN US</span>
          <h2 className="t-title font-cn">
            马家大院，还<span style={{ color: 'var(--gold-soft)' }}>缺几个人</span>
          </h2>
          <p className="t-lead">
            庭院音乐剧需要能唱、能演、能在户外实景里稳定发挥的演员。每周至少三个整排练日——这是唯一的硬条件。
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_1fr] gap-12">
          <div>
            <h3 className="font-cn text-[19px] mb-5 text-paper">当前开放的角色</h3>
            <div className="flex flex-col gap-2.5 mb-8">
              {openRoles.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between px-5 py-3.5 rounded-xl"
                  style={{ background: 'rgba(250,246,238,0.05)', border: '1px solid rgba(201,162,75,0.16)' }}
                >
                  <span className="font-cn text-[15px] text-paper/90">{r.name}</span>
                  <span className="text-[12.5px] text-paper/45">{r.note}</span>
                  <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(178,58,46,0.28)', color: '#E8A59B' }}>
                    招募中
                  </span>
                </div>
              ))}
            </div>

            <h3 className="font-cn text-[19px] mb-5 text-paper">三步投递</h3>
            <ol className="flex flex-col gap-4">
              {a.steps.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-cn text-[15px]"
                    style={{ background: 'rgba(201,162,75,0.18)', color: 'var(--gold-soft)' }}
                  >
                    {s.n}
                  </span>
                  <div>
                    <div className="text-[15px] text-paper/90">{s.t}</div>
                    <div className="text-[13.5px] text-paper/50 mt-1">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4" data-reveal data-reveal-delay="0.1">
            <h3 className="font-cn text-[19px] text-paper">在线投递</h3>
            {(
              [
                ['name', '姓名 *', '你的姓名', 'text'],
                ['contact', '联系方式 *', '手机号或邮箱', 'text'],
                ['role', '应聘角色 *', '请选择角色', 'select'],
                ['video', '自荐视频链接', 'https://…（网盘或直链均可）', 'url'],
              ] as const
            ).map(([k, label, ph, type]) => (
              <label key={k} className="flex flex-col gap-1.5">
                <span className="text-[13px] text-paper/60">{label}</span>
                {type === 'select' ? (
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="px-4 py-3 rounded-xl outline-none text-[14.5px]"
                    style={{ background: 'rgba(250,246,238,0.06)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.2)' }}
                  >
                    <option value="" style={{ color: '#333' }}>请选择…</option>
                    {a.roles.map((r) => (
                      <option key={r.name} value={r.name} style={{ color: '#333' }}>
                        {r.name}（{r.note}）
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    placeholder={ph}
                    className="px-4 py-3 rounded-xl outline-none text-[14.5px] placeholder:text-paper/25"
                    style={{ background: 'rgba(250,246,238,0.06)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.2)' }}
                  />
                )}
              </label>
            ))}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-paper/60">补充说明</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="过往演出经历、可排练时间、擅长曲目…"
                rows={3}
                className="px-4 py-3 rounded-xl outline-none resize-none text-[14.5px] placeholder:text-paper/25"
                style={{ background: 'rgba(250,246,238,0.06)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.2)' }}
              />
            </label>
            <button type="submit" className="btn btn-gold w-full justify-center mt-2">提交投递</button>
            {sent && <p className="text-[13px]" style={{ color: 'var(--gold-soft)' }}>{sent}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
