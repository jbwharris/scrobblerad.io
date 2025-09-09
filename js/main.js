const urlCoverArt = "img/defaultArt.png";
let stationKeys = Object.keys(stations); // Change to let to allow modification
let currentTag = 'all'; // Global variable to track the currently selected tag

const main_scripts = window.main_scripts || {};

function generateRadioButtons(tag = "all") {
    currentTag = tag; // Update the global currentTag

    const stationSelectDiv = document.getElementById('stationSelect');
    stationSelectDiv.innerHTML = '';

    const fragment = document.createDocumentFragment();

    let filteredStationKeys;

    if (tag === "all") {
        filteredStationKeys = stationKeys.filter(stationKey => {
            const station = stations[stationKey];
            return !!station; // Include all valid stations
        });
    } else {
        filteredStationKeys = stationKeys.filter(stationKey => {
            const station = stations[stationKey];
            return !!station && station.tags && station.tags.includes(tag);
        });

        // Fallback to all stations if no stations match the tag
        if (filteredStationKeys.length === 0) {
            filteredStationKeys = stationKeys.filter(stationKey => !!stations[stationKey]);
        }
    }

    filteredStationKeys.forEach(stationKey => {
        const station = stations[stationKey];
        if (!station) return;

        const button = document.createElement('button');
        button.name = stationKey;
        button.textContent = station.stationName;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'station';
        input.value = stationKey;
        input.checked = stationKey === radioPlayer.stationName;

        const img = document.createElement('img');
        img.src = `img/stations/${stationKey}.png`;
        img.width = '45';
        img.height = '45';
        img.loading = 'lazy';

        button.appendChild(input);
        button.prepend(img);
        fragment.appendChild(button);
    });

    stationSelectDiv.appendChild(fragment);

    // Event delegation for station selection
    stationSelectDiv.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('button');
        if (clickedButton) {
            const stationKey = clickedButton.name;
            window.location.hash = `#${stationKey}`;
            radioPlayer.handleStationSelect(null, stationKey, true);
        }
    });

    // Offcanvas Panels Toggle
    document.getElementById("togglePanels").addEventListener("click", function () {
    const leftPanel = document.getElementById("panel1");
    const centrePanel = document.getElementById("panel2");
    const rightPanel = document.getElementById("panel3");
    const iconElement = document.querySelector("#togglePanels .icon-hide-panels, #togglePanels .icon-show-panels");

    // Toggle the panels
    leftPanel.classList.toggle("show");
    centrePanel.classList.toggle("grow");
    rightPanel.classList.toggle("show");

    // Check if we have an icon to toggle
    if (iconElement) {
      if (iconElement.classList.contains("icon-hide-panels")) {
        iconElement.classList.remove("icon-hide-panels");
        iconElement.classList.add("icon-show-panels");
      } else {
        iconElement.classList.remove("icon-show-panels");
        iconElement.classList.add("icon-hide-panels");
      }
    }
  });
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
        this.radioPlayer = radioPlayer;
        this.displayStationName = this.radioPlayer.currentStationData[this.stationName].stationName;
        this.scrobbleTimeout = null;
        this.currentTrack = null;

        this.cacheDOMElements();

        // Cache the template element
        this.template = document.querySelector('#meta');
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
            stationLocation: "stationLocation",
            metaInfo: "metainfo", 
        };

        for (const [key, id] of Object.entries(elementIds)) {
            this[key + 'Element'] = document.getElementById(id);
        }
    }

    formatCompactNumber(number) {
      if (number < 1000) {
        return number;
      } else if (number >= 1000 && number < 1_000_000) {
        return (number / 1000).toFixed(1).replace(/\.0$/, "") + "K";
      } else if (number >= 1_000_000 && number < 1_000_000_000) {
        return (number / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
      } else if (number >= 1_000_000_000 && number < 1_000_000_000_000) {
        return (number / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
      }
    }

    refreshCurrentData(values) {
        const [song, artist, album, artworkUrl, listeners, playcount, errorMessage] = values;

        // Clear any existing scrobble timeout when new data arrives
        if (this.scrobbleTimeout) {
            clearTimeout(this.scrobbleTimeout);
            this.scrobbleTimeout = null;
        }
        const station = this.radioPlayer.currentStationData[this.stationName];

        if ((!song && !artist) || !station) return;

        const metaElement = document.getElementById("playermeta");
        metaElement.classList.toggle("errorMessage", Boolean(errorMessage));

        const playerMetaElement = document.querySelector('div.playermeta');
        playerMetaElement.textContent = '';

        const template = document.querySelector('#meta');
        const clone = document.importNode(template.content, true);

        clone.querySelector('#title').innerHTML = song;
        clone.querySelector('#artist').textContent = artist;
        clone.querySelector('#album').textContent = album;

        const listenerText = (listeners !== null && playcount !== null)
            ? `Listeners: ${this.formatCompactNumber(listeners)} | Plays: ${this.formatCompactNumber(playcount)}`
            : '';
        clone.querySelector('#listeners').textContent = listenerText;

        const albumArtEl = clone.querySelector('#albumArt');

        // Validate and update artwork, then set this.artworkUrl
        this.radioPlayer.validateArtworkUrl(artworkUrl).then(isValid => {
            if (isValid) {
                const effectiveUrl = /^https?:\/\//i.test(artworkUrl) ? artworkUrl : `../${artworkUrl}`;
                this.artworkUrl = artworkUrl;
                albumArtEl.src = artworkUrl;
                albumArtEl.alt = `${song} by ${artist}`;
                document.documentElement.style.setProperty("--albumArt", `url("${effectiveUrl}")`);
            } else if (!this.artworkUrl) {
                this.artworkUrl = this.stationArt;
                albumArtEl.src = "";
                albumArtEl.alt = "";
                document.documentElement.style.setProperty("--albumArt", `url("${this.stationArt}")`);
            }
        });

        clone.querySelector('#radioNameLink').href = station.webUrl;
        clone.querySelector('#radioName').textContent = station.stationName;
        clone.querySelector('#stationLocation').textContent = station.location;

        playerMetaElement.appendChild(clone);
        document.getElementById("playermeta").classList.remove("opacity-50");

        animateElement(playerMetaElement);
        document.querySelector('#panel2').click();

        this.setupMediaSession(song, artist, artworkUrl, errorMessage);


    }

    setupMediaSession(song, artist, artworkUrl, errorMessage) {
        if (song.includes("<br/>")) {
            return;
        }

        let albumDisplay = '';
        if (errorMessage) {
            albumDisplay = '';
        } else if (artist === 'currently loading') {
            albumDisplay = '';
        } else if ((song && artist) && artist !== 'currently loading') {
            albumDisplay = `Now playing on ${this.displayStationName}`;
        }

        // Ensure stationArt always has a valid value
        let stationArt = `../img/stations/${this.stationName}.png`; // Default to stationArt
        if (artworkUrl && (artworkUrl !== urlCoverArt || artworkUrl !== stationArt ) ) {
            stationArt = artworkUrl;
        }

        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song,
                artist: artist || '',
                album: albumDisplay || '',
                duration: Infinity,
                startTime: 0,
                artwork: [{ src: stationArt }], // Ensure src is always valid
            });

            // Update document title
            if (!song && !artist || artist === 'currently loading') {
                document.title = '';
                return;
            } else if (song && artist || !errorMessage) {
                document.title = `${song} - ${artist} | ${this.displayStationName} on scrobblerad.io`;
            }

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
    constructor(buttonElement, skipForwardButton, skipBackButton, reloadStreamButton) {
        // Audio setup
        this.audio = new Audio();
        this.hls = null; // Store HLS instance
        this.isPlaying = null;
        this.shouldReloadStream = false;
        this.pauseTimeout = null;
        this.duration = null;

        // Station info
        this.stationName = "";
        this.currentStationData = null;
        this.previousDataResponse = null;
        this.prevExtractedData = null;
        this.stationArt = '';

        // Metadata handling
        this.songMetadataChanged = false;
        this.lastDataUpdateTime = null;
        this.lastKnownUpdatedTime = null;
        this.errorMessage = false;
        this.mytunerWidgetRemoved = false;

        // UI & Event Handling
        this.playButton = buttonElement;
        this.skipForwardButton = skipForwardButton;
        this.skipBackButton = skipBackButton;
        this.reloadStreamButton = reloadStreamButton;

        // Misc
        this.firstRun = true;
        this.debounceTimeout = null;
        this.streamingInterval = null;

        this.currentSong = null; // Current song title
        this.previousSong = null; // Previous song title
        this.songStartTime = null; // Timestamp when the current song started
        this.scrobbleTimeout = null; // Timeout ID for the 60-second timer       

        // Debounce the audio playback
        this.debouncedPlayAudio = this.debounce((newAudio) => {
          if (this.audio) {
            this.audio.pause();
            this.audio = null;
          }

          this.audio = newAudio;
          this.getStreamingData();
          this.play();
          this.isPlaying = true;
        }, 1500);


        this.bindMethods();
        this.addEventListeners();

        this.init();
    }

    setPage(page) {
        this.page = page;
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
        this.reloadStream = this.reloadStream.bind(this);
    }

    async addEventListeners() {
        this.playButton.addEventListener("click", this.togglePlay);
        this.skipForwardButton.addEventListener("click", this.skipForward);
        this.skipBackButton.addEventListener("click", this.skipBackward);
        this.reloadStreamButton.addEventListener("click", this.reloadStream);

        document.getElementById("stationSelect").addEventListener("click", (event) => {
            if (event.target && event.target.matches("input[name='station']")) {
                this.handleStationSelect(event, event.target.value, true);

                //Scroll the selected station into view
                event.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        // Run jumpToStationFromHash after buttons are generated
        this.jumpToStationFromHash();

        document.addEventListener('DOMContentLoaded', () => {
            this.jumpToStationFromHash();
        }, { once: true });
    }

    init() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("serviceWorker.js")
                .then((registration) => {
                    console.log("Service worker registered", registration);

                    // Optionally, check for updates to the service worker
                    if (registration.waiting) {
                        // If there's a waiting SW, prompt the user or refresh
                        console.log("Service worker is waiting to activate");
                    }

                    registration.onupdatefound = () => {
                        console.log("New service worker update found!");
                        const newWorker = registration.installing;

                        newWorker.onstatechange = () => {
                            if (newWorker.state === "installed") {
                                if (navigator.serviceWorker.controller) {
                                    // A new service worker is available, notify the user
                                    console.log("New service worker installed, but waiting to activate");
                                } else {
                                    // The service worker is installed for the first time
                                    console.log("Service worker installed for the first time");
                                }
                            }
                        };
                    }
                })
                .catch((err) => console.log("Service worker not registered", err));
        }
    }

     calculateNextAndPreviousIndices(direction) {
        let filteredStationKeys;

        if (currentTag === "all") {
            filteredStationKeys = stationKeys.filter(stationKey => !!stations[stationKey]);
        } else {
            filteredStationKeys = stationKeys.filter(stationKey => {
                const station = stations[stationKey];
                return !!station && station.tags && station.tags.includes(currentTag);
            });

            // Fallback to all stations if no stations match the tag
            if (filteredStationKeys.length === 0) {
                filteredStationKeys = stationKeys.filter(stationKey => !!stations[stationKey]);
            }
        }

        const currentIndex = filteredStationKeys.indexOf(this.stationName);
        if (currentIndex === -1) {
            console.error(`Current station "${this.stationName}" not found in filtered list.`);
            return;
        }

        if (direction === 'next') {
            this.nextIndex = (currentIndex + 1) % filteredStationKeys.length;
            this.nextStationName = filteredStationKeys[this.nextIndex];
        } else if (direction === 'previous') {
            this.previousIndex = (currentIndex - 1 + filteredStationKeys.length) % filteredStationKeys.length;
            this.previousStationName = filteredStationKeys[this.previousIndex];
        }
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
            const button = document.querySelector(`button[name='${stationName}']`);

            if (button) {
                button.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to the button
                this.handleStationSelect(null, stationName, true); // Simulate selecting the station
            }
        }
    }

    async loadStationData(url) {
        try {
            const response = await fetch(url);
            const scriptContent = await response.text();
            const script = new Function(scriptContent + "; return stationData;");
            return script();
        } catch (err) {
            console.error('Error loading station data:', err);
        }
    }

    // Method to destroy HLS instance and reset audio
    destroyHLSAndResetAudio() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.audio) {
            this.audio.removeAttribute('src');
            this.audio.load();
        }
    }

    async handleStationSelect(direction, stationName, firstRun) {
        if (!stationName || direction === false) return;

        // Clear existing scrobble timeout
        if (this.page && this.page.scrobbleTimeout) {
            clearTimeout(this.page.scrobbleTimeout);
            console.log("Scrobble timeout cleared due to station switch.");
            this.page.scrobbleTimeout = null;
        }

        if (this.shouldReloadStream) {
            console.log('getting here on reload?');
            document.getElementById("playermeta").classList.remove("opacity-50");
            this.audio.load();
            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }
            this.shouldReloadStream = false;
            return;
        }



        document.getElementById("playermeta").classList.add("opacity-50");

        const stationData = await this.loadStationData(`/js/stations/${stationName}.js`);
        if (!stationData) return;

        this.currentStationData = stationData;
        const page = new Page(stationName, this);

        // Clear any existing streaming intervals
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }

        if (firstRun && !this.shouldReloadStream) {
            this.stationName = stationName;
            this.stationArt = `../img/stations/${this.stationName}.png`;
            document.documentElement.style.setProperty("--albumArt", `url("../${this.stationArt}")`);
            document.documentElement.style.setProperty("--stationArt", `url("../${this.stationArt}")`);
            page.setupMediaSession(this.currentStationData[stationName].stationName, 'currently loading', this.stationArt, false);
            page.refreshCurrentData([`Station data loading`, '', '', this.stationArt, null, null, true]);
            this.playButton.lastElementChild.className = "spinner-grow text-light";
            this.lfmMetaChanged = false;
            console.log(stationName);
            this.updateArt = true;
            this.isPlaying = true;
            this.songMetadataChanged = false;
            this.lastKnownUpdatedTime = null;
            firstRun = false;
        }

        const debouncedSetupAudio = this.debounce(() => {
            if (!this.isPlaying) return;

            if (!this.currentStationData[this.stationName]) {
                console.error("currentStationData is undefined or null");
                return;
            }

            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }

            const newAudio = new Audio(); // Create new Audio element
            newAudio.crossOrigin = 'anonymous';

            const streamUrl = this.currentStationData[this.stationName].streamUrl;
            // const streamUrl = `https://scrobblerad.io/proxy.php?url=${this.currentStationData[this.stationName].streamUrl}`;
            const isHlsStream = streamUrl.endsWith('.m3u8');

            if (isHlsStream) {
                this.hlsStreamLoad(streamUrl, newAudio); // No need to assign return value
            } else {
                if (this.currentStationData[this.stationName].proxyStream) {
                        newAudio.src = this.addCacheBuster(`https://scrobblerad.io/proxy.php?url=${this.currentStationData[this.stationName].streamUrl}`);
                } else {
                    newAudio.src = this.addCacheBuster(streamUrl);
                }

                newAudio.load();
            }

            // If the stream is marked as quiet, boost it
            if (this.currentStationData[this.stationName].quietStream) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaElementSource(newAudio);
                const gainNode = audioContext.createGain();

                gainNode.gain.value = this.currentStationData[this.stationName].gainBoost || 2;

                console.log('station audio boosted');

                source.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Resume context if needed
                if (audioContext.state === 'suspended') {
                    const resumeContext = () => {
                        audioContext.resume();
                        window.removeEventListener('click', resumeContext);
                    };
                    window.addEventListener('click', resumeContext);
                }

                // IMPORTANT: Save the context + node if needed later
                this.audioContext = audioContext;
                this.audioGainNode = gainNode;
            }



            newAudio.onloadedmetadata = () => {
                this.lfmMetaChanged = false;
                this.debouncedPlayAudio(newAudio);

                this.streamingInterval = setInterval(() => {
                    this.getStreamingData();
                }, 25000);
            };

            newAudio.onerror = (error) => {
                console.warn('Error loading audio:', error);
                if (this.isPlaying) {
                    direction === true ? this.skipBackward() : this.skipForward();
                }
            };

            newAudio.load();

            const radioInput = document.querySelector(`input[name='station'][value='${stationName}']`);
            if (radioInput) radioInput.checked = true;

            window.location.hash = `#${stationName}`;
        }, 250);

        debouncedSetupAudio();
    }

     hlsStreamLoad(streamUrl, audioElement) {
        // Check for native HLS support (Safari)
        if (audioElement.canPlayType('application/vnd.apple.mpegurl')) {
            audioElement.src = streamUrl;
            audioElement.play().catch(error => {
                console.error('Failed to play HLS natively:', error);
            });
        } else if (Hls.isSupported()) { // Fallback to HLS.js for other browsers
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(audioElement);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                audioElement.play().catch(error => {
                    console.error('Failed to play HLS via HLS.js:', error);
                });
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Fatal network error encountered, try to recover');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Fatal media error encountered, try to recover');
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            console.error('Unrecoverable error, destroy HLS instance');
                            break;
                    }
                }
            });
            this.hls = hls; // Store HLS instance in the class
        } else {
            console.error('HLS is not supported in this browser and cannot be played.');
        }
    }

    cleanupArtist(artist) {
        // Define patterns to find additional artists or features.
        const patterns = [/ x .*/, / feat\..*/];

        let cleanedArtist = artist;

        patterns.forEach((pattern) => {
            cleanedArtist = cleanedArtist.replace(pattern, '');
        });

        // New check for artist format "Last, First" or "Band, The"
        if (cleanedArtist.includes(', ')) {
            const parts = cleanedArtist.split(', ').map(part => part.trim());
            if (parts.length === 2) {
                cleanedArtist = `${parts[1]} ${parts[0]}`; // Rearrange "Last, First" to "First Last"
            } else if (parts.length > 2) {
                cleanedArtist = `${parts.slice(-1)[0]} ${parts.slice(0, -1).join(' ')}`; // Handle "Band, The" to "The Band"
            }
        }

        return cleanedArtist.trim();
    }

    getFilterSet() {
        return {
            artist: [MetadataFilter.normalizeFeature],
            track: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion, MetadataFilter.youtube],
            album: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
        };
    }

    applyFilters(filterField, value) {
        const validFields = ['track', 'artist', 'album'];
        
        // Check if filterField is valid
        if (!validFields.includes(filterField)) {
            console.error(`Invalid filter field: ${filterField}`);
            return value;  // Return the original value if invalid field
        }

        // Proceed with applying the filter (your existing logic here)
        return value; // Assuming you have filtering logic here
    }

    getDataAtPath(path, data) {
        const pathParts = path.split('.');
        let currentData = data;

        for (let part of pathParts) {
            if (currentData && currentData.hasOwnProperty(part)) {
                currentData = currentData[part];
            } else {
                return undefined;  // Return undefined if path doesn't exist
            }
        }

        return currentData;
    }

    getLastJsonPath(path, data) {
        if (typeof path !== "string" || !path) {
            console.error("Invalid path passed to getLastJsonPath:", path);
            return path; // Return the input unchanged if it's invalid
        }

        const pathParts = path.split('.');

        // Check if path points to an array (e.g., 'tracks.0.artist')
        for (let i = 0; i < pathParts.length; i++) {
            if (/^\d+$/.test(pathParts[i])) {  // If part is a number (i.e., array index)
                const arrayName = pathParts.slice(0, i).join('.');
                const array = this.getDataAtPath(arrayName, data);  // Use getDataAtPath to access the data

                if (Array.isArray(array)) {
                    // Replace the index with 'last'
                    pathParts[i] = (array.length - 1).toString(); // Get last index
                }
                break; // Stop once we replace the index
            }
        }

        return pathParts.join('.');
    }

    extractSongAndArtist(data, stationName) {
        const replaceSpecialCharacters = str => str
            ?.replace(/&apos;|&#039;|’|‘|‚|‛|`|´/g, "'")     // Apostrophe variants
            .replace(/–|—/g, "-")                    // En and em dashes
            .replace(/[“”„]/g, '"')                  // Curly quotes
            .replace(/…/g, "...")                    // Ellipsis
            .replace(/\u00A0/g, " ")                 // Non-breaking spaces
            .replace(/[\t\n\r]/g, '')                // Control characters
            .replace(/&amp;/g, '&')                  // HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s*\[.*?\]/g, '')              // Strips text in square brackets
            .replace(/[*/|\\]/g, '')                 // Asterisks, pipes, and slashes
            .replace(/--/g, '-')                     // Double hyphens
            .replace(/\s*\(Current Track\)\s*/gi, '') // Removes "(Current Track) " from full string
            .replace(/\b(tUnE yArDs|tune-yards|tuneyards)\b/gi, 'tUnE-yArDs') // the band tUnE-yArDs often gets messed up 
            .replace(/\b(Lets|Its|Ive|Dont|Cant|Wont|Aint)\b/gi, (match) => { // common contractions that can sometimes be input incorrectly
                    const replacements = {
                        Lets: "Let's",
                        Its: "It's",
                        Ive: "I've",
                        Dont: "Don't",
                        Cant: "Can't",
                        Wont: "Won't",
                        Aint: "Ain't",
                        Youve: "You've"
                    };
                    return replacements[match] || match;
                })
                .replace(/\b(Somethin|Nothin)\b/gi, (match) => {
                    const replacements = {
                        Somethin: "Somethin'",
                        Nothin: "Nothin'"
                    };
                    return replacements[match] || match;
                })
            .trim() || '';                           // Fallback if string is empty

        const filterSongDetails = song => {
            if (!song) return ''; // Return an empty string if song is undefined
            return song
                .replace(/\s*\(.*?version.*?\)/gi, '') // Removes text in brackets containing "version"
                .replace(/\s-\s.*version.*$/i, '')    // Removes " - Radio Version" or similar
                .replace(/\s-\s.*mix.*$/i, '')    // Removes " - Something Mix" or similar
                .replace(/\s*-\s*\([^\)]*\)/g, '') // Removes " - (Anything in brackets)"
                .replace(/\s*\(.*?edit.*?\)/gi, '')   // Removes text in brackets containing "edit"
                .replace(/\s*\(.*?Feat\..*?\)|\s+Feat\..*?/gi, '')   // Removes text in brackets containing "Feat." or "Song Feat. Other Artist"
                .replace(/\s*\(.*?clean.*?\)/gi, '')   // Removes text in brackets containing "edit"
                .replace(/\s-\s.*edit.*$/i, '')       // Removes " - Radio Edit" or similar
                .replace(/[\(\[]\d{4}\s*Mix[\)\]]/gi, '') // Removes text in parentheses or square brackets containing "Mix"
                .replace(/\s*\(\d{4}\s*-\s*Remaster(ed)?\)/gi, '') // Removes "(1992 - Remaster)" or "(1992 - Remastered)"
                .replace(/\s*\([\d]{4}\s*Remaster(ed)?\)/gi, '') // Removes "(2022 Remaster)" or "(2022 Remastered)"
                .replace(/\s*-\s*[\d]{4}\s*Remaster(ed)?/gi, '') // Removes "- 2022 Remaster" or "- 2022 Remastered"
                .replace(/\s*-\s*Remaster(ed)?/gi, '') // Removes "- Remaster" or "- Remastered" (CASE-INSENSITIVE)
                .replace(/([\)\]])\s*\d{4}.*/, '') // Removes anything after a closing bracket if followed by a year (e.g., "1972")
                .replace(/\s*[\(\[].*?\b\d{4}\b.*?[\)\]]\s*/g, '') // Removes a year within a brackets (6 Music Session, March 31 2025)
                .replace(/\s*\(.*?\bofficial\b.*?\)/gi, '') // Removes "(Official)" or variations like "(original & official)"
                .replace(/\s*\(.*?\bsingle\b.*?\)/gi, '') // Removes "(single)"
                .replace(/\s*\(.*?\bsession\b.*?\)/gi, '') // Removes "(909 Session)"
                .replace(/\s*\(.*?\bcover\b.*?\)/gi, '') // Removes "(_____ cover)"
                .replace(/\s-\s.*single.*$/i, '')    // Removes " - Single" or similar
                .trim();
        };

        const getMetadata = (key) => this.getPath(data, this.currentStationData[this.stationName][key]);
        const regexPattern = this.currentStationData[this.stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
        const match = regexPattern.exec(data);

        let song = filterSongDetails(getMetadata('song'));
        let artist = this.applyFilters('artist', getMetadata('artist'));
        let album = this.applyFilters('album', getMetadata('album'));
        let albumArt = getMetadata('albumArt');
        let spinUpdated = '';
        let dataPath = data.title;

        // CFMU inputs its latest songs at the end of the tracks object, so it needs to figure out what the last item in the array is, then output that
        if (this.currentStationData[stationName].reverseArray) {
            song = filterSongDetails(this.getPath(data, this.getLastJsonPath(this.currentStationData[stationName].song, data)));
            artist = this.applyFilters('artist', this.getPath(data, this.getLastJsonPath(this.currentStationData[stationName].artist, data)));
            album = this.applyFilters('album', this.getPath(data, this.getLastJsonPath(this.currentStationData[stationName].album, data)));

            console.log('song, artist and album reverse array', song, artist, album)
        }

        // some APIs have instances where there's a second place you should look for info if the first item is empty
        if (this.currentStationData[this.stationName].altPath && !song) {
            song = filterSongDetails(getMetadata('song2'));
            artist = this.applyFilters('artist', getMetadata('artist2'));
            album = this.applyFilters('album', getMetadata('album2'));
            albumArt = getMetadata('albumArt2');
        }

        if (this.currentStationData[this.stationName].spinPath) {
            song = filterSongDetails(data.song) || '';
            artist = this.applyFilters('artist', data.artist) || '';
            album = this.applyFilters('album', data.album) || '';
            albumArt = data.albumArt || '';
            spinUpdated = data.spinUpdated || '';

           // console.log('albumArt from spinPath', albumArt);
        }

        if (this.currentStationData[this.stationName].htmlString) {
            song = filterSongDetails(data.song) || '';
            artist = this.applyFilters('artist', data.artist) || '';
            album = this.applyFilters('album', data.album) || '';
            albumArt = data.albumArt || '';
            spinUpdated = data.spinUpdated || '';
        }

        if (this.currentStationData[this.stationName].orbPath || this.currentStationData[this.stationName].dataPath) {
            //radio.co apis that have a string "song - artist" piggybacking on the orbPath function
            if (this.currentStationData[this.stationName].dataPath == true) {
                dataPath = data.data.title;
            } else if (this.currentStationData[this.stationName].dataPath) {
                dataPath = data[this.currentStationData[this.stationName].dataPath];
            }
 
            const match = regexPattern.exec(dataPath);

            if (match) {
                [artist, song, album] = match.slice(1, 4).map((str) => str?.trim());

                song = filterSongDetails(song);
                artist = this.applyFilters('artist', artist);
                album = this.applyFilters('album', album);

                if (this.currentStationData[this.stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found', match);
            }
        }

        if (this.currentStationData[this.stationName].stringPath) {

            if (match) {
                song = filterSongDetails(match[1]?.trim()) || '';
                artist = this.applyFilters('artist', match[2]?.trim()) || '';

                if (this.stationName !== 'cbcmusic') {
                    album = this.applyFilters('album', match[3]?.trim()) || '';
                    albumArt = match[4]?.trim() || urlCoverArt;
                    spinUpdated = match[5]?.trim() || '';
                    spinUpdated = Number(spinUpdated);
                } else {
                    spinUpdated = match[3]?.trim() || '';
                }

                if (this.currentStationData[this.stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            }
        }

        // Cleanup the artist name
        if (artist) {
            artist = this.cleanupArtist(artist);
        }

        // Helper function to check if a string contains any of the filtered values (case-insensitive)
        const containsFilteredValue = (text, values) => {
            if (!text) return false; // Ensure text is defined and not null/undefined
            const lowerCaseText = text.toLowerCase();
            return values.some(value => lowerCaseText.includes(value.toLowerCase()));
        };

        // Check for filtered values or station name and return true if any are present (case-insensitive)
        const checkInvalidContent = (text) => {
            const filteredValues = this.currentStationData[this.stationName].filter || [];
            const stationNameValue = this.currentStationData[this.stationName].stationName;

            // Return true if the text contains filtered values or station name
            return containsFilteredValue(text, filteredValues) || containsFilteredValue(text, [stationNameValue]);
        };

        // Check the song and artist values for invalid content
        if (checkInvalidContent(song) || checkInvalidContent(artist)) {
            // Returning the message indicating the station may be taking a break
            return;
        } else if ((!song && !artist) || (song && !artist)) {
            // Returning the message indicating missing data
            return ['Station data is currently missing', null, null, this.stationArt, '', '', true];
        }


        // Apply replaceSpecialCharacters before returning
        song = replaceSpecialCharacters(song);
        artist = replaceSpecialCharacters(artist);
        album = replaceSpecialCharacters(album);

        // If the album is labeled as "single," set the album to the song title
        if (/single/i.exec(album) || (album.toLowerCase().includes('single'))) {
            return [song, artist, song, albumArt, spinUpdated, '', false];
        }

        // If albumArt is empty, assign the fallback URL
        albumArt = albumArt || urlCoverArt;

        return [song, artist, album, albumArt, spinUpdated, '', false];
    }

    async getLfmMeta(currentSong, currentArtist, currentAlbum, currentArt, queryType) {
        try {
            if (!currentSong || !currentArtist) return null;

            // Fetch data from both sources
            const metadata = await this.fetchLfmOrMusicBrainzData(currentSong, currentArtist, currentAlbum, currentArt, queryType);
            return metadata;

        } catch (error) {
            console.error("Error fetching Last.fm metadata:", error);
            return null;
        }
    }

    async fetchLfmOrMusicBrainzData(currentSong, currentArtist, currentAlbum, currentArt, queryType) {
        // Construct query parameters for both LFM and MB
        const queryParams = this.constructQueryParams(currentSong, currentArtist, currentAlbum, queryType);

        // Check if queryParams are valid (array with two URLs)
        if (!queryParams || queryParams.length !== 2 || !queryParams[0] || !queryParams[1]) {
            console.error("🚨 ERROR: constructQueryParams returned an invalid response.", queryParams);
            return null;
        }

        const [lfmQueryUrl, mbQueryUrl] = queryParams; // Get both LFM and MB URLs

        try {
            // Run both queries in parallel
            const [lfmResponse, mbResponse] = await Promise.all([
                fetch(lfmQueryUrl),  // Last.fm query
                fetch(mbQueryUrl),   // MusicBrainz query
            ]);

            // Check for successful responses
            if (!lfmResponse.ok || !mbResponse.ok) {
                console.error(`API request failed. LFM: ${lfmResponse.status}, MB: ${mbResponse.status}`);
                return null;
            }

            // Parse responses
            const lfmData = await lfmResponse.json();
            const mbData = await mbResponse.json();

            // Process the LFM and MB data
            let lfmResult = null;
            let mbResult = null;

              // Handle LFM data
            if (lfmData.error !== 6 && (queryType === 'track' || !queryType)) {
                lfmResult = [
                    lfmData.track.album?.image?.[3]?.['#text'] || '',
                    lfmData.track.album?.title || currentAlbum || currentSong,
                    lfmData.track.name || currentSong,
                    lfmData.track.artist?.name || currentArtist,
                    lfmData.track.listeners || null,
                    lfmData.track.playcount || null,
                    lfmData.track.album?.artist || '',
                    lfmData.track?.duration || null
                ];
            } else if (lfmData.error !== 6  && (queryType == 'album')) {
                lfmResult = [
                    lfmData.album?.image[3]["#text"] || urlCoverArt,
                    this.applyFilters('album', lfmData.album?.name) || currentAlbum || currentSong,
                    currentSong || 'No streaming data available',
                    this.applyFilters('artist', lfmData.album?.artist) || currentArtist,
                    lfmData.album?.listeners || null,
                    lfmData.album?.playcount || null
                ];
            }
            const isLfmArtMissing = Array.isArray(lfmResult) ? !lfmResult[0] : true;
            const lfmListeners = Array.isArray(lfmResult) ? lfmResult[4] || null : null;
            const lfmPlaycount = Array.isArray(lfmResult) ? lfmResult[5] || null : null;

            if (mbData.releases?.length && (lfmData.error === 6 || isLfmArtMissing || lfmResult?.[7] == 'Various Artists')) {
                mbResult = [
                        `https://coverartarchive.org/release/${mbData.releases[0]?.id}/front-500`,
                        this.applyFilters('album', mbData.releases[0]['release-group']?.title) || currentAlbum,
                        this.applyFilters('track', mbData.releases[0]?.title) || currentSong,
                        mbData.releases[0]['artist-credit'][0]?.name || currentArtist
                ];


                console.log('this.jaccardSimilarity(mbResult[3], currentArtist)', this.jaccardSimilarity(mbResult[3], currentArtist), mbResult[3], currentArtist);

                if ((mbResult[3] != currentArtist ) || (mbResult[2] != currentSong)) {

                    // check if the result is close enough, but not the same as the existing result. Sometimes MB will find a completely new artist or song, which isn't what we want
                    if ((s => s >= 0.6 && s !== 1)(this.jaccardSimilarity(mbResult[3], currentArtist))) {
                        console.log('this.jaccardSimilarity(mbResult[3], currentArtist)', this.jaccardSimilarity(mbResult[3], currentArtist), mbResult[3], currentArtist);
                        this.songMetadataChanged = true;  // Flag the change
                        //if the result is similar enough to the currentArtist, rerun the function
                        return this.getLfmMeta(mbResult[2], mbResult[3], mbResult[1], mbResult[0], 'song');
                    }
                }

                if ((mbResult[0] !== '' && this.jaccardSimilarity(mbResult[3], currentArtist) >= .9) && (!currentArt || isLfmArtMissing)) {

                    if ((s => s >= 0.9)(this.jaccardSimilarity(mbResult[2], currentSong))) {
                        // return album art, album, song, artist, lfm listeners & playcount
                        return [mbResult[0], mbResult[1], mbResult[2], mbResult[3], lfmListeners, lfmPlaycount];
                    } else {
                        // return album art, album, song, artist, lfm listeners & playcount
                        return [mbResult[0], mbResult[1], currentSong, currentArtist, lfmListeners, lfmPlaycount];
                    }
                }
            }

            let finalAlbumArt = currentArt && !currentArt.includes('mzstatic.com') && !currentArt.includes('blankart.jpg') && currentArt !== urlCoverArt
                  ? currentArt
                  : (lfmResult?.[0] || mbResult?.[0] || urlCoverArt);

            //filter the random default MB has started providing
            if (finalAlbumArt.includes('623304f1') || finalAlbumArt.includes('b4df49b51c57')) {
                finalAlbumArt = urlCoverArt;
            }

            if (lfmData.error !== 6 ) {
                // return album art, album, song, artist, lfm listeners & playcount
                if (lfmResult[7] && !this.duration) {
                    this.duration = Number(lfmResult[7]);
                    console.log('this.duration', this.duration)
                } 
                return [this.upsizeImgUrl(finalAlbumArt), lfmResult[1] || currentAlbum || '', lfmResult[2] || currentSong, lfmResult[3] || currentArtist, lfmResult[4] || null, lfmResult[5] || null];
            } else {
                // return album art, album, song, artist, lfm listeners & playcount
                return [this.upsizeImgUrl(finalAlbumArt), currentAlbum || '', currentSong, currentArtist, null, null];
            }
            

        } catch (error) {
            console.error("Error fetching data from LFM or MB:", error);
            return null;
        }
    }


    // Construct query URLs for both LFM and MB
    constructQueryParams(currentSong, currentArtist, currentAlbum, queryType) {
        let lfmMethod = '';
        let lfmQueryField = '';
        let queryDataField = '';
        let lfmQueryUrl;
        let mbQueryUrl;

        // Determine query parameters for LFM
        if ((queryType === 'song') || (queryType === false)) {
            lfmMethod = 'track.getInfo';
            lfmQueryField = 'track';
            queryDataField = currentSong;
        } else {
            lfmMethod = 'track.getInfo';
            lfmQueryField = 'track';
            queryDataField = currentSong;
        }

        // Construct the LFM query URL
        lfmQueryUrl = `https://ws.audioscrobbler.com/2.0/?method=${lfmMethod}&artist=${encodeURIComponent(this.applyFilters('artist', currentArtist))}&${lfmQueryField}=${encodeURIComponent(this.applyFilters(lfmQueryField, queryDataField))}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&autocorrect=1&format=json&limit=1`;

        // Construct the MusicBrainz query URL
        mbQueryUrl = `https://musicbrainz.org/ws/2/release?fmt=json&query=title:+"${encodeURIComponent(this.applyFilters('track', currentSong))}"^3%20${encodeURIComponent(currentSong)}%20artistname:+"${encodeURIComponent(this.applyFilters('artist', currentArtist))}"^4${encodeURIComponent(this.applyFilters('artist', currentArtist))}%20artistname:+"-Various Artists"^4-various artists%20format:+"cd"^4cd&limit=3`;

        return [lfmQueryUrl, mbQueryUrl];
    }

    jaccardSimilarity(str1, str2) {
        const set1 = new Set(str1.toLowerCase().split(" "));
        const set2 = new Set(str2.toLowerCase().split(" "));
        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    validateArtworkUrl(artworkUrl) {
        const isAbsoluteUrl = (url) => {
            return /^https?:\/\//i.test(url); // Checks if the URL starts with http:// or https://
        };

        const effectiveUrl = isAbsoluteUrl(artworkUrl) ? artworkUrl : `../${artworkUrl}`;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = effectiveUrl;

            img.onload = () => {
                resolve(effectiveUrl); // Resolve with the effective URL
            };

            img.onerror = () => {
                resolve(null); // Resolve with null if the image fails to load
            };
        });
    }

    checkUrlValidity(url) {
        return fetch(url, { method: 'HEAD' })
            .then(response => response.ok)
            .catch(() => false);
    }

    async appendMytunerWidget() {
        try {
            const response = await fetch('mytuner.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const htmlContent = await response.text();
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = htmlContent;

            const widgetDiv = tempContainer.querySelector('.mytuner-widget');
            if (!widgetDiv) {
                throw new Error('Widget div not found in mytuner.html');
            }

            const targetElement = document.getElementById('mytuner-container');
            if (targetElement) {
                targetElement.appendChild(widgetDiv);
            } else {
                console.error('Target element not found!');
            }

            // Execute scripts in the widget
            this.executeScriptsInElement(widgetDiv);

        } catch (error) {
            console.error('Error appending mytuner.html:', error);
        }
    }

    removeMytunerWidget() {
        if (this.mytunerWidgetRemoved) return; // Exit if already removed

        // 1. Remove the widget and its container
        const widgetContainerSelectors = ['.mytuner-widget'];

        widgetContainerSelectors.forEach(selector => {
            const container = document.querySelector(selector);
            if (container) {
                container.remove();
            }
        });

        // 2. Remove MyTuner scripts from the head
        const scriptUrlsToRemove = [
            '/js/widgets/player-v1.js'
        ];

        const removeScripts = () => {
            scriptUrlsToRemove.forEach(url => {
                const scripts = document.querySelectorAll(`script[src="${url}"]`);
                scripts.forEach(script => script.remove());
            });
        };

        removeScripts();

        // 3. Block MyTuner API requests
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (url.includes('metadata-api.mytuner.mobi')) {
                console.log('Blocked MyTuner API request:', url);
                return;
            }
            return originalOpen.apply(this, arguments);
        };

        const originalFetch = window.fetch;
        window.fetch = function(resource, options) {
            let url = '';
            if (typeof resource === 'string') {
                url = resource;
            } else if (resource && typeof resource === 'object' && resource.url) {
                url = resource.url;
            }

            if (url && url.includes('metadata-api.mytuner.mobi')) {
                console.log('Blocked MyTuner API fetch request:', url);
                return Promise.reject(new Error('Blocked MyTuner API request'));
            }
            return originalFetch.apply(this, arguments);
        };


        // 4. Observe the DOM for new scripts or elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    removeScripts();
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'SCRIPT' && node.src.includes('mytuner')) {
                            node.remove();
                        }
                    });
                }
            });
        });

        observer.observe(document.head, { childList: true, subtree: true });
        observer.observe(document.body, { childList: true, subtree: true });

        // 5. Remove inline scripts
        const removeInlineScripts = () => {
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.textContent.includes('mytuner')) {
                    script.remove();
                }
            });
        };

        removeInlineScripts();

        this.mytunerWidgetRemoved = true; // Mark as removed
    }

    executeScriptsInElement(element) {
        const scripts = element.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
                newScript.async = false;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript);
        });
    }


    getStreamingData() {
        if (this.isPlaying || this.isPlaying == null) {

            if (!this.stationName) return;

            // check if the last time it updated is still in the future
            if (((this.lastKnownUpdatedTime - Date.now()) < 35000) && ((this.lastKnownUpdatedTime - Date.now()) > 70000) && !this.shouldReloadStream) {
                // check again, since that's a long time to go in a song
                console.log('this.lastKnownUpdatedTime is a bit too far in the future, checking again', (this.lastKnownUpdatedTime - Date.now()) / 1000);
            } else if (((this.lastKnownUpdatedTime - Date.now()) > 20000) && !this.shouldReloadStream) {
                console.log('this.lastKnownUpdatedTime > Date.now', (this.lastKnownUpdatedTime - Date.now()) / 1000);
                return;
            }

            if (this.stationName === 'cbcmusic') {
                if (!document.querySelector('.mytuner-widget')) {
                        this.appendMytunerWidget();
                    }
            } else {
                // Remove the widget and scripts for non-cbcmusic stations
                this.removeMytunerWidget();
            }

            if (this.isPlaying && !this.shouldReloadStream) {

                let stationUrl;

                if (this.currentStationData[this.stationName].spinPath) {
                    stationUrl = `https://widgets.spinitron.com/widget/now-playing-v2?callback=_spinitron206170750999458&station=${this.currentStationData[this.stationName].spinPath}&num=0&sharing=0&player=0&cover=0&merch=0&meta=0`;
                } else if (this.currentStationData[this.stationName].orbPath && !this.currentStationData[this.stationName].dataPath) {
                    stationUrl = `https://scraper2.onlineradiobox.com/${this.currentStationData[this.stationName].orbPath}?l=0`;
                } else {
                    if (this.currentStationData[this.stationName].proxyApi) {
                        stationUrl = `https://scrobblerad.io/proxy.php?url=${this.currentStationData[this.stationName].apiUrl}`;
                    } else {
                        stationUrl = this.currentStationData[this.stationName].apiUrl;
                    }
                }

                stationUrl = this.addCacheBuster(stationUrl);

                const fetchOptions = {
                    method: this.currentStationData[this.stationName].method || 'GET',
                    headers: this.currentStationData[this.stationName].headers || {},
                };

                fetch(stationUrl, fetchOptions)
                    .then((response) => {
                        const contentType = response.headers.get('content-type');
                        
                        // Check if contentType exists before calling includes
                        if (contentType && (contentType.includes('application/json') || 
                            contentType.includes('application/vnd.api+json') || 
                            (this.currentStationData[this.stationName].phpString && !this.currentStationData[this.stationName].htmlString))) {
                            
                            return response.json().then((data) => ({ data, contentType }));
                            
                        } else if (contentType && (contentType.includes('text/html') || 
                            (this.currentStationData[this.stationName].jsonString) && contentType.includes('text/plain') ||  
                            contentType.includes('application/javascript'))) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else {
                            return;
                            //throw new Error(`Unsupported content type or missing content-type header: ${contentType}`);
                        }
                    })
                    .then(({ data, contentType }) => {
                        if (contentType && contentType.includes('text/html') && 
                            !this.currentStationData[this.stationName].phpString && this.stationName !== 'cbcmusic') {
                            
                            // Parse the HTML response
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(data, 'text/html');
                            data = this.extractDataFromHTML(doc);  
                        } else if (contentType && contentType.includes('text/html') && this.stationName == 'cbcmusic') {

                            if (window.mytuner_scripts.mytunerMeta) {
                                console.log('window.mytuner_scripts.mytunerMeta', window.mytuner_scripts.mytunerMeta)
                                data = window.mytuner_scripts.mytunerMeta;
                            }
                        } else if (contentType && contentType.includes('application/javascript')) {
                            // Extract the HTML content from the JavaScript response
                            const htmlContent = this.extractHTMLFromJS(data);
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');
                            data = this.extractDataFromHTML(doc);
                        } else if (contentType && contentType.includes('text/plain')) {
                            data = this.extractJsonFromJS(data);
                        } else if (contentType && contentType.includes('text/html') && 
                                    (this.currentStationData[this.stationName].phpString && !this.currentStationData[this.stationName].htmlString)) {
                            data = data;
                        } else if (contentType && contentType.includes('text/html') && 
                                   this.currentStationData[this.stationName].htmlString) {
                            const htmlContent = data;
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');

                            data = this.extractDataFromHTML(doc);
                        }            

                        // Your existing logic to check if the data is the same
                        if (this.isDataSameAsPrevious(data)) {
                            // Check if it's been more than 900 seconds since the last update
                            if (this.lastDataUpdateTime && (Date.now() - this.lastDataUpdateTime) > 900000) {
                                console.log("Data is the same, but it's now stale");
                                // Process the data even though it's the same because it's stale
                                this.previousDataResponse = data; // Update even if we skip processing
                                this.processData(data);
                            }
                            
                            // console.log("Same data");
                            return; // If data is the same and not stale, exit
                        } 

                        if (this.songMetadataChanged) {
                                console.log("Skipping update: song metadata was altered externally.");
                                this.songMetadataChanged = false; // Reset flag
                                return; // Stop further processing
                        }

                        if (this.cbcData) {
                            data = this.cbcData;
                        }

                        // Process the new data response
                        this.previousDataResponse = data; // Update even if we skip processing

                        this.processData(data);

                        // Update the timestamp to reflect the new data was processed
                        this.lastDataUpdateTime = Date.now();
                        this.duration = null;

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

    extractJsonFromJS(js) {
        // Match the JSON payload inside the jsonpcallback function
        const match = js.match(/jsonpcallback\((.*)\);/);
        if (match && match[1]) {
            try {
                // Parse the matched JSON string
                const jsonData = JSON.parse(match[1]);
                return jsonData;
            } catch (error) {
                throw new Error('Failed to parse JSON from the response: ' + error.message);
            }
        } else {
            throw new Error('Unable to extract JSON content from the response');
        }
    }


    // Helper function to extract necessary data from HTML response
    extractDataFromHTML(doc) {
        const replaceEnDashWithEmDash = str => str.replace(/—/g, '—');
        const replaceHyphenWithEmDash = str => str.replace(/—/g, '—');

        let targetSelector; 

        if (this.currentStationData[this.stationName].htmlString) {
            targetSelector = ['div.song-details:first-child', '.radio-song-title', ' p:first-child', ' .album-title', ' .album-art', ' p:last-child']

            // const htmlString = replaceHyphenWithEmDash(doc.querySelector('div.hidden-xs')?.textContent.trim() || 'No streaming data currently available').replace(/\s+/g,' ').trim();
            // return htmlString;
        } else {
            targetSelector = ['', '.song', '.artist', '.release', 'img', '.spin-time a']
        }

        const song = replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[1]}`)?.textContent.trim() || 'No streaming data currently available');
        const artist = replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[2]}`)?.textContent.trim() || '');
        const album = replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[3]}`)?.textContent.trim() || '');
        const albumArt = doc.querySelector(`${targetSelector[4]}`)?.src || '';
        const spinUpdated = doc.querySelector(`${targetSelector[0]}${targetSelector[5]}`)?.textContent.trim() || '';


        console.log('extractedfromhtml', song, artist, album, albumArt, spinUpdated)
        // Return the extracted data in the format expected by processData
        return {song, artist, album, albumArt, spinUpdated};
    }

   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }      

    updateScrobbleData(song, artist, album) {
        if (song && artist && album) {
            const currentTrack = {
              trackTitle: song,
              trackArtist: artist,
              trackAlbum: album,
              trackTimestamp: Math.floor(Date.now() / 1000) // ✅ timestamp in seconds
            };

            updateNowPlaying(currentTrack);

            if (this.currentTrack !== currentTrack || !this.currentTrack) {
                if (this.currentTrack && this.currentTrack !== currentTrack) { // Song has changed
                    if (this.scrobbleTimeout) {
                        clearTimeout(this.scrobbleTimeout); // Clear existing timeout
                        this.scrobbleTimeout = null;
                    }

                    if (this.songStartTime && (Date.now() - this.songStartTime >= 60000)) {
                        scrobbleIt(this.currentTrack); // Scrobble the previous song
                    }

                    this.songStartTime = null; // Reset song start time
                }

                this.currentTrack = currentTrack;

                // Set a new 60-second timer for the current song
                if (this.currentTrack && !this.songStartTime) {
                    this.songStartTime = Date.now();
                    this.scrobbleTimeout = setTimeout(() => {
                        if (this.currentTrack) {
                            scrobbleIt(this.currentTrack);
                        }
                    }, 60000);
                } 
            }
        }    
    }                          

    processData(data) {
        // Check if data and stationName are available
        if (data && this.stationName) {
            const extractedData = this.extractSongAndArtist(data, this.stationName);

             // Compare the extractedData response with the previous one
            if (JSON.stringify(this.prevExtractedData) === JSON.stringify(extractedData)) {
                console.log('extracted data the same, returning')
                return;
            } else {
                this.prevExtractedData = extractedData;
            }

            // Ensure extractedData is valid and handle cases where no song or artist is found
            if (!extractedData || extractedData.length === 0) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData(['[ Air break ]', '', '', this.stationArt, null, null, true]);
                return;
            }

            this.hasLoadedData = true;
            const [song, artist, album, albumArt, spinUpdated, queryType, errorMsg] = extractedData;                

            // Predefined values
            const timezone = this.currentStationData[this.stationName].timezone;
            let timestamp;

            if ([this.stationName] == 'indie1023') {
                timestamp = `${this.getPath(data, this.currentStationData[this.stationName].timestamp[0])} ${this.getPath(data, this.currentStationData[this.stationName].timestamp[1])} GMT-06:00`;
                    console.log('102.3 timestamp', timestamp);
            } else if (this.currentStationData[this.stationName].reverseArray) {
                timestamp = this.getPath(data, this.getLastJsonPath(this.currentStationData[this.stationName].timestamp, data)); 
                console.log('timestamp reverse array', timestamp);
            } else {
                timestamp = this.getPath(data, this.currentStationData[this.stationName].timestamp);

                if (timestamp == 0 || timestamp == '') {
                    timestamp = undefined;
                }
            }

            if (this.currentStationData[this.stationName].altPath && (!song || !timestamp)) {
                if ([this.stationName] == 'indie1023') {
                    timestamp = `${this.getPath(data, this.currentStationData[this.stationName].timestamp[2])} ${this.getPath(data, this.currentStationData[this.stationName].timestamp[3])}`;
                    console.log('102.3 timestamp', timestamp);
                } else {
                    timestamp = this.getPath(data, this.currentStationData[this.stationName].timestamp2);
                    this.duration = this.getPath(data, this.currentStationData[this.stationName].duration2);
                    console.log('altpath timestamp', timestamp);
                }
            }

            // Format and check stale data in a separate function
            const { staleData } = this.checkStaleData(timezone, timestamp, spinUpdated, this.getPath(data, this.currentStationData[this.stationName].duration), song);

            if ((staleData === "Live365 past" || staleData === "Still future") && (song)) {
                    return;   
            } else if ([this.stationName] == 'indie1023' && song == "Station data is currently missing") {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData(['[ Air Break ]', '', '', this.stationArt, null, null, true]);
                return;
            } else if (song == "Station data is currently missing" && !staleData ) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData([song, '', '', this.stationArt, null, null, true]);
                return;
            }

            // Handle stale data or invalid song
            if ((staleData) || song === 'No streaming data currently available' || errorMsg) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData([(staleData || song), '', '', urlCoverArt, null, null, true]);
                return;
            }

            // Ensure this code doesn't run unless there's new data to process
            if (!this.lfmMetaChanged || (song.toLowerCase() !== this.song.toLowerCase())) {
                
                // First, get the metadata from last.fm
                this.getLfmMeta(song, artist, album, albumArt, '', '', false).then(lfmValues => {
                    const [lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount] = lfmValues || [urlCoverArt, '', song, artist, '', ''];

                    this.song = lfmSong;
                    this.artist = lfmArtist;
                    this.album = lfmAlbum || lfmSong;
                    this.artworkUrl = lfmArt || urlCoverArt;

                    this.updateScrobbleData(this.song, this.artist, this.album);

                    this.listeners = lfmListeners || null;
                    this.playcount = lfmPlaycount || null;
                    this.lfmMetaChanged = true;

                    const page = new Page(this.stationName, this);
                    page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, this.errorMessage]);

                }).catch(error => {
                    console.error('Error processing data:', error);
                });
            }

            if ((this.duration + this.lastKnownUpdatedTime) > Date.now()) {
                this.lastKnownUpdatedTime = this.duration + this.lastKnownUpdatedTime 
            }
        }
    }

    getTimezoneOffset(d, tz) {
      const a = d.toLocaleString("ja", {timeZone: tz}).split(/[/\s:]/);
      a[1]--;
      const t1 = Date.UTC.apply(null, a);
      const t2 = new Date(d).setMilliseconds(0);
      return (t2 - t1) / 60 / 1000;
    }


    checkStaleData(timezone, timestamp, spinUpdated, duration, song) {

        let staleData = '';

        if ((!timezone && !timestamp && !spinUpdated) || (!timestamp && spinUpdated == true) || (timestamp === undefined && !this.currentStationData[this.stationName].spinPath && !timezone)) {
            return staleData;
        }

        let apiUpdatedData;
        // Fix timezoneTime creation
        let timezoneTime = new Date().toLocaleString("en-US", { 
            timeZone: timezone, 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false,
            timeZoneName: 'longOffset'
        });

        if (timestamp) {
            const isDecimalEpoch = /^\d{10}(\.\d+)?$/.test(timestamp); // 10-digit epoch with optional decimal
            const isEpoch = /^\d{10,13}$/.test(timestamp); // integer epoch



            if (isDecimalEpoch || isEpoch) {
                const numericTs = parseFloat(timestamp); // works for both int & float
                apiUpdatedData = numericTs < 1e12 ? Math.floor(numericTs * 1000) : Math.floor(numericTs); // Ensure ms, strip decimals

                console.log('apiUpdatedData from isEpoch', apiUpdatedData);
            } else {
                apiUpdatedData = this.convertTimestamp(timestamp, timezone);
            }
        } else if (spinUpdated) {
            // Handle timestamp conversion and formatting
            let spinUpdatedData = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
            console.log('spinUpdatedData', spinUpdatedData, Date.parse(spinUpdatedData));

            const now = new Date();
            let spinOffset = new Intl.DateTimeFormat("en-US", {
                timeZone: timezone,
                timeZoneName: 'longOffset'
            });

            const parts = spinOffset.formatToParts(now);
            const lookup = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
            apiUpdatedData = `${spinUpdatedData} ${lookup.timeZoneName}`;
            console.log('spin apiUpdatedData', apiUpdatedData);

            apiUpdatedData = Date.parse(apiUpdatedData);
        } else if ((timezone && !timestamp)) {
            console.log('timezone and no timestamp', timestamp);
            if (song !== this.song) {
                // Song changed: Set a new fallback timestamp
                this.fallbackTimestamp = Date.parse(timezoneTime);
                apiUpdatedData = this.fallbackTimestamp;
            } else if (this.fallbackTimestamp) {
                // Same song: Retain the previously assigned timestamp
                apiUpdatedData = this.fallbackTimestamp;
            }
        }

        // Convert formatted times to epoch
        timezoneTime = Date.parse(timezoneTime);


        // some stations have a pretty huge timing offset between the API and the stream, so this is an attempt to make it so the songs might be more likely to be showing the song data at the same time the song is actually playing. 
        if ((this.currentStationData[this.stationName].offset + apiUpdatedData) < timezoneTime) {
            apiUpdatedData = (this.currentStationData[this.stationName].offset + apiUpdatedData);
            timezoneTime = (this.currentStationData[this.stationName].offset + timezoneTime);
        }

        // some stations have duration data and tend to switch the track too early. This makes an adjustment so that the station doesn't jump away from the current too quickly if it's still in the window the song should still be playing
        if (duration) {
            this.duration = duration;

            if (this.duration > 0) {
                apiUpdatedData = apiUpdatedData + duration;
            } else {
                // Check if duration is already in epoch format (milliseconds)
                const isEpoch = (value) => typeof value === 'number' && value >= 1000 && value < 1e13;

                // Convert duration to epoch if necessary
                const epochDuration = isEpoch(this.duration) ? this.duration : this.convertDurationToMilliseconds(this.duration);

                if (duration <= 600) {
                    apiUpdatedData = apiUpdatedData + (duration * 1000);
                   // console.log('apiUpdatedData', apiUpdatedData)
                } else if (epochDuration > 0) {
                    apiUpdatedData = apiUpdatedData + epochDuration;
                } else {
                    apiUpdatedData = apiUpdatedData + duration; // Get end time of the song
                    console.log('apiUpdatedData else', apiUpdatedData)
                }

                console.log("apiUpdatedData + duration =", apiUpdatedData);
            }
        }

        // For Live365 apis that skip back and forth with the data (for whatever reason). This checks if the end of the song is still in the future to ensure it doesn't change the song data back to an old song only to jump back again next api check
        if (this.currentStationData[this.stationName].isFuture) {
          const now = Date.now();
          const pastThreshold = now - 240000; // 240 seconds ago

          if (!this.lastKnownUpdatedTime) {
            // First time setting it
            this.lastKnownUpdatedTime = apiUpdatedData;
          }

          // 1. Reject obviously old data
          if (apiUpdatedData < this.lastKnownUpdatedTime) {
            console.log("Skipping older song data — already showing newer content.", apiUpdatedData,  this.lastKnownUpdatedTime);
            staleData =  "Live365 past";
            return { staleData };
          }

          // 2. Reject data that's *too far in the past*
          if (apiUpdatedData < pastThreshold) {
            console.log("Song data is over 240 seconds old, waiting for fresh data.");
            staleData = "Waiting for fresh data";
            return { staleData };
          }

          // 3. Warn if it's slightly behind
          if (apiUpdatedData < now) {
            console.log("Song data is slightly in the past but still recent.");
          }

          // 4. Check if it's oddly in the future
          if (apiUpdatedData > now + 2000) { // allow a 2s buffer
            console.log("⏩ Song data appears to be in the future.");
            // Optionally reject future data:
            // return { staleData: "Song data is from the future" };
          }

          // 5. All checks passed — accept the song
          this.lastKnownUpdatedTime = apiUpdatedData;
          // console.log("✅ Accepting new song data");
        }


        if (apiUpdatedData.length > 13) {
            apiUpdatedData = Number.parseInt(apiUpdatedData.slice(0, 13));
        }

        this.lastKnownUpdatedTime = apiUpdatedData;
        console.log("this.lastKnownUpdatedTime", this.lastKnownUpdatedTime)

        // Calculate time difference
        const timeDifference = (timezoneTime - apiUpdatedData) / 1000;
        console.log('apiUpdatedData', apiUpdatedData, 'timezoneTime', timezoneTime, 'timeDifference', timeDifference);

        // Check if the data is stale (older than 15 minutes)
        if (timeDifference > 900 && apiUpdatedData !== "") {
            staleData = 'Streaming data is stale';
        }

        return { staleData };
    }

    convertDurationToMilliseconds(durationStr) {
        const parts = durationStr.split(':');
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parts[2].split('.');
        const wholeSeconds = parseInt(seconds[0], 10) || 0;
        const milliseconds = seconds[1] ? parseInt(seconds[1], 10) / Math.pow(10, seconds[1].length) * 1000 : 0;

        return Math.round((hours * 3600 + minutes * 60 + wholeSeconds) * 1000 + milliseconds);
    }

    convertTimestamp(timestamp, timezone, spinUpdated, duration) {

        console.log('timestamp before conversion', timestamp);

        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
        const isEpoch = /^\d{10,13}$/.test(timestamp); // Check for 10 or 13 digits
        const isUTC = typeof timestamp === 'string' && timestamp.trim().endsWith('Z');
        const dateWithoutTimezoneRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}$/;
        const mmddyyyyRegex = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/; // MM-DD-YYYY HH:mm:ss
        const yyyymmddhhmmRegex = /^20\d{10}$/; // YYYYMMDDHHMM starting with 20
        const yyyymmddhhmmssRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

        if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {
            return new Date(timestamp).getTime(); // ⬅️ Epoch
        }

        if (dateWithoutTimezoneRegex.test(timestamp)) {
            timestamp = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
            return new Date(timestamp).getTime(); // ⬅️ Epoch
        }

        if (yyyymmddhhmmssRegex.test(timestamp)) {
            const [datePart, timePart] = timestamp.split(' ');
            const [year, month, day] = datePart.split('-'); // Correct order: YYYY-MM-DD

            // Convert to desired format (MM/DD/YYYY, HH:mm:ss GMT)
            const formattedDate = `${month}/${day}/${year}`;
            const formattedTime = timePart; // Time remains the same
            const formattedTimestamp = `${formattedDate}, ${formattedTime} GMT`;

            return new Date(formattedTimestamp).getTime(); // ⬅️ Epoch
        }

        if (yyyymmddhhmmRegex.test(timestamp)) {
            const year = parseInt(timestamp.substring(0, 4), 10);
            const month = parseInt(timestamp.substring(4, 6), 10) - 1;
            const day = parseInt(timestamp.substring(6, 8), 10);
            const hour = parseInt(timestamp.substring(8, 10), 10);
            const minute = parseInt(timestamp.substring(10, 12), 10);
            return new Date(year, month, day, hour, minute).getTime(); // ⬅️ Epoch
        }

        if (isEpoch) {
            const epoch = Number(timestamp);
            return epoch < 1e12 ? epoch * 1000 : epoch; // ⬅️ Epoch in ms
        }

        if (isUTC) {
            return new Date(timestamp).getTime(); // ⬅️ Epoch
        }

        if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {
            if (timestamp.endsWith('+0000')) {
                timestamp = timestamp.replace('+0000', 'Z');
            }
            return new Date(timestamp).getTime(); // ⬅️ Epoch
        }

        if (mmddyyyyRegex.test(timestamp) || mmddyyyyRegex.test(this.formattedTimestamp)) {
            const [datePart, timePart] = timestamp.split(' ');
            const [month, day, year] = datePart.split('-');
            const formattedTimestamp = `${year}-${month}-${day}T${timePart}`;
            timestamp = this.formatTimeInTimezone(timezone, formattedTimestamp, spinUpdated);
            timestamp = timestamp.replace(/([-+]\d{2})(\d{2})$/, "$1:$2");
            return new Date(timestamp).getTime(); // ⬅️ Epoch
        }

        return new Date(timestamp).getTime(); // fallback

    }

    formatTimeInTimezone(timezone, timestamp, spinUpdated) {
        let apiUpdatedTime = '';

        console.log('timestamp', timestamp, 'spinUpdated', spinUpdated);

        const convertTo24HourFormat = (time12h) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');

            if (modifier === 'PM' && hours !== '12') {
                hours = parseInt(hours, 10) + 12;
            } else if (modifier === 'AM' && hours === '12') {
                hours = '00';
            }

            return `${hours}:${minutes}`;
        };

        // Format the current date and time in the specified timezone
        const currentDatePart = new Date().toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false,
        });

        const currentTimezonePart = new Date().toLocaleString('en-US', {
            timeZone: timezone,
            timeZoneName: 'short',
        }).split(' ').pop();

        // If there's a spinUpdated time, convert it to 24-hour format
        if (spinUpdated && spinUpdated !== true) {
            const updated24Hour = convertTo24HourFormat(spinUpdated);
            apiUpdatedTime = `${currentDatePart} ${updated24Hour}`;
            console.log('spinUpdated apiUpdatedTime', apiUpdatedTime)
        }

        // Format the API-supplied timestamp, if provided, with timezone handling
        if (timestamp) {
            const date = new Date(timestamp);
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour12: false,
                timeZoneName: 'shortOffset',
            });

            const parts = formatter.formatToParts(date);
            let offsetPart = parts.find(part => part.type === 'timeZoneName')?.value;

            if (offsetPart.startsWith('GMT')) {
                offsetPart = offsetPart.replace('GMT', '');
            }

            const match = offsetPart.match(/([+-])(\d+)/);
            if (match) {
                const sign = match[1];
                const hours = match[2].padStart(2, '0');
                const minutes = '00';
                offsetPart = `${sign}${hours}${minutes}`;
            }

            timestamp = timestamp.replace(' ', 'T').replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2").replace(/([-+]\d{2})(\d{2})$/, "$1:$2") + offsetPart;

            apiUpdatedTime = timestamp;
        }
        return apiUpdatedTime;
    }


    loadHTMLContent(condition, url, targetElementId) {
    const targetElement = document.getElementById(targetElementId);

    // Check if the target element exists
    if (!targetElement) {
        console.error(`Element with ID "${targetElementId}" not found in the DOM.`);
        return; // Exit the function early
    }

    if (condition) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                targetElement.innerHTML = html;
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    } else {
        // Optionally clear the content if the condition is false
        targetElement.innerHTML = '';
    }
}
    upsizeImgUrl(url) {
        if (url) {
            return url.replace(/\d{3}x\d{3}/g, '500x500');
        }
    }

    getPath(obj, prop) {
        if (!obj || typeof obj !== 'object' || !prop) {
            return; // Handle invalid arguments
        }

        // Split the property path by "." for multi-layer paths
        const parts = prop.split(".");
        let current = obj;

        // Traverse the object for each part of the path
        for (let i = 0; i < parts.length; i++) {
            if (current[parts[i]] === undefined) {
                return; // Return undefined if any part of the path is not found
            }
            current = current[parts[i]]; // Drill down into the object
        }

        return current; // Return the final value
    }

    play() {
        if (!this.audio.src) return;

        // Check if the stream should be reloaded based on page visibility
        if (this.shouldReloadStream) {
            console.log("the stream is reloading");
            this.handleStationSelect(null, this.stationName, false); // Reload the stream
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
        if (this.playButton.classList.contains("spinner-grow")) {
            this.audio.play();
            return;
        }

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
            const page = new Page(this.stationName, this);
            page.refreshCurrentData([`Press reload to refresh feed`, '', '', urlCoverArt, null, null, true]);
            document.getElementById("playermeta").classList.add("opacity-50");
            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }
            this.shouldReloadStream = true;
        }, 30000);
    }

    togglePlay() {
        // Clear scrobble timeout when playback stops
        if (this.page && this.page.scrobbleTimeout) {
            clearTimeout(this.page.scrobbleTimeout);
            console.log("Scrobble timeout cleared due to playback stop.");
            this.page.scrobbleTimeout = null;
        }

        this.isPlaying ? this.pause() : this.play();
    }

    skipToNextStation() {
        this.calculateNextAndPreviousIndices('next');
        const nextStationKey = this.nextStationName;
        this.handleStationSelect(null, nextStationKey, true);
    }

    skipBackward() {
        this.calculateNextAndPreviousIndices('previous');
        const prevStationKey = this.previousStationName;
        this.handleStationSelect(true, prevStationKey, true);
    }

    skipForward() {
        this.calculateNextAndPreviousIndices('next');
        const nextStationKey = this.nextStationName;
        this.handleStationSelect(null, nextStationKey, true);
    }


    onTagSelected(tag) {
        currentTag = tag;
        generateRadioButtons(tag);
    }


    onAllTagsSelected() {
        currentTag = "all";
        generateRadioButtons("all");
    }


    reloadStream() {
        this.shouldReloadStream = true;
        console.log('reload working');
        this.playButton.lastElementChild.className = "spinner-grow text-light";
        document.getElementById("panel1")
        this.calculateNextAndPreviousIndices();
        const currentStationKey = stationKeys[this.currentIndex];
        this.handleStationSelect(true, currentStationKey, true);
        this.scrobbleReset; 
    }

    scrobbleReset() {
        clearTimeout(this.page.scrobbleTimeout);
    }

    addCacheBuster(url) {
        const timestamp = Date.now();
        const skipCacheBuster = ['radiowestern', 'kexp', 'wrir', 'wprb', 'krcl', 'cbcmusic', 'indie1023', 'somagroovesalad'];
        if (skipCacheBuster.includes(this.stationName) ) {
            return url;
        }
        return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
    }
}

// Initialize radio buttons and radio player
const radioPlayer = new RadioPlayer(
    document.getElementById("playButton"),
    document.getElementById("skipForward"),
    document.getElementById("skipBack"),
    document.getElementById("reloadStream"),
); 

document.addEventListener('DOMContentLoaded', async function() {
    // Generate the radio buttons first
    await generateRadioButtons();

    radioPlayer.jumpToStationFromHash();

    const defaultStation = stationKeys[0];
    radioPlayer.handleStationSelect(false, defaultStation, true);

    const stationSelect = document.getElementById('stationSelect');
    if (stationSelect) {
        stationSelect.addEventListener('change', (event) => {
            const stationName = event.target.value;
            const direction = true; 
            radioPlayer.handleStationSelect(direction, stationName, true);
        }, { once: true });
    } else {
        console.error('Element with ID "stationSelect" not found.');
    }

    // Detect fullscreen mode (PWA standalone) and apply CSS class
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('fullscreen-mode');
    }

    // Scroll to Panel 2
    const container = document.querySelector('.mobile-swipe');
    const panel2 = document.getElementById('panel2');
    if (container && panel2) {
        container.scrollTo({
            left: panel2.offsetLeft,
            behavior: 'smooth' // Change to 'auto' if you don't want smooth scrolling
        });
    }

}, { once: true });

