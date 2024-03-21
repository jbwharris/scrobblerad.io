const urlCoverArt = "../img/defaultArt.webp";

const stationKeys = Object.keys(stations);

function generateRadioButtons() {
  const stationSelectDiv = document.getElementById('stationSelect');

  stationKeys.forEach((stationKey) => {
    const station = stations[stationKey];
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.id = stationKey;
    input.name = 'station';
    input.value = stationKey;
    const textNode = document.createTextNode(station.stationName);
    label.appendChild(input);
    label.appendChild(textNode);
    stationSelectDiv.appendChild(label);
  });
}

class Page {
    constructor(stationName, radioPlayer) {
        this.stationName = stationName;
        this.title = stations[this.stationName].stationName;
        this.radioPlayer = radioPlayer;
    }

    changeTitlePage() {
        document.title = this.title;
    }

    refreshCurrentData(song, artist, album, artworkUrl, updateArt) {
        const currentSong = document.getElementById("title");
        const currentArtist = document.getElementById("artist");
        const currentAlbum = document.getElementById("album");
        const coverArt = document.getElementById("albumArt");
        const radioNameElement = document.getElementById("radioName");
        
        radioNameElement.href = stations[this.stationName].webUrl;
        radioNameElement.className = "animated fadeIn btn btn-info mb-1";
        radioNameElement.innerHTML = this.title;
        document.getElementById("stationLocation").innerHTML =
            stations[this.stationName].location;

            // Animate transition
            currentSong.className = "animated fadeIn text-capitalize h3";
            currentSong.innerHTML = song;

            currentArtist.className = "animated fadeIn text-capitalize h4";
            currentArtist.innerHTML = artist;

            if (song == 'No streaming data currently available') {
                currentSong.innerHTML = song;
                currentArtist.innerHTML = artist;
            }


            if (album) {
                currentAlbum.className = "animated fadeIn text-capitalize";
                currentAlbum.innerHTML = album;

                if (album == 'No album found') {
                    currentAlbum.innerHTML = '';
                }
            } else {
                currentAlbum.innerHTML = "";
            }

            document.documentElement.style.setProperty("--albumArt", `url("${artworkUrl}")`,);
            coverArt.className = "img-fluid rounded mx-auto d-block animated fadeIn";
            coverArt.src = artworkUrl;

            // Remove animation classes
            setTimeout(() => {
                currentSong.className = "text-capitalize h3";
                currentArtist.className = "text-capitalize h4";
                currentAlbum.classList = "text-capitalize";
                coverArt.className = "img-fluid rounded mx-auto d-block";
                radioNameElement.className = "btn btn-info mb-1";
            }, 2000);

            if ("mediaSession" in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song || 'No streaming data currently available',
                    artist: artist || '',
                    album: album || '',
                    position: 0,
                    duration: 10000,
                    artwork: [
                        {
                            src: artworkUrl,
                        },
                    ],
                });

                navigator.mediaSession.setActionHandler('nexttrack', function() {
                  console.log('User clicked "Next Track" icon.');
                    radioPlayer.skipForward();
                });

                navigator.mediaSession.setActionHandler('previoustrack', function() {
                  console.log('User clicked "Previous Track" icon.');
                    radioPlayer.skipBackward();
                });

                navigator.mediaSession.setActionHandler('play', async function() {
                  console.log('User clicked "Play" icon.');
                  radioPlayer.togglePlay();
                });

                navigator.mediaSession.setActionHandler('pause', function() {
                  console.log('User clicked "Pause" icon.');
                  radioPlayer.togglePlay();
                });

            }
    }
}

class RadioPlayer {
    constructor(buttonElement, skipForwardButton, skipBackButton) {
        this.audio = new Audio();
        this.button = buttonElement;
        this.skipForwardButton = skipForwardButton;
        this.skipBackButton = skipBackButton;
        this.isPlaying = false;
        this.artworkUrl = "";
        this.updateArt = "";
        this.stationName = "";

        // Bind methods to ensure proper 'this' reference
        this.handleStationSelect = this.handleStationSelect.bind(this);
        this.getLfmMeta = this.getLfmMeta.bind(this);
        this.getStreamingData = this.getStreamingData.bind(this);
        this.extractSongAndArtist = this.extractSongAndArtist.bind(this);
        this.getPath = this.getPath.bind(this);
        this.togglePlay = this.togglePlay.bind(this); // Add this line
        this.button.addEventListener("click", this.togglePlay);
        this.skipForward = this.skipForward.bind(this);
        this.audio.addEventListener('ended', () => {console.log('Audio playback ended');});

        this.maxArtworkAttempts = 2; // Maximum number of attempts to find artwork
        this.artworkAttempts = 0; // Counter for artwork attempts

        this.init();
    }

    init() {
        if ("serviceWorker" in navigator) {
            document.addEventListener("DOMContentLoaded", () => {
                navigator.serviceWorker
                    .register("serviceWorker.js")
                    .then(() => console.log("Service worker registered"))
                    .catch((err) =>
                        console.log("Service worker not registered", err),
                    );
            });
        }

        document
            .getElementById("stationSelect")
            .addEventListener("click", this.handleStationSelect);
        this.skipForwardButton.addEventListener("click", this.skipForward);
        this.skipBackButton = document.getElementById("skipBackButton");
        this.skipBackButton.addEventListener("click", this.skipBackward.bind(this));
    }

    handleStationSelect(event) {
        if (event.target && event.target.matches("input[name='station']")) {
            const newStationName = event.target.value;

            console.log(newStationName);
            this.stationName = newStationName;
            this.lfmMetaChanged = false; // Reset lfmMetaChanged when station is switched
            this.updateArt = true;
            this.artworkUrl = "";
            this.album = "";
            this.staleData = "";

            // Clear existing interval to avoid multiple setInterval calls
            if (this.streamingInterval) {
                clearInterval(this.streamingInterval);
            }

            this.audio.src = stations[this.stationName].streamUrl;
            this.play();

            const page = new Page(this.stationName, this);
            page.changeTitlePage();

            const fetchDataAndRefreshPage = () => {
                this.getStreamingData();
            };

            fetchDataAndRefreshPage();
            this.streamingInterval = setInterval(fetchDataAndRefreshPage, 25000); // Set new interval
        } else {
            console.log("Media source changed");
        }
    }

     extractSongAndArtist(data, stationName) {
        let song = (
            this.getPath(data, stations[stationName].song) || ""
        ).replace(/&apos;/g, "'");
        let artist = (
            this.getPath(data, stations[stationName].artist) || ""
        ).replace(/&apos;/g, "'");

        // Check if the stationName or a phone number exists in the match data
        const stationNameExists = String(song).includes(stationName) || String(artist).includes(stationName);
        const phoneNumberExists = /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(song) || /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(artist);

        // If either stationName or a phone number exists, set song and artist accordingly
        if (stationNameExists || phoneNumberExists) {
            song = 'No streaming data currently available';
            artist = '';
        } else {
            // If the primary paths don't yield results, try the secondary paths
            if (stations[stationName].nprPath && song === '') {
                song = (
                    this.getPath(data, stations[stationName].song2) || ""
                ).replace(/&apos;/g, "'");
                artist = (
                    this.getPath(data, stations[stationName].artist2) || ""
                ).replace(/&apos;/g, "'");
                console.log('NPR second try');
            }

            let regexPattern = /^(.*) - (.*)/;
            
            if (stations[stationName].pathRegex) {
                regexPattern = stations[stationName].pathRegex;
            }

            // The song and artist data from OnlineRadioBox is inconsistent, sometimes it's not there in the path, but the combined 'artist - song title' is more reliable, so we need to parse the response 
            if (stations[stationName].orbPath === true) { 
                if (stations[stationName].pathRegex) {
                    regexPattern = stations[stationName].pathRegex;
                }

                const match = regexPattern.exec(data.title);

                if (match) {
                    song = match[2].trim();
                    artist = match[1].trim();

                    // some stations have their meta data formatted as 'song title - artist', so this flips those items
                    if (stations[stationName].flipMeta === true) {
                        song = match[1].trim();
                        artist = match[2].trim();
                    }
                } else {
                    song = 'No streaming data currently available';
                    artist = '';
                }
            }

            if (stations[stationName].stringPath === true) { 
                const match = regexPattern.exec(data);

                if (match) {
                    song = match[1].trim();
                    artist = match[2].trim();
                } else {
                    song = 'No streaming data currently available';
                    artist = '';
                }
            }
        }

        let currentSong = song.replace(/&amp;/g, "&");
        let currentArtist = artist.replace(/&amp;/g, "&");
        currentArtist = currentArtist.replace("  ", " ");

        return { song: currentSong, artist: currentArtist };
    }


    getLfmMeta(currentSong, currentArtist, callback) {
        if (currentSong !== '' && currentArtist !== '') {

            // filters to sanitize the song, artist and album 
            const filterSet = {
                artist: [MetadataFilter.normalizeFeature],
                track: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
                album: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
            };

            const filter = MetadataFilter.createFilter(filterSet);

            const lfmxhr = new XMLHttpRequest();

            const lfmQuery = new URL(
                `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(
                    filter.filterField('artist', currentArtist),
                )}&track=${encodeURIComponent(
                    filter.filterField('track', currentSong),
                )}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&&autocorrect=1&format=json&limit=1`,
            );

            lfmxhr.open("GET", lfmQuery, true);
            lfmxhr.onreadystatechange = () => {
                if (lfmxhr.readyState === 4) {
                    if (lfmxhr.status === 200) {
                        const lfmData = JSON.parse(lfmxhr.responseText);
                        let lfmArt = '';
                        let lfmAlbum = '';
                        let lfmSong = '';
                        let lfmArtist = '';

                    //    console.log("lfmQuery", lfmQuery.href);
                    //    console.log("lfmData", lfmData);

                        if (lfmData.error !== 6) {
                            lfmArt = lfmData.track.album?.image[3]["#text"];
                            lfmAlbum = filter.filterField('album', lfmData.track.album?.title) || 'No album found';
                            lfmSong = lfmData.track?.name || currentSong;
                            lfmArtist = lfmData.track.artist?.name || currentArtist;
                        } else {
                            lfmArt = urlCoverArt;
                            lfmAlbum = 'No album found';
                        }

                        // Call the callback function with the retrieved values
                        callback(lfmArt, lfmAlbum, lfmSong, lfmArtist);

                    } else {
                        // Handle HTTP errors here
                        console.error("Error: ", lfmxhr.statusText);
                        // Optionally call the callback with null values or an error message
                        callback(null, null, "Error fetching lfm data");
                    }
                }
            };
            lfmxhr.onerror = function() {
                // Handle errors that occur during the request
                console.error("Request failed");
                callback(null, null, "Request failed");
            };
            lfmxhr.send(null);
        }
    }

    getStreamingData() {
        if (this.isPlaying) {
            fetch(stations[this.stationName].apiUrl, {
                mode: "cors",
                headers: {
                    Accept: "application/json",
                },
            })
            .then((response) => response.json())
            .then((data) => {
                const { song, artist } = this.extractSongAndArtist(data, this.stationName);

                let staleData = '';
                const currentTimeMillis = new Date().getTime();
                let epochTimeString = this.getPath(data, stations[this.stationName].timestamp) || "";

                let epochTimeMillis;
                if (String(epochTimeString).includes('T')) {
                    // Timestamp contains timezone information, parse it directly
                    epochTimeMillis = Date.parse(epochTimeString);
                } else {
                    // Timestamp doesn't contain timezone information, treat it as Unix timestamp
                    epochTimeMillis = parseInt(epochTimeString) * 1000;
                }

                // Calculate the difference in milliseconds
                const timeDifference = currentTimeMillis - epochTimeMillis;

                // Check if the time difference is greater than 15 minutes
                if (timeDifference > 900000 && epochTimeString !== "") { // Changed to 900000 (15 minutes in milliseconds)
                    staleData = 'Streaming data is stale';
                  //  console.log('metadata is stale', timeDifference, 'timestamp:', epochTimeString, 'currentTime:', currentTimeMillis );
                } else {
                 //   console.log('metadata is fresh', timeDifference, 'timestamp:', epochTimeString, 'currentTime:', currentTimeMillis);
                }

                // If the song is 'No streaming data currently available', refresh the page with default values
                if (song === 'No streaming data currently available' || staleData) {
                    const page = new Page(this.stationName, this);
                    page.refreshCurrentData(staleData || song, '', '', urlCoverArt, true);
                    return;
                }

                // If metadata hasn't changed and lfmMetaChanged is true, return
                if (this.lfmMetaChanged && song === this.song) {
                    return;
                }

                // Always call getLfmMeta the first time or if the song has changed
                if (!this.lfmMetaChanged || song !== this.song) {
                    this.getLfmMeta(song, artist, (lfmArt, lfmAlbum, lfmSong, lfmArtist) => {
                        // Assuming artwork retrieval was successful
                        const albumArt = this.getPath(data, stations[this.stationName].albumArt) || lfmArt;
                        const album = this.getPath(data, stations[this.stationName].album) || lfmAlbum;
                        this.artworkUrl = albumArt || urlCoverArt;
                        this.album = album || 'No album found';
                        this.song = lfmSong || song;
                        this.artist = lfmArtist || artist;
                        this.lfmMetaChanged = true;
                        
                        // Refresh data and update metadata
                        const page = new Page(this.stationName, this);
                        page.refreshCurrentData(this.song, this.artist, this.album, this.artworkUrl, true);
                    });
                }

                document.title = `${this.song} - ${this.artist} | ${this.stationName}`;
            })
            .catch((error) => console.error("Error fetching streaming data:", error));
        }
    }

    getPath(obj, prop) {
        if (!obj || typeof obj !== 'object' || !prop) {
            // Handle invalid arguments or undefined properties
            return undefined; // or throw an error, log a message, etc.
        }

        if (stations[this.stationName].needPath === true) {
            var parts = prop.split("."),
                last = parts.pop(),
                l = parts.length,
                i = 1,
                current = parts[0];

            while ((obj = obj[current]) && i < l) {
                current = parts[i];
                i++;
            }

            if (obj) {
                return obj[last];
            }
        } else {
            return obj[prop];
        }
    }

    play() {
        this.audio
            .play()
            .catch((error) => console.error("Error playing audio:", error));
        this.isPlaying = true;
        navigator.mediaSession.playbackState = 'playing';
        this.updateButtonIcon();
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        navigator.mediaSession.playbackState = 'paused';
        this.updateButtonIcon();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    skipForward() {
        this.pause();
        navigator.mediaSession.playbackState = "playing";
        const currentIndex = stationKeys.indexOf(this.stationName);
        const nextIndex = (currentIndex + 1) % stationKeys.length;
        const nextStation = stationKeys[nextIndex];
        document.getElementById(nextStation).click();
        this.togglePlay;
    }

    skipBackward() {
        this.pause();
        navigator.mediaSession.playbackState = "playing";
        const currentIndex = stationKeys.indexOf(this.stationName);
        const prevIndex = (currentIndex - 1 + stationKeys.length) % stationKeys.length;
        const prevStation = stationKeys[prevIndex];
        document.getElementById(prevStation).click();
        this.togglePlay;
    }

    updateButtonIcon() {
        this.button.firstElementChild.className = this.isPlaying
            ? "fa fa-pause"
            : "fa fa-play";

        const metadataDiv = document.getElementById("metadata");
        if (this.isPlaying) {
            metadataDiv.classList.add("playing");
        } else {
            metadataDiv.classList.remove("playing");
        }
    }
}


// Call the function to generate radio buttons when the page loads
window.addEventListener('DOMContentLoaded', generateRadioButtons);

// Initialization code
const playButton = document.querySelector("button#playerButton");
const skipForwardButton = document.querySelector("button#skipForwardButton");
const skipBackButton = document.querySelector("button#skipBackButton");
const radioPlayer = new RadioPlayer(playButton, skipForwardButton, skipBackButton);
