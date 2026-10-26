/* ============================================================
   场次 / 票价 / 招角 / 观演须知 —— 构建期内联自 public/data/showings.json
   用户改 data/showings.json（或 public/data/showings.json）后重新 npm run build 即生效
   ============================================================ */

import raw from '../public/data/showings.json';

export interface Showing {
  id: string;
  date: string;
  time: string;
  venue: string;
  seats: number;
  booked: number;
  status: 'open' | 'low';
  highlight?: boolean;
}

export interface ShowingsData {
  venue: {
    name: string;
    address: string;
    transport: { mode: string; detail: string }[];
    duration: string;
    durationShort: string;
    price: { tier: string; price: string; note: string }[];
    notice: string[];
  };
  showings: Showing[];
  audition: {
    roles: { name: string; open: boolean; note: string }[];
    conditions: string[];
    steps: { n: string; t: string; d: string }[];
    checklist: string[];
  };
  credits: { role: string; name: string }[];
  team: { name: string; desc: string; members: string }[];
}

export const SITE_DATA = raw as ShowingsData;

/* 工具：日期格式化 2026-11-07 → 11月07日 · 周六 */
export function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return { m: m + '月', d: day + '日', wd };
}
