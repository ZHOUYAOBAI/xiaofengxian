/* ============================================================
   站点导航工具 —— 兼容「子路径部署 + 工作台(/script) + 首页」互跳
   问题：部署在子路径（如 /xiaofengxian/）时，绝对路径 href="/" 
   会跳到域名根 → 404。锚点链接在工作台页无对应元素 → 点了无反应。
   方案：链接一律用相对锚点；点击时若在工作台页，则先跳回首页再带锚点。
   ============================================================ */

export const isScriptPage = () =>
  typeof window !== 'undefined' && /\/script\/?$/.test(window.location.pathname);

/** 锚点链接点击：工作台页 → 跳首页对应区块 */
export const anchorClick =
  (anchor: string) => (e: { preventDefault: () => void }) => {
    if (isScriptPage()) {
      e.preventDefault();
      window.location.href = '../' + anchor;
    }
  };

/** logo 回首页 */
export const homeClick = (e: { preventDefault: () => void }) => {
  e.preventDefault();
  window.location.href = isScriptPage() ? '../' : './';
};

/** 演员剧本入口（页脚） */
export const scriptClick = (e: { preventDefault: () => void }) => {
  if (isScriptPage()) {
    e.preventDefault();
    window.location.href = '../script';
  }
};
