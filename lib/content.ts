/* ============================================================
   《蔡锷与小凤仙》庭院音乐剧 · 首页业务数据（静态文案层）
   场次/票价/招角等可手改数据见 public/data/showings.json（客户端读取）
   ============================================================ */

export interface Act {
  num: string;
  title: string;
  sceneCount: number;
  songs: string[];
  intro: string;
}

export interface Role {
  name: string;
  color: string;
  lead?: boolean;
  desc: string;
}

export interface Track {
  file: string;
  name: string;
  vocal: string;
  group?: string;
}

/* ---------- Hero 首屏 ---------- */
export const HERO = {
  kicker: '1915 · 昆明 · 八大胡同',
  titleA: '蔡锷与小凤仙',
  lede: '从遇、识、计、机到离——六幕之间，一对水火难容的男女，在红灯笼与哑声笑语之间，演了一场惊天动地的革命。',
  facts: [
    { k: '体裁', v: '庭院音乐剧', s: '实景演出' },
    { k: '规模', v: '六幕', s: '二十八曲' },
    { k: '时长', v: '150', s: '分钟' },
    { k: '驻场', v: '每月', s: '一场' },
  ],
  tagline: '庭院音乐剧实景演出 · 六幕二十八曲 · 150 分钟 · 驻场每月一场',
};

/* ---------- THE STORY 八幕叙事 ---------- */
export const STORY_HEAD = {
  kicker: 'THE STORY',
  title: '八大胡同里的护国棋局',
  lead: '1913 年，二次革命后，蔡锷以「请假调养」之名离滇赴京。他以为这是更大舞台的起点，却不知道等待他的是一间密室、一道劝进表，以及一个在胡同里卖唱的女子。',
};

export const ACTS: Act[] = [
  {
    num: '序幕',
    title: '赴京',
    sceneCount: 2,
    songs: [],
    intro: '袁世凯一道命令，把滇军都督召进京城。蔡锷离滇赴京的那一刻，还以为自己是去赴一场更大的棋局。',
  },
  {
    num: '一幕',
    title: '遇',
    sceneCount: 3,
    songs: ['落花'],
    intro: '陕西巷云吉班。掌班张罗着声色，杨队长把蔡锷带来「消遣」。小凤仙在灯下唱《落花》——两个世界第一次照面。',
  },
  {
    num: '二幕',
    title: '识',
    sceneCount: 3,
    songs: ['相信我吧'],
    intro: '一句「相信我吧」，一句「督军要是革命党呢」。从试探到交心，庭院里的第一次长谈，把身份的说辞一层层剥开。',
  },
  {
    num: '三幕',
    title: '知',
    sceneCount: 3,
    songs: ['劝进表'],
    intro: '局势骤紧。劝进表要来了。蔡锷必须在「顺应」与「出走」之间选一条路，而选路的人只能是他最不愿意连累的那一个。',
  },
  {
    num: '四幕',
    title: '计',
    sceneCount: 3,
    songs: ['风声'],
    intro: '蔡母、丫鬟与一份报纸。京城里的风声从纸面传到后院。蔡锷劝进表上已经签了字，而云南还在袁世凯的枪口下。',
  },
  {
    num: '五幕',
    title: '机',
    sceneCount: 4,
    songs: ['灯芯糕', '一碗龙井'],
    intro: '计划成形。梁先生、袁三儿、灯芯糕与一碗龙井——所有对话都指向同一个夜晚。蔡锷与小凤仙在这一幕里，正式把话说开。',
  },
  {
    num: '六幕',
    title: '离',
    sceneCount: 4,
    songs: ['撕纸', '雨夜'],
    intro: '雨夜将至。掌班的生日宴、听说、劝进——所有人在同一个空间里各怀心事。蔡锷必须当着小凤仙的面，把那张纸撕下来。',
  },
  {
    num: '尾声',
    title: '念',
    sceneCount: 1,
    songs: ['凤仙花开'],
    intro: '凤仙花开，明月依旧。庭院空了，故人已远。留一个回望的镜头，和一句说不完的话。',
  },
];

/* ---------- TWO SPACES 双空间 ---------- */
export const SPACES = {
  kicker: 'TWO SPACES',
  titleA: '高台之上，是大总统的棋局',
  titleB: '院落深处，是一个女子的心事',
  lead: '两个空间，两种心境。同一个蔡锷，在两处之间来回奔走——台上谈的是共和与国体，台下听的是唱词与一段不肯明说的情。',
};

/* ---------- THE CAST 人物谱 ---------- */
export const CAST_HEAD = {
  kicker: 'THE CAST',
  title: '八个人，一盘没下完的棋',
  lead: '蔡锷是执棋者，小凤仙是他唯一没算到的变数。剩下的六个人——监视的、撮合的、阻拦的、看着的——各自站在自己的立场上，把这对男女推向那个雨夜。',
};

export const ROLES: Role[] = [
  {
    name: '蔡锷',
    color: '#1F4E46',
    lead: true,
    desc: '云南都督，护国军总司令。33 岁，心中装着共和，却要在小凤仙面前装作一个贪玩的风流将军。',
  },
  {
    name: '小凤仙',
    color: '#B23A2E',
    lead: true,
    desc: '云吉班头牌，15 岁。唱《落花》的女子。看似卖唱，实则在一场戏里看清了一个人，也看清了自己。',
  },
  {
    name: '杨队长',
    color: '#2C4A6E',
    desc: '袁世凯幕僚，侦缉队长。奉命「款待」蔡锷，是监视者，也是这条线上唯一带着旧式江湖气的角色。',
  },
  {
    name: '李副官',
    color: '#6A4C93',
    desc: '蔡锷的副官，二十多岁。忠心、务实、话少，是全剧唯一一个敢对将军说「您也忍得」的人。',
  },
  {
    name: '蔡母',
    color: '#8C5A2B',
    desc: '蔡锷母亲，五十多岁。旧式大家闺秀的规矩与一个母亲的政治嗅觉，在她身上同时存在。',
  },
  {
    name: '掌班',
    color: '#1D6E70',
    desc: '云吉班掌柜，中年。圆滑、精明、见风使舵，但也是这条胡同里唯一还记得旧日情分的人。',
  },
  {
    name: '刘妈妈',
    color: '#A83E62',
    desc: '云吉班的中年女管事，操心、热心、嘴碎，负责把所有的琐碎都张罗起来。',
  },
  {
    name: '丫鬟 / 喜鹊',
    color: '#5F7A1F',
    desc: '需变装的双角色。丫鬟随蔡母在府中，喜鹊在云吉班唱曲，是剧中最灵活的一双眼睛。',
  },
];

export const PULL_QUOTE = {
  q1: '不信美女终薄命，',
  q2: '自古侠女出风尘。',
  by: '小凤仙 · 二幕',
};

/* ---------- ORIGINAL SOUND 七首唱段 ---------- */
export const TRACKS: Track[] = [
  { file: 'feixu-liuyuechen.mp3', name: '飞絮', vocal: '小凤仙 · 刘玥辰' },
  { file: 'pengpai.mp3', name: '澎湃', vocal: '蔡锷（咏叹）' },
  { file: 'qiuhen.mp3', name: '秋痕', vocal: '小凤仙（咏叹）' },
  { file: 'wangyue.mp3', name: '望月', vocal: '蔡锷 · 小凤仙（咏叹）' },
  { file: 'rongguang-liudonghan.mp3', name: '荣光', vocal: '蔡锷 · 刘冬寒' },
  { file: 'feixu-lihuayu.mp3', name: '飞絮 · 另一版', vocal: '小凤仙 · 李化羽', group: '飞絮' },
  { file: 'rongguang-chengjiafeng.mp3', name: '荣光 · 另一版', vocal: '蔡锷 · 程甲风', group: '荣光' },
];

/* ---------- MY THEATRE ---------- */
export const STUDIO = {
  kicker: 'MY THEATRE',
  title: '我的剧场',
  lead: '剧组成员与导演的工作区：角色台词、我的预约、投递进度。',
  cards: [
    { k: '演员', title: '我的剧本', desc: '按角色只看自己的台词，检索任意一句半词歌词直达场次。八百余行，完整排练稿。', href: '/story' },
    { k: '导演 / 制作组', title: '导演工作台', desc: '排练进度、场记、待办、到场状态与通告单生成。数据保存在本机浏览器。', href: '/workbench' },
    { k: '观众', title: '我的预约', desc: '在「演出场次」里预约的场次与人数，会同步显示在这里。', href: '#showings' },
  ],
};

/* ---------- 图片插槽说明（供后续替换真实素材） ----------
   public/assets/img-stage-night.webp   — Hero 背景 · 舞台夜景（可替换为马家大院实拍夜景）
   public/assets/img-courtyard-scene.webp — TWO SPACES 全幅图 · 庭院排练实景（可替换为实拍）
   public/assets/img-cast.webp          — CAST 区 · 演员合影（可替换为卡司剧照）
   public/assets/img-finale.webp        — 尾声/预约区 · 谢幕（可替换为谢幕实拍）
   public/assets/scores-webp/*.webp     — 曲谱大图 20 张（插槽：可续传至 28 首）
   public/assets/thumbs/*.webp          — 曲谱缩略图 20 张
   public/assets/*.mp3                  — 唱段音频 7 首
   ============================================================ */
