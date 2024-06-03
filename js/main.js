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
                if (listeners !== undefined && playcount !== undefined) {
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

    calculateNextAndPreviousIndices(direction) {
        this.currentIndex = stationKeys.indexOf(this.stationName);
        this.nextIndex = (this.currentIndex + 1) % stationKeys.length;
        this.previousIndex = (this.currentIndex - 1 + stationKeys.length) % stationKeys.length;
    }

     handleStationSelect(direction, stationName) {
        if (!stationName) return;

        console.log(stationName);
        this.stationName = stationName;
        this.updateArt = true;

        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
        }

        const newAudio = new Audio(this.addCacheBuster(stations[stationName].streamUrl));
        newAudio.onloadedmetadata = () => {
            this.lfmMetaChanged = false; // Reset lfmMetaChanged when station is switched
            if (this.audio) {
                this.audio.pause();
                this.audio = null;
            }
            this.audio = newAudio;
            this.play();
            this.isPlaying = true;

            const fetchDataAndRefreshPage = () => this.getStreamingData();
            fetchDataAndRefreshPage();
            this.streamingInterval = setInterval(fetchDataAndRefreshPage, 25000);
        };

        newAudio.onerror = (error) => {
            console.warn('Error loading audio:', error);
            if (direction == true) {
                this.skipBackward();
            } else {
                this.skipForward();
            }
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
            const regexPattern = stations[stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data.title);

            if (match) {
                [artist, song, album] = match.slice(1, 4).map((str) => str?.trim());
                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            }
        }

        if (stations[stationName].stringPath) {
            const regexPattern = stations[stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data);

            if (match) {
                // Extract and trim the matched groups
                song = match[1]?.trim() || '';
                artist = match[2]?.trim() || '';
                album = match[3]?.trim() || '';

                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }

                // Now you can use song, artist, and album as needed
            } else {
                console.log('No match found');
            }
        }


        // Check if any filtered values are present in the song or artist
        const filteredValues = stations[stationName].filter || [];

        const hasFilteredValue = filteredValues.some(value => {
            return song.includes(value) || artist.includes(value);
        });

        // Check if the stationName or a phone number exists in the match data
        const stationNameExists = String(song).includes(stationName) || String(artist).includes(stationName);
        const phoneNumberExists = /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(song) || /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(artist);

        // If either filteredValues, stationName, a phone number exists or there is no value for song, set song and artist accordingly
        if (stationNameExists || phoneNumberExists || hasFilteredValue || (!song && !artist) ) {
            song = 'Station may be taking a break';
            artist = '';
        }

        return [song, artist, album];
    }

    getLfmMeta(currentSong, currentArtist, currentAlbum) {
        return new Promise((resolve, reject) => {
            if (currentSong !== '' && currentArtist !== '') {
                const filterSet = {
                    artist: [MetadataFilter.normalizeFeature],
                    track: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
                    album: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
                };

                const filter = MetadataFilter.createFilter(filterSet);
                let lfmMethod = '';
                let lfmQueryField = '';
                let lfmDataField = '';

                if (currentAlbum) {
                    lfmMethod = 'album.getInfo';
                    lfmQueryField = 'album';
                    lfmDataField = currentAlbum;
                } else {
                    lfmMethod = 'track.getInfo';
                    lfmQueryField = 'track';
                    lfmDataField = currentSong;
                }

                const lfmQueryUrl = `https://ws.audioscrobbler.com/2.0/?method=${lfmMethod}&artist=${encodeURIComponent(filter.filterField('artist', currentArtist))}&${lfmQueryField}=${encodeURIComponent(filter.filterField(lfmQueryField, lfmDataField))}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&autocorrect=1&format=json&limit=1`;

                fetch(lfmQueryUrl)
                    .then(response => response.json())
                    .then(lfmData => {
                        let lfmArt = '';
                        let lfmAlbum = '';
                        let lfmSong = '';
                        let lfmArtist = '';
                        let lfmListeners = '';
                        let lfmPlaycount = '';

                        if (lfmData.error !== 6) {
                            if (currentAlbum) {
                                lfmArt = lfmData.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.album?.name) || filter.filterField('album', currentAlbum) || '';
                                lfmSong = filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.album?.artist) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.album.listeners;
                                lfmPlaycount = lfmData.album.playcount;
                            } else {
                                lfmArt = lfmData.track?.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.track?.album?.title) || filter.filterField('album', currentAlbum) || '';
                                lfmSong = filter.filterField('track', lfmData.track?.name) || filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.track?.artist?.name) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.track.listeners || '';
                                lfmPlaycount = lfmData.track.playcount || '';
                            }
                        } else if (lfmMethod === 'album.getInfo') {
                            // Retry with track.getInfo if album.getInfo fails
                            this.getLfmMeta(currentSong, currentArtist, '').then(resolve).catch(reject);
                            return;
                        } else {
                            lfmArt = urlCoverArt;
                            lfmAlbum = filter.filterField('track', currentAlbum) || '';
                            lfmSong = filter.filterField('track', currentSong) || 'No streaming data currently available';
                            lfmArtist = filter.filterField('artist', currentArtist) || '';
                            lfmListeners = '';
                            lfmPlaycount = '';
                        }
                        resolve([lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount]);
                    })
                    .catch(error => {
                        console.error("Error fetching Last.fm metadata:", error);
                        reject(error);
                    });
            } else {
                resolve(null);
            }
        });
    }

    getStreamingData() {
        if (this.isPlaying) {
            if (!this.stationName) return;

            let stationUrl = this.addCacheBuster(stations[this.stationName].apiUrl);

            const fetchOptions = {
                method: stations[this.stationName].method || 'GET',
                headers: stations[this.stationName].headers || {},
            };

            fetch(stationUrl, fetchOptions)
                .then((response) => {
                    const contentType = response.headers.get('content-type');

                    if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json')) {
                        return response.json().then((data) => ({ data, contentType }));
                    } else if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
                        return response.text().then((data) => ({ data, contentType }));
                    } else {
                        throw new Error(`Unsupported content type: ${contentType}`);
                    }
                })
                .then(({ data, contentType }) => {
                        if (contentType.includes('text/html')) {
                            // Parse the HTML response
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(data, 'text/html');
                            data = this.extractDataFromHTML(doc);
                        } else if (contentType.includes('application/javascript')) {
                            // Extract the HTML content from the JavaScript response
                            const htmlContent = this.extractHTMLFromJS(data);
                            console.log('excaped HTML', htmlContent);
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');
                            data = this.extractDataFromHTML(doc);
                        }

                    // Compare the current data response with the previous one
                    if (this.isDataSameAsPrevious(data)) {
                        // Data response is the same as the previous one, no need to process further
                        return;
                    }

                    // Store the current data response for future comparison
                    this.previousDataResponse = data;

                    // Process the new data response
                    this.processData(data);
                })
                .catch((error) => {
                    console.error('Error fetching streaming data:', error);
                });
        }
    }

    // Helper function to extract HTML content from a JavaScript response
    extractHTMLFromJS(js) {
        const match = js.match(/_spinitron\d+\("(.+)"\);/s);
        if (match && match[1]) {
            return match[1].replace(/\\"/g, '"'); // Unescape double quotes
        } else {
            throw new Error('Unable to extract HTML content from JavaScript response');
        }
    }

    // Helper function to extract necessary data from HTML response
    extractDataFromHTML(doc) {
        const song = doc.querySelector('span.song')?.textContent.trim() || 'No streaming data currently available';
        const artist = doc.querySelector('span.artist')?.textContent.trim() || '';
        const album = doc.querySelector('span.release')?.textContent.trim() || '';
        const albumArt = doc.querySelector('img.release')?.textContent.trim() || '';
      //  const albumArt = doc.querySelector('.spin-art-container > img.src')?.textContent.trim() || '';

    // Return the extracted data in the format expected by processData
       return `${song} - ${artist} - ${album}`;
    }

   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }

    processData(data) {
        const [ song, artist, album ] = this.extractSongAndArtist(data, this.stationName);
        let staleData = '';
        const currentTimeMillis = new Date().getTime();
        let epochTimeString = this.getPath(data, stations[this.stationName].timestamp) || this.getPath(data, stations[this.stationName].timestamp2) || "";

        let epochTimeMillis;
        if (String(epochTimeString).includes('T')) {
            epochTimeMillis = Date.parse(epochTimeString);
        } else {
            epochTimeMillis = parseInt(epochTimeString) * 1000;
        }

        const timeDifference = currentTimeMillis - epochTimeMillis;
        if (timeDifference > 900000 && epochTimeString !== "") {
            staleData = 'Streaming data is stale';
        }

        if (song === 'No streaming data currently available' || song === 'Station may be taking a break' || song === 'Station data is currently missing' || staleData) {
            const page = new Page(this.stationName, this);
            page.refreshCurrentData([staleData || song, '', '', urlCoverArt, '', '', true]);
            return;
        }

        if (this.isDataSameAsPrevious(data) && this.lfmMetaChanged && song === this.song) {
            return;
        }


        // Always call getLfmMeta the first time or if the song has changed
        if (!this.lfmMetaChanged || song !== this.song) {
            this.getLfmMeta(song, artist, album).then(lfmValues => {
            const [lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount] = lfmValues || [urlCoverArt, '', song, artist, '', ''];

            this.song = lfmSong;
            this.artist = lfmArtist;
            this.album = lfmAlbum;
            this.artworkUrl = lfmArt;
            this.listeners = lfmListeners;
            this.playcount = lfmPlaycount;
            
            this.lfmMetaChanged = true;

            document.title = `${this.song} - ${this.artist} | ${this.stationName}`;
            
            const page = new Page(this.stationName, this);
            page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, true]);
        }).catch(error => {
            console.error('Error processing data:', error);
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

    skipToNextStation() {
        this.calculateNextAndPreviousIndices();
        const nextStationKey = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationKey);
    }

    skipBackward() {
        this.calculateNextAndPreviousIndices();
        const prevStationKey = stationKeys[this.previousIndex];
        this.handleStationSelect(true, prevStationKey);
    }

    skipForward() {
        this.calculateNextAndPreviousIndices();
        const nextStationKey = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationKey);
    }

    addCacheBuster(url) {
        const timestamp = new Date().getTime();
        return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
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
