'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SCRIPT, SONG_TITLE, ROLE_COLOR } from '@/lib/script-data';
import { SINGING, SONG_META, isAside, isSinging, songOf } from '@/lib/song-semantics';

/**
 * 演员工作台 · 民国戏院版（v3 剧本语义排版）
 * 排版模型：按剧本逻辑重组为「语义块」——
 *   - 唱段横幅：♫《歌名》（说明）· 演唱者
 *   - 唱词块：逐句排，同角色续句缩进不重复人名，整段淡金乐谱调
 *   - 对白块：角色章 + 台词，同角色连续台词合并（人名只出现一次）
 *   - 舞台指示 / 声部注记：小字注记
 * 左栏：模式（阅读/背诵/抽背/对手戏）、幕次、角色印章、进度、搜索
 */
const PROGRESS_KEY = 'xfx-script-progress';
const STARS_KEY = 'xfx-script-stars';
const DUET_KEY = 'xfx-script-duet';

type ProgressMap = Record<string, Record<number, true>>;
type Mode = 'read' | 'duet';

function loadProgress(): ProgressMap {
  try {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

/* ===== 语义块 ===== */
interface Block {
  type: 'stage' | 'aside' | 'song' | 'line';
  idx?: number;
  song?: number;
  role?: string;
  kind?: 'sing' | 'talk';
  first?: boolean;
}
function buildBlocks(sc: { lineIds: number[] }): Block[] {
  const bs: Block[] = [];
  let curSong: number | null = null;
  let prev: { kind: 'sing' | 'talk'; role: string } | null = null;
  for (const idx of sc.lineIds) {
    const l = SCRIPT.lines[idx];
    if (isAside(idx)) {
      bs.push({ type: 'aside', idx });
      prev = null;
      continue;
    }
    if (l.kind === 'stage') {
      bs.push({ type: 'stage', idx });
      prev = null;
      continue;
    }
    if (isSinging(idx)) {
      const s = SINGING[String(idx)].song;
      if (s !== curSong) {
        bs.push({ type: 'song', song: s });
        curSong = s;
      }
      const role = l.roleName || '';
      const first = !(prev && prev.kind === 'sing' && prev.role === role);
      bs.push({ type: 'line', idx, role, kind: 'sing', first });
      prev = { kind: 'sing', role };
      continue;
    }
    const role = l.roleName || '';
    const first = !(prev && prev.kind === 'talk' && prev.role === role);
    bs.push({ type: 'line', idx, role, kind: 'talk', first });
    prev = { kind: 'talk', role };
  }
  return bs;
}

export default function ScriptReader() {
  const [activeAct, setActiveAct] = useState('act0');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('read');
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [maskOn, setMaskOn] = useState(false); // 背词自测：遮住当前幕所选角色的台词
  const [stars, setStars] = useState<Set<number>>(new Set());
  const [jump, setJump] = useState<{ line?: number; song?: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    try {
      const s = JSON.parse(localStorage.getItem(STARS_KEY) || '[]');
      setStars(new Set(Array.isArray(s) ? s : []));
    } catch {}
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
  const actRoleLines = practiceRole
    ? roleLines.filter(({ l }) => l.actId === activeAct)
    : [];
  const actRoleDone = practiceRole
    ? actRoleLines.filter(({ i }) => progress[practiceRole]?.[i]).length
    : 0;

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
    actRoleLines.forEach(({ i }) => reveal(practiceRole!, i));
  };

  /* ---- 星标收藏 ---- */
  const toggleStar = (idx: number) => {
    setStars((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      try {
        localStorage.setItem(STARS_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };
  const clearStars = () => {
    setStars(new Set());
    try {
      localStorage.setItem(STARS_KEY, '[]');
    } catch {}
  };

  /* ---- 定位跳转（切幕 → 滚动 → 高亮） ---- */
  const jumpToLine = (idx: number) => {
    setMode('read'); // 背诵/抽背/对手戏模式下正文无定位行，先回阅读模式
    setActiveAct(SCRIPT.lines[idx].actId);
    setQuery('');
    setJump({ line: idx });
  };
  const jumpToSong = (song: number) => {
    setMode('read');
    const first = Object.keys(SINGING).find((k) => SINGING[k].song === song);
    if (first != null) setActiveAct(SCRIPT.lines[+first].actId);
    setJump({ song });
  };
  useEffect(() => {
    if (!jump) return;
    const target = jump.line != null ? `[data-line="${jump.line}"]` : `#song-${jump.song}`;
    const cls = jump.line != null ? 'line-jump' : 'song-jump';
    const t = setInterval(() => {
      const el = document.querySelector(target);
      if (el) {
        clearInterval(t);
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 2600);
        setJump(null);
      }
    }, 220);
    const guard = setTimeout(() => clearInterval(t), 4500);
    return () => {
      clearInterval(t);
      clearTimeout(guard);
    };
  }, [jump]);

  /* ---- 台词小抄（复制） ---- */
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };
  const copyAct = async () => {
    const act = SCRIPT.acts.find((a) => a.id === activeAct)!;
    const txt = act.scenes
      .flatMap((sc) => sc.lineIds)
      .map((i) => {
        const l = SCRIPT.lines[i];
        return l.kind === 'stage' ? `【${l.text}】` : `${l.roleName || '台词'}：${l.text}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      flash(`已复制「${act.num}」全部台词 ${txt.split('\n').length} 行`);
    } catch {
      flash('复制失败，请手动框选复制');
    }
  };
  const copyRoles = async () => {
    const roles = Array.from(selected);
    const txt = SCRIPT.lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => roles.includes(l.roleName || '') && l.kind !== 'stage' && l.text.trim())
      .map(({ l }) => `${l.roleName}：${l.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      flash(`已复制 ${roles.join('、')} 台词 ${txt.split('\n').length} 句`);
    } catch {
      flash('复制失败，请手动框选复制');
    }
  };

  /* 唱段 → 所属幕 */
  const songActs = useMemo(() => {
    const m: Record<number, string> = {};
    for (const k of Object.keys(SINGING)) {
      const s = SINGING[k].song;
      if (m[s] == null) m[s] = SCRIPT.lines[+k].actId;
    }
    return m;
  }, []);

  const goAct = (id: string) => {
    setActiveAct(id);
    setQuery('');
    window.scrollTo({ top: 0 });
  };

  const duetRole = selected.size === 2 ? Array.from(selected)[0] : null;
  const duetPartner = selected.size === 2 ? Array.from(selected)[1] : null;
  // 对手戏默认配对：已选两位按选择顺序；未选/选一位时带入当前练习角色 + 默认对手（蔡锷⇄小凤仙）
  const effDuet = useMemo(() => {
    const s = Array.from(selected);
    if (s.length >= 2) return { roleA: s[1], roleB: s[0] };
    const pri = s[0] || practiceRole || '蔡锷';
    const partner = pri === '蔡锷' ? '小凤仙' : pri === '小凤仙' ? '蔡锷' : '蔡锷';
    return { roleA: partner, roleB: pri };
  }, [selected, practiceRole]);

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', paddingTop: 88 }}>
      {/* ===== 顶栏 ===== */}
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
        {/* ===== 左栏 ===== */}
        <aside className="relative w-full lg:w-[288px] shrink-0 lg:sticky lg:top-[96px] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto lg:pr-2 flex flex-col gap-7 rounded-2xl p-6"
          style={{ background: 'var(--ink)', color: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)' }}>
          <div className="absolute top-0 left-6 w-16 h-[3px]" style={{ background: 'var(--gold)' }} aria-hidden />

          <section>
            <SideTitle>排练模式</SideTitle>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['read', '阅读'],
                  ['duet', '对手戏'],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3 py-1.5 rounded-full text-[13px] tracking-[0.06em] transition-all"
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
              {mode === 'read' && '点选角色 → 其台词高亮；同一角色连续台词只出现一次人名。'}
              {mode === 'duet' && '选两个角色，跟着对家台词接词，练对手戏。'}
            </SideHint>
          </section>

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

          <section>
            <SideTitle>唱段目录（{Object.keys(SONG_META).length} 曲）</SideTitle>
            <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
              {Object.keys(SONG_META)
                .sort((a, b) => +a - +b)
                .map((k) => {
                  const m = SONG_META[k];
                  const actNum = SCRIPT.acts.find((a) => a.id === songActs[+k])?.num;
                  return (
                    <button
                      key={k}
                      onClick={() => jumpToSong(+k)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-all"
                      style={{ background: 'rgba(201,162,75,0.07)', border: '1px solid rgba(201,162,75,0.14)' }}
                    >
                      <span className="text-[12px]" style={{ color: '#8C6F2E' }}>♫</span>
                      <span className="text-[12.5px] font-cn truncate" style={{ color: 'var(--gold-soft)' }}>{m.title}</span>
                      <span className="text-[10.5px] ml-auto shrink-0" style={{ color: 'var(--muted)' }}>
                        {actNum || ''}{m.n}句
                      </span>
                    </button>
                  );
                })}
            </div>
            <SideHint>点击任意曲目，自动跳到对应唱段并高亮。</SideHint>
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <SideTitle>角色</SideTitle>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="text-[12px] px-2.5 py-1 rounded-full"
                  style={{ border: '1px solid rgba(232,165,155,0.5)', color: '#E8A59B' }}>
                  清除
                </button>
              )}
            </div>
            {mode === 'duet' && (
              <SideHint>
                {selected.size === 0
                  ? '对手戏模式：点选两位演员，按剧本顺序排出对白（已自动带上你的练习角色）。'
                  : selected.size === 1
                    ? '再点一位演员，组成对手戏。'
                    : '已选两位，正文区开始接词练习。'}
              </SideHint>
            )}
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
                  const songs = new Set(lines.map((l) => songOf(SCRIPT.lines.indexOf(l))).filter((s) => s != null)).size;
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

          {stars.size > 0 && (
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <SideTitle>星标句（{stars.size}）</SideTitle>
                <button onClick={clearStars} className="text-[12px] px-2.5 py-1 rounded-full"
                  style={{ border: '1px solid rgba(232,165,155,0.5)', color: '#E8A59B' }}>
                  清空
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                {Array.from(stars).sort((a, b) => a - b).map((idx) => {
                  const l = SCRIPT.lines[idx];
                  return (
                    <button key={idx} onClick={() => jumpToLine(idx)}
                      className="px-2.5 py-1.5 rounded-md text-left text-[12px] leading-relaxed"
                      style={{ background: 'rgba(201,162,75,0.07)', border: '1px solid rgba(201,162,75,0.14)' }}>
                      <span className="mr-1" style={{ color: '#E8C66B' }}>★</span>
                      <span style={{ color: 'var(--muted)' }}>{l.roleName || '台词'}：</span>
                      <span style={{ color: 'var(--paper)' }}>
                        {l.text.length > 24 ? l.text.slice(0, 24) + '…' : l.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {mode === 'read' && practiceRole && (
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <SideTitle>背词自测</SideTitle>
                <button
                  onClick={() => {
                    setMaskOn(!maskOn);
                    setRevealed(new Set());
                  }}
                  className="px-3 py-1 rounded-full text-[12px] transition-all"
                  style={{
                    background: maskOn ? 'var(--gold)' : 'transparent',
                    color: maskOn ? '#0E1A24' : 'var(--gold-soft)',
                    border: `1px solid ${maskOn ? 'var(--gold)' : 'rgba(201,162,75,0.45)'}`,
                    fontWeight: maskOn ? 600 : 400,
                  }}
                >
                  {maskOn ? '关闭自测' : '开启自测'}
                </button>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(201,162,75,0.1)', border: '1px solid rgba(201,162,75,0.3)' }}>
                {maskOn ? (
                  <>
                    <div className="flex items-center justify-between text-[13px]">
                      <span style={{ color: 'var(--gold-soft)' }}>
                        <b>{practiceRole}</b> · 本幕已背 <b>{actRoleDone}</b>/{actRoleLines.length}
                      </span>
                      <button onClick={revealAll} className="px-3 py-1 rounded-full text-[12px]" style={{ border: '1px solid rgba(201,162,75,0.45)', color: 'var(--gold-soft)' }}>
                        翻开全部
                      </button>
                    </div>
                    <Bar ratio={actRoleLines.length ? actRoleDone / actRoleLines.length : 0} color="var(--gold)" />
                    {actRoleLines.length === 0 ? (
                      <p className="mt-2 text-[11.5px]" style={{ color: 'var(--muted)' }}>
                        本幕没有 {practiceRole} 的台词，切到其他幕试试
                      </p>
                    ) : (
                      <p className="mt-2 text-[11.5px]" style={{ color: 'var(--muted)' }}>
                        该角色本幕台词已遮住，点行翻开；全剧已背 {roleDone}/{roleLines.length} 句
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                    开启后遮住 <b style={{ color: 'var(--gold-soft)' }}>{practiceRole}</b> 在本幕的全部台词，点行翻开自测。
                  </p>
                )}
              </div>
            </section>
          )}

          <section>
            <SideTitle>台词小抄</SideTitle>
            <div className="flex flex-col gap-2">
              <button onClick={copyAct} className="px-3 py-2 rounded-lg text-[13px] text-left transition-all"
                style={{ border: '1px solid rgba(201,162,75,0.35)', color: 'var(--gold-soft)' }}>
                复制当前幕台词
              </button>
              {selected.size > 0 && (
                <button onClick={copyRoles} className="px-3 py-2 rounded-lg text-[13px] text-left transition-all"
                  style={{ border: '1px solid rgba(201,162,75,0.35)', color: 'var(--gold-soft)' }}>
                  复制所选角色台词（{Array.from(selected).join('、')}）
                </button>
              )}
            </div>
            <SideHint>一键导出纯文本，粘贴到备忘录或打印背诵小抄。</SideHint>
          </section>

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
            effDuet ? (
              <DuetStage roleA={effDuet.roleA} roleB={effDuet.roleB} activeAct={activeAct} />
            ) : (
              <EmptyStage title="对手戏 · 接词排练"
                hint="在左栏「角色」中点选两位演员（如 蔡锷 + 小凤仙），系统按剧本顺序排出对白：先亮对方台词做提示，你接自己的词，点击翻看对照。" />
            )
          ) : searching ? (
            <SearchResult rows={filtered} selected={selected} mask={maskOn} progress={progress} onReveal={reveal} />
          ) : (
            <ScriptPage actId={activeAct} selected={selected} mask={maskOn} progress={progress} revealed={revealed} onReveal={reveal} stars={stars} onStar={toggleStar} />
          )}
        </main>
      </div>

      <div className="shell pb-16 text-center text-[12.5px] tracking-[0.15em]" style={{ color: 'var(--tea)' }}>
        {meta.title} · {meta.version}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-5 py-3 rounded-xl text-[13px] tracking-[0.06em]"
          style={{ background: 'var(--ink)', color: 'var(--gold-soft)', border: '1px solid rgba(201,162,75,0.5)', boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
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

/* ================= 剧本页（语义块排版） ================= */

function ScriptPage({
  actId, selected, mask, progress, revealed, onReveal, stars, onStar,
}: {
  actId: string;
  selected: Set<string>;
  mask: boolean;
  progress: ProgressMap;
  revealed: Set<string>;
  onReveal: (role: string, idx: number) => void;
  stars: Set<number>;
  onStar: (idx: number) => void;
}) {
  const act = SCRIPT.acts.find((a) => a.id === actId)!;
  const hlRole = selected.size === 1 ? Array.from(selected)[0] : null;
  const hlLines = hlRole
    ? SCRIPT.lines.filter((l) => l.roleName === hlRole && l.kind !== 'stage' && l.text.trim() && l.actId === actId)
    : [];
  const hlColor = hlRole ? (ROLE_COLOR[hlRole] || 'var(--gold)') : 'var(--gold)';
  return (
    <div className="rounded-2xl px-5 sm:px-8 py-8"
      style={{ background: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)', boxShadow: '0 0 0 1px rgba(201,162,75,0.12)' }}>
      <div className="mb-8 pb-5 flex flex-wrap items-end gap-x-5 gap-y-2" style={{ borderBottom: '1.5px solid var(--gold)' }}>
        <h2 className="font-cn text-[clamp(24px,3vw,32px)] tracking-[0.08em]">{act.num}{act.title ? ` ${act.title}` : ''}</h2>
        <span className="text-[12.5px]" style={{ color: 'var(--tea)' }}>
          {act.scenes.length} 场 · {mask ? '背词自测：点遮罩行翻开' : '点选角色即可高亮其台词'}
        </span>
      </div>

      {hlRole && !mask && (
        <div className="mb-6 px-4 py-2.5 rounded-xl flex items-center gap-3 text-[13px]"
          style={{ background: `${hlColor}14`, border: `1px solid ${hlColor}44`, color: 'var(--ink)' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: hlColor }} />
          {hlLines.length > 0 ? (
            <span>
              高亮中：<b style={{ color: hlColor }}>{hlRole}</b> · 本幕 {hlLines.length} 句台词已凸现
            </span>
          ) : (
            <span>
              <b style={{ color: hlColor }}>{hlRole}</b> 本幕没有台词，切到别的幕试试
            </span>
          )}
        </div>
      )}

      {act.scenes.map((sc) => (
        <div key={sc.id} className="mb-9">
          <div className="flex items-start gap-3 mb-4">
            <span className="inline-block w-[4px] h-[18px] rounded mt-1" style={{ background: 'var(--vermilion)' }} />
            <div>
              <span className="font-cn text-[15.5px] tracking-[0.06em] mr-3" style={{ color: 'var(--vermilion)' }}>第 {sc.no} 场</span>
              {sc.note && <span className="text-[12.5px] leading-relaxed" style={{ color: 'var(--tea)' }}>{sc.note}</span>}
            </div>
          </div>
          <div className="flex flex-col">
            {buildBlocks(sc).map((b, bi) => (
              <BlockView key={bi} b={b} selected={selected} mask={mask} progress={progress} revealed={revealed} onReveal={onReveal} stars={stars} onStar={onStar} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockView({
  b, selected, mask, progress, revealed, onReveal, stars, onStar,
}: {
  b: Block;
  selected: Set<string>;
  mask: boolean;
  progress: ProgressMap;
  revealed: Set<string>;
  onReveal: (role: string, idx: number) => void;
  stars: Set<number>;
  onStar: (idx: number) => void;
}) {
  if (b.type === 'stage') return <StageNote text={SCRIPT.lines[b.idx!].text} />;
  if (b.type === 'aside') return <AsideNote text={SCRIPT.lines[b.idx!].text} />;
  if (b.type === 'song') {
    const m = SONG_META[String(b.song!)];
    if (!m) return null;
    return <SongBanner song={b.song!} title={m.title} note={m.note} singers={m.singers} />;
  }
  return (
    <ScriptLine
      line={SCRIPT.lines[b.idx!]}
      idx={b.idx!}
      role={b.role || ''}
      kind={b.kind!}
      first={!!b.first}
      selected={selected}
      mask={mask}
      progress={progress}
      revealed={revealed.has(`${b.role || ''}:${b.idx}`)}
      onReveal={onReveal}
      starred={stars.has(b.idx!)}
      onStar={onStar}
    />
  );
}

/** 舞台指示 */
function StageNote({ text }: { text: string }) {
  return (
    <div className="my-3 px-4 py-2.5 text-center">
      <p className="text-[12.5px] italic leading-[1.9] inline-block px-4 py-1 rounded-lg" style={{ color: '#9A8B7A', background: 'rgba(139,123,107,0.06)' }}>
        【{text}】
      </p>
    </div>
  );
}
/** 声部注记 */
function AsideNote({ text }: { text: string }) {
  const t = text.replace(/^\{/, '').replace(/\}$/, '');
  return (
    <div className="my-2 text-center">
      <span className="text-[12px] tracking-[0.18em]" style={{ color: '#8C6F2E' }}>♫（{t}）</span>
    </div>
  );
}
/** 唱段横幅 */
function SongBanner({ song, title, note, singers }: { song: number; title: string; note: string; singers: string[] }) {
  return (
    <div id={`song-${song}`} className="my-6 px-5 py-4 rounded-xl"
      style={{ background: 'linear-gradient(90deg, rgba(201,162,75,0.22), rgba(201,162,75,0.08))', border: '1px solid rgba(201,162,75,0.45)', borderLeft: '4px solid var(--gold)' }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[20px]" style={{ color: '#8C6F2E' }}>♫</span>
        <span className="font-cn text-[19px] tracking-[0.08em]" style={{ color: '#5C4A2E' }}>《{title}》</span>
        {note && <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,162,75,0.25)', color: '#8C6F2E' }}>{note}</span>}
        {singers.length > 0 && (
          <span className="text-[12px] tracking-[0.12em]" style={{ color: '#8A7B6B' }}>演唱 · {singers.join(' / ')}</span>
        )}
      </div>
    </div>
  );
}

/** 台词行：唱词（sing）与对白（talk）共用，块首带角色章、续行缩进 */
function ScriptLine({
  line, idx, role, kind, first, selected, mask, progress, revealed, onReveal, starred, onStar,
}: {
  line: { text: string; songIndex: number | null };
  idx: number;
  role: string;
  kind: 'sing' | 'talk';
  first: boolean;
  selected: Set<string>;
  mask: boolean;
  progress: ProgressMap;
  revealed: boolean;
  onReveal: (role: string, idx: number) => void;
  starred: boolean;
  onStar: (idx: number) => void;
}) {
  const isSing = kind === 'sing';
  const on = selected.has(role);
  const songTitle = isSing && line.songIndex != null ? SONG_TITLE[line.songIndex] : null;
  const color = ROLE_COLOR[role];
  const dim = selected.size > 0 && !on;

  // 背词自测遮罩
  const practicing = mask && on && !revealed;
  if (practicing) {
    const done = !!progress[role]?.[idx];
    return (
      <button
        data-line={idx}
        onClick={() => onReveal(role, idx)}
        className="w-full text-left py-3 border-b flex items-center gap-4 group transition-all"
        style={{ borderColor: 'rgba(139,123,107,0.14)', background: 'rgba(139,123,107,0.05)', paddingLeft: first ? 0 : 64 }}
      >
        <span className="w-[64px] shrink-0 px-2 py-1 rounded-md text-[12px] text-center font-cn" style={{ background: color || '#C9A24B', color: '#FAF6EE' }}>
          {first ? role : ''}
        </span>
        <span className="text-[14px] tracking-[0.12em] transition-all" style={{ color: 'var(--tea)' }}>
          {done ? '已背 ✓ · 再点温习' : '▢▢ 背诵中 · 点击翻开 ▢▢'}
        </span>
      </button>
    );
  }

  const base: React.CSSProperties = {
    opacity: dim ? 0.25 : 1,
    borderColor: 'rgba(139,123,107,0.12)',
    background: on
      ? `${color}22`
      : isSing
        ? 'rgba(201,162,75,0.05)'
        : 'transparent',
  };

  return (
    <div
      data-line={idx}
      className="script-line py-[9px] border-b transition-all duration-300 flex items-start gap-3"
      style={{
        ...base,
        borderLeft: on ? `3px solid ${color}` : isSing ? '3px solid rgba(201,162,75,0.35)' : '3px solid transparent',
        paddingLeft: on ? 12 : 15,
      }}
    >
      <div className="shrink-0 w-[64px] pt-0.5">
        {first ? (
          <span
            className="inline-block px-2 py-1 rounded-md text-[12px] text-center font-cn tracking-[0.04em] transition-colors"
            style={{
              background: on ? color : isSing ? 'rgba(201,162,75,0.2)' : 'rgba(139,123,107,0.13)',
              color: on ? '#FAF6EE' : isSing ? '#8C6F2E' : '#5C524A',
              fontWeight: on ? 600 : 400,
            }}
          >
            {role || '台词'}
          </span>
        ) : null}
      </div>
      <p
        className="flex-1 leading-[1.95] transition-all"
        style={{
          color: on ? '#16130F' : isSing ? '#4A3A26' : '#2E2620',
          fontWeight: on ? 600 : 400,
          fontSize: isSing ? 17 : 15.5,
          fontFamily: isSing ? 'var(--serif), serif' : 'inherit',
          letterSpacing: isSing ? '0.05em' : 'normal',
        }}
      >
        {line.text}
        {isSing && songTitle && <span className="ml-2.5 text-[11.5px] tracking-[0.06em]" style={{ color: '#8C6F2E' }}>♪《{songTitle}》</span>}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStar(idx);
        }}
        className={`script-star-btn ${starred ? 'on' : ''} shrink-0 px-1 text-[16px] leading-none self-start mt-0.5`}
        style={{ color: starred ? '#C9A24B' : 'rgba(201,162,75,0.75)' }}
        title={starred ? '取消星标' : '标记重点句'}
        aria-label={starred ? '取消星标' : '标记重点句'}
      >
        {starred ? '★' : '☆'}
      </button>
    </div>
  );
}

/* ================= 对手戏 ================= */

function DuetStage({ roleA, roleB, activeAct }: { roleA: string; roleB: string; activeAct: string }) {
  const [scope, setScope] = useState<'act' | 'all'>('act'); // 对手戏默认练当前幕
  const duetKey = `duet:${roleA}→${roleB}`;
  const [turned, setTurned] = useState<Set<number>>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(DUET_KEY) || '{}');
      return new Set(Array.isArray(s[duetKey]) ? s[duetKey] : []);
    } catch {
      return new Set();
    }
  });

  const allPairs = useMemo(() => {
    const out: { cue: string; cueRole: string; text: string; actNum: string; sceneNo: number; actId: string }[] = [];
    for (const act of SCRIPT.acts) {
      for (const sc of act.scenes) {
        let lastAny: { text: string; role: string } | null = null;
        let lastA: { text: string } | null = null;
        let lastB: { text: string } | null = null;
        for (const idx of sc.lineIds) {
          const ln = SCRIPT.lines[idx];
          if (ln.kind === 'stage' || !ln.roleName || !ln.text.trim()) continue;
          if (isSinging(idx)) continue; // 唱词不参与对手戏，只练对白
          if (ln.roleName === roleB) {
            if (lastB) {
              // 自己连说：cue 应是自己的上一句，而非更早的对方旧词
              out.push({ cue: lastB.text, cueRole: `${roleB}·连说`, text: ln.text, actNum: act.num, sceneNo: sc.no, actId: act.id });
            } else if (lastA) {
              out.push({ cue: lastA.text, cueRole: roleA, text: ln.text, actNum: act.num, sceneNo: sc.no, actId: act.id });
            } else if (lastAny) {
              out.push({ cue: lastAny.text, cueRole: lastAny.role, text: ln.text, actNum: act.num, sceneNo: sc.no, actId: act.id });
            } else {
              out.push({ cue: '', cueRole: '', text: ln.text, actNum: act.num, sceneNo: sc.no, actId: act.id });
            }
          }
          if (ln.roleName === roleB) lastB = { text: ln.text };
          else {
            if (ln.roleName === roleA) lastA = { text: ln.text };
            lastB = null; // 别人插话，连说中断
          }
          lastAny = { text: ln.text, role: ln.roleName };
        }
      }
    }
    return out;
  }, [roleA, roleB]);

  const pairs = useMemo(
    () => (scope === 'act' ? allPairs.filter((p) => p.actId === activeAct) : allPairs),
    [allPairs, scope, activeAct]
  );

  const saveTurned = (next: Set<number>) => {
    try {
      const all = JSON.parse(localStorage.getItem(DUET_KEY) || '{}');
      all[duetKey] = [...next];
      localStorage.setItem(DUET_KEY, JSON.stringify(all));
    } catch {}
  };
  const turn = (k: number) => {
    setTurned((t) => {
      const next = new Set(t).add(k);
      saveTurned(next);
      return next;
    });
  };
  const resetAll = () => {
    setTurned(new Set());
    saveTurned(new Set());
  };
  const colorB = ROLE_COLOR[roleB] || 'var(--gold)';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-cn text-[18px]" style={{ color: 'var(--ink)' }}>对手戏 · 你演</span>
        <Seal text={roleB} color={colorB} />
        <span style={{ color: 'var(--tea)' }}>共 {pairs.length} 句对白 · 已接 {turned.size} 句</span>
        <div className="w-40"><Bar ratio={pairs.length ? turned.size / pairs.length : 0} color="var(--gold)" /></div>
        <div className="flex rounded-full overflow-hidden text-[12px]" style={{ border: '1px solid rgba(201,162,75,0.4)' }}>
          <button onClick={() => setScope('act')} className="px-3 py-1"
            style={{ background: scope === 'act' ? 'var(--gold)' : 'transparent', color: scope === 'act' ? '#0E1A24' : 'var(--muted)', fontWeight: scope === 'act' ? 600 : 400 }}>
            本幕
          </button>
          <button onClick={() => setScope('all')} className="px-3 py-1"
            style={{ background: scope === 'all' ? 'var(--gold)' : 'transparent', color: scope === 'all' ? '#0E1A24' : 'var(--muted)', fontWeight: scope === 'all' ? 600 : 400 }}>
            全剧
          </button>
        </div>
        {turned.size > 0 && (
          <button onClick={resetAll} className="px-3 py-1 rounded-full text-[12px]" style={{ border: '1px solid rgba(232,165,155,0.5)', color: '#E8A59B' }}>
            重新练
          </button>
        )}
      </div>

      {pairs.length === 0 ? (
        <div className="px-6 py-10 rounded-2xl text-center text-[14px]" style={{ background: 'var(--paper-2)', color: 'var(--tea)' }}>
          {scope === 'act'
            ? `本幕没有 ${roleB} 的对白，切到别的幕，或点「全剧」练全部。`
            : '这两位在戏里没有直接对白，换一对试试。'}
        </div>
      ) : (
        pairs.map((p, k) => {
          const on = turned.has(k);
          return (
            <div key={k} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,162,75,0.35)' }}>
              <div className="px-5 py-3.5" style={{ background: 'rgba(201,162,75,0.08)', borderLeft: '3px solid rgba(201,162,75,0.6)' }}>
                <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: 'var(--tea)' }}>
                  {p.actNum} · 第{p.sceneNo}场 ·{' '}
                  {p.cueRole?.includes('·连说') ? (
                    <span style={{ color: 'var(--gold-soft)' }}>自己连说 · 接上一句</span>
                  ) : (
                    p.cueRole || '开场'
                  )}
                </div>
                <p className="text-[14.5px] leading-[1.9]" style={{ color: 'var(--ink)' }}>
                  {p.cue || '—— 本场开场，你的词 ——'}
                </p>
              </div>
              {on ? (
                <button onClick={() => turn(k)} className="w-full text-left px-5 py-3.5"
                  style={{ background: `${colorB}1A`, borderLeft: `3px solid ${colorB}` }}>
                  <div className="text-[11px] tracking-[0.2em] mb-1" style={{ color: 'var(--tea)' }}>{roleB}</div>
                  <p className="text-[14.5px] leading-[1.9]" style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.text}</p>
                </button>
              ) : (
                <button onClick={() => turn(k)} className="w-full text-left px-5 py-3.5 transition-colors"
                  style={{ background: 'var(--paper-2)', borderLeft: `3px dashed ${colorB}` }}>
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

/* ================= 搜索结果 ================= */

function SearchResult({
  rows, selected, mask, progress, onReveal,
}: {
  rows: { line: { actId: string; kind: string; text: string; roleName?: string; songIndex: number | null }; i: number }[];
  selected: Set<string>;
  mask: boolean;
  progress: ProgressMap;
  onReveal: (role: string, idx: number) => void;
}) {
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!grouped.has(r.line.actId)) grouped.set(r.line.actId, []);
    grouped.get(r.line.actId)!.push(r);
  }
  return (
    <div className="rounded-2xl px-5 sm:px-8 py-8" style={{ background: 'var(--paper)', border: '1px solid rgba(201,162,75,0.4)' }}>
      {Array.from(grouped.entries()).map(([actId, list]) => {
        const act = SCRIPT.acts.find((a) => a.id === actId)!;
        return (
          <div key={actId} className="mb-8 last:mb-0">
            <h3 className="font-cn text-[20px] mb-3" style={{ borderBottom: '1px solid rgba(201,162,75,0.3)', paddingBottom: 8 }}>
              {act.num} · {act.title || ''} <span className="text-[12px]" style={{ color: 'var(--tea)' }}>{list.length} 句</span>
            </h3>
            {list.map(({ line, i }) => (
              <SearchLine key={i} line={line} idx={i} selected={selected} mask={mask} progress={progress} onReveal={onReveal} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SearchLine({
  line, idx, selected, mask, progress, onReveal,
}: {
  line: { kind: string; text: string; roleName?: string; songIndex: number | null };
  idx: number;
  selected: Set<string>;
  mask: boolean;
  progress: ProgressMap;
  onReveal: (role: string, idx: number) => void;
}) {
  const isSing = isSinging(idx);
  const isAsd = isAside(idx) && line.kind !== 'stage';
  const role = line.roleName || '';
  const on = selected.has(role);
  const color = ROLE_COLOR[role];
  if (line.kind === 'stage') return <StageNote text={line.text} />;
  if (isAsd) return <AsideNote text={line.text} />;
  if (mask && on) {
    const done = !!progress[role]?.[idx];
    return (
      <button onClick={() => onReveal(role, idx)} data-line={idx}
        className="w-full text-left py-3 border-b flex items-center gap-4"
        style={{ borderColor: 'rgba(139,123,107,0.14)', background: 'rgba(139,123,107,0.05)' }}>
        <span className="w-[64px] shrink-0 px-2 py-1 rounded-md text-[12px] text-center font-cn" style={{ background: color || '#C9A24B', color: '#FAF6EE' }}>{role}</span>
        <span className="text-[14px]" style={{ color: 'var(--tea)' }}>{done ? '已背 ✓ · 再点温习' : '▢▢ 自测中 · 点击翻开 ▢▢'}</span>
      </button>
    );
  }
  return (
    <div data-line={idx} className="py-3 border-b flex items-start gap-3"
      style={{ borderColor: 'rgba(139,123,107,0.12)', background: on ? `${color}14` : isSing ? 'rgba(201,162,75,0.05)' : 'transparent', borderLeft: on ? `3px solid ${color}` : isSing ? '3px solid rgba(201,162,75,0.35)' : '3px solid transparent', paddingLeft: on ? 12 : 15, opacity: selected.size > 0 && !on ? 0.3 : 1 }}>
      <div className="shrink-0 w-[64px] pt-0.5">
        <span className="inline-block px-2 py-1 rounded-md text-[12px] text-center font-cn"
          style={{ background: on ? color : isSing ? 'rgba(201,162,75,0.2)' : 'rgba(139,123,107,0.13)', color: on ? '#FAF6EE' : isSing ? '#8C6F2E' : '#5C524A' }}>
          {role || '台词'}
        </span>
      </div>
      <p className="flex-1 leading-[1.9]" style={{ color: isSing ? '#4A3A26' : '#2E2620', fontSize: isSing ? 16 : 15, fontFamily: isSing ? 'var(--serif), serif' : 'inherit' }}>
        {line.text}
        {isSing && line.songIndex != null && <span className="ml-2 text-[11.5px]" style={{ color: '#8C6F2E' }}>♪《{SONG_TITLE[line.songIndex]}》</span>}
      </p>
    </div>
  );
}
