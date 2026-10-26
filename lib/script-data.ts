/* ============================================================
   演员工作台 · 剧本数据 —— 构建期内联自 public/data/script.json
   数据源：《庭院音乐剧〈蔡锷与小凤仙〉2026.8 月修改.docx》
   词语逐字保留原稿，仅排版
   ============================================================ */

import raw from '../public/data/script.json';

export interface RoleItem {
  id: string;
  name: string;
  color: string;
  desc: string;
}

export interface SceneItem {
  id: string;
  no: number;
  note: string;
  lineIds: number[];
}

export interface ActItem {
  num: string;
  title: string;
  id: string;
  scenes: SceneItem[];
  songIds: string[];
}

export interface LineItem {
  kind: 'stage' | 'text' | 'line' | string;
  text: string;
  actId: string;
  sceneId: string;
  songIndex: number | null;
  role?: string;
  roleId?: string;
  roleName?: string;
}

export interface SongItem {
  index: number;
  title: string;
  rawTitle?: string;
  vocal: string;
  hasLyrics: boolean;
}

export interface ScriptData {
  meta: {
    title: string;
    subtitle: string;
    company: string;
    version: string;
    year: string;
    acts: number;
    scenes: number;
    songs: number;
    lines: number;
  };
  roles: RoleItem[];
  songs: SongItem[];
  acts: ActItem[];
  lines: LineItem[];
}

export const SCRIPT = raw as ScriptData;

/** 唱词：歌曲标题 map（songIndex → 歌名） */
export const SONG_TITLE: Record<number, string> = Object.fromEntries(
  SCRIPT.songs.map((s) => [s.index, s.title])
);

/** 唱段原始标题（如「唱段一《你》」），正文唱段横幅用 */
export const SONG_RAW: Record<number, string> = Object.fromEntries(
  SCRIPT.songs.map((s) => [s.index, s.rawTitle || `唱段《${s.title}》`])
);

/** 角色名 → 颜色 */
export const ROLE_COLOR: Record<string, string> = Object.fromEntries(
  SCRIPT.roles.map((r) => [r.name, r.color])
);
