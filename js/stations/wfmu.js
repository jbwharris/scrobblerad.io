const stationData = {
  wfmu: {
    stationName: "WFMU",
    albumArt: "iImg",
    location: "Jersey City, NJ 🇺🇸",
    webUrl: "https://wfmu.org",
    streamUrl: "https://stream0.wfmu.org/freeform-128k.mp3",
    apiUrl: "https://scraper2.onlineradiobox.com/us.wfmu?l=0",
    timestamp: "updated",
    orbPath: true,
    pathRegex: /"([^"]+)" by ([^"]+?)(?=\son)/,
    flipMeta: true,
    filter: ["on Wake on WFMU", "Your DJ speaks", "Cat Bomb! Radio", "Six Degrees with Alan"],
  }
};