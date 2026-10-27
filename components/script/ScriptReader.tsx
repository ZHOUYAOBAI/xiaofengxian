'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SCRIPT, SONG_TITLE, SONG_RAW, ROLE_COLOR } from '@/lib/script-data';
import VoiceDemo from './VoiceDemo';
import VoiceTTSSettings from './VoiceTTSSettings';
import { loadTTSConfig, speakWithHuoshan, stopHuoshan, TTSConfig } from './HuoshanTTS';

/**
 * 演员工作台
 * 1) 点击角色 → 该角色全部台词凸现（其余弱化），可多选对比
 * 2) 背诵模式：选中角色的台词逐句遮罩，点击翻开，进度存本机
 * 3) 唱段标注：正文中唱段起始处显示「♫ 唱段X《歌名》」横幅，唱词用歌词样式
 * 4) 逐句合成朗读：标准播音腔（浏览器 TTS 中文音色，可调语速），支持整幕连读
 */
const PROGRESS_KEY = 'xfx-script-progress';
const RATES = [0.8, 0.9, 1.0] as const;

type ProgressMap = Record<string, Record<number, true>>;

function loadProgress(): ProgressMap {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function ScriptReader() {
  const [activeAct, setActiveAct] = useState('act0');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'read' | 'practice'>('read');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  // TTS
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState<number>(0.9);
  const [pitch, setPitch] = useState<number>(1);
  const [speaking, setSpeaking] = useState(false);
  const [actSpeaking, setActSpeaking] = useState(false);
  const [readingIdx, setReadingIdx] = useState<number | null>(null);
  const speechRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechRef.current = window.speechSynthesis;
      const refresh = () => {
        const all = window.speechSynthesis.getVoices();
        const zh = all.filter((v) => v.lang.toLowerCase().startsWith('zh'));
        setVoiceList(zh);
        // 默认优选：神经/在线音色 > 普通话 > 任意中文
        const best =
          zh.find((v) => /neural|online|natural|premium|云|晓晓|云希|云扬|xiaoxiao|yunxi|yunyang/i.test(v.name))
          || zh.find((v) => v.lang === 'zh-CN' && /mandarin|普通话|中国大陆/i.test(v.name))
          || zh.find((v) => v.lang === 'zh-CN')
          || zh[0] || null;
        setVoice(best);
      };
      refresh();
      window.speechSynthesis.addEventListener('voiceschanged', refresh);
    }
    return () => {
      if (speechRef.current) speechRef.current.cancel();
    };
  }, []);

  const meta = SCRIPT.meta;

  const toggleRole = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim();
    return SCRIPT.lines.map((line, i) => ({ line, i })).filter(({ line }) => !q || line.text.includes(q));
  }, [query]);

  const practiceRole = selected.size === 1 ? Array.from(selected)[0] : null;
  const roleLines = useMemo(
    () => (practiceRole ? SCRIPT.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.roleName === practiceRole) : []),
    [practiceRole]
  );
  const roleDone = practiceRole ? Object.keys(progress[practiceRole] || {}).length : 0;

  const reveal = (role: string, idx: number) => {
    setProgress((p) => {
      const next = { ...p, [role]: { ...(p[role] || {}), [idx]: true as const } };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setRevealed((r) => new Set(r).add(`${role}:${idx}`));
  };

  const revealAll = () => {
    roleLines.forEach(({ i }) => reveal(practiceRole!, i));
  };

  /* ===== TTS ===== */
  const cleanText = (t: string) => t.replace(/（[^）]*）/g, '').replace(/\s+/g, '').trim();

  // 火山真人 TTS 配置（可空）
  const [ttsCfg, setTtsCfg] = useState<TTSConfig | null>(null);
  useEffect(() => {
    setTtsCfg(loadTTSConfig());
  }, []);

  /** 逐句朗读：优先火山真人 TTS，失败回退浏览器语音 */
  const speak = async (text: string, lineIdx?: number) => {
    const s = speechRef.current;
    if (!s || !text) return;
    s.cancel();
    const ok = await speakWithHuoshan(cleanText(text), ttsCfg, {
      onStart: () => { setSpeaking(true); if (lineIdx != null) setReadingIdx(lineIdx); },
      onEnd: () => { setSpeaking(false); setReadingIdx(null); },
    });
    if (ok) return;
    const u = new SpeechSynthesisUtterance(cleanText(text));
    if (voice) u.voice = voice;
    u.lang = 'zh-CN';
    u.rate = rate;
    u.pitch = pitch;
    setSpeaking(true);
    if (lineIdx != null) setReadingIdx(lineIdx);
    u.onend = () => { setSpeaking(false); setReadingIdx(null); };
    u.onerror = () => { setSpeaking(false); setReadingIdx(null); };
    s.speak(u);
  };

  const stopSpeak = () => {
    speechRef.current?.cancel();
    stopHuoshan();
    setSpeaking(false);
    setActSpeaking(false);
    setReadingIdx(null);
  };

  const PAUSE_MS = 380;

  const speakAct = async (actId: string) => {
    const s = speechRef.current;
    if (!s) return;
    s.cancel();
    const act = SCRIPT.acts.find((a) => a.id === actId)!;
    const queue = act.scenes
      .flatMap((sc) => sc.lineIds.map((i) => SCRIPT.lines[i]))
      .filter((l) => l.kind !== 'stage' && cleanText(l.text))
      .map((l) => ({ text: cleanText(l.text), idx: SCRIPT.lines.indexOf(l) }));
    if (!queue.length) return;
    setActSpeaking(true);
    let qi = 0;
    const next = async () => {
      if (!s || qi >= queue.length) {
        setActSpeaking(false);
        setReadingIdx(null);
        return;
      }
      const item = queue[qi];
      qi += 1;
      setReadingIdx(item.idx);
      // 当前句滚动到视口（跟读）
      const el = document.querySelector(`[data-line="${item.idx}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 优先火山真人 TTS
      const done = await speakWithHuoshan(item.text, ttsCfg, {
        onEnd: () => { setTimeout(() => { next(); }, PAUSE_MS); },
        onError: () => { /* 单句失败不打断，下一句继续 */ },
      });
      if (done) return;
      const u = new SpeechSynthesisUtterance(item.text);
      if (voice) u.voice = voice;
      u.lang = 'zh-CN';
      u.rate = rate;
      u.pitch = pitch;
      u.onend = () => { setTimeout(() => { next(); }, PAUSE_MS); };
      u.onerror = () => { setTimeout(() => { next(); }, PAUSE_MS); };
      s.speak(u);
    };
    next();
  };

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', paddingTop: 88 }}>
      {/* ===== 顶栏 ===== */}
      <div className="shell pt-4 pb-6">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h1 className="font-cn text-[clamp(28px,4vw,40px)]">
            演员工作台<span className="ml-3 text-[14px] text-[#8A7B6B]">{meta.subtitle} · 排练用</span>
          </h1>
          <span className="text-[12.5px] tracking-[0.08em] text-[#8A7B6B]">
            {meta.acts} 幕 {meta.scenes} 场 · {meta.songs} 曲 · {meta.lines} 条台词
          </span>
        </div>

        {/* 真人示范：AI 播音整段朗读 */}
        <VoiceDemo />

        {/* 模式切换 + 朗读控制 */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <ModeBtn active={mode === 'read'} onClick={() => setMode('read')}>阅读</ModeBtn>
          <ModeBtn active={mode === 'practice'} onClick={() => setMode('practice')}>背诵练习</ModeBtn>
          {mode === 'practice' && (
            <span className="text-[12.5px] text-[#8A7B6B]">先选一个角色，它的台词会被遮住，点击逐句翻开</span>
          )}
          <span className="mx-1 text-[#C9A24B]">│</span>
          <span className="text-[12.5px] text-[#8A7B6B]">朗读</span>
          <button
            onClick={() => speakAct(activeAct)}
            disabled={actSpeaking}
            className="px-3 py-1 rounded-full text-[12.5px] transition-all disabled:opacity-40"
            style={{ border: '1px solid rgba(201,162,75,0.45)', color: actSpeaking ? '#8A7B6B' : '#5C4A2E', background: actSpeaking ? 'rgba(201,162,75,0.15)' : 'transparent' }}
          >
            {actSpeaking ? '整幕朗读中…' : '朗读整幕'}
          </button>
          <button onClick={stopSpeak} className="px-3 py-1 rounded-full text-[12.5px]" style={{ border: '1px solid rgba(178,58,46,0.4)', color: '#B23A2E' }}>
            停止
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-[#8A7B6B]">语速</span>
            {RATES.map((r) => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className="px-2.5 py-0.5 rounded-full text-[12px] transition-all"
                style={{
                  background: rate === r ? 'var(--ink)' : 'transparent',
                  color: rate === r ? '#FAF6EE' : '#4A4038',
                  border: '1px solid rgba(139,123,107,0.35)',
                }}
              >
                {r}
              </button>
            ))}
            <span className="ml-1 text-[12px] text-[#8A7B6B]">音调</span>
            {[0.9, 1, 1.1].map((p) => (
              <button
                key={p}
                onClick={() => setPitch(p)}
                className="px-2.5 py-0.5 rounded-full text-[12px] transition-all"
                style={{
                  background: pitch === p ? 'var(--ink)' : 'transparent',
                  color: pitch === p ? '#FAF6EE' : '#4A4038',
                  border: '1px solid rgba(139,123,107,0.35)',
                }}
              >
                {p}
              </button>
            ))}
            {voiceList.length > 0 && (
              <>
                <span className="ml-1 text-[12px] text-[#8A7B6B]">音色</span>
                <select
                  value={voice?.name || ''}
                  onChange={(e) => {
                    const v = voiceList.find((x) => x.name === e.target.value);
                    if (v) { setVoice(v); speechRef.current?.cancel(); setSpeaking(false); setReadingIdx(null); }
                  }}
                  className="max-w-[220px] px-2.5 py-1.5 rounded-full text-[12px] outline-none"
                  style={{ background: 'var(--paper-2)', border: '1px solid rgba(139,123,107,0.35)', color: '#4A4038' }}
                  title="选择朗读音色（推荐带“神经/在线”字样的）"
                >
                  {voiceList.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}{/neural|online|natural|premium|云/i.test(v.name) ? ' ☆' : ''}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <VoiceTTSSettings onChange={(c) => setTtsCfg(c)} />
          {speaking && <span className="text-[12px] text-[#8C6F2E] animate-pulse">▶ 朗读中</span>}
        </div>

        {/* 角色栏：点击凸现 */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] tracking-[0.2em] text-[#8A7B6B]">点角色 → 该角色台词凸现 · 行尾喇叭可逐句朗读</span>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-[12px] px-2 py-0.5 rounded-full text-[#B23A2E]" style={{ border: '1px solid rgba(178,58,46,0.4)' }}>
                清除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {SCRIPT.roles.map((r) => {
              const on = selected.has(r.name);
              return (
                <button
                  key={r.name}
                  onClick={() => toggleRole(r.name)}
                  className="px-3.5 py-1.5 rounded-full text-[13px] tracking-[0.04em] transition-all"
                  style={{
                    background: on ? r.color : 'transparent',
                    color: on ? '#FAF6EE' : '#4A4038',
                    border: `1px solid ${on ? r.color : 'rgba(139,123,107,0.35)'}`,
                    boxShadow: on ? `0 0 0 3px ${r.color}22` : 'none',
                    transform: on ? 'translateY(-1px)' : 'none',
                  }}
                >
                  {r.name}
                </button>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(selected).map((name) => {
                const lines = SCRIPT.lines.filter((l) => l.roleName === name);
                const scenes = new Set(lines.map((l) => l.sceneId)).size;
                const songs = new Set(lines.map((l) => l.songIndex).filter((s) => s != null)).size;
                return (
                  <div key={name} className="px-3.5 py-2 rounded-xl text-[12.5px] flex gap-4" style={{ background: `${ROLE_COLOR[name] || '#C9A24B'}1A`, border: `1px solid ${ROLE_COLOR[name] || '#C9A24B'}44` }}>
                    <span><b>{name}</b></span>
                    <span>台词 <b>{lines.length}</b></span>
                    <span>出场 <b>{scenes}</b> 场</span>
                    <span>唱段 <b>{songs}</b></span>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'practice' && practiceRole && (
            <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(201,162,75,0.12)', border: '1px solid rgba(201,162,75,0.35)' }}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#5C4A2E]">
                  <b>{practiceRole}</b> 共 {roleLines.length} 句 · 已背 <b>{roleDone}</b> 句
                </span>
                <button onClick={revealAll} className="px-3 py-1 rounded-full text-[12px] text-[#5C4A2E]" style={{ border: '1px solid rgba(201,162,75,0.5)' }}>
                  翻开全部
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,123,107,0.18)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${roleLines.length ? Math.round((roleDone / roleLines.length) * 100) : 0}%`, background: 'linear-gradient(90deg,#C9A24B,#8C6F2E)' }} />
              </div>
            </div>
          )}
        </div>

        {/* 搜索 */}
        <div className="mt-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索任意一句台词 / 半句歌词，直达场次…"
            className="w-full max-w-[560px] px-5 py-3 rounded-xl outline-none text-[14.5px] placeholder:text-[#8A7B6B]/70"
            style={{ background: 'var(--paper-2)', border: '1px solid rgba(139,123,107,0.25)' }}
          />
          {searching && (
            <p className="mt-2 text-[13px] text-[#8A7B6B]">全剧本命中 {filtered.length} 条</p>
          )}
        </div>
      </div>

      {/* ===== 八幕导航 ===== */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(241,234,220,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(139,123,107,0.2)' }}>
        <div className="shell flex gap-1 overflow-x-auto py-3">
          {SCRIPT.acts.map((a) => (
            <button
              key={a.id}
              onClick={() => { setActiveAct(a.id); setQuery(''); }}
              className="shrink-0 px-4 py-1.5 rounded-full text-[13px] tracking-[0.08em] transition-all"
              style={{
                background: activeAct === a.id ? 'var(--ink)' : 'transparent',
                color: activeAct === a.id ? '#FAF6EE' : '#4A4038',
                border: '1px solid rgba(139,123,107,0.3)',
              }}
            >
              {a.num}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 剧本正文 ===== */}
      <div className="shell py-12">
        {searching ? (
          <SearchResult rows={filtered} selected={selected} mode={mode} progress={progress} onReveal={reveal} onSpeak={speak} />
        ) : (
          SCRIPT.acts
            .filter((a) => a.id === activeAct)
            .map((act) => (
              <div key={act.id}>
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="font-cn text-[26px]">{act.num} · {act.title}</h2>
                  <span className="text-[13px] text-[#8A7B6B]">{act.scenes.length} 场</span>
                  {act.songIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {act.songIds.map((s) => (
                        <span key={s} className="px-2.5 py-0.5 rounded-full text-[11.5px]" style={{ background: 'rgba(201,162,75,0.16)', color: '#8C6F2E' }}>
                          ♪ {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {act.scenes.map((sc) => {
                  let prevSong: number | null = null;
                  return (
                    <div key={sc.id} className="mb-10">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="font-cn text-[15px]" style={{ color: 'var(--vermilion)' }}>第 {sc.no} 场</span>
                        <span className="text-[12.5px] text-[#8A7B6B]">{sc.note}</span>
                      </div>
                      <div className="flex flex-col">
                        {sc.lineIds.map((idx) => {
                          const line = SCRIPT.lines[idx];
                          const songChanged = line.songIndex != null && line.songIndex !== prevSong;
                          if (line.songIndex != null) prevSong = line.songIndex;
                          return (
                            <FragmentRow key={idx} songChanged={songChanged && line.songIndex != null} songIdx={line.songIndex}>
                              <LineRow
                                line={line}
                                idx={idx}
                                selected={selected}
                                mode={mode}
                                progress={progress}
                                revealed={revealed.has(`${line.roleName || ''}:${idx}`)}
                                onReveal={reveal}
                                onSpeak={speak}
                                speaking={speaking}
                                readingIdx={readingIdx}
                              />
                            </FragmentRow>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        )}
      </div>

      <div className="shell pb-16 text-center text-[12.5px] text-[#8A7B6B]">
        {meta.title} · {meta.version} · 台词逐字保留原稿，仅排版
      </div>
    </div>
  );
}

/** 唱段起始横幅 + 行（songIndex 变化时插入横幅） */
function FragmentRow({ songChanged, songIdx, children }: { songChanged: boolean; songIdx: number | null; children: React.ReactNode }) {
  return (
    <>
      {songChanged && songIdx != null && (
        <div className="my-5 py-2.5 px-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(201,162,75,0.14)', border: '1px solid rgba(201,162,75,0.35)', borderLeft: '3px solid #C9A24B' }}>
          <span className="text-[16px] text-[#8C6F2E]">♫</span>
          <span className="font-cn text-[15px] tracking-[0.06em] text-[#5C4A2E]">{SONG_RAW[songIdx]}</span>
        </div>
      )}
      {children}
    </>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-[13px] tracking-[0.08em] transition-all"
      style={{
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? '#FAF6EE' : '#4A4038',
        border: '1px solid rgba(139,123,107,0.35)',
      }}
    >
      {children}
    </button>
  );
}

/** 单条台词行 */
function LineRow({
  line, idx, selected, mode, progress, revealed, onReveal, onSpeak, speaking, readingIdx,
}: {
  line: { kind: string; text: string; roleName?: string; songIndex: number | null };
  idx: number;
  selected: Set<string>;
  mode: 'read' | 'practice';
  progress: ProgressMap;
  revealed: boolean;
  onReveal: (role: string, idx: number) => void;
  onSpeak: (text: string, idx: number) => void;
  speaking: boolean;
  readingIdx?: number | null;
}) {
  const isStage = line.kind === 'stage';
  const isSong = line.songIndex != null;
  const role = line.roleName || '';
  const on = selected.has(role);
  const song = isSong ? SONG_TITLE[line.songIndex!] : null;
  const color = ROLE_COLOR[role];
  const isReading = readingIdx === idx;

  // 背诵模式：选中角色的台词遮罩（未翻开）
  const practicing = mode === 'practice' && on && !revealed && !isStage;

  if (practicing) {
    const done = !!progress[role]?.[idx];
    return (
      <button
        data-line={idx}
        onClick={() => onReveal(role, idx)}
        className="w-full text-left py-3 border-b flex items-center gap-3 group"
        style={{ borderColor: 'rgba(139,123,107,0.12)', background: 'rgba(139,123,107,0.06)' }}
      >
        <span className="w-[86px] shrink-0 px-2.5 py-1 rounded-full text-[12px] text-[#FAF6EE]" style={{ background: color || '#C9A24B' }}>
          {role}
        </span>
        <span className="text-[14px] text-[#8A7B6B] tracking-[0.1em] group-hover:text-[#5C4A2E] transition-colors">
          {done ? '已背 ✓ · 再点可温习' : '背诵中 · 点击翻开'}
        </span>
      </button>
    );
  }

  const base: React.CSSProperties = isStage
    ? { opacity: selected.size > 0 ? 0.45 : 0.75 }
    : selected.size > 0
      ? on
        ? { opacity: 1 }
        : { opacity: 0.3 }
      : { opacity: 1 };

  return (
    <div
      data-line={idx}
      className="py-3 border-b transition-all duration-300 group"
      style={{
        ...base,
        borderColor: 'rgba(139,123,107,0.12)',
        background: isReading
          ? 'rgba(201,162,75,0.22)'
          : on
            ? `${color}14`
            : isSong
              ? 'rgba(201,162,75,0.04)'
              : 'transparent',
        borderLeft: isReading
          ? '3px solid #C9A24B'
          : on
            ? `3px solid ${color}`
            : '3px solid transparent',
        paddingLeft: isReading || on ? 14 : 17,
        transform: on ? 'translateX(2px)' : 'none',
      }}
    >
      {isStage ? (
        <p className="text-[13px] italic text-[#A29484] leading-[1.9]">
          （{line.text}）
        </p>
      ) : (
        <div className="flex gap-4 items-start">
          <div className="shrink-0 w-[86px] pt-1">
            <span
              className="inline-block px-2.5 py-1 rounded-full text-[12px] tracking-[0.04em] transition-colors"
              style={{
                background: on ? color : 'rgba(139,123,107,0.14)',
                color: on ? '#FAF6EE' : '#5C524A',
                fontWeight: on ? 600 : 400,
              }}
            >
              {role || '台词'}
            </span>
          </div>
          <p
            className="flex-1 leading-[2] transition-all"
            style={{
              color: on ? '#1D1915' : isSong ? '#4A3A26' : '#2E2620',
              fontWeight: on ? 600 : 400,
              fontSize: on ? 16 : isSong ? 15 : 15.5,
              fontStyle: isSong ? 'italic' : 'normal',
              fontFamily: isSong ? 'var(--font-cn), serif' : 'inherit',
            }}
          >
            {line.text}
            {song && <span className="ml-2.5 text-[12px] text-[#8C6F2E]">♪《{song}》</span>}
          </p>
          {/* 逐句朗读 */}
          {!isStage && (
            <button
              onClick={(e) => { e.stopPropagation(); onSpeak(line.text, idx); }}
              title="朗读这句"
              aria-label="朗读这句"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-all opacity-40 hover:opacity-100"
              style={{ border: '1px solid rgba(201,162,75,0.4)', color: speaking ? '#B23A2E' : '#8C6F2E', background: 'rgba(250,246,238,0.6)' }}
            >
              {speaking ? '⏸' : '▶'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 搜索命中结果：按幕分组 */
function SearchResult({
  rows, selected, mode, progress, onReveal, onSpeak,
}: {
  rows: { line: { actId: string; kind: string; text: string; roleName?: string; songIndex: number | null }; i: number }[];
  selected: Set<string>;
  mode: 'read' | 'practice';
  progress: ProgressMap;
  onReveal: (role: string, idx: number) => void;
  onSpeak: (text: string, idx: number) => void;
}) {
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!grouped.has(r.line.actId)) grouped.set(r.line.actId, []);
    grouped.get(r.line.actId)!.push(r);
  }
  return (
    <div className="flex flex-col gap-10">
      {Array.from(grouped.entries()).map(([actId, list]) => {
        const act = SCRIPT.acts.find((a) => a.id === actId)!;
        return (
          <div key={actId}>
            <h3 className="font-cn text-[20px] mb-4">{act.num} · {act.title}</h3>
            {list.map(({ line, i }) => (
              <LineRow key={i} line={line} idx={i} selected={selected} mode={mode} progress={progress} revealed={false} onReveal={onReveal} onSpeak={onSpeak} speaking={false} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
