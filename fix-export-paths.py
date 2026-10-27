#!/usr/bin/env python3
# 《蔡锷与小凤仙》静态导出 · 子路由相对资源路径修正
# Next assetPrefix './' 的已知缺陷：子路由页(如 /script/)生成的资源引用是 './_next/...'
# 在子路径部署(GitHub Pages /xiaofengxian/script/)下会解析错位，须提升一级为 '../_next/...'
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'out')
fixed = 0

for f in glob.glob(os.path.join(OUT, '**', '*.html'), recursive=True):
    rel = os.path.relpath(f, OUT)
    if '/' not in rel:
        continue  # 根页面(index.html / 404.html)保持 './_next'
    with open(f, 'r', encoding='utf-8') as fh:
        s = fh.read()
    # RSC payload / webpack chunk 映射里的裸引用（webpack publicPath='./_next/'，
    # 与 'static/chunks/...' 拼接后相对子路由页解析为 /.../script/_next → 404；
    # 提升两级 ./_next/../../_next/ 归一化后正好落到子路径根 _next）
    s2 = s.replace('"static/chunks/', '"../../_next/static/chunks/')
    # 子路由页资源引用提升一级（幂等：负向后瞻排除已修正的 ../_next/，
    # 避免 './_next/' 作为 '../_next/' 子串被二次替换成 '.../_next/'）
    s2 = re.sub(r'(?<![.])\./_next/', '../_next/', s2)
    s2 = re.sub(r'(?<![.])\./assets/', '../assets/', s2)
    s2 = re.sub(r'(?<![.])src="\./', 'src="../', s2)
    s2 = re.sub(r'(?<![.])href="\./', 'href="../', s2)
    if s2 != s:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(s2)
        fixed += 1
        print('fix:', rel)

print(f'完成：修正 {fixed} 个子路由页面')
sys.exit(0)
