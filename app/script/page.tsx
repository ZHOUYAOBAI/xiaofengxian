import type { Metadata } from 'next';
import ScriptGate from '@/components/script/ScriptGate';
import ScriptReader from '@/components/script/ScriptReader';

export const metadata: Metadata = {
  title: '演员工作台 · 蔡锷与小凤仙',
  description: '《蔡锷与小凤仙》庭院音乐剧演员排练工作台：全剧八幕 74 场 26 曲，点角色凸现台词、背诵练习、全文检索。',
  robots: { index: false, follow: false },
};

/**
 * 演员工作台（密码保护：2021888）
 * 未解锁时仅渲染密码门；解锁后进入工作台
 */
export default function ScriptPage() {
  return (
    <ScriptGate>
      <ScriptReader />
    </ScriptGate>
  );
}
