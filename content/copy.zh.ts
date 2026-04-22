export const zh = ({
  meta: {
    title: "豆书 · Doushu",
    tagline: "三千册迷你书 · 共同出版计划",
  },
  brand: {
    name: "豆书",
    sub: "Doushu",
  },
  hero: {
    eyebrow: "WUHAN · CO-PUBLISHING EVENT",
    title: "三千颗豆，做成一本书",
    subtitle:
      "一本可以挂在钥匙串上的迷你书。集齐三千份心意，我们就把它印成真正的纸书，从武汉寄到你手上。",
    primaryCta: "我有一本",
    secondaryCta: "了解项目",
  },
  progress: {
    of: "已售 / 共",
    ofShort: "／",
    sold: "已售",
    goal: "目标",
    stretch: "凑齐三千册即开机印刷",
    success: "已达成 — 我们要印书啦！",
  },
  tabs: {
    wall: "心愿墙",
    about: "关于",
    how: "怎么玩",
    faq: "常见问题",
  },
  signIn: {
    title: "打开你的那本书",
    subtitle: "凭书内的编号 + 暗号进入",
    serialLabel: "编号",
    serialPlaceholder: "0247",
    wordLabel: "暗号",
    wordPlaceholder: "velvet-otter",
    submit: "开启",
    forgot: "忘了暗号？联系出版人即可找回。",
    error: "编号或暗号不对，再核对一下书内页",
  },
  myBook: {
    title: "我的小书",
    yours: "这本是你的",
    serial: "编号",
    statusLabel: "状态",
    profileTitle: "留下名字与联系方式",
    profileNote: "保存后，你的编号会出现在心愿墙上。",
    nicknameLabel: "昵称 / 名字",
    contactLabel: "联系方式（微信 / 手机 / 邮箱）",
    wantPrintedLabel: "未来想换一本真正的纸书（武汉发出，邮费自付）",
    save: "保存",
    saved: "已保存",
    requestExchange: "申请换纸书",
    cancelExchange: "取消申请",
    addressLabel: "收件地址",
    addressTooShort: "请填写完整的收件地址",
    exchangeRequested: "已提交申请",
    exchangeFailed: "提交失败，请稍后再试或联系出版人",
    timeline: {
      issued: "已领取",
      profileComplete: "信息已填",
      exchangeRequested: "已申请纸书",
      shippingPaid: "邮费已付",
      shipped: "已发货",
      delivered: "已送达",
    },
    signOut: "退出",
  },
  about: {
    title: "关于豆书",
    paragraphs: [
      "豆书是一群手工书爱好者在武汉发起的迷你出版项目。每一本豆书都不到掌心大，封面手绘、内页手装。",
      "三千册的销量将启动一次正式的纸质印刷。每一位早期支持者的编号都会留在书里、也留在心愿墙上。",
      "我们在线下手工售卖，店家把编号与暗号写在你的书内页。回到这里登录，便能补全你的名字、追踪未来纸书的发货进度。",
    ],
  },
  how: {
    title: "怎么玩",
    steps: [
      {
        title: "线下买到一本",
        body: "出版人在武汉的市集与小店出摊。买到时，TA 会在书内页写下你的编号与一个暗号。",
      },
      {
        title: "回来登录",
        body: "凭编号 + 暗号在这里登录，填上昵称与联系方式。你的编号会出现在心愿墙上。",
      },
      {
        title: "可选：换一本纸书",
        body: "凑齐三千册后，我们会安排印刷。你可以申请把迷你书换成正式的纸书，从武汉寄出（邮费自付）。",
      },
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "为什么用编号 + 暗号，不用账号密码？",
        a: "因为这件事很小、很轻、不涉及钱。一句好玩的暗号比记一串密码更有意思。",
      },
      {
        q: "暗号忘了怎么办？",
        a: "联系卖你这本书的出版人，TA 可以查到你的暗号、必要时给你换一个新的。",
      },
      {
        q: "纸书什么时候开印？",
        a: "三千册全部售出之后开机。所有买过迷你书的朋友会优先得到换购通知。",
      },
      {
        q: "可以不公开我的名字吗？",
        a: "可以。在「我的小书」里把「公开到心愿墙」关掉即可。",
      },
    ],
  },
  wall: {
    title: "心愿墙",
    empty: "还没有人留下名字。你可以是第一个。",
    recent: "最近加入",
  },
  admin: {
    title: "出版人后台",
    passwordLabel: "管理员密码",
    signIn: "进入",
    issueTitle: "派发下一本",
    issueButton: "派发下一个编号",
    issueHint: "点一下生成新编号 + 暗号，然后写到书内页。",
    nextSerial: "下一个编号",
    magicWord: "暗号",
    copy: "复制",
    copied: "已复制",
    print: "打印这张卡",
    recentlyIssued: "最近派发",
    openInNotion: "在 Notion 中管理",
    notionHint: "其余日常工作（修改地址、标记发货、补正信息）都在 Notion 里完成。",
    sold: "已派发",
    completed: "已完成资料",
    exchanges: "纸书申请",
    signOut: "退出",
  },
  langSwitch: {
    label: "语言",
    zh: "中",
    en: "EN",
  },
  common: {
    cancel: "取消",
    close: "关闭",
    saving: "保存中…",
    loading: "加载中…",
  },
} as const) satisfies CopyShape;

type CopyShape = {
  meta: { title: string; tagline: string };
  brand: { name: string; sub: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  progress: {
    of: string;
    ofShort: string;
    sold: string;
    goal: string;
    stretch: string;
    success: string;
  };
  tabs: { wall: string; about: string; how: string; faq: string };
  signIn: {
    title: string;
    subtitle: string;
    serialLabel: string;
    serialPlaceholder: string;
    wordLabel: string;
    wordPlaceholder: string;
    submit: string;
    forgot: string;
    error: string;
  };
  myBook: {
    title: string;
    yours: string;
    serial: string;
    statusLabel: string;
    profileTitle: string;
    profileNote: string;
    nicknameLabel: string;
    contactLabel: string;
    wantPrintedLabel: string;
    save: string;
    saved: string;
    requestExchange: string;
    cancelExchange: string;
    addressLabel: string;
    addressTooShort: string;
    exchangeRequested: string;
    exchangeFailed: string;
    timeline: {
      issued: string;
      profileComplete: string;
      exchangeRequested: string;
      shippingPaid: string;
      shipped: string;
      delivered: string;
    };
    signOut: string;
  };
  about: { title: string; paragraphs: readonly string[] };
  how: {
    title: string;
    steps: readonly { title: string; body: string }[];
  };
  faq: {
    title: string;
    items: readonly { q: string; a: string }[];
  };
  wall: { title: string; empty: string; recent: string };
  admin: {
    title: string;
    passwordLabel: string;
    signIn: string;
    issueTitle: string;
    issueButton: string;
    issueHint: string;
    nextSerial: string;
    magicWord: string;
    copy: string;
    copied: string;
    print: string;
    recentlyIssued: string;
    openInNotion: string;
    notionHint: string;
    sold: string;
    completed: string;
    exchanges: string;
    signOut: string;
  };
  langSwitch: { label: string; zh: string; en: string };
  common: { cancel: string; close: string; saving: string; loading: string };
};

export type Copy = CopyShape;
