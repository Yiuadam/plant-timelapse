export type Lang = "en" | "zh";

export const LANGUAGES: { key: Lang; label: string }[] = [
  { key: "en", label: "English" },
  { key: "zh", label: "中文" },
];

// A flat dictionary keyed by a short id, rather than nesting per-page --
// many keys (Save, Cancel, Delete, ...) are shared across many
// components, and a flat namespace makes reuse obvious instead of
// duplicating the same translation under ten different page keys.
export const DICT = {
  // Shared actions
  save: { en: "Save", zh: "保存" },
  cancel: { en: "Cancel", zh: "取消" },
  delete: { en: "Delete", zh: "删除" },
  edit: { en: "Edit", zh: "编辑" },
  add: { en: "Add", zh: "添加" },
  open: { en: "Open", zh: "打开" },
  close: { en: "Close", zh: "关闭" },
  loading: { en: "Loading...", zh: "加载中..." },
  search: { en: "Search", zh: "搜索" },

  // Nav / tab bar
  nav_trips: { en: "Trips", zh: "行程" },
  nav_timeline: { en: "Timeline", zh: "时间线" },
  nav_passport: { en: "Passport", zh: "护照" },
  nav_translate: { en: "Translate", zh: "翻译" },
  nav_profile: { en: "Profile", zh: "个人资料" },
  nav_you: { en: "You", zh: "我的" },
  nav_login: { en: "Log in", zh: "登录" },
  nav_register: { en: "Register", zh: "注册" },
  nav_logout: { en: "Log out", zh: "退出登录" },
  nav_edit_profile: { en: "Edit profile", zh: "编辑资料" },
  nav_change_style: { en: "Change site style", zh: "切换网站风格" },
  nav_toggle_theme: { en: "Toggle dark and light mode", zh: "切换深色/浅色模式" },
  nav_change_language: { en: "Change language", zh: "切换语言" },
  theme_dark: { en: "Dark", zh: "深色" },
  theme_light: { en: "Light", zh: "浅色" },

  // Dashboard
  dashboard_title: { en: "Your board", zh: "我的看板" },
  dashboard_tidy_up: { en: "Tidy up", zh: "整理" },
  dashboard_add_widget: { en: "+ Add widget", zh: "+ 添加小组件" },
  dashboard_search_widgets: { en: "Search widgets", zh: "搜索小组件" },
  dashboard_no_widgets_found: { en: "No widgets found", zh: "未找到小组件" },
  widget_trips: { en: "Trips", zh: "行程" },
  widget_clock: { en: "Clock", zh: "时钟" },
  widget_photos: { en: "Photos", zh: "照片" },
  widget_map: { en: "Map", zh: "地图" },
  widget_notes: { en: "Notes", zh: "笔记" },
  widget_sticky: { en: "Sticky note", zh: "便利贴" },
  widget_travel: { en: "Travel", zh: "行程安排" },
  widget_passport: { en: "Passport", zh: "护照" },
  widget_no_photos: { en: "No photos yet", zh: "还没有照片" },
  widget_no_trips: { en: "No trips yet — add your first one.", zh: "还没有行程——添加第一个吧。" },
  widget_no_stamps: {
    en: "No stamps yet — visit the Passport page once you've been.",
    zh: "还没有印章——去过之后请到护照页面盖章。",
  },
  widget_new_trip: { en: "+ New", zh: "+ 新建" },

  // Trips
  trips_title: { en: "Your trips", zh: "我的行程" },
  trips_new: { en: "+ New trip", zh: "+ 新建行程" },
  trips_empty: {
    en: "No trips yet — create your first one to start logging places, photos, and bookings.",
    zh: "还没有行程——创建第一个行程，开始记录地点、照片和预订信息吧。",
  },
  trips_shared: { en: "Shared", zh: "共享" },
  trips_delete_confirm: {
    en: 'Delete "{title}"? This can\'t be undone.',
    zh: "删除「{title}」？此操作无法撤销。",
  },

  // Passport
  passport_title: { en: "Passport", zh: "护照" },
  passport_subtitle: {
    en: "Every trip with a destination can be stamped once you've been.",
    zh: "去过的目的地都可以盖上对应的印章。",
  },
  passport_name: { en: "Name", zh: "姓名" },
  passport_sex: { en: "Sex", zh: "性别" },
  passport_birth: { en: "Birth", zh: "出生日期" },
  passport_no: { en: "Passport No.", zh: "护照号码" },
  passport_issued: { en: "Issued", zh: "签发日期" },
  passport_authority: { en: "Authority", zh: "签发机关" },
  passport_ready_to_stamp: { en: "Ready to stamp", zh: "待盖章" },
  passport_stamp_it: { en: "Stamp it", zh: "盖章" },
  passport_stamping: { en: "Stamping...", zh: "盖章中..." },
  passport_open: { en: "Open passport", zh: "打开护照" },
  passport_close: { en: "Close passport", zh: "合上护照" },
  passport_tap_to_open: { en: "Tap to open", zh: "点击打开" },
  passport_prev_page: { en: "‹ Prev", zh: "‹ 上一页" },
  passport_next_page: { en: "Next ›", zh: "下一页 ›" },
  passport_page_of: { en: "Page {current} of {total}", zh: "第 {current} / {total} 页" },
  passport_visited: { en: "Visited", zh: "已到访" },

  // Translate
  translate_title: { en: "Translate", zh: "翻译" },
  translate_subtitle: {
    en: "Type a word or phrase to translate it, with a short explanation.",
    zh: "输入一个单词或短语，获取翻译和简短解释。",
  },
  translate_history: { en: "History", zh: "历史记录" },
  translate_placeholder: {
    en: "Type a word or phrase in any language...",
    zh: "输入任意语言的单词或短语...",
  },
  translate_button: { en: "Translate", zh: "翻译" },
  translate_translating: { en: "Translating...", zh: "翻译中..." },
  translate_auto_detect: { en: "Language is detected automatically", zh: "自动识别语言" },
  translate_result_translation: { en: "Translation", zh: "翻译" },
  translate_result_explanation: { en: "Explanation", zh: "解释" },
  translate_instant_match: { en: "Instant dictionary match", zh: "词典即时匹配" },
  translate_free_mt: { en: "Free machine translation", zh: "免费机器翻译" },
  translate_no_text: {
    en: "Couldn't make out any text there.",
    zh: "没能识别出文字。",
  },
  translate_failed: { en: "Translation failed", zh: "翻译失败" },
  translate_history_title: { en: "Translation history", zh: "翻译历史" },
  translate_history_new: { en: "New translation", zh: "新的翻译" },
  translate_history_empty: { en: "Nothing translated yet.", zh: "还没有翻译记录。" },

  // Timeline
  timeline_title: { en: "Timeline", zh: "时间线" },
  timeline_add_event: { en: "+ Add event", zh: "+ 添加事件" },
  timeline_empty: {
    en: "Trips with a destination show up here automatically, in order. Create a trip, or use \"Add event\" above to pin an exact spot on the map.",
    zh: "有目的地的行程会自动按顺序显示在这里。创建一个行程，或使用上方的\"添加事件\"在地图上标记精确地点。",
  },

  // Auth
  auth_email: { en: "Email", zh: "邮箱" },
  auth_password: { en: "Password", zh: "密码" },
  auth_name: { en: "Name", zh: "姓名" },
  auth_login_title: { en: "Log in", zh: "登录" },
  auth_register_title: { en: "Register", zh: "注册" },
  auth_logging_in: { en: "Logging in...", zh: "登录中..." },
  auth_registering: { en: "Registering...", zh: "注册中..." },
  auth_invalid_credentials: { en: "Invalid email or password", zh: "邮箱或密码不正确" },
  auth_no_account: { en: "Don't have an account?", zh: "还没有账号？" },
  auth_have_account: { en: "Already have an account?", zh: "已经有账号了？" },
  auth_create_account: { en: "Create an account", zh: "创建账号" },
  auth_creating: { en: "Creating...", zh: "创建中..." },
  auth_registration_failed: { en: "Registration failed", zh: "注册失败" },

  // Profile
  profile_title: { en: "Profile", zh: "个人资料" },

  // Landing page (signed out)
  landing_tagline: {
    en: "Record your trips, pin the places you visit, keep your photos, and track what you spend along the way.",
    zh: "记录你的行程，标记去过的地方，保存照片，追踪旅途中的花费。",
  },
  landing_get_started: { en: "Get started", zh: "开始使用" },
} as const;

export type DictKey = keyof typeof DICT;

export function t(lang: Lang, key: DictKey, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let text: string = entry ? entry[lang] ?? entry.en : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
