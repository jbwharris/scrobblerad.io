const urlCoverArt = "../img/defaultArt.png";
const stationKeys = Object.keys(stations);

function generateRadioButtons() {
    const stationSelectDiv = document.getElementById('stationSelect');
    const fragment = document.createDocumentFragment();

    stationKeys.forEach((stationKey) => {
        const station = stations[stationKey];
        const label = document.createElement('label');
        label.id = stationKey; // Set the label's id to the stationKey
        label.textContent = station.stationName;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'station';
        input.value = stationKey;
        input.checked = stationKey === radioPlayer.stationName;
        
        // Add event listener to update the URL hash
        input.addEventListener('change', () => {
            if (input.checked) {
                window.location.hash = `#${stationKey}`;
            }
        });

        // Create an anchor link to jump to the station
        const anchor = document.createElement('a');
        anchor.href = `#${stationKey}`;
        anchor.appendChild(label);
        
        label.appendChild(input);
        fragment.appendChild(anchor);
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
        const elementIds = {
            currentSong: "title",
            currentArtist: "artist",
            currentAlbum: "album",
            currentListeners: "listeners",
            coverArt: "albumArt",
            radioNameLink: "radioNameLink",
            radioName: "radioName",
            stationLocation: "stationLocation"
        };

        for (const [key, id] of Object.entries(elementIds)) {
            this[key + 'Element'] = document.getElementById(id);
        }
    }


    changeTitlePage() {
        document.title = `${this.title} currently loading`;
    }

    refreshCurrentData(values) {
        const [song, artist, album, artworkUrl, listeners, playcount] = values;
        const nf = new Intl.NumberFormat('en-US');

        this.setupMediaSession(song, artist, artworkUrl);

        setTimeout(() => {
            this.coverArtElement.onload = () => {
                document.documentElement.style.setProperty("--albumArt", `url("${artworkUrl}")`);

                this.radioNameLinkElement.href = stations[this.stationName].webUrl;
                this.radioNameElement.innerHTML = this.title;
                this.stationLocationElement.innerHTML = stations[this.stationName].location;
                animateElement(this.radioNameElement);
                animateElement(this.stationLocationElement);
                animateElement(this.coverArtElement);

                this.animateAndUpdateElement(this.currentSongElement, song);
                this.animateAndUpdateElement(this.currentArtistElement, artist);
                this.animateAndUpdateElement(this.currentAlbumElement, album);
                if (listeners !== null  && playcount !== null ) {
                    this.animateAndUpdateElement(this.currentListenersElement, `Listeners: ${nf.format(listeners)} | Plays: ${nf.format(playcount)}`);
                } else {
                    this.animateAndUpdateElement(this.currentListenersElement, '');
                }

                if (song !== '' || artist !== '' || title !== `${stations[this.stationName].stationName} currently loading`) {
                    document.title = `${song} - ${artist} | ${stations[this.stationName].stationName} on scrobblerad.io`;
                }
            };
            this.coverArtElement.src = artworkUrl;
        }, 1500);
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
                title: song ||  `${stations[this.stationName].stationName} currently loading`,
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
        this.isPlaying = null;
        this.stationName = "";
        this.previousDataResponse = null;
        this.pauseTimeout = null; // Timer for pause duration
        this.shouldReloadStream = false; // Flag to indicate if the stream should be reloaded
        this.stations = document.querySelectorAll('.station');
        this.debounceTimeout = null; // Store debounce timeout ID
        this.firstRun = true;
        this.streamingInterval = null; // Initialize streamingInterval here
        this.canAutoplay = false;

        // Debounce the audio playback
        this.debouncedPlayAudio = this.debounce((newAudio) => {
          if (this.audio) {
            this.audio.pause();
            this.audio = null;
          }

          setTimeout(() => {
            this.audio = newAudio;
            this.getStreamingData()
            this.play();
            this.isPlaying = true;
          }, 500);
        }, 1500);

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
        this.upsizeImgUrl = this.upsizeImgUrl.bind(this);
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
                this.handleStationSelect(event, event.target.value, true);
            }
        });

        // Add event listener for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            this.jumpToStationFromHash();
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

    // Debounce function
    debounce(func, wait) {
        return (...args) => {
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }
            this.debounceTimeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    jumpToStationFromHash() {
        const hash = window.location.hash;
        if (hash) {
            const stationName = hash.substring(1); // Remove the '#' character
            const label = document.getElementById(stationName);
            if (label) {
                label.scrollIntoView(); // Scroll to the label
                // Simulate selecting the station
                this.handleStationSelect(null, stationName, true);
            }
        }
    }

    handleStationSelect(direction, stationName, firstRun) {
        if (!stationName || direction === false) return;

        // Clear any existing streaming intervals
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }

        if (firstRun) {
            this.playButton.lastElementChild.className = "spinner-grow text-light";
            this.lfmMetaChanged = false; // Reset lfmMetaChanged when station is switched
            console.log(stationName);
            this.stationName = stationName;
            this.updateArt = true;
            this.getStreamingData();
            firstRun = false; // Set firstRun to false after first run logic
        }

        const debouncedSetupAudio = this.debounce(() => {
            const newAudio = new Audio(this.addCacheBuster(stations[stationName].streamUrl));

            newAudio.onloadedmetadata = () => {
                this.lfmMetaChanged = false; // Reset lfmMetaChanged when station is switched

                // Use the debounced function to handle audio playback
                this.debouncedPlayAudio(newAudio);

                // Set the streaming interval
                this.streamingInterval = setInterval(() => {
                    this.getStreamingData();
                }, 25000);
            };

            newAudio.onerror = (error) => {
                console.warn('Error loading audio:', error);
                if (direction === true) {
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

            // Update the URL hash
            window.location.hash = `#${stationName}`;
        }, 250); // Adjust the debounce delay as needed

        debouncedSetupAudio();
    }


    extractSongAndArtist(data, stationName) {
        const paths = ['song', 'artist', 'album', 'albumArt'];
        const replaceApostrophe = str => str?.replace(/&apos;/g, "'") || '';

        const getMetadata = (key) => replaceApostrophe(this.getPath(data, stations[stationName][key]));

        let song = getMetadata('song');
        let artist = getMetadata('artist');
        let album = getMetadata('album');
        let albumArt = getMetadata('albumArt');

        if (stations[stationName].altPath && !song) {
            song = getMetadata('song2');
            artist = getMetadata('artist2');
        }

        if (stations[stationName].orbPath) {
            const regexPattern = stations[stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data.title);

            if (match) {
                [artist, song, album] = match.slice(1, 4).map((str) => str?.trim());
                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            } 
        }

        if (stations[stationName].stringPath) {
            const regexPattern = stations[stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data);

            if (match) {
                song = match[1]?.trim() || '';
                artist = match[2]?.trim() || '';
                album = match[3]?.trim() || '';
                albumArt = match[4]?.trim() || urlCoverArt;

                if (stations[stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            }
        }

        // Helper function to check if a string contains any of the filtered values
        const containsFilteredValue = (text, values) => values.some(value => text.includes(value));

        // Check for filtered values, station name, or phone number and return null if any are present
        const filteredValues = stations[stationName].filter || [];
        const checkInvalidContent = (text) => {
            return containsFilteredValue(text, filteredValues) ||
                   text.includes(stationName) ||
                   /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.exec(text);
        };

        if (checkInvalidContent(song) || checkInvalidContent(artist) || (!song && !artist)) {
            return null;
        }

        // If the album is labeled as "single," set the album to the song title
        if (/single/i.exec(album)) {
            album = song;
        }


        // If albumArt is empty, assign the fallback URL
        albumArt = albumArt || urlCoverArt;

        console.log('albumArt after processed', albumArt);

        return [song, artist, album, albumArt];
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
                    lfmDataField = currentSong.replace(/\s*\(.*?version.*?\)/gi, '');
                }

                const lfmQueryUrl = `https://ws.audioscrobbler.com/2.0/?method=${lfmMethod}&artist=${encodeURIComponent(filter.filterField('artist', currentArtist))}&${lfmQueryField}=${encodeURIComponent(filter.filterField(lfmQueryField, lfmDataField))}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&autocorrect=1&format=json&limit=1`;

                fetch(lfmQueryUrl)
                    .then(response => response.json())
                    .then(lfmData => {
                        let lfmArt = '';
                        let lfmAlbum = '';
                        let lfmSong = '';
                        let lfmArtist = '';
                        let lfmListeners = null;
                        let lfmPlaycount = null;

                        if (lfmData.error !== 6) {
                            if (currentAlbum) {
                                lfmArt = lfmData.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.album?.name) || filter.filterField('album', currentAlbum) || '';
                                lfmSong = filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.album?.artist) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.album.listeners || null;
                                lfmPlaycount = lfmData.album.playcount || null;
                            } else {
                                lfmArt = lfmData.track?.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.track?.album?.title) || filter.filterField('album', currentAlbum) || '';
                                lfmSong = filter.filterField('track', lfmData.track?.name) || filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.track?.artist?.name) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.track.listeners || null;
                                lfmPlaycount = lfmData.track.playcount || null;
                            }
                        } else if (lfmMethod === 'album.getInfo') {
                            // Retry with track.getInfo if album.getInfo fails
                            this.getLfmMeta(currentSong, currentArtist, '').then(resolve).catch(reject);
                            return;
                        } else {
                            lfmArt = urlCoverArt;
                            lfmAlbum = filter.filterField('album', currentAlbum) || '';
                            lfmSong = filter.filterField('track', currentSong) || 'No streaming data currently available';
                            lfmArtist = filter.filterField('artist', currentArtist) || '';
                            lfmListeners = null;
                            lfmPlaycount = null;
                            console.log('got info from station api');
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
        if (this.isPlaying || this.isPlaying == null) {
            
            if (!this.stationName) return;

            if (this.isPlaying && !this.shouldReloadStream) {
                let stationUrl = this.addCacheBuster(stations[this.stationName].apiUrl);

                const fetchOptions = {
                    method: stations[this.stationName].method || 'GET',
                    headers: stations[this.stationName].headers || {},
                };

                fetch(stationUrl, fetchOptions)
                    .then((response) => {
                        const contentType = response.headers.get('content-type');
                        if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json' || stations[this.stationName].phpString )) {
                            return response.json().then((data) => ({ data, contentType }));
                        } else if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else {
                            throw new Error(`Unsupported content type: ${contentType}`);
                        }
                    })
                    .then(({ data, contentType }) => {
                            if (contentType.includes('text/html') && !stations[this.stationName].phpString) {
                                // Parse the HTML response
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(data, 'text/html');
                                data = this.extractDataFromHTML(doc);
                            } else if (contentType.includes('application/javascript')) {
                                // Extract the HTML content from the JavaScript response
                                const htmlContent = this.extractHTMLFromJS(data);
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
        const albumArt = doc.querySelector('img')?.src || '';

        console.log(`${song} - ${artist} - ${album} - ${albumArt}`);

        // Return the extracted data in the format expected by processData
        return `${song} - ${artist} - ${album} - ${albumArt}`;
    }

   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }

    processData(data) {
        // Check if data and stationName are available
        if (data && this.stationName) {
            const extractedData = this.extractSongAndArtist(data, this.stationName);

            // Ensure extractedData is valid and handle cases where no song or artist is found
            if (!extractedData || extractedData.length === 0) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData(['No streaming data to show', '', '', urlCoverArt, null, null, true]);
                return;
            }

            // Data has successfully loaded at least once
            this.hasLoadedData = true;

            const [song, artist, album, albumArt] = extractedData;

            let staleData = '';
            const currentTimeMillis = new Date().getTime();

            // Extract the timestamp from the data
            let epochTimeString = this.getPath(data, stations[this.stationName].timestamp) || this.getPath(data, stations[this.stationName].timestamp2) || "";
            // console.log("epochTimeString", epochTimeString);

            let epochTimeMillis;

            if (String(epochTimeString).includes('T')) {
                // Handle ISO 8601 format (e.g., 2024-08-09T19:32:02Z)
                epochTimeMillis = Date.parse(epochTimeString);
            } else if (String(epochTimeString).match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                // Handle custom format "YYYY-MM-DD HH:MM:SS"
                const [datePart, timePart] = epochTimeString.split(' ');
                const [year, month, day] = datePart.split('-');
                const [hour, minute, second] = timePart.split(':');
                
                epochTimeMillis = new Date(year, month - 1, day, hour, minute, second).getTime();
            } else {
                // Assume Unix epoch time
                epochTimeMillis = parseInt(epochTimeString) * 1000;
            }

            // Calculate the time difference
            const timeDifference = currentTimeMillis - epochTimeMillis;

            // Check if the data is stale (older than 15 minutes or 900000 milliseconds)
            if (timeDifference > 900000 && epochTimeString !== "") {
                staleData = 'Streaming data is stale';
            }

            // Check for stale data or no valid song data
            if (song === 'No streaming data currently available' || song === 'Station may be taking a break' || song === 'Station data is currently missing' || staleData) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData([staleData || song, '', '', urlCoverArt, null, null, true]);
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
                    if (lfmArt === urlCoverArt) {
                        this.artworkUrl = this.upsizeImgUrl(albumArt) || this.upsizeImgUrl(this.getPath(data, stations[this.stationName].albumArt)) || urlCoverArt;
                    } else {    
                        this.artworkUrl = this.upsizeImgUrl(lfmArt);
                    }
                    this.listeners = lfmListeners;
                    this.playcount = lfmPlaycount;
                    
                    this.lfmMetaChanged = true;
                    
                    const page = new Page(this.stationName, this);
                    page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, true]);
                }).catch(error => {
                    console.error('Error processing data:', error);
                });
            }
        }
    }



    upsizeImgUrl(url) {
        if (url) {
            return url.replace(/170x170|360x360|300x300/g, '500x500');
        } else {
            return;
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

        // Check if the stream should be reloaded based on page visibility
        if (this.shouldReloadStream) {
            console.log("the stream is reloading");
            this.handleStationSelect(null, this.stationName, true); // Reload the stream
            this.shouldReloadStream = false; // Reset the flag
        } else {
            // Attempt to play audio
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.playButton.lastElementChild.className = "icon-pause";
                document.getElementById("metadata").classList.add("playing");

                if (this.pauseTimeout) {
                    clearTimeout(this.pauseTimeout);
                    this.pauseTimeout = null;
                }

            }).catch((error) => {
                console.error('Error playing audio:', error);
            });

        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playButton.lastElementChild.className = "icon-play";
        document.getElementById("metadata").classList.remove("playing");

        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
        }

        // Set a timeout to mark stream reload after 30 seconds
        this.pauseTimeout = setTimeout(() => {
            console.log("the stream should be reloaded");
            this.shouldReloadStream = true;
        }, 30000);
    }


    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }

    skipToNextStation() {
        this.calculateNextAndPreviousIndices();
        const nextStationKey = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationKey, true);
    }

    skipBackward() {
        this.playButton.lastElementChild.className = "spinner-grow text-light";
        this.calculateNextAndPreviousIndices();
        const prevStationKey = stationKeys[this.previousIndex];
        this.handleStationSelect(true, prevStationKey, true);
    }

    skipForward() {
        this.playButton.lastElementChild.className = "spinner-grow text-light";
        this.calculateNextAndPreviousIndices();
        const nextStationKey = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationKey, true);
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

document.addEventListener('DOMContentLoaded', function() {
    // Your code that interacts with the DOM goes here
    const defaultStation = stationKeys[0];
    radioPlayer.handleStationSelect(false, defaultStation, true);

    const stationSelect = document.getElementById('stationSelect');
    if (stationSelect) {
        stationSelect.addEventListener('change', (event) => {
            const stationName = event.target.value;
            const direction = true; 
            radioPlayer.handleStationSelect(direction, stationName, true);
        });
    } else {
        console.error('Element with ID "station-select" not found.');
    }
});