const stationData = {
  bbc: {
    location: "London, UK 🇬🇧",
    timezone: "UTC",
    timestamp: "updated",
    radio1: {
      webUrl: "https://www.bbc.co.uk/sounds/play/live/bbc_radio_one",
      streamUrl: "https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/hls/nonuk/audio_syndication_low_sbr_v1/cfs/bbc_radio_one.m3u8",
      orbPath: "uk.bbcradio1",
    },
    radio2: {
      webUrl: "https://www.bbc.co.uk/sounds/play/live/bbc_radio_two",
      streamUrl: "https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/hls/nonuk/audio_syndication_low_sbr_v1/cfs/bbc_radio_two.m3u8",
      orbPath: "uk.bbcradio2",
    },
    radio6: {
      webUrl: "https://www.bbc.co.uk/sounds/play/live:bbc_6music",
      streamUrl: "https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/hls/nonuk/audio_syndication_low_sbr_v1/cfs/bbc_6music.m3u8",
      orbPath: "uk.bbcradio6",
    },
    indieforever: {
      artist: "data.0.titles.primary",
      song: "data.0.titles.secondary",
      webUrl: "https://www.bbc.co.uk/sounds/play/live:bbc_6music",
      streamUrl: "https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/hls/uk/mobile_wifi_main_hd_abr_v2/aks/bbc_radio_six_indie_forever.m3u8",
      apiUrl: "https://rms.api.bbc.co.uk/v2/services/bbc_radio_six_indie_forever/segments/latest?experience=domestic&offset=0&limit=4",
      updated: "data.0.offset.start",
      proxyApi: true,
      proxyStream: true,
    }
  }
};