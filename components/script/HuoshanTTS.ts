'use client';

/**
 * 火山引擎 · 豆包语音 真人 TTS 前端模块
 * - 设置面板：AppID / Access Token / 音色（localStorage 保存）
 * - synthesize()：调用 https://openspeech.bytedance.com/api/v1/tts（V1 非流式，JSON+base64）
 * - 鉴权：Authorization: Bearer;<token>
 * - 失败返回 null，调用方回退浏览器语音
 */

export type TTSConfig = {
  appid: string;
  token: string;
  voice: string; // voice_type 代号
  voiceName: string;
};

const KEY = 'xfx-huoshan-tts';

export const VOICE_OPTIONS: { name: string; voice_type: string; tip: string }[] = [
  { name: '温柔小哥（男·沉稳）', voice_type: 'zh_male_wenrouxiaoge_mars_bigtts', tip: '通用大模型男声' },
  { name: '甜美桃子（女·清亮）', voice_type: 'zh_female_tianmeitaozi_mars_bigtts', tip: '通用大模型女声' },
  { name: '霸气青叔（男·厚重）', voice_type: 'zh_male_baqixinyin_emo_v2_mars_bigtts', tip: '角色感男声' },
  { name: '古风少御（女·戏腔感）', voice_type: 'zh_female_gufengshaoyu_mars_bigtts', tip: '民国戏腔向女声' },
  { name: '儒雅总裁（男·文气）', voice_type: 'ICL_zh_male_ruyazongcai_tob', tip: '台词感男声' },
];

export function loadTTSConfig(): TTSConfig | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c && c.appid && c.token ? c : null;
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

export async function synthesize(text: string, cfg: TTSConfig): Promise<string | null> {
  if (!text || !cfg) return null;
  const body = {
    app: { appid: cfg.appid, token: cfg.token, cluster: 'volcano_tts' },
    user: { uid: 'xfx-workbench' },
    audio: { voice_type: cfg.voice, encoding: 'mp3', speed_ratio: 1.0 },
    request: { reqid: uuid(), text, operation: 'query' },
  };
  try {
    const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer;${cfg.token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('[HuoshanTTS] http', res.status);
      return null;
    }
    const j = await res.json();
    if (j.code !== 3000 || !j.data) {
      console.warn('[HuoshanTTS] code', j.code, j.message);
      return null;
    }
    const bytes = atob(j.data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch (e) {
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

/** 合成并播放一句；失败返回 false（调用方回退浏览器语音） */
export async function speakWithHuoshan(
  text: string,
  cfg: TTSConfig | null,
  opts: { onStart?: () => void; onEnd?: () => void; onError?: (msg: string) => void } = {}
): Promise<boolean> {
  if (!cfg) return false;
  const url = await synthesize(text, cfg);
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
