'use client';

import { useEffect, useRef, useState } from 'react';

type Seg = { seg: number; text: string; url: string; dur: number };
type Index = Record<string, Seg[]>;

const ROLE_ORDER = ['蔡锷', '小凤仙', '杨队长', '李副官', '蔡母', '掌班', '刘妈妈', '喜鹊', '丫鬟', '三人', '二合', '画外音', '（台词）'];

export default function VoiceDemo() {
  const [idx, setIdx] = useState<Index | null>(null);
  const [role, setRole] = useState('蔡锷');
  const [playing, setPlaying] = useState<string | null>(null);
  const [openText, setOpenText] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/audio/audio-index.json')
      .then((r) => r.json())
      .then((d) => setIdx(d))
      .catch(() => setIdx({}));
  }, []);

  const stopAll = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const play = (seg: Seg) => {
    if (playing === seg.url) { stopAll(); return; }
    stopAll();
    const a = new Audio(seg.url);
    a.onended = () => setPlaying(null);
    a.onerror = () => setPlaying(null);
    audioRef.current = a;
    setPlaying(seg.url);
    a.play().catch(() => setPlaying(null));
  };

  const segs = idx?.[role] || [];
  const roles = idx ? ROLE_ORDER.filter((r) => idx[r]?.length) : [];

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(201,162,75,0.35)', background: 'linear-gradient(180deg, rgba(201,162,75,0.07), rgba(201,162,75,0.02))' }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A24B' }} />
          <h3 className="font-serif tracking-[0.2em] text-[15px] text-[#3A3329]">真人示范 · AI 播音</h3>
          <span className="text-[11px] text-[#8A7B6B] tracking-[0.08em]">逐角色整段标准读音 · 供台词校正</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#8A7B6B]">
          以下为 AI 合成播音腔，按角色朗读整段台词（含唱段词）。听熟角色语气后，可用上方系统朗读逐句跟读校正。
        </p>
        {roles.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setOpenText(null); stopAll(); }}
                className="px-3 py-1.5 rounded-full text-[12px] transition-all"
                style={{
                  background: role === r ? 'var(--ink)' : 'rgba(250,246,238,0.7)',
                  color: role === r ? '#FAF6EE' : '#4A4038',
                  border: '1px solid rgba(139,123,107,0.35)',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-[12px] text-[#8A7B6B]">音频加载中…</div>
        )}
      </div>

      {segs.length > 0 && (
        <div className="px-5 pb-4 space-y-2.5">
          {segs.map((seg) => (
            <div
              key={seg.seg}
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(250,246,238,0.6)', border: '1px solid rgba(139,123,107,0.15)' }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => play(seg)}
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[15px] transition-all"
                  style={{
                    border: '1px solid rgba(201,162,75,0.5)',
                    color: playing === seg.url ? '#B23A2E' : '#8C6F2E',
                    background: playing === seg.url ? 'rgba(201,162,75,0.18)' : 'rgba(250,246,238,0.8)',
                  }}
                  title={playing === seg.url ? '停止' : '播放这一段'}
                  aria-label={playing === seg.url ? '停止播放' : '播放这一段'}
                >
                  {playing === seg.url ? '■' : '▶'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 text-[12px] text-[#8A7B6B]">
                    <span>第 {seg.seg} 段</span>
                    <span>{seg.dur}s</span>
                    <button
                      onClick={() => setOpenText(openText === seg.seg ? null : seg.seg)}
                      className="text-[#8C6F2E] underline underline-offset-2 decoration-[rgba(140,111,46,0.4)] hover:decoration-[#8C6F2E]"
                    >
                      {openText === seg.seg ? '收起台词' : '看台词'}
                    </button>
                  </div>
                  {openText === seg.seg && (
                    <p className="mt-2 text-[13.5px] leading-loose text-[#4A4038] whitespace-pre-wrap">
                      {seg.text.replace(/。$/, '')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
