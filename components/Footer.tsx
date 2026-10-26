const COLS = [
  {
    h: '剧目',
    links: [
      { href: '#story', t: '这出戏' },
      { href: '#cast', t: '角色' },
      { href: '#gallery', t: '曲谱' },
      { href: '#listen', t: '原声' },
    ],
  },
  {
    h: '来看戏',
    links: [
      { href: '#showings', t: '演出场次' },
      { href: '#guide', t: '观剧指南' },
      { href: '#message', t: '留言' },
    ],
  },
  {
    h: '加入我们',
    links: [
      { href: '#join', t: '招角' },
      { href: 'script', t: '演员剧本' },
      { href: '#studio', t: '我的剧场' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 border-t" style={{ borderColor: 'rgba(201,162,75,0.14)' }}>
      <div className="shell py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        {COLS.map((c) => (
          <div key={c.h}>
            <h4 className="text-[12px] tracking-[0.3em] text-gold mb-5">{c.h}</h4>
            <div className="flex flex-col gap-3">
              {c.links.map((l) => (
                <a key={l.t} href={l.href} className="text-[14px] text-paper/60 hover:text-gold-soft no-underline transition-colors">
                  {l.t}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div>
          <h4 className="text-[12px] tracking-[0.3em] text-gold mb-5">出品</h4>
          <p className="text-[14px] text-paper/60 mb-1">云南钟声音乐制作有限公司</p>
          <p className="text-[14px] text-paper/60 mb-1">昆明市 · 钱王街 马家大院</p>
          <p className="text-[14px] text-paper/40">xiaofengxian@zhongsheng.com</p>
        </div>
      </div>
      <div className="shell pb-10 flex flex-col md:flex-row justify-between gap-2 text-[12.5px] text-paper/35">
        <span>《蔡锷与小凤仙》庭院音乐剧 · 2026 年 8 月修订版</span>
        <span>本站剧本与曲谱仅供剧团内部排练使用</span>
      </div>
    </footer>
  );
}
