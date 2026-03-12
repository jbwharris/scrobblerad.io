const stationData = {
  wfmu: {
    location: "Jersey City, NJ 🇺🇸",
    timestamp: "updated",
    timezone: "America/New_York",
    pathRegex: /"([^"]+)" by ([^"]+?)(?=\son)/,
    proxyStream: true,
    flipMeta: true,
    filter: ["on Wake on WFMU", "Your DJ speaks", "Cat Bomb! Radio", "Six Degrees with Alan"],
    streamUrl: "https://stream0.wfmu.org/freeform-128k.mp3",
    orbPath: "us.wfmu",
    drummer: {
      webUrl: "https://wfmu.org/drummer",
      streamUrl: "https://stream0.wfmu.org/drummer",
      orbPath: "us.wfmusgivethedrummer",
    },
    sheena: {
      webUrl: "https://wfmu.org/sheena",
      streamUrl: "https://stream0.wfmu.org/sheena",
      orbPath: "us.wfmusheenasjungleroom",
    }, 
    soul: {
      webUrl: "https://wfmu.org",
      streamUrl: "https://stream0.wfmu.org/rocknsoul",
      orbPath: "us.wfmusichiban",
    },
  },
};
