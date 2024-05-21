const urlCoverArt = "../img/defaultArt.png";
const stationKeys = Object.keys(stations);

function generateRadioButtons() {
    const stationSelectDiv = document.getElementById('stationSelect');
    const fragment = document.createDocumentFragment();

    stationKeys.forEach((stationKey) => {
        const station = stations[stationKey];
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = stationKey;
        input.name = 'station';
        input.value = stationKey;
        input.checked = stationKey === radioPlayer.stationName;

        const textNode = document.createTextNode(station.stationName);
        label.appendChild(input);
        label.appendChild(textNode);
        fragment.appendChild(label);
    });

    stationSelectDiv.appendChild(fragment);
}

function animateElement(element, duration = 2000) {
    element.classList.add("animated", "fadeIn");
    setTimeout(() => {
        element.classList.remove("animated", "fadeIn");
    }, duration);
}

class Page {
    constructor(stationName, radioPlayer) {
        this.stationName = stationName;
        this.title = stations[this.stationName].stationName;
        this.radioPlayer = radioPlayer;

        this.cacheDOMElements();
        this.setupMediaSession('', '', '');
    }

    cacheDOMElements() {
        this.currentSongElement = document.getElementById("title");
        this.currentArtistElement = document.getElementById("artist");
        this.currentAlbumElement = document.getElementById("album");
        this.currentListenersElement = document.getElementById("listeners");
        this.coverArtElement = document.getElementById("albumArt");
        this.radioNameElement = document.getElementById("radioName");
        this.stationLocationElement = document.getElementById("stationLocation");
    }

    changeTitlePage() {
        document.title = this.title;
    }

    refreshCurrentData(values) {
        const [song, artist, album, artworkUrl, listeners, playcount, updateArt] = values;
        const nf = new Intl.NumberFormat('en-US');

        setTimeout(() => {
            this.coverArtElement.onload = () => {
                document.documentElement.style.setProperty("--albumArt", `url("${artworkUrl}")`);
                animateElement(this.coverArtElement);

                this.radioNameElement.href = stations[this.stationName].webUrl;
                animateElement(this.radioNameElement);
                this.radioNameElement.innerHTML = this.title;
                this.stationLocationElement.innerHTML = stations[this.stationName].location;

                this.animateAndUpdateElement(this.currentSongElement, song);
                this.animateAndUpdateElement(this.currentArtistElement, artist);
                this.animateAndUpdateElement(this.currentAlbumElement, album);
                if (listeners && playcount) {
                    this.animateAndUpdateElement(this.currentListenersElement, `Listeners: ${nf.format(listeners)} | Plays: ${nf.format(playcount)}`);
                }

                this.setupMediaSession(song, artist, artworkUrl);
            };
            this.coverArtElement.src = artworkUrl;
        }, 300);
    }

    animateAndUpdateElement(element, content) {
        if (content) {
            animateElement(element);
            element.innerHTML = content;
        } else {
            element.innerHTML = "";
        }
    }

    setupMediaSession(song, artist, artworkUrl) {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song || 'No streaming data currently available',
                artist: artist || '',
                album: `Now playing on ${stations[this.stationName].stationName}` || '',
                duration: Infinity,
                startTime: 0,
                artwork: [{ src: artworkUrl }],
            });

            const actionHandlers = {
                nexttrack: () => this.radioPlayer.skipForward(),
                previoustrack: () => this.radioPlayer.skipBackward(),
                play: () => this.radioPlayer.togglePlay(),
                pause: () => this.radioPlayer.togglePlay(),
            };

            for (const [action, handler] of Object.entries(actionHandlers)) {
                navigator.mediaSession.setActionHandler(action, handler);
            }
        }
    }
}

class RadioPlayer {
    constructor(buttonElement, skipForwardButton, skipBackButton) {
        this.audio = new Audio();
        this.playButton = buttonElement;
        this.skipForwardButton = skipForwardButton;
        this.skipBackButton = skipBackButton;
        this.isPlaying = false;
        this.stationName = "";
        this.previousDataResponse = null;

        this.bindMethods();
        this.addEventListeners();
        this.init();
    }

    bindMethods() {
        this.handleStationSelect = this.handleStationSelect.bind(this);
        this.getLfmMeta = this.getLfmMeta.bind(this);
        this.getStreamingData = this.getStreamingData.bind(this);
        this.extractSongAndArtist = this.extractSongAndArtist.bind(this);
        this.getPath = this.getPath.bind(this);
        this.togglePlay = this.togglePlay.bind(this);
        this.skipForward = this.skipForward.bind(this);
        this.skipBackward = this.skipBackward.bind(this);
    }

    addEventListeners() {
        this.playButton.addEventListener("click", this.togglePlay);
        this.skipForwardButton.addEventListener("click", this.skipForward);
        this.skipBackButton.addEventListener("click", this.skipBackward);

        document.getElementById("stationSelect").addEventListener("click", (event) => {
            if (event.target && event.target.matches("input[name='station']")) {
                this.handleStationSelect(event, event.target.value);
            }
        });
    }

    init() {
        if ("serviceWorker" in navigator) {
            document.addEventListener("DOMContentLoaded", () => {
                navigator.serviceWorker
                    .register("serviceWorker.js")
                    .then(() => console.log("Service worker registered"))
                    .catch((err) => console.log("Service worker not registered", err));
            });
        }
    }

    calculateNextAndPreviousIndices() {
        this.currentIndex = stationKeys.indexOf(this.stationName);
        this.nextIndex = (this.currentIndex + 1) % stationKeys.length;
        this.previousIndex = (this.currentIndex - 1 + stationKeys.length) % stationKeys.length;
    }

    handleStationSelect(event, stationName) {
        if (!stationName) return;

        console.log(stationName);
        this.stationName = stationName;
        this.updateArt = true;

        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
        }

        const newAudio = new Audio(stations[stationName].streamUrl);
        newAudio.onloadedmetadata = () => {
            this.lfmMetaChanged = false; // Reset lfmMetaChanged when station is switched
            console.log('lfmMetaChanged:', this.lfmMetaChanged);
            if (this.audio) {
                this.audio.pause();
                this.audio = null;
            }
            this.audio = newAudio;
            this.play();

            const fetchDataAndRefreshPage = () => this.getStreamingData();
            fetchDataAndRefreshPage();
            this.streamingInterval = setInterval(fetchDataAndRefreshPage, 25000);
        };

        newAudio.onerror = (error) => {
            console.error('Error loading audio:', error);
        };

        newAudio.load();
        const page = new Page(this.stationName, this);
        page.changeTitlePage();

        const radioInput = document.querySelector(`input[name='station'][value='${stationName}']`);
        if (radioInput) {
            radioInput.checked = true;
        }
    }

    extractSongAndArtist(data, stationName) {
        let song = this.getPath(data, stations[stationName].song)?.replace(/&apos;/g, "'") || '';
        let artist = this.getPath(data, stations[stationName].artist)?.replace(/&apos;/g, "'") || '';
        let album = this.getPath(data, stations[stationName].album)?.replace(/&apos;/g, "'") || '';

        if (stations[stationName].nprPath && !song) {
            song = this.getPath(data, stations[stationName].song2)?.replace(/&apos;/g, "'") || '';
            artist = this.getPath(data, stations[stationName].artist2)?.replace(/&apos;/g, "'") || '';
        }

        if (stations[stationName].orbPath) {
            const regexPattern = stations[stationName].pathRegex || /^(.*) \- (.*)/;
            const match = regexPattern.exec(data.title);

            if (match) {
                [artist, song, album] = match.slice(1, 4).map((str) => str?.trim());
                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                song = 'No streaming data currently available';
                artist = '';
            }
        }

        if (stations[stationName].stringPath) {
            const regexPattern = stations[stationName].pathRegex || /^(.*) \- (.*)/;
            const match = regexPattern.exec(data);

            if (match) {
                [song, artist] = match.slice(1, 3).map((str) => str?.trim());
                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                song = 'No streaming data currently available';
                artist = '';
            }
        }

        return [song, artist, album];
    }

    getLfmMeta(song, artist) {
        if (!song || !artist) return Promise.resolve(null);
        const apiKey = '09498b5daf0eceeacbcdc8c6a4c01ccb';

        const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(song)}&format=json`;

        return fetch(url)
            .then((response) => response.json())
            .then((data) => {
                const track = data.track;
                if (!track) return null;

                const album = track.album?.title || '';
                const artworkUrl = track.album?.image?.[3]?.['#text'] || urlCoverArt;
                const playcount = track.playcount || 0;
                const listeners = track.listeners || 0;

                return [album, artworkUrl, playcount, listeners];
            })
            .catch((error) => {
                console.error('Error fetching Last.fm metadata:', error);
                return null;
            });
    }

    getStreamingData() {

        if (this.isPlaying) {
        
        if (!this.stationName) return;

        

        const stationUrl = stations[this.stationName].apiUrl;

        const fetchOptions = {
            method: stations[this.stationName].method || 'GET',
            headers: stations[this.stationName].headers || {},
        };

        fetch(stationUrl, fetchOptions)
            .then((response) => {
                const contentType = response.headers.get('content-type');
                return response.json();
            })
            .then((data) => {
                const [song, artist, album] = this.extractSongAndArtist(data, this.stationName);

                if (song === "No streaming data currently available" && this.previousDataResponse) {
                    return;
                }

                // Compare the current data response with the previous one
                if (this.isDataSameAsPrevious(data)) {
                    // Data response is the same as the previous one, no need to process further
                    return;
                }

                this.previousDataResponse = data;

                // Process the new data response
                this.processData(data);


                this.getLfmMeta(song, artist).then((lfmData) => {
                    const [lfmAlbum, artworkUrl, playcount, listeners] = lfmData || [album, urlCoverArt, 0, 0];
                    const updateArt = this.updateArt;

                    this.updateArt = false;

                    const page = new Page(this.stationName, this);
                    page.refreshCurrentData([song, artist, lfmAlbum || album, artworkUrl, listeners, playcount, updateArt]);
                });
            })
            .catch((error) => {
                console.error('Error fetching streaming data:', error);
            });
        }
    }

   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }

    // Function to process the data response
    processData(data) {
        const { song, artist, album } = this.extractSongAndArtist(data, this.stationName);

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
        }

        // If the song is 'No streaming data currently available', refresh the page with default values
        if (song === 'No streaming data currently available' || song === 'Station data is taking a break' || song === 'Station data is currently missing' || staleData) {
            const page = new Page(this.stationName, this);
            page.refreshCurrentData([staleData || song, '', '', urlCoverArt, '', '', true]);
            return;
        }

        // If metadata hasn't changed and lfmMetaChanged is true, return
        if (this.lfmMetaChanged && song === this.song) {
            return;
        }

        // Always call getLfmMeta the first time or if the song has changed
        if (!this.lfmMetaChanged || song !== this.song) {
            this.getLfmMeta(song, artist, album, (lfmValues) => {
                if (!lfmValues) {
                    // Handle error or null case from getLfmMeta
                    console.error("Error fetching lfm data");
                    return;
                }

                // Assuming artwork retrieval was successful
                this.artworkUrl = this.getPath(data, stations[this.stationName].albumArt) || lfmValues[0] || urlCoverArt;
                this.album = this.getPath(data, stations[this.stationName].album) || lfmValues[1] || '';
                this.song = lfmValues[2] || song;
                this.artist = lfmValues[3] || artist;
                this.listeners = lfmValues[4] || ''; 
                this.playcount = lfmValues[5] || ''; 

                console.log("listeners:", this.listeners, "playcount:", this.playcount);

                this.lfmMetaChanged = true;

                document.title = `${this.song} - ${this.artist} | ${this.stationName}`;
                
                // Refresh data and update metadata
                const page = new Page(this.stationName, this);
                page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, true]);
            });
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
        if (!this.audio.src) return;
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.playButton.lastElementChild.className = "fa fa-pause";
            document.getElementById("metadata").classList.add("playing");
        }).catch((error) => {
            console.error('Error playing audio:', error);
        });
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playButton.lastElementChild.className = "fa fa-play";
        document.getElementById("metadata").classList.remove("playing");
    }

    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }

    skipForward() {
        this.calculateNextAndPreviousIndices();
        const nextStationName = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationName);
    }

    skipBackward() {
        this.calculateNextAndPreviousIndices();
        const previousStationName = stationKeys[this.previousIndex];
        this.handleStationSelect(null, previousStationName);
    }
}

// Initialize radio buttons and radio player
const radioPlayer = new RadioPlayer(
    document.getElementById("playButton"),
    document.getElementById("skipForward"),
    document.getElementById("skipBack")
);

generateRadioButtons();

// Load the default station
const defaultStation = stationKeys[0];
radioPlayer.handleStationSelect(null, defaultStation);
