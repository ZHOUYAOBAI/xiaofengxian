'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SCRIPT, SONG_TITLE, SONG_RAW, ROLE_COLOR } from '@/lib/script-data';

/**
 * 演员工作台 · 民国戏院版
 * 左栏（深藏青幕布）：排练模式（阅读/背诵/抽背/对手戏）、幕次、角色印章、进度、搜索
 * 右栏（宣纸剧本页）：正文 / 聚光灯抽背 / 对手戏 cue 接词
 * 功能：角色凸现、背诵遮罩、随机抽背+熟/不熟标记、双角色对手戏接词、唱段标注、全文搜索
 */
const PROGRESS_KEY = 'xfx-script-progress';
const MASTERY_KEY = 'xfx-script-mastery';

type ProgressMap = Record<string, Record<number, true>>;
type MasteryMap = Record<string, Record<number, 'hot' | 'cold'>>;
type Mode = 'read' | 'practice' | 'drill' | 'duet';

function loadProgress(): ProgressMap {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}
function loadMastery(): MasteryMap {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(MASTERY_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function ScriptReader() {
  const [activeAct, setActiveAct] = useState('act0');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('read');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [mastery, setMastery] = useState<MasteryMap>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setProgress(loadProgress());
    setMastery(loadMastery());
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
    () => (practiceRole ? SCRIPT.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.roleName === practiceRole && l.kind !== 'stage' && l.text.trim()) : []),
    [practiceRole]
  );
  const roleDone = practiceRole ? Object.keys(progress[practiceRole] || {}).length : 0;
  const roleMaster = practiceRole ? mastery[practiceRole] || {} : {};
  const hotCount = practiceRole ? Object.values(roleMaster).filter((v) => v === 'hot').length : 0;
  const coldCount = practiceRole ? Object.values(roleMaster).filter((v) => v === 'cold').length : 0;
  const coldLines = practiceRole
    ? roleLines.filter(({ i }) => roleMaster[i] === 'cold')
    : [];

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

  const markMastery = (role: string, idx: number, v: 'hot' | 'cold') => {
    setMastery((m) => {
      const next = { ...m, [role]: { ...(m[role] || {}), [idx]: v } };
      try {
        localStorage.setItem(MASTERY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetMastery = (role: string) => {
    setMastery((m) => {
      const next = { ...m, [role]: {} };
      try {
        localStorage.setItem(MASTERY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const goAct = (id: string) => {
    setActiveAct(id);
    setQuery('');
    window.scrollTo({ top: 0 });
  };

  const duetRole = selected.size === 2 ? Array.from(selected)[0] : null;
  const duetPartner = selected.size === 2 ? Array.from(selected)[1] : null;

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', paddingTop: 88 }}>
      {/* ===== 顶栏：题头 ===== */}
      <div className="shell pt-5 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-4" style={{ borderBottom: '2px solid var(--gold)' }}>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="font-cn text-[clamp(30px,4.5vw,46px)] leading-none tracking-[0.1em]">
                {meta.title}<span className="ml-3 text-[15px] tracking-[0.2em] text-[#8A7B6B]">{meta.subtitle}</span>
              </h1>
              <Seal text="工作台" color="var(--vermilion)" />
            </div>
            <p className="mt-3 text-[13px] tracking-[0.12em] text-[#8A7B6B]">
              全剧 {meta.acts} 幕 {meta.scenes} 场 · {meta.songs} 曲 · {meta.lines} 句台词
            </p>
          </div>
        </div>
      </div>

      {/* ===== 左右分栏 ===== */}
      <div className="shell pb-20 pt-8 flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
        {/* ===== 左栏：深藏青幕布 ===== */}
        <aside className="relative w-full lg:w-[288px] shrink-0 lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:pr-2 flex flex-col gap-7 rounded-2xl p-6"
          style={{ background: 'var(--ink)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)' }}>
          <div className="absolute top-0 left-6 w-16 h-[3px]" style={{ background: 'var(--gold)' }} aria-hidden />

          {/* 排练模式 */}
          <section>
            <SideTitle>排练模式</SideTitle>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['read', '阅读'],
                  ['practice', '背诵'],
                  ['drill', '抽背'],
                  ['duet', '对手戏'],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3.5 py-1.5 rounded-full text-[13px] tracking-[0.06em] transition-all"
                  style={{
                    background: mode === m ? 'var(--gold)' : 'transparent',
                    color: mode === m ? '#0E1A24' : 'var(--muted)',
                    border: `1px solid ${mode === m ? 'var(--gold)' : 'rgba(201,162,75,0.35)'}`,
                    fontWeight: mode === m ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <SideHint>
              {mode === 'read' && '点选角色 → 其台词凸现；可多选对比。'}
              {mode === 'practice' && '选一个角色，其台词将被遮住，点一句翻一句。'}
              {mode === 'drill' && '选一个角色，逐句随机抽背，标记 熟/不熟。'}
              {mode === 'duet' && '选两个角色，跟着对家台词接词。'}
            </SideHint>
          </section>

          {/* 幕次导航 */}
          <section>
            <SideTitle>幕次</SideTitle>
            <div className="flex flex-row lg:flex-col flex-wrap lg:flex-nowrap gap-1">
              {SCRIPT.acts.map((a) => {
                const on = activeAct === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => goAct(a.id)}
                    className="px-3 py-1.5 rounded-lg text-[13px] tracking-[0.06em] text-left transition-all shrink-0 lg:shrink"
                    style={{
                      background: on ? 'rgba(201,162,75,0.16)' : 'transparent',
                      color: on ? 'var(--gold-soft)' : 'var(--muted)',
                      border: `1px solid ${on ? 'rgba(201,162,75,0.5)' : 'rgba(201,162,75,0.12)'}`,
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {a.num}{a.title ? ` ${a.title}` : ''}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 角色印章 */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <SideTitle>角色</SideTitle>
              {selected.size > 0 && (
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[12px] px-2.5 py-1 rounded-full"
                  style={{ border: '1px solid rgba(232,165,155,0.5)', color: '#E8A59B' }}
                >
                  清除
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SCRIPT.roles.map((r) => {
                const on = selected.has(r.name);
                const c = ROLE_COLOR[r.name] || 'var(--gold)';
                return (
                  <button
                    key={r.name}
                    onClick={() => toggleRole(r.name)}
                    className="py-1.5 rounded-md text-[12.5px] tracking-[0.08em] font-cn transition-all"
                    style={{
                      background: on ? c : 'transparent',
                      color: on ? '#FAF6EE' : 'var(--muted)',
                      border: `1.5px solid ${on ? c : 'rgba(201,162,75,0.3)'}`,
                      boxShadow: on ? 'none' : 'none',
                      transform: on ? 'translateY(-1px)' : 'none',
                    }}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>

            {selected.size > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {Array.from(selected).map((name) => {
                  const lines = SCRIPT.lines.filter((l) => l.roleName === name);
                  const scenes = new Set(lines.map((l) => l.sceneId)).size;
                  const songs = new Set(lines.map((l) => l.songIndex).filter((s) => s != null)).size;
                  return (
                    <div key={name} className="px-3 py-2 rounded-lg text-[12px] flex items-center gap-3"
                      style={{ background: `${ROLE_COLOR[name] || '#C9A24B'}1A`, border: `1px solid ${ROLE_COLOR[name] || '#C9A24B'}44`, color: 'var(--paper)' }}>
                      <b style={{ color: 'var(--gold-soft)' }}>{name}</b>
                      <span style={{ color: 'var(--muted)' }}>{lines.length} 句</span>
                      <span style={{ color: 'var(--muted)' }}>{scenes} 场</span>
                      <span style={{ color: 'var(--muted)' }}>{songs} 曲</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 背诵进度 */}
          {mode === 'practice' && practiceRole && (
            <section>
              <SideTitle>背诵进度</SideTitle>
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(201,162,75,0.1)', border: '1px solid rgba(201,162,75,0.3)' }}>
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: 'var(--gold-soft)' }}>
                    <b>{practiceRole}</b> · 已背 <b>{roleDone}</b>/{roleLines.length}
                  </span>
                  <button onClick={revealAll} className="px-3 py-1 rounded-full text-[12px]" style={{ border: '1px solid rgba(201,162,75,0.45)', color: 'var(--gold-soft)' }}>
                    翻开全部
                  </button>
                </div>
                <Bar ratio={roleLines.length ? roleDone / roleLines.length : 0} color="var(--gold)" />
              </div>
            </section>
          )}

          {/* 抽背进度 */}
          {mode === 'drill' && practiceRole && (
            <section>
              <SideTitle>掌握进度</SideTitle>
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(201,162,75,0.1)', border: '1px solid rgba(201,162,75,0.3)' }}>
                <div className="flex items-center justify-between text-[13px] mb-2" style={{ color: 'var(--gold-soft)' }}>
                  <span><b>{practiceRole}</b> · {roleLines.length} 句</span>
                  <button onClick={() => resetMastery(practiceRole)} className="px-2.5 py-1 rounded-full text-[12px]" style={{ border: '1px solid rgba(232,165,155,0.45)', color: '#E8A59B' }}>
                    重置
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[12.5px] mb-2" style={{ color: 'var(--muted)' }}>
                  <Chip n={hotCount} label="已熟" c="#7FB069" />
                  <Chip n={coldCount} label="再练" c="#E8A59B" />
                  <Chip n={roleLines.length - hotCount - coldCount} label="未练" c="var(--muted)" />
                </div>
                <Bar ratio={roleLines.length ? (hotCount + coldCount) / roleLines.length : 0} color="var(--gold)" />
                {coldLines.length > 0 && (
                  <button
                    onClick={() => setMode('read')}
                    className="mt-2 w-full text-[12px] text-left"
                    style={{ color: '#E8A59B' }}
                  >
                    错题集 {coldLines.length} 句 · 去阅读模式重看 ↓
                  </button>
                )}
              </div>
            </section>
          )}

          {/* 搜索 */}
          <section>
            <SideTitle>搜索</SideTitle>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜任意台词 / 半句唱词…"
              className="w-full px-4 py-2.5 rounded-xl outline-none text-[14px]"
              style={{ background: 'var(--ink-2)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.25)' }}
            />
            {searching && (
              <p className="mt-2 text-[12px]" style={{ color: 'var(--muted)' }}>全剧命中 {filtered.length} 句</p>
            )}
          </section>
        </aside>

        {/* ===== 右栏 ===== */}
        <main className="flex-1 min-w-0 w-full">
          {mode === 'duet' ? (
            duetRole && duetPartner ? (
              <DuetStage roleA={duetPartner} roleB={duetRole} />
            ) : (
              <EmptyStage
                title="对手戏 · 接词排练"
                hint="在左栏「角色」中点选两位演员（如 蔡锷 + 小凤仙），系统会按剧本顺序排出对白，先亮对方台词做提示，你接自己的词，点击翻看对照。"
              />
            )
          ) : mode === 'drill' ? (
            practiceRole ? (
              <DrillStage
                role={practiceRole}
                roleLines={roleLines}
                mastery={mastery[practiceRole] || {}}
                onMark={markMastery}
              />
            ) : (
              <EmptyStage
                title="随机抽背 · 聚光灯"
                hint="在左栏「角色」中选一位演员（如 蔡锷），舞台灯光即起：系统随机抽一句该角色的台词，先露首字，你在心里接完，再揭晓对照，并标记 记住了 / 再练练。"
              />
            )
          ) : searching ? (
            <SearchResult rows={filtered} selected={selected} mode={mode === 'practice' ? 'practice' : 'read'} progress={progress} onReveal={reveal} />
          ) : (
            <ScriptPage actId={activeAct} selected={selected} mode={mode === 'practice' ? 'practice' : 'read'} progress={progress} revealed={revealed} onReveal={reveal} />
          )}
        </main>
      </div>

      <div className="shell pb-16 text-center text-[12.5px] tracking-[0.15em]" style={{ color: 'var(--tea)' }}>
        {meta.title} · {meta.version}
      </div>
    </div>
  );
}

/* ================= 小组件 ================= */

function SideTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[11.5px] tracking-[0.28em]" style={{ color: 'var(--gold)' }}>
      <span className="inline-block w-1.5 h-1.5" style={{ background: 'var(--gold)', transform: 'rotate(45deg)' }} />
      {children}
    </div>
  );
}
function SideHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>{children}</p>;
}
function Chip({ n, label, c }: { n: number; label: string; c: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />
      {label} {n}
    </span>
  );
}
function Bar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(250,246,238,0.14)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(ratio * 100))}%`, background: color }} />
    </div>
  );
}
/** 朱红印章 */
function Seal({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center justify-center font-cn text-[13px] tracking-[0.3em] px-2.5 py-1.5 rounded-[4px]"
      style={{ color, border: `2px solid ${color}`, transform: 'rotate(-2deg)' }}
    >
      {text}
    </span>
  );
}
function EmptyStage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="min-h-[440px] flex items-center justify-center rounded-2xl p-10"
      style={{ background: 'var(--paper-2)', border: '1px solid rgba(201,162,75,0.35)' }}>
      <div className="text-center max-w-[440px]">
        <div className="font-cn text-[22px] mb-3" style={{ color: 'var(--ink)' }}>{title}</div>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--tea)' }}>{hint}</p>
      </div>
    </div>
  );
}

/* ================= 抽背模式：聚光灯 ================= */

function DrillStage({
  role, roleLines, mastery, onMark,
}: {
  role: string;
  roleLines: { l: { text: string; sceneId: string; actId: string; songIndex: number | null }; i: number }[];
  mastery: Record<number, 'hot' | 'cold'>;
  onMark: (role: string, idx: number, v: 'hot' | 'cold') => void;
}) {
  const [cur, setCur] = useState<{ i: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const prevRole = useRef<string>(role);

  const untried = roleLines.filter(({ i }) => !mastery[i]);
  const colds = roleLines.filter(({ i }) => mastery[i] === 'cold');
  const hots = roleLines.filter(({ i }) => mastery[i] === 'hot');

  const draw = (pool: typeof roleLines) => {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const next = () => {
    // 优先未练，其次再练，最后已熟
    const pool = untried.length ? untried : colds.length ? colds : hots;
    const d = draw(pool);
    if (!d) return;
    setCur(d);
    setRevealed(false);
  };

  useEffect(() => {
    // 切换角色时重置当前句
    if (prevRole.current !== role) {
      prevRole.current = role;
      setCur(null);
      setRevealed(false);
    }
    if (!cur) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, roleLines.length]);

  if (!cur) {
    return (
      <div className="min-h-[440px] flex items-center justify-center rounded-2xl p-10"
        style={{ background: 'var(--ink)', border: '1px solid rgba(201,162,75,0.4)' }}>
        <div className="text-center">
          <div className="font-cn text-[20px] mb-4" style={{ color: 'var(--gold-soft)' }}>台词已全部过完</div>
          <button
            onClick={next}
            className="px-8 py-3 rounded-full text-[14px] tracking-[0.12em]"
            style={{ background: 'var(--gold)', color: '#0E1A24', fontWeight: 600 }}
          >
            再抽一轮
          </button>
        </div>
      </div>
    );
  }

  const line = roleLines.find((r) => r.i === cur.i)!;
  const text = line.l.text;
  const scene = SCRIPT.acts.find((a) => a.id === line.l.actId)?.scenes.find((s) => s.id === line.l.sceneId);
  const act = SCRIPT.acts.find((a) => a.id === line.l.actId);
  const color = ROLE_COLOR[role] || 'var(--gold)';
  // 上句 cue：同一场景里本句前最近的非舞台台词
  let cue: string | null = null;
  if (scene) {
    const myIdx = scene.lineIds.indexOf(cur.i);
    for (let k = myIdx - 1; k >= 0; k--) {
      const prev = SCRIPT.lines[scene.lineIds[k]];
      if (prev.kind !== 'stage' && prev.text.trim()) {
        cue = prev.text;
        break;
      }
    }
  }

  const headChar = text.trim().charAt(0);
  const masked = `▢`.repeat(Math.min(24, Math.max(6, text.trim().length - 1)));
  const song = line.l.songIndex != null ? SONG_TITLE[line.l.songIndex] : null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--ink)', border: '1px solid rgba(201,162,75,0.45)' }}>
      {/* 顶部：场次条 */}
      <div className="px-6 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(201,162,75,0.25)' }}>
        <div className="flex items-center gap-3">
          <span className="font-cn text-[15px]" style={{ color: 'var(--gold-soft)' }}>{act?.num}{scene ? ` · 第${scene.no}场` : ''}</span>
          {song && <span className="px-2 py-0.5 rounded-full text-[12px]" style={{ background: 'rgba(201,162,75,0.18)', color: 'var(--gold-soft)' }}>♪《{song}》</span>}
        </div>
        <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {role} 剩余未练 {untried.length} 句
        </span>
      </div>

      {/* 舞台中央 */}
      <div className="px-6 py-10">
        {/* cue 上句 */}
        {cue && (
          <div className="mb-6 px-4 py-2.5 rounded-lg text-[13px] italic leading-relaxed"
            style={{ background: 'rgba(250,246,238,0.05)', color: 'var(--muted)', borderLeft: '2px solid rgba(201,162,75,0.4)' }}>
            上句 · {cue.length > 46 ? cue.slice(0, 46) + '…' : cue}
          </div>
        )}

        {/* 聚光灯卡片 */}
        <div className="relative px-8 py-9 rounded-xl text-center"
          style={{ background: 'var(--ink-2)', border: '1px solid rgba(201,162,75,0.35)' }}>
          <div className="mb-3 flex items-center justify-center gap-2">
            <Seal text={role} color={color} />
          </div>
          {revealed ? (
            <p className="font-cn text-[clamp(17px,2vw,22px)] leading-[2] tracking-[0.05em]" style={{ color: 'var(--paper)' }}>
              {text}
            </p>
          ) : (
            <p className="font-cn text-[clamp(17px,2vw,22px)] leading-[2] tracking-[0.05em]" style={{ color: 'var(--gold-soft)' }}>
              {headChar}<span style={{ color: 'rgba(201,162,75,0.35)', letterSpacing: '0.14em' }}>{masked}</span>
            </p>
          )}
          <p className="mt-4 text-[12px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
            {revealed ? '对照原文 · 在心里再过一遍' : '首字已亮 · 在心里把整句接完，再点揭晓'}
          </p>
        </div>
      </div>

      {/* 操作区 */}
      <div className="px-6 pb-7 flex flex-wrap items-center justify-center gap-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="px-8 py-3 rounded-full text-[14px] tracking-[0.14em]"
            style={{ background: 'var(--gold)', color: '#0E1A24', fontWeight: 600 }}
          >
            揭晓
          </button>
        ) : (
          <>
            <button
              onClick={() => { onMark(role, cur.i, 'hot'); next(); }}
              className="px-6 py-3 rounded-full text-[14px] tracking-[0.1em]"
              style={{ background: '#7FB069', color: '#0E1A24', fontWeight: 600 }}
            >
              记住了 ✓
            </button>
            <button
              onClick={() => { onMark(role, cur.i, 'cold'); next(); }}
              className="px-6 py-3 rounded-full text-[14px] tracking-[0.1em]"
              style={{ background: 'var(--vermilion)', color: '#FAF6EE', fontWeight: 600 }}
            >
              再练练 ✗
            </button>
            <button
              onClick={() => { onMark(role, cur.i, 'hot'); setRevealed(true); }}
              className="px-4 py-3 rounded-full text-[13px]"
              style={{ border: '1px solid rgba(250,246,238,0.3)', color: 'var(--muted)' }}
            >
              重抽一句
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= 对手戏：cue 接词 ================= */

function DuetStage({ roleA, roleB }: { roleA: string; roleB: string }) {
  const [turned, setTurned] = useState<Set<number>>(new Set());

  // roleA 说 cue，roleB 接（用户练 roleB）
  const pairs = useMemo(() => {
    const out: { cue: string; text: string; actNum: string; sceneNo: number }[] = [];
    for (const act of SCRIPT.acts) {
      for (const sc of act.scenes) {
        let lastA: { text: string } | null = null;
        for (const idx of sc.lineIds) {
          const ln = SCRIPT.lines[idx];
          if (ln.kind === 'stage' || !ln.roleName || !ln.text.trim()) continue;
          if (ln.roleName === roleB && lastA) {
            out.push({ cue: lastA.text, text: ln.text, actNum: act.num, sceneNo: sc.no });
          }
          if (ln.roleName === roleA) lastA = { text: ln.text };
        }
      }
    }
    return out;
  }, [roleA, roleB]);

  const turn = (k: number) => setTurned((t) => new Set(t).add(k));
  const colorA = ROLE_COLOR[roleA] || 'var(--gold)';
  const colorB = ROLE_COLOR[roleB] || 'var(--gold)';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-cn text-[18px]" style={{ color: 'var(--ink)' }}>对手戏 · 你演</span>
        <Seal text={roleB} color={colorB} />
        <span style={{ color: 'var(--tea)' }}>共 {pairs.length} 组对白 · 已接 {turned.size} 组</span>
        <Bar ratio={pairs.length ? turned.size / pairs.length : 0} color="var(--gold)" />
      </div>

      {pairs.length === 0 ? (
        <div className="px-6 py-10 rounded-2xl text-center text-[14px]" style={{ background: 'var(--paper-2)', color: 'var(--tea)' }}>
          这两位在戏里没有直接对白，换一对试试。
        </div>
      ) : (
        pairs.map((p, k) => {
          const on = turned.has(k);
          return (
            <div key={k} className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(201,162,75,0.35)' }}>
              {/* cue：对家台词 */}
              <div className="px-5 py-3.5"
                style={{ background: `${colorA}18`, borderLeft: `3px solid ${colorA}` }}>
                <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: 'var(--tea)' }}>
                  {p.actNum} · 第{p.sceneNo}场 · {roleA}
                </div>
                <p className="text-[14.5px] leading-[1.9]" style={{ color: 'var(--ink)' }}>{p.cue}</p>
              </div>
              {/* 你的词 */}
              {on ? (
                <button
                  onClick={() => turn(k)}
                  className="w-full text-left px-5 py-3.5"
                  style={{ background: `${colorB}1A`, borderLeft: `3px solid ${colorB}` }}
                >
                  <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: 'var(--tea)' }}>{roleB}</div>
                  <p className="text-[14.5px] leading-[1.9]" style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.text}</p>
                </button>
              ) : (
                <button
                  onClick={() => turn(k)}
                  className="w-full text-left px-5 py-3.5 transition-colors"
                  style={{ background: 'var(--paper-2)', borderLeft: `3px dashed ${colorB}` }}
                >
                  <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: 'var(--tea)' }}>{roleB} · 轮到你</div>
                  <p className="text-[14px]" style={{ color: 'var(--tea)' }}>—— 在心里接完这句，点这里对照 ——</p>
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ================= 剧本页（阅读/背诵共用） ================= */

function ScriptPage({
  actId, selected, mode, progress, revealed, onReveal,
}: {
  actId: string;
  selected: Set<string>;
  mode: 'read' | 'practice';
  progress: ProgressMap;
  revealed: Set<string>;
  onReveal: (role: string, idx: number) => void;
}) {
  const act = SCRIPT.acts.find((a) => a.id === actId)!;
  let prevSong: number | null = null;
  return (
    <div className="rounded-2xl px-5 sm:px-8 py-8"
      style={{ background: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)', boxShadow: '0 0 0 1px rgba(201,162,75,0.12)' }}>
      {/* 幕题头 */}
      <div className="mb-8 pb-5 flex flex-wrap items-end gap-x-5 gap-y-2"
        style={{ borderBottom: '1.5px solid var(--gold)' }}>
        <h2 className="font-cn text-[clamp(24px,3vw,32px)] tracking-[0.08em]">{act.num}{act.title ? ` ${act.title}` : ''}</h2>
        <span className="text-[12.5px]" style={{ color: 'var(--tea)' }}>{act.scenes.length} 场 · {mode === 'practice' ? '背诵模式：点击遮罩行翻开' : '角色凸现已开启'}</span>
      </div>

      {act.scenes.map((sc) => (
        <div key={sc.id} className="mb-9">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-block w-[4px] h-[18px] rounded" style={{ background: 'var(--vermilion)' }} />
            <span className="font-cn text-[15.5px] tracking-[0.06em]" style={{ color: 'var(--vermilion)' }}>第 {sc.no} 场</span>
            <span className="text-[12.5px] leading-relaxed" style={{ color: 'var(--tea)' }}>{sc.note}</span>
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
                    onReveal={onReveal}
                  />
                </FragmentRow>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 唱段起始横幅 + 行 */
function FragmentRow({ songChanged, songIdx, children }: { songChanged: boolean; songIdx: number | null; children: React.ReactNode }) {
  return (
    <>
      {songChanged && songIdx != null && (
        <div className="my-5 py-2.5 px-4 rounded-lg flex items-center gap-3"
          style={{ background: 'rgba(201,162,75,0.14)', border: '1px solid rgba(201,162,75,0.35)', borderLeft: '4px solid var(--gold)' }}>
          <span className="text-[17px]" style={{ color: '#8C6F2E' }}>♫</span>
          <span className="font-cn text-[15px] tracking-[0.06em]" style={{ color: '#5C4A2E' }}>{SONG_RAW[songIdx]}</span>
        </div>
      )}
      {children}
    </>
  );
}

/** 单条台词行 */
function LineRow({
  line, idx, selected, mode, progress, revealed, onReveal,
}: {
  line: { kind: string; text: string; roleName?: string; songIndex: number | null };
  idx: number;
  selected: Set<string>;
  mode: 'read' | 'practice';
  progress: ProgressMap;
  revealed: boolean;
  onReveal: (role: string, idx: number) => void;
}) {
  const isStage = line.kind === 'stage';
  const isSong = line.songIndex != null;
  const role = line.roleName || '';
  const on = selected.has(role);
  const song = isSong ? SONG_TITLE[line.songIndex!] : null;
  const color = ROLE_COLOR[role];

  const practicing = mode === 'practice' && on && !revealed && !isStage;

  if (practicing) {
    const done = !!progress[role]?.[idx];
    return (
      <button
        data-line={idx}
        onClick={() => onReveal(role, idx)}
        className="w-full text-left py-3 border-b flex items-center gap-4 group"
        style={{ borderColor: 'rgba(139,123,107,0.14)', background: 'rgba(139,123,107,0.05)' }}
      >
        <span className="w-[84px] shrink-0 px-2.5 py-1 rounded-md text-[12px] text-center font-cn" style={{ background: color || '#C9A24B', color: '#FAF6EE' }}>
          {role}
        </span>
        <span className="text-[14px] tracking-[0.12em] group-hover:tracking-[0.14em] transition-all" style={{ color: 'var(--tea)' }}>
          {done ? '已背 ✓ · 再点温习' : '▢▢▢ 背诵中 · 点击翻开 ▢▢▢'}
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
      className="py-3 border-b transition-all duration-300"
      style={{
        ...base,
        borderColor: 'rgba(139,123,107,0.12)',
        background: on
          ? `${color}14`
          : isSong
            ? 'rgba(201,162,75,0.05)'
            : 'transparent',
        borderLeft: on
          ? `3px solid ${color}`
          : '3px solid transparent',
        paddingLeft: on ? 14 : 17,
        transform: on ? 'translateX(2px)' : 'none',
      }}
    >
      {isStage ? (
        <p className="text-[13px] italic leading-[1.9]" style={{ color: '#A29484' }}>
          （{line.text}）
        </p>
      ) : (
        <div className="flex gap-4 items-start">
          <div className="shrink-0 w-[84px] pt-1">
            <span
              className="inline-block px-2.5 py-1 rounded-md text-[12px] text-center font-cn tracking-[0.04em] transition-colors"
              style={{
                background: on ? color : 'rgba(139,123,107,0.13)',
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
              fontFamily: isSong ? 'var(--serif), serif' : 'inherit',
            }}
          >
            {line.text}
            {song && <span className="ml-2.5 text-[12px]" style={{ color: '#8C6F2E' }}>♪《{song}》</span>}
          </p>
        </div>
      )}
    </div>
  );
}

/** 搜索命中结果：按幕分组 */
function SearchResult({
  rows, selected, mode, progress, onReveal,
}: {
  rows: { line: { actId: string; kind: string; text: string; roleName?: string; songIndex: number | null }; i: number }[];
  selected: Set<string>;
  mode: 'read' | 'practice';
  progress: ProgressMap;
  onReveal: (role: string, idx: number) => void;
}) {
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!grouped.has(r.line.actId)) grouped.set(r.line.actId, []);
    grouped.get(r.line.actId)!.push(r);
  }
  return (
    <div className="rounded-2xl px-5 sm:px-8 py-8"
      style={{ background: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)' }}>
      {Array.from(grouped.entries()).map(([actId, list]) => {
        const act = SCRIPT.acts.find((a) => a.id === actId)!;
        return (
          <div key={actId} className="mb-8 last:mb-0">
            <h3 className="font-cn text-[20px] mb-3" style={{ borderBottom: '1px solid rgba(201,162,75,0.3)', paddingBottom: 8 }}>
              {act.num} · {act.title || ''} <span className="text-[12px]" style={{ color: 'var(--tea)' }}>{list.length} 句</span>
            </h3>
            {list.map(({ line, i }) => (
              <LineRow key={i} line={line} idx={i} selected={selected} mode={mode} progress={progress} revealed={false} onReveal={onReveal} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
