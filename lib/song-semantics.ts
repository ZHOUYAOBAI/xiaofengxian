/* ============================================================
   演员工作台 · 唱词语义层
   来源：public/data/song-lines.json（由剧本 docx 逐段核校生成）
   - SINGING: 行 idx → { song, role }（真正唱词行；唱段区间内混入的对白已被剔除）
   - ASIDE:   声部注记行（如 {三人分声部合），渲染为舞台注记
   - SONG_META: 唱段 → 歌名/演唱说明/演唱者
   行索引与 script.json 严格一一对应，音频索引安全
   ============================================================ */

import raw from '../public/data/song-lines.json';

export interface SingingEntry {
  song: number;
  role: string;
}
export interface SongMeta {
  title: string;
  note: string;
  singers: string[];
  n: number;
}

export const SINGING: Record<string, SingingEntry> = raw.singing;
export const ASIDE_IDX: Record<number, boolean> = Object.fromEntries(
  (raw.aside as number[]).map((i) => [i, true])
);
export const SONG_META: Record<string, SongMeta> = raw.songMeta;

export const isSinging = (idx: number): boolean => !!SINGING[String(idx)];
export const isAside = (idx: number): boolean => !!ASIDE_IDX[idx];
export const songOf = (idx: number): number | null => (SINGING[String(idx)] ? SINGING[String(idx)].song : null);
