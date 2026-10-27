/**
 * 蔡锷与小凤仙 · 庭院音乐剧官网 — 火山真人TTS 中转 Worker
 *
 * 用途：火山引擎豆包语音 2.0 的 CORS 配置未放行新版鉴权头 X-Api-Key，
 *      浏览器无法直连。本 Worker 在服务端转发（无 CORS 限制），
 *      浏览器只与 Worker 通信（Worker 返回 mp3 + CORS *）。
 *
 * 部署：
 *  1. 打开 https://dash.cloudflare.com → Workers & Pages → 创建 Worker
 *  2. 粘贴本文件全部代码 → 保存并部署
 *  3. 得到形如 https://xxx.workers.dev 的地址
 *  4. 在官网工作台「真人音色」设置面板填入该地址（可选填 https:// 前缀）
 *
 * 安全建议（可选）：把 API Key 改为环境变量，Worker 设置 → 变量 VOLC_API_KEY。
 */

const VOLC_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const RESOURCE_ID = 'seed-tts-2.0';
const DEFAULT_API_KEY = 'cd640f02-72de-4547-b884-833edc7f8b4c';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(o, status) {
  return new Response(JSON.stringify(o), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/tts' && request.method === 'POST') {
      try {
        const { text, speaker } = await request.json();
        if (!text || typeof text !== 'string' || text.length > 2000) {
          return json({ error: 'text 参数缺失或过长' }, 400);
        }
        if (!speaker) return json({ error: 'speaker 参数缺失' }, 400);

        const apiKey = (env && env.VOLC_API_KEY) || DEFAULT_API_KEY;

        const res = await fetch(VOLC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Api-Resource-Id': RESOURCE_ID,
            'X-Api-Request-Id': crypto.randomUUID(),
          },
          body: JSON.stringify({
            req_params: {
              text,
              speaker,
              audio_params: { format: 'mp3', sample_rate: 24000 },
            },
          }),
        });

        const raw = await res.text();
        const parts = [];
        let code = null;
        let msg = '';
        for (const line of raw.split('\n').filter(Boolean)) {
          try {
            const obj = JSON.parse(line);
            const c = obj.header ? obj.header.code : obj.code;
            if (c === 0 || c === 20000000 || c === undefined) {
              if (obj.data) parts.push(obj.data);
            } else {
              code = c;
              msg = (obj.header && obj.header.message) || obj.message || '';
            }
          } catch {
            /* 忽略无法解析的行 */
          }
        }

        if (code !== null) {
          return json({ error: `火山返回错误 ${code} ${msg}` }, 502);
        }
        if (!parts.length) {
          return json({ error: '火山未返回音频数据' }, 502);
        }

        const b64 = parts.join('');
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return new Response(bin, {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', ...CORS },
        });
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 500);
      }
    }

    return json({ error: 'not found' }, 404);
  },
};
