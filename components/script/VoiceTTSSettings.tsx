'use client';

import { useEffect, useRef, useState } from 'react';
import { loadTTSConfig, saveTTSConfig, VOICE_OPTIONS, TTSConfig } from './HuoshanTTS';

/**
 * 火山真人 TTS 设置面板（嵌在朗读控制条）
 */
export default function VoiceTTSSettings({ onChange }: { onChange: (cfg: TTSConfig | null) => void }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<TTSConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [voice, setVoice] = useState(VOICE_OPTIONS[0].voice_type);
  const [voiceName, setVoiceName] = useState(VOICE_OPTIONS[0].name);
  const [custom, setCustom] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const c = loadTTSConfig();
    setCfg(c);
    if (c) {
      setApiKey(c.apiKey);
      setProxyUrl(c.proxyUrl || '');
      setVoice(c.voice);
      const found = VOICE_OPTIONS.find((v) => v.voice_type === c.voice);
      setCustom(!found);
      setVoiceName(c.voiceName || found?.name || c.voice);
    }
  }, []);

  const save = () => {
    if (!apiKey.trim() && !proxyUrl.trim()) return;
    const c: TTSConfig = {
      apiKey: apiKey.trim(),
      voice,
      voiceName: custom ? voiceName.trim() || voice : voiceName,
      proxyUrl: proxyUrl.trim() || undefined,
    };
    saveTTSConfig(c);
    setCfg(c);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2000);
    onChange(c);
  };

  const clear = () => {
    try { localStorage.removeItem('xfx-huoshan-tts-v2'); } catch { /* ignore */ }
    setCfg(null);
    setApiKey('');
    onChange(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-full text-[12.5px] transition-all flex items-center gap-1.5"
        style={{
          border: cfg ? '1px solid rgba(201,162,75,0.6)' : '1px solid rgba(139,123,107,0.3)',
          color: cfg ? '#5C4A2E' : '#8A7B6B',
          background: cfg ? 'rgba(201,162,75,0.12)' : 'transparent',
        }}
        title="接入火山引擎豆包语音，逐句朗读变真人音色"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg ? '#C9A24B' : '#8A7B6B' }} />
        真人TTS{cfg ? '·已启用' : ''}
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-[340px] rounded-2xl p-4 shadow-xl"
          style={{ background: '#F5EFE3', border: '1px solid rgba(201,162,75,0.4)', right: 0 }}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-serif tracking-[0.15em] text-[14px] text-[#3A3329]">火山引擎 · 真人音色</h4>
            {cfg && <button onClick={clear} className="text-[11.5px] text-[#B23A2E] underline underline-offset-2">清除配置</button>}
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[#8A7B6B]">
            在<a className="text-[#8C6F2E] underline underline-offset-2" href="https://console.volcengine.com/" target="_blank" rel="noreferrer">火山引擎控制台</a>开通「豆包语音」后，在<b>控制台 &gt; API Key 管理</b>复制 API Key 填入即可。免费 2 万字符，超出约 2.8 元/万字。
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#8A7B6B]">
            <b>注意</b>：火山接口限制了浏览器直连（CORS），需填<b>中转地址</b>才能用真人音色。部署方法：打开 <a className="text-[#8C6F2E] underline underline-offset-2" href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">Cloudflare</a> → Workers &amp; Pages → 创建 Worker → 粘贴 <code className="text-[10.5px]">cloudflare-worker.js</code> 代码保存部署 → 把生成的 <code className="text-[10.5px]">xxx.workers.dev</code> 地址填到下方「中转地址」。
          </p>
          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-[12px] text-[#5C4A2E]">API Key（直连用，填了中转可留空）</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="控制台 > API Key 管理 中复制"
                type="text"
                className="mt-0.5 w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgba(250,246,238,0.9)', border: '1px solid rgba(139,123,107,0.35)', color: '#4A4038' }}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[#5C4A2E]">中转地址（推荐）</span>
              <input
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://你的worker.workers.dev"
                type="text"
                className="mt-0.5 w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgba(250,246,238,0.9)', border: '1px solid rgba(139,123,107,0.35)', color: '#4A4038' }}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[#5C4A2E]">音色</span>
              <select
                value={custom ? '__custom__' : voice}
                onChange={(e) => {
                  if (e.target.value === '__custom__') { setCustom(true); setVoiceName(''); }
                  else {
                    setCustom(false);
                    const v = VOICE_OPTIONS.find((x) => x.voice_type === e.target.value)!;
                    setVoice(v.voice_type);
                    setVoiceName(v.name);
                  }
                }}
                className="mt-0.5 w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgba(250,246,238,0.9)', border: '1px solid rgba(139,123,107,0.35)', color: '#4A4038' }}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.voice_type} value={v.voice_type}>{v.name}（{v.tip}）</option>
                ))}
                <option value="__custom__">自定义（控制台音色列表查询代号）</option>
              </select>
            </label>
            {custom && (
              <input
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="输入 voice_type 代号，如 zh_female_vv_uranus_bigtts"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgba(250,246,238,0.9)', border: '1px solid rgba(139,123,107,0.35)', color: '#4A4038' }}
              />
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={save}
              disabled={!apiKey.trim() && !proxyUrl.trim()}
              className="px-4 py-1.5 rounded-full text-[12.5px] transition-all disabled:opacity-40"
              style={{ background: 'var(--ink)', color: '#FAF6EE', border: '1px solid var(--ink)' }}
            >
              保存并启用
            </button>
            {saved && <span className="text-[12px] text-[#5C4A2E]">✓ 已保存，逐句朗读将使用真人音色</span>}
          </div>
        </div>
      )}
    </div>
  );
}
