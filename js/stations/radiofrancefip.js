const stationData = {
  radiofrancefip: {
    artist: "now.secondLine.title",
    song: "now.firstLine.title",
    location: "Paris, France 🇫🇷",
    timestamp: "now.startTime",
    webUrl: "https://www.nova.fr/",
    streamUrl: "https://icecast.radiofrance.fr/fip-hifi.aac",
    apiUrl: "https://www.radiofrance.fr/fip/api/live?webradio=fip",
    timezone: "UTC",
    proxyApi: true,
    filter: ["Club Jazzaflip", "Radio France", "electro", "Le Direct"],
    electro: {
      stationName: "Radio France Fip: Electro",
      webUrl: "https://www.nova.fr/",
      streamUrl: "https://icecast.radiofrance.fr/fipelectro-hifi.aac",
      apiUrl: "https://www.radiofrance.fr/fip/api/live?webradio=fip_electro",
    },
    jazz: {
      stationName: "Radio France Fip: Jazz",
      webUrl: "https://www.nova.fr/",
      streamUrl: "https://icecast.radiofrance.fr/fipjazz-hifi.aac",
      apiUrl: "https://www.radiofrance.fr/fip/api/live?webradio=fip_jazz",
    },
    rock: {
      stationName: "Radio France Fip: Rock",
      webUrl: "https://www.nova.fr/",
      streamUrl: "https://icecast.radiofrance.fr/fiprock-hifi.aac",
      apiUrl: "https://www.radiofrance.fr/fip/api/live?webradio=fip_rock",
    },
  }
};