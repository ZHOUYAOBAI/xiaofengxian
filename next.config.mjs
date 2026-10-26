/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // 相对资源前缀：同一份产物同时适配 GitHub Pages 子路径(/xiaofengxian/) 与 Cloudflare Pages 根路径
  assetPrefix: './',
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
