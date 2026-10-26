import type { Metadata } from 'next';
import ScriptGate from '@/components/script/ScriptGate';
import ScriptReader from '@/components/script/ScriptReader';

export const metadata: Metadata = {
  title: '演员剧本 · 蔡锷与小凤仙',
  description: '《蔡锷与小凤仙》庭院音乐剧演员排练剧本：全剧八幕 74 场 814 条台词，按角色筛选、全文检索。',
  robots: { index: false, follow: false },
};

/**
 * 演员剧本页（密码保护：2021888）
 * 未解锁时仅渲染密码门；解锁后渲染全剧剧本
 */
export default function ScriptPage() {
  return (
    <ScriptGate>
      <ScriptReader />
    </ScriptGate>
  );
}
