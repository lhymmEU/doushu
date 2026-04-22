import type { Copy } from "./copy.zh";

export const en: Copy = {
  meta: {
    title: "Doushu · 豆书",
    tagline: "A 3000-copy mini-book co-publishing event",
  },
  brand: {
    name: "Doushu",
    sub: "豆书",
  },
  hero: {
    eyebrow: "WUHAN · CO-PUBLISHING EVENT",
    title: "Three thousand small things, one printed book",
    subtitle:
      "A handmade mini-book that hangs from a keychain. Gather three thousand and we go to print — mailed from Wuhan to your hands.",
    primaryCta: "I have a copy",
    secondaryCta: "About the project",
  },
  progress: {
    of: "sold of",
    ofShort: "/",
    sold: "Sold",
    goal: "Goal",
    stretch: "We print at 3000",
    success: "Reached — we're printing!",
  },
  tabs: {
    wall: "Wall",
    about: "About",
    how: "How it works",
    faq: "FAQ",
  },
  signIn: {
    title: "Open your book",
    subtitle: "Use the serial and magic word inside the cover",
    serialLabel: "Serial",
    serialPlaceholder: "0247",
    wordLabel: "Magic word",
    wordPlaceholder: "velvet-otter",
    submit: "Open",
    forgot: "Forgot the word? The publisher can look it up.",
    error: "Serial or magic word doesn't match. Check the inside cover.",
  },
  myBook: {
    title: "My book",
    yours: "This one is yours",
    serial: "Serial",
    statusLabel: "Status",
    profileTitle: "Leave a name and a way to reach you",
    profileNote: "Once you save, your serial appears on the public wall.",
    nicknameLabel: "Nickname",
    contactLabel: "Contact (WeChat / phone / email)",
    wantPrintedLabel:
      "I'd like a printed book later (mailed from Wuhan, postage on me)",
    save: "Save",
    saved: "Saved",
    requestExchange: "Request a printed book",
    cancelExchange: "Cancel request",
    addressLabel: "Shipping address",
    addressTooShort: "Please enter a complete shipping address",
    exchangeRequested: "Request submitted",
    exchangeFailed: "Could not submit. Please try again or contact the publisher.",
    timeline: {
      issued: "Issued",
      profileComplete: "Profile complete",
      exchangeRequested: "Printed book requested",
      shippingPaid: "Postage paid",
      shipped: "Shipped",
      delivered: "Delivered",
    },
    signOut: "Sign out",
  },
  about: {
    title: "About Doushu",
    paragraphs: [
      "Doushu is a handmade mini-book project from Wuhan. Each copy is smaller than your palm — hand-drawn covers, hand-stitched pages.",
      "When we sell three thousand we trigger a full printed run. Every early supporter's serial is engraved into the book and onto the public wall.",
      "Books are sold offline. The publisher writes a serial and a magic word inside your cover. Come back here, sign in with that pair, fill in your name, and follow your printed copy on its way.",
    ],
  },
  how: {
    title: "How it works",
    steps: [
      {
        title: "Find a book in person",
        body: "We sell at small markets and shops in Wuhan. The seller writes a serial and a magic word inside.",
      },
      {
        title: "Sign in here",
        body: "Use the serial + magic word, then fill in a nickname and a contact. Your serial appears on the wall.",
      },
      {
        title: "Optional: trade up to a printed book",
        body: "When we hit 3000 we go to print. You can request the printed edition; we mail it from Wuhan and you cover postage.",
      },
    ],
  },
  faq: {
    title: "FAQ",
    items: [
      {
        q: "Why a serial + magic word instead of an account?",
        a: "This is a small, low-stakes project. A whimsical phrase is more fun to remember than yet another password.",
      },
      {
        q: "What if I forget my magic word?",
        a: "Ask the publisher who sold you the book — they can look it up or issue a new one.",
      },
      {
        q: "When do printed books go out?",
        a: "Right after we hit 3000. Mini-book buyers get first dibs on the printed run.",
      },
      {
        q: "Can I keep my name private?",
        a: "Yes. In My book, turn off 'Show on wall'.",
      },
    ],
  },
  wall: {
    title: "Wall of buyers",
    empty: "No one's left their name yet — you could be the first.",
    recent: "Just joined",
  },
  admin: {
    title: "Publisher console",
    passwordLabel: "Admin password",
    signIn: "Enter",
    issueTitle: "Issue next book",
    issueButton: "Issue next serial",
    issueHint: "One tap creates a serial + magic word. Write them inside the cover.",
    nextSerial: "Next serial",
    magicWord: "Magic word",
    copy: "Copy",
    copied: "Copied",
    print: "Print this card",
    recentlyIssued: "Recently issued",
    openInNotion: "Manage in Notion",
    notionHint:
      "Day-to-day edits (addresses, shipping marks, fixes) all happen in Notion.",
    sold: "Issued",
    completed: "Profiles complete",
    exchanges: "Printed-book requests",
    signOut: "Sign out",
  },
  langSwitch: {
    label: "Language",
    zh: "中",
    en: "EN",
  },
  common: {
    cancel: "Cancel",
    close: "Close",
    saving: "Saving…",
    loading: "Loading…",
  },
};
