'use client';

import { useMemo, useState } from 'react';
import { SCRIPT, SONG_TITLE, ROLE_COLOR } from '@/lib/script-data';

/**
 * 演员剧本 · 阅读器
 * 功能：八幕导航 / 按角色只看自己的台词 / 全剧本关键词搜索 / 场次与唱词标注
 */
export default function ScriptReader() {
  const [activeAct, setActiveAct] = useState('act0');
  const [role, setRole] = useState<string>('全部');
  const [query, setQuery] = useState('');

  const meta = SCRIPT.meta;
  const roles = [{ name: '全部', color: '#C9A24B' }, ...SCRIPT.roles.map((r) => ({ name: r.name, color: r.color }))];

  const filtered = useMemo(() => {
    const q = query.trim();
    return SCRIPT.lines.map((line, i) => ({ line, i })).filter(({ line }) => {
      if (role !== '全部' && line.roleName !== role) return false;
      if (q && !line.text.includes(q)) return false;
      return true;
    });
  }, [role, query]);

  const searching = query.trim().length > 0;

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', paddingTop: 96 }}>
      {/* 顶栏信息 */}
      <div className="shell pt-4 pb-8">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h1 className="font-cn text-[clamp(28px,4vw,40px)]">
            演员剧本<span className="ml-3 text-[14px] text-[#8A7B6B]">{meta.subtitle}</span>
          </h1>
          <span className="text-[12.5px] tracking-[0.08em] text-[#8A7B6B]">
            {meta.version} · {meta.acts} 幕 {meta.scenes} 场 · {meta.songs} 曲 · {meta.lines} 条台词
          </span>
        </div>

        {/* 角色筛选（新演员学角色的核心） */}
        <div className="mt-6 flex flex-wrap gap-2.5" role="group" aria-label="按角色筛选台词">
          {roles.map((r) => (
            <button
              key={r.name}
              onClick={() => setRole(r.name)}
              className="px-4 py-1.5 rounded-full text-[13px] tracking-[0.06em] transition-all"
              style={{
                background: role === r.name ? r.color : 'transparent',
                color: role === r.name ? '#FAF6EE' : '#4A4038',
                border: `1px solid ${role === r.name ? r.color : 'rgba(139,123,107,0.35)'}`,
              }}
            >
              {r.name}
            </button>
          ))}
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
            <p className="mt-2 text-[13px] text-[#8A7B6B]">
              全剧本命中 {filtered.length} 条 · 当前角色「{role}」
            </p>
          )}
        </div>
      </div>

      {/* 八幕导航 */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(241,234,220,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(139,123,107,0.2)' }}>
        <div className="shell flex gap-1 overflow-x-auto py-3">
          {SCRIPT.acts.map((a) => (
            <button
              key={a.id}
              onClick={() => { setActiveAct(a.id); setQuery(''); setRole('全部'); }}
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

      {/* 剧本正文 */}
      <div className="shell py-12">
        {searching ? (
          <SearchResult rows={filtered} />
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
                  const lines = sc.lineIds
                    .map((idx) => ({ line: SCRIPT.lines[idx], i: idx }))
                    .filter(({ line }) => role === '全部' || line.roleName === role);
                  if (lines.length === 0) return null;
                  return (
                    <div key={sc.id} className="mb-10">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="font-cn text-[15px]" style={{ color: 'var(--vermilion)' }}>第 {sc.no} 场</span>
                        <span className="text-[12.5px] text-[#8A7B6B]">{sc.note}</span>
                      </div>
                      <div className="flex flex-col">
                        {lines.map(({ line, i }) => (
                          <LineRow key={i} line={line} idx={i} highlight={role !== '全部'} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        )}

        {filtered.length === 0 && !searching && (
          <p className="text-[14px] text-[#8A7B6B]">当前角色在此幕没有台词。</p>
        )}
      </div>

      <div className="shell pb-16 text-center text-[12.5px] text-[#8A7B6B]">
        云南钟声音乐制作有限公司 · {meta.version}
      </div>
    </div>
  );
}

/** 单条台词行：stage 舞台提示弱化，line 台词突出 */
function LineRow({ line, idx, highlight }: { line: { kind: string; text: string; roleName?: string; songIndex: number | null; role?: string }; idx: number; highlight?: boolean }) {
  const isStage = line.kind === 'stage';
  const song = line.songIndex != null ? SONG_TITLE[line.songIndex] : null;
  const color = line.roleName ? ROLE_COLOR[line.roleName] : undefined;

  return (
    <div
      className="py-3 border-b"
      style={{ borderColor: 'rgba(139,123,107,0.12)' }}
    >
      {isStage ? (
        <p className="text-[13px] italic text-[#A29484] leading-[1.9]">
          （{line.text}）
        </p>
      ) : (
        <div className="flex gap-4">
          <div className="shrink-0 w-[86px] pt-1">
            <span
              className="inline-block px-2.5 py-1 rounded-full text-[12px] tracking-[0.04em]"
              style={{
                background: highlight ? (color || '#C9A24B') : 'rgba(139,123,107,0.14)',
                color: highlight ? '#FAF6EE' : '#5C524A',
              }}
            >
              {line.roleName || line.role || '台词'}
            </span>
          </div>
          <p className="text-[15.5px] leading-[1.95] text-[#2E2620] flex-1">
            {line.text}
            {song && (
              <span className="ml-2.5 text-[12px] text-[#8C6F2E]">♪《{song}》</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/** 搜索命中结果：按幕/场分组展示 */
function SearchResult({ rows }: { rows: { line: { actId: string; sceneId: string; kind: string; text: string; roleName?: string; songIndex: number | null }; i: number }[] }) {
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.line.actId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  return (
    <div className="flex flex-col gap-10">
      {Array.from(grouped.entries()).map(([actId, list]) => {
        const act = SCRIPT.acts.find((a) => a.id === actId)!;
        return (
          <div key={actId}>
            <h3 className="font-cn text-[20px] mb-4">{act.num} · {act.title}</h3>
            {list.map(({ line, i }) => <LineRow key={i} line={line} idx={i} />)}
          </div>
        );
      })}
    </div>
  );
}
