const stations = {
  abc: {
    doublej: {
      stationName: "ABC - Double J",
      tags: ["au", "public", "alt", "rock"],
    },
    triplej: {
      stationName: "ABC - Triple J",
      tags: ["au", "public", "alt", "indie"],
    },
    triplejunearthed: {
      stationName: "ABC - Triple J Unearthed",
      tags: ["au", "public", "indie", "unsigned"],
    },
  },
  acrn: {
    stationName: "ACRN",
    tags: ["us", "college", "alt", "top"],
  },
  altradio: {
    stationName: "AltRadio",
    tags: ["us", "npr", "public", "eclectic"],
  },
  bagelradio: {
    stationName: "BagelRadio",
    tags: ["us", "top", "pop"],
  },
  bbc: {
    radio2: {
      stationName: "BBC Radio 2",
      tags: ["uk", "public", "alt", "top40"],
    },
    radio6: {
      stationName: "BBC Radio 6 Music",
      tags: ["uk", "public", "alt", "eclectic", "top"],
    },
  },
  bfffm: {
    stationName: "BFF.fm",
    tags: ["us", "community", "eclectic"],
  },
  birchstreet: {
    stationName: "Birch Street Radio",
    tags: ["ca", "indie", "folk"],
  },
  blacklightradio: {
    stationName: "Blacklight Radio",
    tags: ["us", "electronic", "ambient"],
  },
  blowupradio: {
    stationName: "BlowupRadio",
    tags: ["us", "indie", "rock"],
  },
  thebridge: {
    stationName: "The Bridge 90.9",
    tags: ["us", "indie", "rock", "top"],
  },
  btpm: {
    stationName: "BTPM - The Bridge",
    tags: ["us", "ca", "npr", "public", "aaa", "top"],
  },
  cbcmusic: {
    stationName: "CBC Music",
    tags: ["ca", "public", "top40"],
  },
  cfny: {
    stationName: "102.1 The Edge - CFNY",
    tags: ["ca", "corp", "alt"],
  },
  cfrc: {
    stationName: "CFRC",
    tags: ["ca", "college", "variety"],
  },
  chillfiltr: {
    stationName: "CHILLFILTR",
    tags: ["ca", "chill", "electronic"],
  },
  chirpradio: {
    stationName: "CHIRP Radio",
    tags: ["us", "community", "indie", "top"],
  },
  chly: {
    stationName: "CHLY",
    tags: ["ca", "community", "variety"],
  },
  chma: {
    stationName: "CHMA",
    tags: ["ca", "community", "variety"],
  },
  chop: {
    stationName: "102.7 CHOP FM",
    tags: ["ca", "indie", "community", "college", "alt", "top"],
  },
  cimx: {
    stationName: "89X - CIMX",
    tags: ["ca", "alt", "corp"],
  },
  cioi: {
    stationName: "INDI 101.5 - CIOI",
    tags: ["ca", "indie", "alt", "top"],
  },
  ciso: {
    stationName: "89.1 MAX FM - CISO",
    tags: ["ca", "alt", "corp"],
  },
  civl: {
    stationName: "CIVL",
    tags: ["ca", "community", "variety"],
  },
  cjiq: {
    stationName: "CJIQ",
    tags: ["ca", "college", "rock"],
  },
  cjmp: {
    stationName: "CJMP",
    tags: ["ca", "community", "variety"],
  },
  cjsw: {
    stationName: "CJSW",
    tags: ["ca", "community", "alt"],
  },
  cjuc: {
    stationName: "CJUC",
    tags: ["ca", "community", "variety"],
  },
  ckua: {
    stationName: "CKUA",
    tags: ["ca", "public", "variety"],
  },
  ckut: {
    stationName: "CKUT",
    tags: ["ca", "college", "eclectic"],
  },
  ckuw: {
    stationName: "CKUW",
    tags: ["ca", "college", "community"],
  },
  coloradosound: {
    stationName: "The Colorado Sound",
    tags: ["us", "indie", "aaa"],
  },
  thecurrent: {
    stationName: "The Current",
    tags: ["us", "public", "aaa", "top"],
  },
  d1alt: {
    stationName: "D1 Alternative",
    tags: ["ca", "alt", "justmusic"],
  },
  d2relax: {
    stationName: "D2 Relax",
    tags: ["ca", "chill", "justmusic"],
  },
  dkfm: {
    stationName: "DKFM",
    tags: ["us", "electronic", "ambient"],
  },
  dkfmclassic: {
    stationName: "DKFM Classic",
    tags: ["ca", "electronic", "classic"],
  },
  easternalt: {
    stationName: "Eastern Alternative Radio",
    tags: ["uk", "alt"],
  },
  eastvillageradio: {
    stationName: "East Village Radio",
    tags: ["us", "community", "eclectic"],
  },
  eightradio: {
    stationName: "8Radio",
    tags: ["ie", "indie", "eclectic"],
  },
  wyms: {
    stationName: "88Nine - Radio Milwaukee",
    tags: ["us", "npr", "aaa", "top"],
  },
  flashAlt: {
    stationName: "Flashback Alternatives",
    tags: ["ca", "alt", "retro"],
  },
  floodfm: {
    stationName: "Flood FM",
    tags: ["us", "indie", "online"],
  },
  kffp: {
    stationName: "Freeform Portland",
    tags: ["us", "community", "eclectic"],
  },
  funkymoose: {
    stationName: "Funky Moose Radio",
    tags: ["ca", "funk", "soul"],
  },
  gorillafm: {
    stationName: "Gorilla FM",
    tags: ["ch", "electronic", "justmusic"],
  },
  indie1023: {
    stationName: "Indie 102.3",
    tags: ["us", "public", "indie"],
  },
  indie617: {
    stationName: "indie617",
    tags: ["us", "indie", "alt"],
  },
  indie88: {
    stationName: "Indie88",
    tags: ["ca", "corp", "indie"],
  },
  indieblend: {
    stationName: "The Indie Blend",
    tags: ["us", "indie", "justmusic"],
  },
  indiediscotheque: {
    stationName: "Indie Discotheque",
    tags: ["us", "indie", "electronic"],
  },
  indiexfm: {
    stationName: "Indie X FM",
    tags: ["us", "indie", "justmusic"],
  },
  idobianthm: {
    stationName: "idobi anthm",
    tags: ["us", "pop", "rock"],
  },
  inhailer: {
    stationName: "Inhailer Radio",
    tags: ["us", "indie", "rock", "top"],
  },
  kalw: {
    stationName: "KALW",
    tags: ["us", "npr", "public"],
  },
  kalx: {
    stationName: "KALX",
    tags: ["us", "college", "eclectic"],
  },
  kboo: {
    stationName: "KBOO",
    tags: ["us", "community", "variety"],
  },
  kcrw: {
    stationName: "KCRW",
    tags: ["us", "public", "npr", "eclectic"],
  },
  kcrweclectic24: {
    stationName: "KCRW Eclectic 24",
    tags: ["us", "public", "eclectic"],
  },
  kexp: {
    stationName: "KEXP",
    tags: ["us", "public", "indie", "top"],
  },
  kfai: {
    stationName: "KFAI",
    tags: ["us", "community", "eclectic"],
  },
  kfjc: {
    stationName: "KFJC",
    tags: ["us", "college", "eclectic"],
  },
  kpcr: {
    stationName: "KPCR - Pirate Cat Radio",
    tags: ["us", "community", "eclectic"],
  },
  kpiss: {
    stationName: "KPISS",
    tags: ["us", "punk", "indie"],
  },
  kqua: {
    stationName: "KQUA - The River",
    tags: ["us", "aaa", "rock"],
  },
  kroq: {
    stationName: "KROQ",
    tags: ["us", "corp", "alt"],
  },
  krsh: {
    stationName: "The Krush",
    tags: ["us", "hiphop", "rnb"],
  },
  krsm: {
    stationName: "KRSM",
    tags: ["us", "community", "variety"],
  },
  kuom: {
    stationName: "KUOM - Radio K",
    tags: ["us", "college", "indie"],
  },
  kutx: {
    stationName: "KUTX",
    tags: ["us", "college", "aaa", "top"],
  },
  kxll: {
    stationName: "KXLL",
    tags: ["us", "npr", "variety"],
  },
  kxlu: {
    stationName: "KXLU",
    tags: ["us", "college", "eclectic"],
  },
  kxt: {
    stationName: "KXT",
    tags: ["us", "public", "npr", "aaa"],
  },
  kzsc: {
    stationName: "KZSC",
    tags: ["us", "college", "eclectic"],
  },
  lemellotron: {
    stationName: "Le Mellotron",
    tags: ["fr", "chill", "electronic"],
  },
  lightning100: {
    stationName: "Lightning 100",
    tags: ["us", "aaa", "rock", "top"],
  },
  megashuffle: {
    stationName: "MegaShuffle",
    tags: ["ca", "variety", "justmusic"],
  },
  metradio: {
    stationName: "Met Radio",
    tags: ["ca", "indie", "rock"],
  },
  midtownradio: {
    stationName: "Midtown Radio",
    tags: ["ca", "indie", "rock"],
  },
  mountainchill: {
    stationName: "Mountain Chill",
    tags: ["us", "chill", "electronic"],
  },
  tmm1: {
    stationName: "The Music Machine 1",
    tags: ["uk", "variety", "justmusic"],
  },
  tmm2: {
    stationName: "The Music Machine 2",
    tags: ["uk", "variety", "justmusic"],
  },
  newsounds: {
    stationName: "New Sounds",
    tags: ["us", "public", "experimental"],
  },
  noiseboxradio: {
    stationName: "Noisebox Radio",
    tags: ["uk", "electronic", "experimental"],
  },
  nostalgie: {
    stationName: "Nostalgie",
    tags: ["be", "80s", "retro"],
  },
  novaphonicfm: {
    stationName: "Novaphonic.FM",
    tags: ["us", "aaa", "npr", "indie", "top"],
  },
  plazaone: {
    stationName: "Nightwave Plaza",
    tags: ["us", "synthwave", "electronic"],
  },
  thepoint: {
    stationName: "The Point",
    tags: ["us", "aaa", "rock", "top"],
  },
  prpfm: {
    stationName: "Portland Radio Project",
    tags: ["us", "community", "indie"],
  },
  qcindie: {
    stationName: "QCIndie",
    tags: ["ca", "online", "indie", "top"],
  },
  radiofrancefip: {
    stationName: "Radio France Fip",
    tags: ["fr", "eclectic", "jazz"],
    electro: {
      stationName: "Radio France Fip Electro",
      tags: ["fr", "eclectic", "electronic"],
    },
    jazz: {
      stationName: "Radio France Fip Jazz",
      tags: ["fr", "eclectic", "jazz"],
    },
    rock: {
      stationName: "Radio France Fip Rock",
      tags: ["fr", "eclectic", "rock", "indie"],
    },
  },
  radiohumber: {
    stationName: "Radio Humber",
    tags: ["ca", "college", "variety"],
  },
  radiolaurier: {
    stationName: "Radio Laurier",
    tags: ["ca", "college", "variety"],
  },
  radionovanuit: {
    stationName: "Radio Nova - La Nuit",
    tags: ["fr", "electronic", "night"],
  },
  radioparadiseglobal: {
    stationName: "Radio Paradise Global Mix",
    tags: ["us", "online", "eclectic"],
  },
  radioparadisemain: {
    stationName: "Radio Paradise Main Mix",
    tags: ["us", "online", "rock", "top"],
  },
  radiosydney: {
    stationName: "Radio Sydney",
    tags: ["au", "public", "variety"],
  },
  radiowestern: {
    stationName: "Radio Western",
    tags: ["ca", "college", "variety"],
  },
  radiox: {
    stationName: "Radio X",
    tags: ["uk", "corp", "rock"],
  },
  sabotage: {
    stationName: "Sabotage Radio",
    tags: ["fr", "indie", "rock"],
  },
  skylab: {
    stationName: "Skylab Radio",
    tags: ["uk", "electronic", "ambient"],
  },
  socalsound: {
    stationName: "The SoCal Sound",
    tags: ["us", "aaa", "rock", "top"],
  },
  soma: {
    eightiesunderground: {
      stationName: "SomaFM 80s Underground",
      tags: ["us", "soma", "80s", "new wave"],
    },
    folkfwd: {
      stationName: "SomaFM Folk Forward",
      tags: ["us", "soma", "folk", "indie"],
    },
    groovesalad: {
      stationName: "SomaFM Groove Salad",
      tags: ["us", "soma", "electronic", "downtempo"],
    },
    indiepop: {
      stationName: "SomaFM Indie Pop Rocks!",
      tags: ["us", "soma", "indie", "pop"],
    },
    sonicuniverse: {
      stationName: "SomaFM Sonic Universe",
      tags: ["us", "soma", "jazz", "eclectic"],
    },
  },
  soniccoast: {
    stationName: "The Sonic Coast",
    tags: ["us", "indie", "rock"],
  },
  spacefm: {
    stationName: "Space 101.1FM",
    tags: ["us", "indie", "rock"],
  },
  thesummit: {
    stationName: "The Summit",
    tags: ["us", "aaa", "rock"],
  },
  uncertainfm: {
    stationName: "UncertainFM",
    tags: ["us", "experimental", "electronic"],
  },
  untidyradio: {
    stationName: "Untidy Radio",
    tags: ["us", "eclectic", "variety"],
  },
  wber: {
    stationName: "WBER",
    tags: ["us", "college", "alt"],
  },
  wbor: {
    stationName: "WBOR",
    tags: ["us", "college", "variety", "top"],
  },
  wbru: {
    stationName: "WBRU",
    tags: ["us", "college", "alt"],
  },
  wcbn: {
    stationName: "WCBN",
    tags: ["us", "college", "eclectic"],
  },
  wers: {
    stationName: "WERS",
    tags: ["us", "college", "variety"],
  },
  wext: {
    stationName: "WEXT",
    tags: ["us", "aaa", "npr", "public"],
  },
  wfmu: {
    stationName: "WFMU",
    tags: ["us", "community", "eclectic", "top"],
    drummer: {
      stationName: "WFMU - Give The Drummer Radio",
      tags: ["us", "community", "experimental"],
    },
    soul: {
      stationName: "WFMU - Rock'n'Soul Radio",
      tags: ["us", "community", "soul", "rock"],
    },
    sheena: {
      stationName: "WFMU - Sheena's Jungle Room",
      tags: ["us", "community", "punk"],
    },
  },
  wfpk: {
    stationName: "WFPK",
    tags: ["us", "public", "npr", "aaa"],
  },
  wfuv: {
    stationName: "WFUV",
    tags: ["us", "public", "aaa"],
  },
  whsn: {
    stationName: "WHSN",
    tags: ["us", "college", "variety"],
  },
  wicb: {
    stationName: "WICB",
    tags: ["us", "college", "alt"],
  },
  witt: {
    stationName: "WITT",
    tags: ["us", "college", "variety"],
  },
  wknc: {
    stationName: "WKNC",
    tags: ["us", "college", "indie"],
  },
  wluw: {
    stationName: "WLUW",
    tags: ["us", "college", "variety"],
  },
  wmfo: {
    stationName: "WMFO",
    tags: ["us", "college", "eclectic"],
  },
  wmse: {
    stationName: "WMSE Radio",
    tags: ["us", "community", "variety"],
  },
  wnmc: {
    stationName: "WNMC",
    tags: ["us", "college", "variety"],
  },
  wnrn: {
    stationName: "WNRN",
    tags: ["us", "community", "aaa"],
  },
  wnxp: {
    stationName: "WNXP",
    tags: ["us", "public", "npr", "aaa", "top"],
  },
  worldwidefm: {
    stationName: "Worldwide FM",
    tags: ["uk", "eclectic", "global"],
  },
  wpkn: {
    stationName: "WPKN",
    tags: ["us", "community", "variety"],
  },
  wprb: {
    stationName: "WPRB",
    tags: ["us", "college", "eclectic"],
  },
  wrfl: {
    stationName: "WRFL",
    tags: ["us", "college", "indie"],
  },
  wrir: {
    stationName: "WRIR",
    tags: ["us", "community", "variety"],
  },
  wrur: {
    stationName: "WRUR - The Route",
    tags: ["us", "public", "npr", "aaa"],
  },
  wtmd: {
    stationName: "WTMD",
    tags: ["us", "public", "npr", "aaa"],
  },
  wudr: {
    stationName: "WUDR - Flyer Radio",
    tags: ["us", "college", "indie", "top"],
  },
  wuky: {
    stationName: "WUKY",
    tags: ["us", "public", "npr", "aaa"],
  },
  wyep: {
    stationName: "WYEP",
    tags: ["us", "public", "npr", "aaa"],
  },
  wyomingsounds: {
    stationName: "Wyoming Sounds",
    tags: ["us", "public", "npr", "aaa"],
  },
  wzbc: {
    stationName: "WZBC",
    tags: ["us", "college", "alt"],
  },
  x929: {
    stationName: "X92.9",
    tags: ["ca", "corp", "alt"],
  },
  xpn: {
    stationName: "XPN",
    tags: ["us", "npr", "aaa", "top"],
  },
  xpn2: {
    stationName: "XPoNential Radio",
    tags: ["us", "npr", "justmusic"],
  },
  xrayfm: {
    stationName: "XRAY FM",
    tags: ["us", "community", "indie"],
  },
  ynotradio: {
    stationName: "Y-Not Radio",
    tags: ["us", "indie", "rock", "top"],
  },
};
