'use client';

/**
 * 火山引擎 · 豆包语音合成大模型 2.0 —— 浏览器端接入
 * - 新版控制台鉴权：X-Api-Key（控制台 > API Key 管理）
 * - 接口：POST https://openspeech.bytedance.com/api/v3/tts/unidirectional（HTTP Chunked）
 * - 资源：X-Api-Resource-Id: seed-tts-2.0（需在控制台开通/试用语音合成服务）
 * - 失败返回 null，调用方回退浏览器语音
 */

export type TTSConfig = {
  apiKey: string;
  voice: string; // voice_type 代号
  voiceName: string;
  proxyUrl?: string; // 可选：Cloudflare Worker 中转地址（绕过火山 CORS 限制）
};

const KEY = 'xfx-huoshan-tts-v2';

export const VOICE_OPTIONS: { name: string; voice_type: string; tip: string }[] = [
  { name: '温柔小哥 2.0（男·沉稳）', voice_type: 'zh_male_wenrouxiaoge_uranus_bigtts', tip: '民国将军气质首选' },
  { name: '云舟 2.0（男·浑厚）', voice_type: 'zh_male_m191_uranus_bigtts', tip: '播音级男声' },
  { name: '东方浩然 2.0（男·正气）', voice_type: 'zh_male_dongfanghaoran_uranus_bigtts', tip: '家国戏台词感' },
  { name: 'Vivi 2.0（女·戏腔向）', voice_type: 'zh_female_vv_uranus_bigtts', tip: '民国歌女首选' },
  { name: '知性灿灿 2.0（女·清亮）', voice_type: 'zh_female_cancan_uranus_bigtts', tip: '角色感女声' },
  { name: '邻家女孩 2.0（女·柔）', voice_type: 'zh_female_linjianvhai_uranus_bigtts', tip: '丫鬟/少女向' },
];

/**
 * 角色 → 音色 自动匹配（演员工作台逐句朗读时按角色切换）
 * 依据《庭院音乐剧《蔡锷与小凤仙》2026.8月修改》人物设定与台词气质
 */
export const ROLE_VOICE_MAP: Record<string, { voice_type: string; name: string }> = {
  蔡锷: { voice_type: 'zh_male_wenrouxiaoge_uranus_bigtts', name: '温柔小哥 2.0' },
  小凤仙: { voice_type: 'zh_female_qingxinnvsheng_uranus_bigtts', name: '清新女声 2.0' },
  杨队长: { voice_type: 'zh_male_qingcang_uranus_bigtts', name: '擎苍 2.0' },
  掌班: { voice_type: 'zh_male_yuanboxiaoshu_uranus_bigtts', name: '渊博小叔 2.0' },
  李副官: { voice_type: 'zh_male_qingshuangnanda_uranus_bigtts', name: '清爽男大 2.0' },
  蔡母: { voice_type: 'zh_female_qinqienv_uranus_bigtts', name: '亲切女声 2.0' },
  刘妈妈: { voice_type: 'zh_female_shuangkuaisisi_uranus_bigtts', name: '爽快思思 2.0' },
  喜鹊: { voice_type: 'zh_female_tianmeixiaoyuan_uranus_bigtts', name: '甜美小源 2.0' },
  丫鬟: { voice_type: 'zh_female_qiaopinv_uranus_bigtts', name: '俏皮女声 2.0' },
  画外音: { voice_type: 'zh_male_m191_uranus_bigtts', name: '云舟 2.0' },
  旁白: { voice_type: 'zh_male_m191_uranus_bigtts', name: '云舟 2.0' },
  三人: { voice_type: 'zh_male_m191_uranus_bigtts', name: '云舟 2.0' },
  二合: { voice_type: 'zh_male_dongfanghaoran_uranus_bigtts', name: '东方浩然 2.0' },
};

export function roleVoiceOf(roleName?: string): { voice_type: string; name: string } | null {
  if (!roleName) return null;
  return ROLE_VOICE_MAP[roleName] || null;
}

export function loadTTSConfig(): TTSConfig | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c && (c.apiKey || c.proxyUrl) ? c : null;
  } catch {
    return null;
  }
}

export function saveTTSConfig(cfg: TTSConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 调用豆包语音合成大模型2.0。
 * 优先走 Cloudflare Worker 中转（proxyUrl），可绕过火山 CORS 限制；
 * 未配置中转时直连火山（仅当火山 CORS 放行新版头时有效）。
 * 返回 mp3 的 objectURL；失败返回 null。带 12 秒超时。
 */
export async function synthesize(text: string, cfg: TTSConfig): Promise<string | null> {
  if (!text || !cfg) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  // 中转模式：Worker 转发（服务端调用，无 CORS 问题）
  if (cfg.proxyUrl) {
    try {
      const base = cfg.proxyUrl.replace(/\/+$/, '');
      const res = await fetch(`${base}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: cfg.voice }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        let msg = `中转HTTP ${res.status}`;
        try { const j = await res.json(); if (j && j.error) msg += ' ' + j.error; } catch {}
        console.warn('[HuoshanTTS] proxy', msg);
        return null;
      }
      const blob = await res.blob();
      if (!blob || blob.size < 100) {
        console.warn('[HuoshanTTS] proxy 空音频');
        return null;
      }
      return URL.createObjectURL(blob);
    } catch (e) {
      clearTimeout(timer);
      console.warn('[HuoshanTTS] proxy network', e);
      return null;
    }
  }

  // 直连模式（火山 CORS 未放行新版头时浏览器必失败，保留作 fallback）
  const body = {
    req_params: {
      text,
      speaker: cfg.voice,
      audio_params: { format: 'mp3', sample_rate: 24000 },
    },
  };
  try {
    const res = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': cfg.apiKey,
        'X-Api-Resource-Id': 'seed-tts-2.0',
        'X-Api-Request-Id': uuid(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn('[HuoshanTTS] http', res.status);
      return null;
    }
    const raw = await res.text();
    // Chunked 流：每 chunk 一个 JSON 对象（可能多行/连续多个对象）
    // code=0 为数据包；code=20000000 为流结束标记（message=OK，无音频数据），应跳过而非报错
    const chunks = raw.split('\n').filter(Boolean);
    const parts: string[] = [];
    let got = false;
    for (const line of chunks) {
      try {
        const obj = JSON.parse(line);
        const code = obj.header?.code ?? obj.code;
        if (code === 0 || code === 20000000 || code === undefined) {
          if (obj.data) {
            parts.push(obj.data);
            got = true;
          }
        } else {
          console.warn('[HuoshanTTS] resp code', code, obj.header?.message || obj.message);
          return null;
        }
      } catch {
        /* 忽略无法解析的行 */
      }
    }
    if (!got || !parts.length) return null;
    const b64 = parts.join('');
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: 'audio/mpeg' }));
  } catch (e) {
    clearTimeout(timer);
    console.warn('[HuoshanTTS] network', e);
    return null;
  }
}

/** 当前播放的火山音频（模块级，供 stopSpeak 统一停止） */
let currentAudio: HTMLAudioElement | null = null;

export function stopHuoshan() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
}

/** 合成并播放一句；失败返回 false（调用方回退浏览器语音）
 *  opts.voice：可选按句覆盖音色（如按角色自动切换），缺省用 cfg.voice */
export async function speakWithHuoshan(
  text: string,
  cfg: TTSConfig | null,
  opts: { onStart?: () => void; onEnd?: () => void; onError?: (msg: string) => void; voice?: string | null } = {}
): Promise<boolean> {
  if (!cfg) return false;
  const finalCfg = opts.voice && opts.voice !== cfg.voice ? { ...cfg, voice: opts.voice } : cfg;
  const url = await synthesize(text, finalCfg);
  if (!url) {
    opts.onError?.('真人合成失败，已回退系统语音');
    return false;
  }
  stopHuoshan();
  opts.onStart?.();
  const a = new Audio(url);
  currentAudio = a;
  a.onended = () => { if (currentAudio === a) currentAudio = null; opts.onEnd?.(); URL.revokeObjectURL(url); };
  a.onerror = () => { if (currentAudio === a) currentAudio = null; opts.onEnd?.(); URL.revokeObjectURL(url); };
  a.play().catch(() => { if (currentAudio === a) currentAudio = null; opts.onEnd?.(); URL.revokeObjectURL(url); });
  return true;
}
