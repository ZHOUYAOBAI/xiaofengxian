#!/usr/bin/env bash
# 《蔡锷与小凤仙》庭院音乐剧官网 · 一键构建部署
# 用法：./deploy.sh  （在 xiaofengxian-site 目录下执行）
set -e
cd "$(dirname "$0")"

echo "① 构建静态产物…"
npm run build

echo "② 同步产物到仓库根（GitHub Pages 直接服务根目录）…"
rsync -a --delete out/ ./  \
  --exclude '/app' --exclude '/components' --exclude '/lib' --exclude '/public' --exclude '/data' \
  --exclude '/.next' --exclude '/node_modules' --exclude '/out' \
  --exclude '/package.json' --exclude '/package-lock.json' \
  --exclude '/next.config.mjs' --exclude '/next-env.d.ts' \
  --exclude '/tsconfig.json' --exclude '/tailwind.config.ts' \
  --exclude '/postcss.config.mjs' --exclude '/.gitignore' \
  --exclude '/使用说明.md' --exclude '/deploy.sh' --exclude '/.git' --exclude '/.nojekyll'

echo "③ 提交并推送…"
TOKEN=$(sed -n 's/^[[:space:]]*oauth_token:[[:space:]]*//p' ~/.config/gh/hosts.yml | head -1)
git add -A
git commit -m "build: Next.js 静态导出 $(date '+%Y-%m-%d %H:%M')" || true
git push "https://x-access-token:${TOKEN}@github.com/ZHOUYAOBAI/xiaofengxian.git" main

echo "④ 完成。GitHub Pages 约 1-2 分钟后自动更新。"
