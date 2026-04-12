import { debounce, addCacheBuster, hasTag } from './utils.js';
import { Page } from './page.js';
import { handleStationClick, generateRadioButtons } from './radioButtons.js';
import { urlCoverArt, currentTag } from './constants.js';
import { getTimezoneOffset, checkStaleData, convertDurationToMilliseconds, convertTimestamp, formatTimeInTimezone  } from './timing.js';
import { MetadataFilter } from './filter.min.js';



export class RadioPlayer {
    constructor(buttonElement, skipForwardButton, skipBackButton, reloadStreamButton, stations) {
        // Audio setup
        this.audio = new Audio();
        this.hls = null; // Store HLS instance
        this.isPlaying = null;
        this.shouldReloadStream = false;
        this.pauseTimeout = null;
        this.duration = null;
        this.currentPage = null;
        this.stationDisplayName = null;
        this.nextStationDisplayName = null;
        this.prevStationDisplayName = null;

        // Station info
        this.stationKey = "";
        this.currentStationData = null;
        this.previousDataResponse = null;
        this.prevExtractedData = null;
        this.stationArt = '';
        this.currentIndex = null;
        this.streamUrl = null;
        this.streamApiUrl = null;
        this.stations = stations;

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
        this.urlCoverArt = urlCoverArt;
        this.addCacheBuster = addCacheBuster;
        this.radioPlayer = this;
        this.currentTag = currentTag;
        this.handleStationClick = handleStationClick;

        // timing 
       this.getTimezoneOffset = getTimezoneOffset; 
       this.checkStaleData = checkStaleData; 
       this.convertDurationToMilliseconds = convertDurationToMilliseconds; 
       this.convertTimestamp = convertTimestamp; 
       this.formatTimeInTimezone = formatTimeInTimezone;

        // Misc
        this.firstRun = true;
        this.debounce = debounce;
        this.debounceTimeout = null;
        this.songStartTime = null; // Timestamp when the current song started
        this.scrobbleTimeout = null; // Timeout ID for the 60-second timer     
        this.currentTrack = {
          title: null,
          artist: null,
          album: null,
          albumArt: null,
          spinUpdated: null,
          timestamp: null,
          duration: null
        };
        this.currentScrobble;

        this.streamingInterval = null;

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



    bindMethods() {
        this.handleStationSelect = this.handleStationSelect.bind(this);
        this.initializePage = this.initializePage.bind(this);
        this.getLfmMeta = this.getLfmMeta.bind(this);
        this.getStreamingData = this.getStreamingData.bind(this);
        this.extractSongAndArtist = this.extractSongAndArtist.bind(this);
        this.getPath = this.getPath.bind(this);
        this.upsizeImgUrl = this.upsizeImgUrl.bind(this);
        this.togglePlay = this.togglePlay.bind(this);
        this.skipForward = this.skipForward.bind(this);
        this.skipBackward = this.skipBackward.bind(this);
        this.reloadStream = this.reloadStream.bind(this);
        this.getNestedValue = this.getNestedValue.bind(this);
    }

async addEventListeners() {
    this.playButton.addEventListener("click", this.togglePlay);
    this.skipForwardButton.addEventListener("click", this.skipForward);
    this.skipBackButton.addEventListener("click", this.skipBackward);
    this.reloadStreamButton.addEventListener("click", this.reloadStream);

    // Correctly listen for the change event on the <select> element
    document.getElementById("stationSelect").addEventListener("change", (event) => {
        const selectedStationKey = event.target.value;
        const selectedStationDisplayName = event.target.options[event.target.selectedIndex].text;
        this.handleStationSelect(null, selectedStationKey, selectedStationDisplayName, false);
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

    initializePage(stationKey) {
        if (this.currentPage) {
          this.currentPage.destroy(); // Cleanup previous instance
        }
        this.currentPage = new Page(stationKey, this.radioPlayer); // Pass radioPlayer instance
      }


    getNestedValue(obj, keyPath, targetProperty, defaultValue = undefined) {
        if (!obj || !keyPath || !targetProperty) return defaultValue;

        // If keyPath doesn't contain '.', it's a top-level property
        if (!keyPath.includes('.')) {
            return obj[keyPath]?.[targetProperty] ?? defaultValue;
        }

        // Split the keyPath by '.' into an array of keys
        const keys = keyPath.split('.');
        let current = obj;
        let result = undefined;

        // Traverse the nested path and check for targetProperty at each level
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (current && typeof current === 'object' && key in current) {
                current = current[key];

                // Check if targetProperty exists at the current level
                if (current?.[targetProperty]) {
                    result = current[targetProperty]; // Store the result but continue traversing
                }
            } else {
                return defaultValue;
            }
        }

        // After traversing the nested path, return the most specific result or defaultValue
        return result ?? defaultValue;
    }



    calculateNextAndPreviousIndices(direction) {

    const allStations = this.stations.map((stationKey) => ({
        stationKey,
        stationDisplayName: stationKey,
        tags: [],
        group: null,
    }));

    let filteredStations = [];

    if (this.currentTag === "all") {
        filteredStations = allStations;
    } else {
        filteredStations = allStations.filter(station => hasTag(station, this.currentTag));
        if (filteredStations.length === 0) {
            filteredStations = allStations;
        }
    }

    const currentStation = filteredStations.find(station => station.stationKey === this.stationKey);
    if (!currentStation) {
        console.log('no currentStation, returning');
        return;
    }


        this.currentIndex = filteredStations.indexOf(currentStation);

        if (direction === 'next') {
            this.nextIndex = (this.currentIndex + 1) % filteredStations.length;
            const nextStation = filteredStations[this.nextIndex];
            this.nextStationKey = nextStation.stationKey;
            this.nextStationDisplayName = nextStation.stationDisplayName;
        } else if (direction === 'previous') {
            this.previousIndex = (this.currentIndex - 1 + filteredStations.length) % filteredStations.length;
            const previousStation = filteredStations[this.previousIndex];
            this.previousStationKey = previousStation.stationKey;
            this.previousStationDisplayName = previousStation.stationDisplayName;
        }
    }


    jumpToStationFromHash() {
        const hash = window.location.hash;

        if (hash) {
            const stationKey = hash.substring(1); // Remove the '#' character
            const button = document.querySelector(`button[name='${stationKey}']`);

            if (button) {
                // Extract the station display name from the button's text content
                const stationDisplayName = button.textContent.trim();

                // Scroll the button into view
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Pass both stationKey and stationDisplayName to handleStationSelect
                this.handleStationSelect(null, stationKey, stationDisplayName, true);
            }
        }
    }


    async loadStationData(stationKey) {
      let url;
      if (stationKey.includes('.')) {
        // If there's an underscore, load the parent station file (e.g., abc.js for abc_doublej)
        const parentStation = stationKey.split('.')[0]; // Extract parent station name (e.g., abc from abc_doublej)
        url = `/js/stations/${parentStation}.js`;
      } else {
        // Otherwise, load the specific station file (e.g., wfmu.js)
        url = `/js/stations/${stationKey}.js`;
      }

      try {
        const response = await fetch(url);
        const scriptContent = await response.text();
        const script = new Function(scriptContent + "; return stationData;");
        return script();
      } catch (err) {
        console.error(`Error loading station data for ${stationKey}:`, err);
        return null;
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

    async handleStationSelect(direction, stationKey, stationDisplayName, firstRun) {
        if (!stationKey || direction === false) return;

        this.stationKey = stationKey;
        this.firstRun = firstRun;

        // Clear existing scrobble timeout
        if (this.currentPage && this.currentPage.scrobbleTimeout) {
            clearTimeout(this.currentPage.scrobbleTimeout);
            console.log("Scrobble timeout cleared due to station switch.");
            this.currentPage.scrobbleTimeout = null;
        }

        if (this.shouldReloadStream) {
            document.getElementById("playermeta").classList.remove("opacity-50");
            this.audio.load();
            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }
            this.shouldReloadStream = false;
            return;
        }

        // Destroy the previous Page instance if it exists
        if (this.currentPage) {
            this.currentPage.destroy();
            this.currentPage = null;
        }

        document.getElementById("playermeta").classList.add("opacity-50");

        if (firstRun == true && !this.shouldReloadStream) {
            this.currentStationData = await this.loadStationData(this.stationKey);

            if (!this.currentStationData) return;

            if (!stationDisplayName) {
                this.stationDisplayName = this.getNestedValue(this.currentStationData, this.stationKey, 'stationName', null);
            } else if (stationDisplayName) {
                this.stationDisplayName = stationDisplayName;
            }

            this.streamUrl = this.getNestedValue(this.currentStationData, stationKey, 'streamUrl', null);


            // Initialize the new Page instance
            this.initializePage(stationKey);

            // Clear any existing streaming intervals
            if (this.streamingInterval) {
                clearInterval(this.streamingInterval);
                this.streamingInterval = null;
            }

            this.stationKey = stationKey;
            this.stationArt = `../img/stations/${this.stationKey}.png`;
            document.documentElement.style.setProperty("--albumArt", `url("../${this.stationArt}")`);
            document.documentElement.style.setProperty("--stationArt", `url("../${this.stationArt}")`);
            this.currentPage.setupMediaSession(this.stationDisplayName, 'currently loading', this.stationArt, false);
            this.currentPage.refreshCurrentData([`Station data loading`, '', '', this.stationArt, null, null, true]);
            this.playButton.lastElementChild.className = "spinner-grow text-light";
            this.lfmMetaChanged = false;
            console.log(stationKey);
            this.updateArt = true;
            this.isPlaying = true;
            this.songMetadataChanged = false;
            this.lastKnownUpdatedTime = null;
            this.stationApiUrl = null;
            this.firstRun = false;
            firstRun = false;
        }

        const debouncedSetupAudio = debounce(() => {
            if (!this.isPlaying) return;


            if (!this.currentStationData) {
                console.error("currentStationData is undefined or null");
                return;
            }

            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }

            const newAudio = new Audio(); // Create new Audio element
            newAudio.crossOrigin = 'anonymous';

            const isHlsStream = this.streamUrl.endsWith('.m3u8');

            if (isHlsStream) {
                this.hlsStreamLoad(this.streamUrl, newAudio); // No need to assign return value
            } else {

                if (this.getNestedValue(this.currentStationData, this.stationKey, 'proxyStream', null)) {
                        newAudio.src = this.addCacheBuster(`https://scrobblerad.io/proxy.php?url=${this.streamUrl}`);
                } else {
                    newAudio.src = this.addCacheBuster(this.streamUrl);
                }

                newAudio.load();
            }

            // If the stream is marked as quiet, boost it
            if (this.getNestedValue(this.currentStationData, this.stationKey, 'quietStream', null)) {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaElementSource(newAudio);
                const gainNode = audioContext.createGain();

                gainNode.gain.value = this.getNestedValue(this.currentStationData, this.stationKey, 'gainBoost', null) || 2;

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
                if (this.isPlaying && this.currentPage) {
                    console.log('this.currentPage', this.currentPage);
                    this.currentPage.refreshCurrentData([`Audio not loading, skipping station`, '', '', this.stationArt, null, null, true]);
                   // direction === true ? this.skipBackward() : this.skipForward();
                }
            };

            newAudio.load();

            const radioInput = document.querySelector(`input[name='station'][value='${this.stationKey}']`);
            if (radioInput) radioInput.checked = true;

            window.location.hash = `#${this.stationKey}`;
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

    extractSongAndArtist(data, stationKey) {
        const replaceSpecialCharacters = str => {
    if (str == null) return ''; // Handle null or undefined
    const strValue = String(str); // Ensure it's a string
    return strValue
        .replace(/&apos;|&#039;|’|‘|‚|‛|`|´/g, "'")
        .replace(/–|—/g, "-")
        .replace(/[“”„]/g, '"')
        .replace(/…/g, "...")
        .replace(/\u00A0/g, " ")
        .replace(/[\t\n\r]/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s*\[.*?\]/g, '')
        .replace(/[*/|\\]/g, '')
        .replace(/--/g, '-')
        .replace(/\s*\(Current Track\)\s*/gi, '')
        .replace(/\s-\s.*single.*$/i, '')
        .replace(/\b(tUnE yArDs|tune-yards|tuneyards)\b/gi, 'tUnE-yArDs')
        .replace(/\b(Lets|Its|Ive|Dont|Cant|Wont|Aint)\b/gi, match => {
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
        .replace(/\b(Somethin|Nothin)\b/gi, match => {
            const replacements = {
                Somethin: "Somethin'",
                Nothin: "Nothin'"
            };
            return replacements[match] || match;
        })
            .trim() || '';
        };


        const filterSongDetails = song => {
            if (!song) return ''; // Return an empty string if song is undefined
            return song
                .replace(/\s*\(.*?version.*?\)/gi, '') // Removes text in brackets containing "version"
                .replace(/\s-\s.*version.*$/i, '')    // Removes " - Radio Version" or similar
                .replace(/\s-\s.*kqua.*$/i, '')    // Removes " - Radio Version" or similar
                .replace(/\s-\s.*mix.*$/i, '')    // Removes " - Something Mix" or similar
                .replace(/\s*-\s*\([^)]*\)/g, '') // Removes " - (Anything in brackets)"
                .replace(/\s*\(.*?edit.*?\)/gi, '')   // Removes text in brackets containing "edit"
                .replace(/\s*\(\s*(feat\.?|ft\.?|featuring).*?\)|\s+(feat\.?|ft\.?|featuring)\s.*$/gi, '') // Removes text in brackets containing "Feat." or "Song Feat. Other Artist"
                .replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/i, '')   // Removes text to the end of the string containing "Feat." or "Song Feat. Other Artist"

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
                .replace(/\s*\(.*?\blive\b.*?\)/gi, '') // Removes "(Live session)"
                .replace(/\s*\(.*?\bcover\b.*?\)/gi, '') // Removes "(_____ cover)"
                .replace(/\s-\s.*single.*$/i, '')    // Removes " - Single" or similar
                .replace(/\s*\([^)]*$/gi, '') // remove truncated brackets
                .trim();
        };

        const getMetadata = (key) => replaceSpecialCharacters(this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, key)));
        const regexPattern = this.getNestedValue(this.currentStationData, this.stationKey, 'pathRegex', null) || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
        const regexPattern2 = this.getNestedValue(this.currentStationData, this.stationKey, 'pathRegex2', null);
        const match = regexPattern.exec(replaceSpecialCharacters(data));


        let dataPath = data.title;

        this.currentTrack = {
            ...this.currentTrack,
            title: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'song', null)),
            artist: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'artist', null)),
            album: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'album', null)),
            albumArt: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, '', null)),
            spinUpdated: ''
        }

        // CFMU inputs its latest songs at the end of the tracks object, so it needs to figure out what the last item in the array is, then output that
        if (this.getNestedValue(this.currentStationData, this.stationKey, 'reverseArray', null)) {
            this.currentTrack = {
                ...this.currentTrack,
                title: this.getPath(data, this.getLastJsonPath(this.currentStationData[stationKey].song, data)),
                artist: this.getPath(data, this.getLastJsonPath(this.currentStationData[stationKey].artist, data)),
                album: this.getPath(data, this.getLastJsonPath(this.currentStationData[stationKey].album, data)),
            }
        }

        // some APIs have instances where there's a second place you should look for info if the first item is empty
        if (this.getNestedValue(this.currentStationData, this.stationKey, 'altpath', null) && !this.currentTrack.title) {
            
            this.currentTrack = {
                ...this.currentTrack,
            title: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'song2', null)),
            artist: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'artist2', null)),
            album: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'album2', null)),
            albumArt: this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'albumArt2', null)),
            spinUpdated: ''
            }
            
        }

        if (this.getNestedValue(this.currentStationData, this.stationKey, 'spinPath', null) || this.getNestedValue(this.currentStationData, this.stationKey, 'htmlString', null) || this.getNestedValue(this.currentStationData, this.stationKey, 'xmlString', null)) {
            this.currentTrack = {
                ...this.currentTrack,
                title: data[0] || '',
                artist: data[1] || '',
                album: data[2] || '',
                albumArt: data[3] || '',
                spinUpdated: data[4] || '',
            }
        }

        if (this.getNestedValue(this.currentStationData, this.stationKey, 'orbPath', null) || this.getNestedValue(this.currentStationData, this.stationKey, 'dataPath', null)) {

            //radio.co apis that have a string "song - artist" piggybacking on the orbPath function
            if (this.getNestedValue(this.currentStationData, this.stationKey, 'dataPath', null) == true) {
                dataPath = data.data.title;
            } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'dataPath', null)) {
                dataPath = data[`${[this.getNestedValue(this.currentStationData, this.stationKey, 'dataPath', null)]}`];
            }

            const match = regexPattern.exec(dataPath);

            if (match) {
                [this.currentTrack.artist, this.currentTrack.title, this.currentTrack.album] = match.slice(1, 4).map((str) => str?.trim());
            } else if (!match && regexPattern2) {
                const fallbackMatch = regexPattern2.exec(dataPath);
                [this.currentTrack.artist, this.currentTrack.title, this.currentTrack.album] = fallbackMatch.slice(1, 4).map((str) => str?.trim());
            } else {
                console.log('No match found', match);
            }
        }

        if ((this.getNestedValue(this.currentStationData, this.stationKey, 'stringPath', null))) {
            if (match) {
                this.currentTrack.title = match[1]?.trim() || '';
                this.currentTrack.artist = match[2]?.trim() || '';

                if (this.stationKey !== 'cbcmusic') {
                    this.currentTrack = {
                        ...this.currentTrack,
                        album: match[3]?.trim() || '',
                        albumArt: match[4]?.trim() || urlCoverArt,
                        spinUpdated: new Date(Number(match[5]?.trim() || '')).getTime()
                    }
                }
                    
                } else { // if it is cbcmusic
                    this.currentTrack.spinUpdated = Number(match[3]?.trim()) || '';
                }
            } else {
                console.log('No match found');
            }
        
        // Helper function to check if a string contains any of the filtered values (case-insensitive)
        const containsFilteredValue = (text, values) => {
            if (!text) return false; // Ensure text is defined and not null/undefined
            const lowerCaseText = text.toLowerCase();
            return values.some(value => 
                value && lowerCaseText.includes(value.toLowerCase()) // Ensure value is also defined
            );
        };

        // Helper function to check if any of the provided texts contain invalid content
        const checkAnyInvalidContent = (...texts) => {
            const filteredValues = this.getNestedValue(this.currentStationData, this.stationKey, 'filter', null) || [];
            const stationKeyValue = this.getNestedValue(this.currentStationData, this.stationKey, 'stationName', null);
            const allValuesToCheck = [...filteredValues, stationKeyValue].filter(Boolean); // Remove falsy values

            return texts.some(text => 
                text && containsFilteredValue(text, allValuesToCheck)
            );
        };


        if (this.getNestedValue(this.currentStationData, this.stationKey, 'flipMeta', null)) {
            [this.currentTrack.title, this.currentTrack.artist] = [this.currentTrack.artist, this.currentTrack.title];
        }

        // Check the song, artist, and album values for invalid content
        if (checkAnyInvalidContent(this.currentTrack.title, this.currentTrack.artist, this.currentTrack.album)) {
            // Returning the message indicating the station may be taking a break
            return;
        } else if (!this.currentTrack.artist && this.currentTrack.title !== undefined) {
            // Returning the message indicating missing data
            return ['[Air break]', null, null, this.stationArt, '', '', true];
        }

        // filter the values after they've been defined above
        this.currentTrack.title = filterSongDetails(this.currentTrack.title);
       if (this.currentTrack.artist) {
            this.currentTrack.artist = this.applyFilters('artist', this.cleanupArtist(this.currentTrack.artist));
        }
        this.currentTrack.album = this.applyFilters('album', this.currentTrack.album) || '';

        // If the album is labeled as "single," set the album to the song title
        if (/single/i.exec(this.currentTrack.album) || (this.currentTrack.album.toLowerCase().includes('single'))) {
            this.currentTrack.album = filterSongDetails(this.currentTrack.title);
        }

        // If albumArt is empty, assign the fallback URL
        this.currentTrack.albumArt = this.currentTrack.albumArt || urlCoverArt;

        return [this.currentTrack.title, this.currentTrack.artist, this.currentTrack.album, this.currentTrack.albumArt, this.currentTrack.spinUpdated, '', false];
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

       // Abort any previous fetch
        if (this.fetchAbortController) {
            this.fetchAbortController.abort();
        }
        // New controller for this request
        this.fetchAbortController = new AbortController();

        const signal = this.fetchAbortController.signal;
        const [lfmQueryUrl, mbQueryUrl] = this.constructQueryParams(currentSong, currentArtist, currentAlbum, queryType);

        try {
            const [lfmResponse, mbResponse] = await Promise.all([
                fetch(lfmQueryUrl, { signal }),  // Pass controller’s signal
                fetch(mbQueryUrl, { signal }),
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

            const finalAlbumArt = await this.upsizeImgUrl(
                currentArt && 
                !['mzstatic.com', 'blankart.jpg', '623304f1', 'b4df49b51c57', urlCoverArt].some(pattern => currentArt.includes(pattern)) 
                    ? currentArt 
                    : (lfmResult?.[0] || mbResult?.[0] || urlCoverArt)
            );

            if (lfmData.error !== 6 ) {

                // return album art, album, song, artist, lfm listeners & playcount
                if (lfmResult[7] && !this.getNestedValue(this.currentStationData, this.stationKey, 'duration', null)) {
                    this.duration = Number(lfmResult[7]);
                    console.log('this.duration', this.duration)
                } 
                return [finalAlbumArt, lfmResult[1] || currentAlbum || '', lfmResult[2] || currentSong, lfmResult[3] || currentArtist, lfmResult[4] || null, lfmResult[5] || null];
            } else {
                // return album art, album, song, artist, lfm listeners & playcount
                return [finalAlbumArt, currentAlbum || '', currentSong, currentArtist, null, null];
            }
            

        } catch (error) {
            if (error.name === 'AbortError') {
                // Handle fetch abort (optional: just quietly ignore)
                console.log('Fetch aborted');
                return null;
            }
            // Handle other errors
            console.error('Error fetching LFM/MB data:', error);
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
            return /^https?:\/\//i.test(url);
        };

        const effectiveUrl = isAbsoluteUrl(artworkUrl) ? artworkUrl : `../${artworkUrl}`;

        return new Promise((resolve) => {
            const img = new Image();
            img.src = effectiveUrl;

            img.onload = () => {
                resolve(effectiveUrl);
            };

            img.onerror = () => {
                resolve(null);
            };
        });
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

            if (!this.stationKey) return;

            // check if the last time it updated is still in the future
            if (((this.lastKnownUpdatedTime - Date.now()) < 35000) && ((this.lastKnownUpdatedTime - Date.now()) > 70000) && !this.shouldReloadStream) {
                // check again, since that's a long time to go in a song
                console.log('this.lastKnownUpdatedTime is a bit too far in the future, checking again', (this.lastKnownUpdatedTime - Date.now()) / 1000);
            } else if (((this.lastKnownUpdatedTime - Date.now()) > 20000) && !this.shouldReloadStream) {
                console.log('this.lastKnownUpdatedTime > Date.now', (this.lastKnownUpdatedTime - Date.now()) / 1000);
                return;
            }

            if (this.stationKey === 'cbcmusic') {
                if (!document.querySelector('.mytuner-widget')) {
                        this.appendMytunerWidget();
                    }
            } else {
                // Remove the widget and scripts for non-cbcmusic stations
                this.removeMytunerWidget();
            }

            if (this.isPlaying && !this.shouldReloadStream) {

                let stationApiUrl;
                if (!this.stationApiUrl) {
                    if (this.getNestedValue(this.currentStationData, this.stationKey, 'spinPath', null)) {
                        stationApiUrl = `https://widgets.spinitron.com/widget/now-playing-v2?callback=_spinitron206170750999458&station=${this.getNestedValue(this.currentStationData, this.stationKey, 'spinPath', null)}&num=0&sharing=0&player=0&cover=0&merch=0&meta=0`;
                    } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'orbPath', null)) {
                        stationApiUrl = `https://scraper2.onlineradiobox.com/${this.getNestedValue(this.currentStationData, this.stationKey, 'orbPath', null)}?l=0`;

                        console.log('obPath condition', stationApiUrl, this.stationKey)
                    } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'nprPath', null) && !this.getNestedValue(this.currentStationData, this.stationKey, 'dataPath', null)) {
                        stationApiUrl = `https://api.composer.nprstations.org/v1/widget/${this.getNestedValue(this.currentStationData, this.stationKey, 'nprPath', null)}/tracks?format=json&limit=2&hide_amazon=false&hide_itunes=false&hide_arkiv=false&share_format=false`;
                    } else {
                        if (this.getNestedValue(this.currentStationData, this.stationKey, 'proxyApi', null)) {
                            stationApiUrl = `https://scrobblerad.io/proxy.php?url=${this.getNestedValue(this.currentStationData, this.stationKey, 'apiUrl', null)}`;
                        } else {
                            stationApiUrl = this.getNestedValue(this.currentStationData, this.stationKey, 'apiUrl', null);
                        }
                    }
                    this.stationApiUrl = stationApiUrl;
                }

                fetch(this.addCacheBuster(this.stationApiUrl))
                    .then((response) => {
                        const contentType = response.headers.get('content-type');
                        
                        // Check if contentType exists before calling includes
                        if (contentType && (contentType.includes('application/json') || 
                            contentType.includes('application/vnd.api+json') || 
                            (this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null) && !this.getNestedValue(this.currentStationData, this.stationKey, 'htmlString', null)))) {
                            return response.json().then((data) => ({ data, contentType }));
                            
                        } else if (contentType && (contentType.includes('text/html') || 
                            (this.getNestedValue(this.currentStationData, this.stationKey, 'jsonString', null)) && contentType.includes('text/plain') ||  
                            contentType.includes('application/javascript'))) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else if (contentType && (contentType.includes('text/xml'))) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else {
                            return;
                            //throw new Error(`Unsupported content type or missing content-type header: ${contentType}`);
                        }
                    })
                    .then(({ data, contentType }) => {
                        if (contentType && contentType.includes('text/html') && 
                            !this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null) && this.stationKey !== 'cbcmusic') {
                            
                            // Parse the HTML response
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(data, 'text/html');
                            data = this.extractDataFromHTML(doc);  
                        } else if (contentType && contentType.includes('text/html') && this.stationKey == 'cbcmusic' && window.mytuner_scripts.mytunerMeta !== '') {

                            console.log("window.mytuner_scripts.mytunerMeta", window.mytuner_scripts.mytunerMeta)

                            if (window.mytuner_scripts.mytunerMeta !== null) {
                                data = window.mytuner_scripts.mytunerMeta;
                            } else {
                                return;
                            }
                        } else if (contentType && contentType.includes('application/javascript')) {
                            // Extract the HTML content from the JavaScript response
                            const htmlContent = this.extractHTMLFromJS(data);
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');
                            data = this.extractDataFromHTML(doc);
                        } else if (contentType && contentType.includes('text/plain') && !this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null)) {
                            data = this.extractJsonFromJS(data);
                        } else if (contentType && contentType.includes('text/html') && 
                                    (this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null) && !this.getNestedValue(this.currentStationData, this.stationKey, 'htmlString', null)) || this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null) && contentType.includes('text/plain') || this.getNestedValue(this.currentStationData, this.stationKey, 'phpString', null) && contentType.includes('text/html')) {
                            data = String(data);
                        } else if (contentType && contentType.includes('text/html') && 
                                   this.getNestedValue(this.currentStationData, this.stationKey, 'htmlString', null)) {
                            const htmlContent = data;
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');

                            data = this.extractDataFromHTML(doc);
                        } else if (contentType && contentType.includes('text/xml')) {
                            data = this.extractDataFromXML(data);  
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

        if (this.getNestedValue(this.currentStationData, this.stationKey, 'htmlString', null)) {
            targetSelector = ['div.song-details:first-child', '.radio-song-title', ' p:first-child', ' .album-title', ' .album-art', ' p:last-child']
        } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'xmlString', null)) {
            targetSelector = ['Entry', '[Title]', '[Artist]', '[Album]', '[MusicId]', '[StartTime]']
        } else {
            targetSelector = ['', '.song', '.artist', '.release', 'img', '.spin-time a']
        }

        this.currentTrack = {
            ...this.currentTrack,
            title: replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[1]}`)?.textContent.trim() || 'No streaming data currently available'),
            artist: replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[2]}`)?.textContent.trim() || ''),
            album: replaceEnDashWithEmDash(doc.querySelector(`${targetSelector[0]}${targetSelector[3]}`)?.textContent.trim() || ''),
            albumArt: doc.querySelector(`${targetSelector[4]}`)?.src || '',
            spinUpdated: doc.querySelector(`${targetSelector[0]}${targetSelector[5]}`)?.textContent.trim() || '',
        }

        // Return the extracted data in the format expected by processData
        return [this.currentTrack.title, this.currentTrack.artist, this.currentTrack.album, this.currentTrack.albumArt, this.currentTrack.spinUpdated];
    }

    // Helper function to extract necessary data from HTML response
    extractDataFromXML(doc) {

        const removeAsterisk = str => str.replace(/\*/g, '');
        let entries;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(doc, "text/xml");

        // Determine the correct tag name for entries
        const entryTagName = this.getNestedValue(this.currentStationData, this.stationKey, 'xmlString', null) || "Entry";
        entries = xmlDoc.getElementsByTagName(entryTagName);

        if (entries.length === 0) {
            console.log("No entries found in the XML.");
            return { song: 'No streaming data currently available', artist: '', album: '', albumArt: '', spinUpdated: '' };
        }

        // Check if the first entry has attributes (second XML format)
        const isAttributeBased = entries[0].attributes && entries[0].attributes.Title;

        // Extract data based on the format
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            if (isAttributeBased) {
                // Attribute-based XML format

                this.currentTrack = {
                    ...this.currentTrack,
                    title: removeAsterisk(entry.attributes.Title ? entry.attributes.Title.value : 'No streaming data currently available'),
                    artist: entry.attributes.Artist ? entry.attributes.Artist.value : '',
                    album: entry.attributes.Album ? entry.attributes.Album.value : '',
                    timestamp: entry.attributes.StartTime ? entry.attributes.StartTime.value : '',
                }

                console.log('isAttributeBased')
            } else {
                // Tag-based XML format
                this.currentTrack = {
                    ...this.currentTrack,
                title: (entry.querySelector(this.getNestedValue(this.currentStationData, this.stationKey, 'song', null)) || {}).textContent || 'No streaming data currently available',
                artist: (entry.querySelector(this.getNestedValue(this.currentStationData, this.stationKey, 'artist', null)) || {}).textContent || '',
                album: (entry.querySelector(this.getNestedValue(this.currentStationData, this.stationKey, 'album', null)) || {}).textContent || '',
                timestamp: (entry.querySelector(this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp', null)) || entry.attributes[this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp', null)] || {}).textContent || '',
                }
            }

            // Return the extracted data for the first entry
            return [this.currentTrack.title, this.currentTrack.artist, this.currentTrack.album, this.currentTrack.timestamp];
        }

        // Return a default value if no entries are found (though we already checked for this)
        return { song: 'No streaming data currently available', artist: '', album: '', albumArt: '', spinUpdated: '' };
    }



   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }      

    updateScrobbleData(song, artist, album) {
        if (song && artist && album) {
            const currentScrobble = {
              trackTitle: song,
              trackArtist: artist,
              trackAlbum: album,
              trackTimestamp: Math.floor(Date.now() / 1000) // ✅ timestamp in seconds
            };

            updateNowPlaying(currentScrobble);

            if (this.currentScrobble !== currentScrobble || !this.currentScrobble) {
                if (this.currentScrobble && this.currentScrobble !== currentScrobble) { // Song has changed
                    if (this.scrobbleTimeout) {
                        clearTimeout(this.scrobbleTimeout); // Clear existing timeout
                        this.scrobbleTimeout = null;
                    }

                    if (this.songStartTime && (Date.now() - this.songStartTime >= 60000)) {
                        scrobbleIt(this.currentScrobble); // Scrobble the previous song
                    }

                    this.songStartTime = null; // Reset song start time
                }

                this.currentScrobble = currentScrobble;

                // Set a new 60-second timer for the current song
                if (this.currentScrobble && !this.songStartTime) {
                    this.songStartTime = Date.now();
                    this.scrobbleTimeout = setTimeout(() => {
                        if (this.currentScrobble) {
                            scrobbleIt(this.currentScrobble);
                        }
                    }, 60000);
                } 
            }
        }    
    }                          

    processData(data) {
        // Check if data and stationKey are available
        if (data && this.stationKey ) {

            if ((this.lastKnownUpdatedTime > Date.now())) {
                console.log("this.lastKnownUpdatedTime is greater", this.lastKnownUpdatedTime, Date.now())
            } else {
                console.log("this.lastKnownUpdatedTime is less", this.lastKnownUpdatedTime, Date.now())
            }

            const extractedData = this.extractSongAndArtist(data, this.stationKey);

             // Compare the extractedData response with the previous one
            if ((JSON.stringify(this.prevExtractedData) === JSON.stringify(extractedData)) && navigator.mediaSession.metadata.title !== 'Station data loading') {
                console.log('extracted data the same, returning')
                return;
            } else {
                this.prevExtractedData = extractedData;
            }

            // Ensure extractedData is valid and handle cases where no song or artist is found
            if (!extractedData || extractedData.length === 0) {
                const page = new Page(this.stationKey, this);
                page.refreshCurrentData(['[ Air break ]', '', '', this.stationArt, null, null, true]);
                return;
            }

            this.hasLoadedData = true;
            const [song, artist, album, albumArt, spinUpdated, queryType, errorMsg] = extractedData;     

            // Predefined values
            const timezone = this.getNestedValue(this.currentStationData, this.stationKey, 'timezone', null);

            if ([this.stationKey] == 'indie1023') {
                this.currentTrack.timestamp = `${this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp[0]', null))} ${this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp[1]', null))} GMT-06:00`;
                    console.log('102.3 timestamp', this.currentTrack.timestamp);
            } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'reverseArray', null)) {
                this.currentTrack.timestamp = this.getPath(data, this.getLastJsonPath(this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp', null), data)); 
                console.log('timestamp reverse array', this.currentTrack.timestamp);
            } else {
                this.currentTrack.timestamp = this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp', null));

                if (this.currentTrack.timestamp == 0 || this.currentTrack.timestamp == '') {
                    this.currentTrack.timestamp = undefined;
                }
            }

            if (this.getNestedValue(this.currentStationData, this.stationKey, 'altPath', null) && (!this.currentTrack.title || !this.currentTrack.timestamp)) {
                if ([this.stationKey] == 'indie1023') {
                    this.currentTrack.timestamp = `${this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp[2]', null))} ${this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp[3]', null))}`;
                    console.log('102.3 timestamp', this.currentTrack.timestamp);
                } else {
                    this.currentTrack.timestamp = this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp2', null));
                    this.currentTrack.duration = this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'duration2', null));
                    console.log('altpath timestamp', this.currentTrack.timestamp);
                }
            } else if (this.getNestedValue(this.currentStationData, this.stationKey, 'altPath', null) && this.currentTrack.timestamp) {

                if (this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp2', null)) > this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'timestamp', null))) {
                    console.log("timestamp2 is greater than timestamp");
                }
            }

            // Format and check stale data in a separate function
            const { staleData } = this.checkStaleData(timezone, this.currentTrack.timestamp, this.currentTrack.spinUpdated, this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'duration', null)), this.getPath(data, this.getNestedValue(this.currentStationData, this.stationKey, 'trackEnd', null)), song);

            if ((staleData === "Live365 past" || staleData === "Still future") && (song)) {
                    return;   
            } else if ([this.stationKey] == 'indie1023' && song == "[Air break]") {
                const page = new Page(this.stationKey, this);
                page.refreshCurrentData(['[ Air Break ]', '', '', this.stationArt, null, null, true]);
                return;
            } else if (song == "[Air break]" && !staleData ) {
                const page = new Page(this.stationKey, this);
                page.refreshCurrentData([song, '', '', this.stationArt, null, null, true]);
                return;
            }

            // Handle stale data or invalid song
            if ((staleData) || song === 'No streaming data currently available' || errorMsg) {
                const page = new Page(this.stationKey, this);
                page.refreshCurrentData([(staleData || song), '', '', this.stationArt, null, null, true]);
                return;
            }

            // Ensure this code doesn't run unless there's new data to process
            if (!this.lfmMetaChanged || (song.toLowerCase() !== this.song.toLowerCase())) {
                
                // First, get the metadata from last.fm
                this.getLfmMeta(song, artist, album, albumArt, '', '', false).then(lfmValues => {
                    const [lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount] = lfmValues || [urlCoverArt, '', song, artist, '', ''];

                    this.song = lfmSong || this.currentTrack.title;
                    this.artist = lfmArtist || this.currentTrack.artist;
                    this.album = lfmAlbum || this.currentTrack.album || lfmSong;
                    this.artworkUrl = lfmArt || this.currentTrack.albumArt || urlCoverArt;

                    this.updateScrobbleData(this.song, this.artist, this.album);

                    this.listeners = lfmListeners || null;
                    this.playcount = lfmPlaycount || null;
                    this.lfmMetaChanged = true;

                    const page = new Page(this.stationKey, this);
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
        // Ensure obj is an object and prop is a string
        if (!obj || typeof obj !== 'object' || typeof prop !== 'string' || !prop.trim()) {
            return undefined;
        }

        // Split the property path by "." for multi-layer paths
        const parts = prop.split(".");
        let current = obj;

        // Traverse the object for each part of the path
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (!current || !Object.prototype.hasOwnProperty.call(current, part)) {
              
                //Figure out how to get this to show when there genuinely is missing data and not all the time
              //  this.currentPage.refreshCurrentData([`No station data found`, '', '', this.stationArt, null, null, true]);
                return undefined;
            }

            current = current[part]; // Drill down into the object
        }

        return current; // Return the final value
    }



    play() {
        if (!this.audio.src) return;

        // Check if the stream should be reloaded based on page visibility
        if (this.shouldReloadStream) {
            console.log("the stream is reloading");
            this.handleStationSelect(null, this.stationKey, this.stationDisplayName, false); // Reload the stream
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
            const page = new Page(this.stationKey, this);
            page.refreshCurrentData([`Press reload to refresh feed`, '', '', this.stationArt, null, null, true]);
            document.getElementById("playermeta").classList.add("opacity-50");
            if (this.hls) {
                this.destroyHLSAndResetAudio();
            }
            this.shouldReloadStream = true;
        }, 30000);
    }


    togglePlay() {
        // Clear scrobble timeout when playback stops
        if (this.currentPage && this.currentPage.scrobbleTimeout) {
            clearTimeout(this.currentPage.scrobbleTimeout);
            console.log("Scrobble timeout cleared due to playback stop.");
            this.currentPage.scrobbleTimeout = null;
        }

        this.isPlaying ? this.pause() : this.play();
    }

    skipForward() {
        this.calculateNextAndPreviousIndices('next');
        const nextStationKey = this.nextStationKey;
        console.log('this.nextStationKey', this.nextStationKey, this.nextStationDisplayName);
        const nextStationDisplayName = this.nextStationDisplayName;
        this.stationApiUrl = null;
        this.handleStationSelect(null, nextStationKey, nextStationDisplayName, true);
    }

    skipBackward() {
        this.calculateNextAndPreviousIndices('previous');
        const prevStationKey = this.previousStationKey;
        const prevStationDisplayName = this.previousStationDisplayName;
        this.stationApiUrl = null;
        this.handleStationSelect(true, prevStationKey, prevStationDisplayName, true);
    }



    onTagSelected(tag) {
        this.currentTag = tag;
        generateRadioButtons(this.currentTag);
    }


    onAllTagsSelected() {
        this.currentTag = "all";
        generateRadioButtons("all");
    }

    reloadStream() {
        this.shouldReloadStream = true;
        console.log('reload working');
        this.currentPage.refreshCurrentData([`Station data loading`, '', '', this.stationArt, null, null, true]);
        this.playButton.lastElementChild.className = "spinner-grow text-light";

        // Reset scrobble (assuming scrobbleReset is a method)
        if (typeof this.scrobbleReset === 'function') {
            this.scrobbleReset();
        }

        // Destroy existing instances before reloading
        if (this.currentPage) {
            this.currentPage.destroy();
            this.currentPage = null;
        }

        // Reload the current station
        this.calculateNextAndPreviousIndices();
        const currentStationKey = stationKeys[this.currentIndex];

        console.log('this.currentIndex', this.currentIndex);
        this.handleStationSelect(true, currentStationKey, null, true);
    }

    scrobbleReset() {
        if (this.currentPage && this.currentPage.scrobbleTimeout) {
            clearTimeout(this.currentPage.scrobbleTimeout);
            this.currentPage.scrobbleTimeout = null;
        }
    }

    destroy() {
        if (this.fetchAbortController) {
            this.fetchAbortController.abort();
            this.fetchAbortController = null;
        }

        // Remove event listeners
        this.playButton.removeEventListener('click', this.togglePlay);
        this.skipForwardButton.removeEventListener('click', this.skipForward);
        this.skipBackButton.removeEventListener('click', this.skipBackward);
        this.reloadStreamButton.removeEventListener('click', this.reloadStream);

        // Clear intervals and timeouts
        clearInterval(this.streamingInterval);
        clearTimeout(this.debounceTimeout);
        clearTimeout(this.pauseTimeout);
        clearTimeout(this.scrobbleTimeout);

        // Destroy class instances
        if (this.currentPage) {
        this.currentPage.destroy();
        this.currentPage = null;
        }

        // Clear DOM references
        this.audio = null;
        this.hls = null;
        this.currentStationData = null;
        this.previousDataResponse = null;
        this.prevExtractedData = null;
    }
}