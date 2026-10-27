#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""整剧逐句真人音频预合成：调用火山豆包语音2.0，按角色分配音色，存 public/audio/line/"""
import json, os, base64, time, urllib.request, ssl, re, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = '/home/user/.doubao/agent_mode/workspace/xiaofengxian-site'
SCRIPT = os.path.join(ROOT, 'public/data/script.json')
OUTDIR = os.path.join(ROOT, 'public/audio/line')
IDX = os.path.join(ROOT, 'public/audio/line-index.json')
API_KEY = 'cd640f02-72de-4547-b884-833edc7f8b4c'
VOLC_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
CTX = ssl.create_default_context()

ROLE_VOICE = {
    '蔡锷': 'zh_male_wenrouxiaoge_uranus_bigtts',
    '小凤仙': 'zh_female_qingxinnvsheng_uranus_bigtts',
    '杨队长': 'zh_male_qingcang_uranus_bigtts',
    '掌班': 'zh_male_yuanboxiaoshu_uranus_bigtts',
    '李副官': 'zh_male_qingshuangnanda_uranus_bigtts',
    '蔡母': 'zh_female_qinqienv_uranus_bigtts',
    '刘妈妈': 'zh_female_shuangkuaisisi_uranus_bigtts',
    '喜鹊': 'zh_female_tianmeixiaoyuan_uranus_bigtts',
    '丫鬟': 'zh_female_qiaopinv_uranus_bigtts',
    '画外音': 'zh_male_m191_uranus_bigtts',
    '旁白': 'zh_male_m191_uranus_bigtts',
    '三人': 'zh_male_m191_uranus_bigtts',
    '二合': 'zh_male_dongfanghaoran_uranus_bigtts',
}

def clean_text(t):
    t = re.sub(r'（[^）]*）', '', t)
    t = re.sub(r'\s+', '', t)
    return t.strip()

def synthesize(text, speaker, reqid):
    body = json.dumps({
        'req_params': {
            'text': text,
            'speaker': speaker,
            'audio_params': {'format': 'mp3', 'sample_rate': 24000},
        }
    }).encode()
    req = urllib.request.Request(VOLC_URL, data=body, method='POST', headers={
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
        'X-Api-Resource-Id': 'seed-tts-2.0',
        'X-Api-Request-Id': reqid,
    })
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        raw = r.read().decode('utf-8')
    parts, code, msg = [], None, ''
    for line in raw.split('\n'):
        line = line.strip()
        if not line: continue
        try:
            obj = json.loads(line)
            c = obj.get('header', {}).get('code', obj.get('code'))
            if c in (0, 20000000, None):
                if obj.get('data'): parts.append(obj['data'])
            else:
                code, msg = c, obj.get('header', {}).get('message', obj.get('message', ''))
        except Exception:
            pass
    if code is not None:
        raise RuntimeError(f'volc code={code} {msg}')
    if not parts:
        raise RuntimeError('no audio data')
    return base64.b64decode(''.join(parts))

def main():
    os.makedirs(OUTDIR, exist_ok=True)
    data = json.load(open(SCRIPT))
    lines = data if isinstance(data, list) else data.get('lines', [])
    jobs = []
    for i, l in enumerate(lines):
        if not isinstance(l, dict): continue
        if l.get('kind') == 'stage': continue
        t = clean_text(l.get('text', ''))
        if not t: continue
        role = l.get('roleName') or ''
        spk = ROLE_VOICE.get(role, 'zh_male_m191_uranus_bigtts')
        jobs.append((i, t, spk))
    print(f'待合成: {len(jobs)} 句')

    done = set()
    if os.path.exists(IDX):
        try: done = set(json.load(open(IDX)).get('done', []))
        except Exception: pass
    todo = [j for j in jobs if j[0] not in done]
    print(f'已有: {len(jobs)-len(todo)}, 待做: {len(todo)}')

    def work(job):
        i, t, spk = job
        fp = os.path.join(OUTDIR, f'{i}.mp3')
        if os.path.exists(fp) and os.path.getsize(fp) > 100:
            return i, True, None
        for attempt in range(3):
            try:
                mp3 = synthesize(t, spk, f'batch-{i}-{attempt}-{int(time.time())}')
                if not mp3 or len(mp3) < 100:
                    raise RuntimeError('tiny mp3')
                with open(fp, 'wb') as f:
                    f.write(mp3)
                return i, True, None
            except Exception as e:
                if attempt == 2:
                    return i, False, f'{i}:{t[:20]} -> {e}'
                time.sleep(1.5 * (attempt + 1))
        return i, False, 'unknown'

    ok, fail = 0, 0
    fails = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(work, j): j for j in todo}
        for k, fut in enumerate(as_completed(futs)):
            i, okk, err = fut.result()
            if okk: ok += 1
            else: fail += 1; fails.append(err)
            if (k + 1) % 50 == 0 or okk is False:
                print(f'进度 {k+1}/{len(todo)} 成功{ok} 失败{fail}', flush=True)
            with open(IDX, 'w') as f:
                json.dump({'done': sorted(set(done) | {f[0] for f in todo[:k+1] if os.path.exists(os.path.join(OUTDIR, str(f[0])+".mp3"))})}, f)

    # 最终索引
    final = []
    for i, t, spk in jobs:
        if os.path.exists(os.path.join(OUTDIR, f'{i}.mp3')):
            final.append(i)
    with open(IDX, 'w') as f:
        json.dump({'done': sorted(final), 'count': len(final)}, f, ensure_ascii=False)
    print(f'完成: 成功 {ok} 失败 {fail}, 最终 {len(final)} 句')
    if fails[:10]: print('失败样例:', fails[:10])

if __name__ == '__main__':
    main()
