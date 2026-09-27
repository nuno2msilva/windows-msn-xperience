/* Per-version configuration. Every version runs on the Windows XP look (os: "xp"); "vista" is still available in css/themes.css. Everything visual comes from assets/<id>/ (built by tools/build.py);
   menus, Options pages and dialog text come from data.js (the original msgslang DIALOG/MENU/string resources). */
const VERSIONS = {
  "4.7": {
    id: "4.7", listPicSizes: ["none"], label: "Windows Messenger 4.7", short: "4.7", year: 2004, product: "Windows Messenger",
    layout: "wm", os: "xp",
    statusLabels: { online: "Online", busy: "Busy", brb: "Be Right Back", away: "Away", call: "On The Phone", lunch: "Out To Lunch", offline: "Appear Offline" },
    offlineGroup: "Not Online",
    features: { dp: false, psm: false, nudge: false, winks: false, voice: false, search: false, spaces: false, song: false, backgrounds: false, sharing: false },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert" },
    soundLabels: { online: "Contact signs in", type: "New message received", newemail: "New e-mail arrives", newalert: "New alert arrives" },
    defaults: [],
  },

  "6.2": {
    id: "6.2", listPicSizes: ["none"], label: "MSN Messenger 6.2", short: "6.2", year: 2004, product: "MSN Messenger",
    layout: "msn7", os: "xp",
    statusLabels: { online: "Online", busy: "Busy", brb: "Be Right Back", away: "Away", call: "On The Phone", lunch: "Out To Lunch", offline: "Appear Offline" },
    offlineGroup: "Not Online",
    // 6.x: display pictures, custom emoticons and backgrounds, audio and webcam; no personal message, winks, nudges or voice clips.
    // The main window shows the large status buddy beside your name (no display picture there) and an "I want to..." pane.
    features: { dp: true, psm: false, nudge: false, winks: false, voice: false, search: false, spaces: false, song: false, backgrounds: true, sharing: false,
                mainPic: false, actionsPane: true },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert", outgoing: "ring" },
    soundLabels: {},
    defaults: ["default1"],
  },

  "7.5": {
    id: "7.5", listPicSizes: ["large", "small", "none"], label: "MSN Messenger 7.5", short: "7.5", year: 2005, product: "MSN Messenger",
    layout: "msn7", os: "xp",
    statusLabels: { online: "Online", busy: "Busy", brb: "Be Right Back", away: "Away", call: "On The Phone", lunch: "Out To Lunch", offline: "Appear Offline" },
    offlineGroup: "Offline",
    features: { dp: true, psm: true, nudge: true, winks: true, voice: true, search: false, spaces: false, song: true, backgrounds: true, sharing: false },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert", nudge: "nudge", phone: "phone", outgoing: "ring", vimdone: "vimdone" },
    soundLabels: { online: "Contact signs in", type: "New message received", newemail: "New e-mail arrives", newalert: "New alert arrives", nudge: "Nudge received", phone: "Incoming call", outgoing: "Outgoing call (ring)", vimdone: "Voice clip recorded" },
    defaults: ["default1", "default2", "default3"],
  },

  "8.5": {
    id: "8.5", listPicSizes: ["large", "medium", "small", "none"], label: "Windows Live Messenger 8.5", short: "8.5", year: 2007, product: "Windows Live Messenger",
    layout: "wlm", os: "xp",
    statusLabels: { online: "Online", busy: "Busy", brb: "Be Right Back", away: "Away", call: "In a Call", lunch: "Out to Lunch", offline: "Appear Offline" },
    offlineGroup: "Offline",
    features: { dp: true, psm: true, nudge: true, winks: true, voice: true, search: true, spaces: true, song: true, backgrounds: true, sharing: true },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert", nudge: "nudge", phone: "phone", outgoing: "outgoing", vimdone: "vimdone" },
    soundLabels: { online: "A contact signs in", type: "A message is received", newemail: "An e-mail is received", newalert: "An alert is received", nudge: "A nudge is received", phone: "A call comes in", outgoing: "Outgoing call", vimdone: "A voice clip finishes recording" },
    defaults: ["default1", "default2", "default3", "default4"],
  },
  "2009": {
    id: "2009", listPicSizes: ["large", "medium", "small", "none"], label: "Windows Live Messenger 2009", short: "2009 (14.0)", year: 2009, product: "Windows Live Messenger",
    layout: "wlm", os: "xp",
    statusKeys: ["online", "busy", "away", "offline"],            // 2009's status menu: Available, Busy, Away, Appear offline
    statusLabels: { online: "Available", busy: "Busy", brb: "Away", away: "Away", call: "Busy", lunch: "Away", offline: "Appear offline" },
    offlineGroup: "Offline",
    // Messenger 2009 (Wave 3): 8.5-style windows, plus scenes, favorites, named groups, categories and the invitation-style add contact
    features: { dp: true, psm: true, nudge: true, winks: true, voice: true, search: true, spaces: false, song: true, backgrounds: true, sharing: false,
                scenes: true, groups: true, favorites: true, categories: true, invite: true, whatsNew: true },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert", nudge: "nudge", phone: "phone", outgoing: "outgoing", vimdone: "vimdone" },
    soundLabels: {},
    extraSounds: ["alien", "band_intro", "cafe_in_paris", "driving_bass", "electric_guitar", "gong", "kiss", "life_in_redmond", "piano", "smooth_sax"],
    defaults: ["default1", "default2", "default3", "default4", "default5"],
  },
  "2012": {
    id: "2012", listPicSizes: ["large", "medium", "small", "none"], label: "Windows Live Messenger 2012", short: "2012 (16.4)", year: 2012, product: "Windows Live Messenger",
    layout: "w12", os: "xp",
    statusKeys: ["online", "busy", "away", "offline"],            // 2011/2012 dropped BRB, phone and lunch from your own menu
    statusLabels: { online: "Available", busy: "Busy", brb: "Be right back", away: "Away", call: "Busy", lunch: "Away", offline: "Appear offline" },
    offlineGroup: "Offline",
    features: { dp: true, psm: true, nudge: true, winks: true, voice: true, search: true, spaces: false, song: true, backgrounds: false, sharing: false, scenes: true, social: true, groups: true,
                favorites: true, categories: true, invite: true },
    sounds: { online: "online", type: "type", newemail: "newemail", newalert: "newalert", nudge: "nudge", phone: "phone", outgoing: "outgoing", vimdone: "vimdone" },
    soundLabels: { online: "A contact signs in", type: "I receive an instant message", newemail: "New e-mail arrives", newalert: "Alert", nudge: "Nudge", phone: "Incoming call", outgoing: "Outgoing call", vimdone: "Video call finished" },
    extraSounds: ["alien", "band_intro", "cafe_in_paris", "driving_bass", "electric_guitar", "gong", "kiss", "life_in_redmond", "piano", "smooth_sax"],
    defaults: ["default1", "default2", "default3", "default4", "default5"],
  },
};
const VERSION_ORDER = ["4.7", "6.2", "7.5", "8.5", "2009", "2012"];

/* The classic emoticon strip (assets/common/emoticons.png, 19px cells) in its original order. */
const EMOTICON_CODES = [":)", ":D", ";)", ":O", ":P", "(H)", ":@", ":$", ":S", ":(", ":'(", ":|", "(6)", "(A)", "(L)", "(U)", "(M)", "(@)", "(&)", "(S)",
  "(*)", "(~)", "(E)", "(8)", "(F)", "(W)", "(O)", "(K)", "(G)", "(^)", "(P)", "(I)", "(C)", "(T)", "({)", "(})", "(B)", "(D)", "(Z)", "(X)", "(Y)", "(N)",
  ":[", "(?)", "(%)", "(#)", "(R)"];
