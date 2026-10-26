'use client';

import { useEffect, useRef, useState } from 'react';
import { TRACKS } from '@/lib/content';

/* ============ ORIGINAL SOUND 七首唱段 ============ */
export function SoundSection() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState('');

  const toggle = (file: string) => {
    if (playing === file) {
      audioRef.current?.pause();
      setPlaying('');
      return;
    }
    // 单曲互斥：同一时刻只播一个
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(`./assets/${file}`);
    a.addEventListener('ended', () => setPlaying(''));
    audioRef.current = a;
    a.play();
    setPlaying(file);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <section id="listen" className="section relative z-10" style={{ background: 'var(--ink-2)', color: 'var(--paper)' }}>
      <div className="shell">
        <div className="sec-head on-dark" data-reveal>
          <span className="t-kicker on-dark">ORIGINAL SOUND</span>
          <h2 className="t-title font-cn">
            七首<span style={{ color: 'var(--gold-soft)' }}>必听</span>
          </h2>
          <p className="t-lead">原唱实录音频。同一角色不同版本的演绎，值得对照听。</p>
        </div>

        <div className="flex flex-col gap-3">
          {TRACKS.map((t, i) => (
            <div
              key={t.file}
              data-reveal
              data-reveal-delay={String(Math.min(i * 0.05, 0.25))}
              className="flex items-center justify-between px-6 py-4 rounded-xl transition-colors"
              style={{
                background: playing === t.file ? 'rgba(201,162,75,0.14)' : 'rgba(250,246,238,0.05)',
                border: '1px solid rgba(201,162,75,0.16)',
              }}
            >
              <div>
                <div className="text-[15.5px] text-paper/90">
                  {t.group ? `${t.group} · ${t.name.split('·').pop()}` : t.name}
                  {t.group && <span className="ml-2 text-[11.5px] text-paper/35">另一版演绎</span>}
                </div>
                <div className="text-[12.5px] text-paper/45 mt-0.5">{t.vocal}</div>
              </div>
              <button
                aria-label={playing === t.file ? `暂停 ${t.name}` : `播放 ${t.name}`}
                onClick={() => toggle(t.file)}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: playing === t.file ? 'var(--gold)' : 'rgba(201,162,75,0.16)',
                  color: playing === t.file ? '#0E1A24' : 'var(--gold-soft)',
                }}
              >
                {playing === t.file ? (
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><path d="M2 1l9 5-9 5z"/></svg>
                )}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-paper/35">单曲循环开启后，同一时刻只会有一个曲目在播。</p>
      </div>
    </section>
  );
}

/* ============ SCORE GALLERY 曲谱画廊（20 张，点击放大；插槽可续传至 28 首） ============ */
const SCORE_COUNT = 20;

export function GallerySection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const names = Array.from({ length: SCORE_COUNT }, (_, i) => `image${i + 1}.webp`);

  const nav = (dir: 1 | -1) => {
    if (openIdx === null) return;
    setOpenIdx((openIdx + dir + SCORE_COUNT) % SCORE_COUNT);
  };

  return (
    <section id="gallery" className="section relative z-10" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">SCORE GALLERY</span>
          <h2 className="t-title font-cn">
            二十八首<span style={{ color: 'var(--vermilion)' }}>曲谱</span>
          </h2>
          <p className="t-lead">排练用谱，按场次归档。点击放大查看。</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {names.map((n, i) => (
            <button
              key={n}
              data-reveal
              data-reveal-delay={String(Math.min(i * 0.03, 0.25))}
              onClick={() => setOpenIdx(i)}
              className="group relative rounded-xl overflow-hidden aspect-[3/4] p-0 border-0 cursor-zoom-in"
              aria-label={`查看曲谱 ${i + 1}`}
            >
              <img
                src={`./assets/thumbs/${n}`}
                alt={`曲谱 ${i + 1} 预览`}
                loading="lazy"
                className="w-full h-full object-cover transition-opacity duration-700 group-hover:opacity-80"
                style={{ background: 'rgba(139,123,107,0.15)' }}
              />
              <span className="absolute inset-0 bg-[#0E1A24]/0 group-hover:bg-[#0E1A24]/20 transition-colors" />
            </button>
          ))}
        </div>
        <p className="mt-5 text-[13px] text-[#8A7B6B]">
          当前收录 20 张 · 其余曲谱整理中，将陆续补充至 28 首
        </p>
      </div>

      {/* 灯箱 */}
      {openIdx !== null && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          style={{ background: 'rgba(8,14,20,0.94)' }}
          onClick={() => setOpenIdx(null)}
        >
          <button
            className="absolute top-6 right-8 text-paper/70 text-[26px]"
            aria-label="关闭"
            onClick={() => setOpenIdx(null)}
          >
            ×
          </button>
          <button
            className="absolute left-5 md:left-10 top-1/2 -translate-y-1/2 text-[30px] text-paper/70 px-4 py-2"
            aria-label="上一张"
            onClick={(e) => { e.stopPropagation(); nav(-1); }}
          >
            ‹
          </button>
          <img
            src={`./assets/scores-webp/${names[openIdx]}`}
            alt={`曲谱大图 ${openIdx + 1}`}
            className="max-h-[86vh] max-w-[86vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-5 md:right-10 top-1/2 -translate-y-1/2 text-[30px] text-paper/70 px-4 py-2"
            aria-label="下一张"
            onClick={(e) => { e.stopPropagation(); nav(1); }}
          >
            ›
          </button>
          <p className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[13px] text-paper/55">
            {openIdx + 1} / {SCORE_COUNT}
          </p>
        </div>
      )}
    </section>
  );
}

/* ============ MESSAGE 留言 ============ */
interface Msg {
  name: string;
  text: string;
  at: number;
}

export function MessageSection() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setMsgs(JSON.parse(localStorage.getItem('xfx-messages') || '[]'));
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setStatus('请填写称呼与留言');
      return;
    }
    const next = [...msgs, { name: name.trim(), text: text.trim(), at: Date.now() }];
    localStorage.setItem('xfx-messages', JSON.stringify(next));
    setMsgs(next);
    setName('');
    setText('');
    setStatus('留言成功 · 经剧组审阅后公开');
    window.setTimeout(() => setStatus(''), 4000);
  };

  return (
    <section id="message" className="section relative z-10" style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}>
      <div className="shell max-w-[720px]">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">MESSAGE</span>
          <h2 className="t-title font-cn">
            给我们<span style={{ color: 'var(--vermilion)' }}>留句话</span>
          </h2>
          <p className="t-lead">关于这出戏、关于演出、或者只是想问一句——都欢迎。留言经剧组审阅后公开。</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 mb-12" data-reveal>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-[#8A7B6B]">称呼 *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="怎么称呼你"
              className="px-4 py-3 rounded-xl outline-none text-[14.5px]"
              style={{ background: 'var(--paper)', border: '1px solid rgba(139,123,107,0.25)' }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-[#8A7B6B]">留言 *</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="想说的话…"
              rows={4}
              className="px-4 py-3 rounded-xl outline-none resize-none text-[14.5px]"
              style={{ background: 'var(--paper)', border: '1px solid rgba(139,123,107,0.25)' }}
            />
          </label>
          <button type="submit" className="btn" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            发送留言
          </button>
          {status && <p className="text-[13px]" style={{ color: 'var(--vermilion)' }}>{status}</p>}
        </form>

        <div className="flex flex-col gap-4" data-reveal>
          {msgs.length === 0 && <p className="text-[14px] text-[#8A7B6B]">还没有留言，来说第一句。</p>}
          {msgs.map((m, i) => (
            <div key={i} className="px-6 py-5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid rgba(139,123,107,0.18)' }}>
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-cn text-[15px] text-[#16302A]">{m.name}</span>
                <span className="text-[11.5px] text-[#8A7B6B]">{new Date(m.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[14.5px] leading-[1.9] text-[#4A4038]">{m.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ MY THEATRE 我的剧场 ============ */
export function MyTheatreSection() {
  const [bookingCount, setBookingCount] = useState(0);

  useEffect(() => {
    setBookingCount((JSON.parse(localStorage.getItem('xfx-bookings') || '[]') as unknown[]).length);
  }, []);

  return (
    <section id="studio" className="section relative z-10" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      <div className="shell">
        <div className="sec-head" data-reveal>
          <span className="t-kicker">MY THEATRE</span>
          <h2 className="t-title font-cn">
            我的<span style={{ color: 'var(--vermilion)' }}>剧场</span>
          </h2>
          <p className="t-lead">剧组成员与导演的工作区：角色台词、我的预约、投递进度。</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6" data-reveal>
          <a
            href="#story"
            className="p-7 rounded-2xl no-underline transition-transform hover:-translate-y-1"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            <div className="text-[11px] tracking-[0.24em] text-gold/80">演员</div>
            <h3 className="font-cn text-[20px] mt-3 text-paper">我的剧本</h3>
            <p className="mt-3 text-[14px] leading-[1.9] text-paper/60">按角色只看自己的台词，检索任意一句半词歌词直达场次。八百余行，完整排练稿。</p>
            <span className="link-line inline-block mt-5 text-[13px]">进入 →</span>
          </a>
          <a
            href="#story"
            className="p-7 rounded-2xl no-underline transition-transform hover:-translate-y-1"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            <div className="text-[11px] tracking-[0.24em] text-gold/80">导演 / 制作组</div>
            <h3 className="font-cn text-[20px] mt-3 text-paper">导演工作台</h3>
            <p className="mt-3 text-[14px] leading-[1.9] text-paper/60">排练进度、场记、待办、到场状态与通告单生成。数据保存在本机浏览器。</p>
            <span className="link-line inline-block mt-5 text-[13px]">进入 →</span>
          </a>
          <a
            href="#showings"
            className="p-7 rounded-2xl no-underline transition-transform hover:-translate-y-1"
            style={{ background: 'var(--paper-2)', border: '1px solid rgba(139,123,107,0.22)', color: 'var(--ink)' }}
          >
            <div className="text-[11px] tracking-[0.24em] text-[#8C6F2E]">观众</div>
            <h3 className="font-cn text-[20px] mt-3 text-[#16302A]">我的预约</h3>
            <p className="mt-3 text-[14px] leading-[1.9] text-[#4A4038]">
              {bookingCount > 0 ? `已预约 ${bookingCount} 场演出，本机可查。` : '还没有预约记录。到「来看戏」选一场吧。'}
            </p>
            <span className="inline-block mt-5 text-[13px]" style={{ color: 'var(--vermilion)' }}>去预约 →</span>
          </a>
        </div>
      </div>
    </section>
  );
}
