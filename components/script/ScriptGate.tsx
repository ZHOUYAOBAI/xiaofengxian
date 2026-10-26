'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * 演员剧本 · 密码门
 * 密码 2021888 以 SHA-256 哈希比对（源码不落明文），解锁状态存 localStorage
 * 注：纯静态站无后端，此保护面向观众/新演员，防止未授权翻阅
 */
const EXPECTED_HASH = '2abf5063adf81b2ae083b69b75d83dcb13db454d8dfa5dd8d69d5fdf6886c026';
const UNLOCK_KEY = 'xfx-script-unlock';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function ScriptGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(UNLOCK_KEY) === '1') {
      setUnlocked(true);
    }
  }, []);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    setBusy(true);
    setErr('');
    const h = await sha256(pwd.trim());
    if (h === EXPECTED_HASH) {
      localStorage.setItem(UNLOCK_KEY, '1');
      setUnlocked(true);
    } else {
      setErr('密码不对，再试一次。');
    }
    setBusy(false);
    setPwd('');
  };

  if (unlocked) return <>{children}</>;

  return (
    <section
      className="relative min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1A2A38 0%, #0E1A24 60%, #0B141C 100%)' }}
    >
      <div className="shell relative z-10 w-full max-w-[420px] py-24">
        <div data-reveal className="text-center">
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center font-cn text-[26px]"
            style={{ border: '1px solid rgba(201,162,75,0.45)', color: 'var(--gold-soft)', background: 'rgba(201,162,75,0.08)' }}
          >
            凤
          </div>
          <h1 className="font-cn text-[clamp(28px,4.5vw,36px)] text-paper mt-6">
            演员剧本
          </h1>
          <p className="mt-3 text-[14px] text-paper/55 tracking-[0.12em]">
            本页仅供剧组演员排练使用 · 请输入密码进入
          </p>
        </div>

        <form onSubmit={unlock} data-reveal data-reveal-delay="0.15" className="mt-10 flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="请输入演员密码"
            autoFocus
            className="px-5 py-4 rounded-2xl outline-none text-center text-[18px] tracking-[0.2em] text-paper placeholder:text-paper/30"
            style={{ background: 'rgba(250,246,238,0.06)', border: '1px solid rgba(201,162,75,0.28)' }}
          />
          <button
            type="submit"
            disabled={busy}
            className="btn btn-gold w-full justify-center disabled:opacity-50"
          >
            {busy ? '校验中…' : '进入剧本'}
          </button>
          {err && (
            <p className="text-center text-[13.5px] animate-pulse" style={{ color: '#E8A59B' }}>
              {err}
            </p>
          )}
          <p className="text-center text-[12px] text-paper/30 mt-2">密码由剧组制作组统一发放</p>
        </form>
      </div>
    </section>
  );
}
