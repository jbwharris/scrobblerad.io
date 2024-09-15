const urlCoverArt = "img/defaultArt.png";
const stationKeys = Object.keys(stations);
let skipCORS = '';

async function generateRadioButtons() {
  const skipCORS = await isCORSEnabled('https://api.wnyc.org/api/v1/whats_on/');

  const stationSelectDiv = document.getElementById('stationSelect');
  
  // Clear the container to prevent duplicates
  stationSelectDiv.innerHTML = '';

  const fragment = document.createDocumentFragment();

  // Iterate through station keys and remove stations with CORS if skipCORS is false
  Object.keys(stations).forEach((stationKey) => {
    const station = stations[stationKey];
    // Remove the station if CORS is enabled and we need to skip CORS stations
    if (skipCORS === false && station.cors) {
      delete stations[stationKey];
    }
  });

  // Now filter and generate buttons for remaining stations
  const filteredStationKeys = Object.keys(stations); // Now this contains only non-CORS stations

  filteredStationKeys.forEach((stationKey) => {
    const station = stations[stationKey];
    const button = document.createElement('button');
    button.name = stationKey; // Set the button's name to the stationKey
    button.textContent = station.stationName;
    
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'station';
    input.value = stationKey;
    input.checked = stationKey === radioPlayer.stationName;

    // Attach the input to the button
    button.appendChild(input);
    fragment.appendChild(button);
  });

  stationSelectDiv.appendChild(fragment);

  // Event delegation: Add a single event listener to the parent container
  stationSelectDiv.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('button');
    if (clickedButton) {
      event.preventDefault(); // Prevent the default button behavior
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
    const iconElement = document.querySelector("#togglePanels .icon-hide-panels, #togglePanels .icon-show-panels"); // Target either icon class

    // Toggle the panels
    leftPanel.classList.toggle("show");
    centrePanel.classList.toggle("grow");
    rightPanel.classList.toggle("show");

    // Check if we have an icon to toggle
    if (iconElement) {
      // Toggle between the two icon classes
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


async function isCORSEnabled(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors', // CORS mode
    });

    // If the response is ok, CORS is allowed
    if (response.ok) {
      return true;
    } else {
      // CORS is enforced but not allowed by the server
      return false;
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // CORS is likely active and blocking the request
      return false;
    } else {
      return false;
    }
  }
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
        this.displayStationName = stations[stationName].stationName;
        this.radioPlayer = radioPlayer;

        this.cacheDOMElements();
        this.setupMediaSession('', '', '');

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
        const [song, artist, album, artworkUrl, listeners, playcount, , currentStationData] = values;

        setTimeout(() => {
            const updateMetadata = () => {
                if ((!song && !artist) || !artworkUrl || !currentStationData[this.stationName]) {
                    return;
                }

                const playerMetaElement = document.querySelector('div.playermeta');
                playerMetaElement.textContent = ''; // Clear existing content

                const template = document.querySelector('#meta');
                const clone = document.importNode(template.content, true);

                // Update the template content with the current data
                clone.querySelector('#title').textContent = song;
                clone.querySelector('#artist').textContent = artist;
                clone.querySelector('#album').textContent = album;
                clone.querySelector('#listeners').textContent = 
                    listeners !== null && playcount !== null ? `Listeners: ${this.formatCompactNumber(listeners)} | Plays: ${this.formatCompactNumber(playcount)}` : '';

                clone.querySelector('#albumArt').src = artworkUrl; // Update the image source
                clone.querySelector('#albumArt').alt = `${song} by ${artist}`;
                const radioNameLink = clone.querySelector('#radioNameLink');
                radioNameLink.href = currentStationData[this.stationName].webUrl;
                clone.querySelector('#radioName').textContent = currentStationData[this.stationName].stationName;
                clone.querySelector('#stationLocation').textContent = currentStationData[this.stationName].location;

                playerMetaElement.appendChild(clone);

                const backgroundUrl = artworkUrl === urlCoverArt ? `url("../${artworkUrl}")` : `url("${artworkUrl}")`;
                document.documentElement.style.setProperty("--albumArt", backgroundUrl);

                // Animate the entire playermeta container
                animateElement(playerMetaElement);

                // Simulate a click on #panel2 after the animation
                document.querySelector('#panel2').click();

                this.setupMediaSession(song, artist, artworkUrl);
            };

            // Prefetch the image and call updateMetadata once it's loaded
            const img = new Image();
            img.onload = () => {
                setTimeout(updateMetadata, 0); // Call updateMetadata immediately after the image has loaded
            };
            img.src = artworkUrl; // Trigger the image loading
        }, 1500);
    }

    setupMediaSession(song, artist, artworkUrl) {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song,
                artist: artist || '',
                album: `Now playing on ${this.displayStationName}` || '',
                duration: Infinity,
                startTime: 0,
                artwork: [{ src: artworkUrl }],
            });

            // Update document title
            if (song && artist) {
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
        this.currentStationData = null;
        this.audio = new Audio();
        this.playButton = buttonElement;
        this.skipForwardButton = skipForwardButton;
        this.skipBackButton = skipBackButton;
        this.reloadStreamButton = reloadStreamButton;
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

                // Scroll the selected station into view
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
            document.addEventListener("DOMContentLoaded", () => {
                navigator.serviceWorker
                    .register("serviceWorker.js")
                    .then(() => console.log("Service worker registered"))
                    .catch((err) => console.log("Service worker not registered", err));
            }, { once: true });
        }
    }

    calculateNextAndPreviousIndices() {
        this.currentIndex = stationKeys.indexOf(this.stationName);

        const nextStation = stationKeys[(this.currentIndex + 1) % stationKeys.length];
        const previousStation = stationKeys[(this.currentIndex - 1 + stationKeys.length) % stationKeys.length];

        const nextStep = (stations[nextStation].cors && !skipCORS) ? 2 : 1;
        const previousStep = (stations[previousStation].cors && !skipCORS) ? 2 : 1;

        this.nextIndex = (this.currentIndex + nextStep) % stationKeys.length;
        this.previousIndex = (this.currentIndex - previousStep + stationKeys.length) % stationKeys.length;
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

    async handleStationSelect(direction, stationName, firstRun) {
        if (!stationName || direction === false) return;

        const stationData = await this.loadStationData(`/js/stations/${stationName}.js`);
        if (!stationData) return;

        this.currentStationData = stationData;

        // Clear any existing streaming intervals
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }

        if (firstRun) {
            this.playButton.lastElementChild.className = "spinner-grow text-light";
            this.lfmMetaChanged = false;
            console.log(stationName);
            this.stationName = stationName;
            this.updateArt = true;
            this.isPlaying = true;
            firstRun = false;
        }

        const debouncedSetupAudio = this.debounce(() => {
            if (!this.isPlaying) return;

            if (!this.currentStationData[this.stationName]) {
                console.error("currentStationData is undefined or null");
                return;
            }

            const currentStationName = this.currentStationData[this.stationName].stationName;

            const newAudio = new Audio(this.addCacheBuster(this.currentStationData[this.stationName].streamUrl));

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

            const page = new Page(this.stationName, this);

            if (stations[stationName].stationName === this.currentStationData[stationName].stationName) {
                document.title = `${this.currentStationData[stationName].stationName} currently loading`;
            }

            const radioInput = document.querySelector(`input[name='station'][value='${stationName}']`);
            if (radioInput) radioInput.checked = true;

            window.location.hash = `#${stationName}`;
        }, 250);

        debouncedSetupAudio();
    }


    cleanupArtist(artist) {
        // Define patterns to find additional artists or features.
        const patterns = [/ x .*/, / feat\..*/];

        let cleanedArtist = artist;

        patterns.forEach((pattern) => {
            cleanedArtist = cleanedArtist.replace(pattern, '');
        });

        return cleanedArtist.trim();
    }   

    getFilterSet() {
        return {
            artist: [MetadataFilter.normalizeFeature],
            track: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion, MetadataFilter.youtube],
            album: [MetadataFilter.removeRemastered, MetadataFilter.removeFeature, MetadataFilter.removeLive, MetadataFilter.removeCleanExplicit, MetadataFilter.removeVersion],
        };
    }

    // Create a method to filter a field using the filter set
    applyFilters(field, value) {
        const filter = MetadataFilter.createFilter(this.getFilterSet());
        return filter.filterField(field, value);
    }

    extractSongAndArtist(data, stationName) {
        const replaceApostrophe = str => str?.replace(/&apos;|’|‘|‚|‛|`|´/g, "'") || '';
        const getMetadata = (key) => this.getPath(data, this.currentStationData[this.stationName][key]);

        let song = getMetadata('song');
        let artist = getMetadata('artist');
        let album = getMetadata('album');
        let albumArt = getMetadata('albumArt');

        if (this.currentStationData[this.stationName].altPath && !song) {
            song = getMetadata('song2');
            artist = getMetadata('artist2');
        }

        if (this.currentStationData[this.stationName].orbPath) {
            const regexPattern = this.currentStationData[this.stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data.title);

            if (match) {
                [artist, song, album] = match.slice(1, 4).map((str) => str?.trim());
                if (this.currentStationData[this.stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            }
        }

        if (this.currentStationData[this.stationName].stringPath) {
            const regexPattern = this.currentStationData[this.stationName].pathRegex || /^(.*?)\s+-\s+(.*?)(?:\s+-\s+([^-\n]*))?(?:\s+-\s+(.*))?$/;
            const match = regexPattern.exec(data);

            if (match) {
                song = match[1]?.trim() || '';
                artist = match[2]?.trim() || '';
                album = match[3]?.trim() || '';
                albumArt = match[4]?.trim() || urlCoverArt;

                if (this.currentStationData[this.stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            }
        }

        // Cleanup the artist name
        artist = this.cleanupArtist(artist);

        // Apply filtering before returning
        song = this.applyFilters('track', song)
                .replace(/\s*\(.*?version.*?\)/gi, '')   // Removes text in brackets containing "version"
                .replace(/\s*\(.*?edit.*?\)/gi, '')      // Removes text in brackets containing "edit"
                .replace(/[\(\[]\d{4}\s*Mix[\)\]]/i, '') // Removes text in parentheses or square brackets containing "Mix"
            .trim();
        artist = this.applyFilters('artist', artist);
        album = this.applyFilters('album', album);

        // Helper function to check if a string contains any of the filtered values
        const containsFilteredValue = (text, values) => {
            if (!text) return false; // Ensure text is defined
            return values.some(value => text.includes(value));
        };

        // Check for filtered values or station name and return true if any are present
        const checkInvalidContent = (text) => {
            const filteredValues = this.currentStationData[this.stationName].filter || [];
            const stationNameValue = this.currentStationData[this.stationName].stationName;

            return containsFilteredValue(text, filteredValues) || containsFilteredValue(text, [stationNameValue]);
        };

        if (checkInvalidContent(song) || checkInvalidContent(artist)) {
            return ['Station may be taking a break', null, null, urlCoverArt];
        } else if ((!song && !artist)) {
            return ['Station data is currently missing', null, null, urlCoverArt];
        }

        // Apply replaceApostrophe before returning
        song = replaceApostrophe(song);
        artist = replaceApostrophe(artist);
        album = replaceApostrophe(album);

        // If the album is labeled as "single," set the album to the song title
        if (/single/i.exec(album)) {
            return [song, artist, song, albumArt];
        }

        // If albumArt is empty, assign the fallback URL
        albumArt = albumArt || urlCoverArt;

        return [song, artist, album, albumArt];
    }


    getLfmMeta(currentSong, currentArtist, currentAlbum) {
        return new Promise((resolve, reject) => {
            if (currentSong !== '' && currentArtist !== '') {
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

                const lfmQueryUrl = `https://ws.audioscrobbler.com/2.0/?method=${lfmMethod}&artist=${encodeURIComponent(this.applyFilters('artist', currentArtist))}&${lfmQueryField}=${encodeURIComponent(this.applyFilters(lfmQueryField, lfmDataField))}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&autocorrect=1&format=json&limit=1`;

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
                                lfmAlbum = this.applyFilters('album', lfmData.album?.name) || currentAlbum || '';
                                lfmSong = currentSong || 'No streaming data currently available';
                                lfmArtist = this.applyFilters('artist', lfmData.album?.artist) || currentArtist || '';
                                lfmListeners = lfmData.album.listeners || null;
                                lfmPlaycount = lfmData.album.playcount || null;
                            } else {
                                lfmArt = lfmData.track?.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = this.applyFilters('album', lfmData.track?.album?.title) || currentAlbum || '';
                                lfmSong = this.applyFilters('track', lfmData.track?.name) || currentSong || 'No streaming data currently available';
                                lfmArtist = this.applyFilters('artist', lfmData.track?.artist?.name) || currentArtist || '';
                                lfmListeners = lfmData.track.listeners || null;
                                lfmPlaycount = lfmData.track.playcount || null;
                            }
                        } else if (lfmMethod === 'album.getInfo') {
                            // Retry with track.getInfo if album.getInfo fails
                            this.getLfmMeta(currentSong, currentArtist, '').then(resolve).catch(reject);
                            return;
                        } else {
                            lfmArt = urlCoverArt;
                            lfmAlbum = this.applyFilters('album', currentAlbum) || '';
                            lfmSong = this.applyFilters('track', currentSong) || 'No streaming data currently available';
                            lfmArtist = this.applyFilters('track', currentArtist) || '';
                            lfmListeners = null;
                            lfmPlaycount = null;
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
                let stationUrl = this.addCacheBuster(this.currentStationData[this.stationName].apiUrl);

                const fetchOptions = {
                    method: this.currentStationData[this.stationName].method || 'GET',
                    headers: this.currentStationData[this.stationName].headers || {},
                };

                fetch(stationUrl, fetchOptions)
                    .then((response) => {
                        const contentType = response.headers.get('content-type');
                        if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json' || this.currentStationData[this.stationName].phpString )) {
                            return response.json().then((data) => ({ data, contentType }));
                        } else if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else {
                            throw new Error(`Unsupported content type: ${contentType}`);
                        }
                    })
                    .then(({ data, contentType }) => {
                            if (contentType.includes('text/html') && !this.currentStationData[this.stationName].phpString) {
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
                            } else if (contentType.includes('text/html') && this.currentStationData[this.stationName].phpString) {

                                console.log('data', data);
                                data = data;
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
        const replaceEnDashWithEmDash = str => str.replace(/-/g, '—');

        const song = replaceEnDashWithEmDash(doc.querySelector('span.song')?.textContent.trim() || 'No streaming data currently available');
        const artist = replaceEnDashWithEmDash(doc.querySelector('span.artist')?.textContent.trim() || '');
        const album = replaceEnDashWithEmDash(doc.querySelector('span.release')?.textContent.trim() || '');
        const albumArt = doc.querySelector('img')?.src || '';

       // console.log(`${song} - ${artist} - ${album} - ${albumArt}`);

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
                page.refreshCurrentData(['No streaming data to show', '', '', urlCoverArt, null, null, true, this.currentStationData]);
                return;
            }

            // Data has successfully loaded at least once
            this.hasLoadedData = true;

            const [song, artist, album, albumArt] = extractedData;

            let staleData = '';
            const currentTimeMillis = new Date().getTime();

            // Extract the timestamp from the data
            let epochTimeString = this.getPath(data, this.currentStationData[this.stationName].timestamp) || this.getPath(data, this.currentStationData[this.stationName].timestamp2) || "";
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
                page.refreshCurrentData([staleData || song, '', '', urlCoverArt, null, null, true, this.currentStationData]);
                return;
            }

            if (this.isDataSameAsPrevious(data) && this.lfmMetaChanged && song === this.song) {
                return;
            }

            // Always call getLfmMeta the first time or if the song has changed

            if (!this.lfmMetaChanged || song.toLowerCase() !== this.song.toLowerCase()) {
                this.getLfmMeta(song, artist, album).then(lfmValues => {
                    const [lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount] = lfmValues || [urlCoverArt, '', song, artist, '', ''];

                    this.song = lfmSong;
                    this.artist = lfmArtist;
                    this.album = lfmAlbum;
                    if (lfmArt === urlCoverArt) {
                        this.artworkUrl = this.upsizeImgUrl(albumArt) || this.upsizeImgUrl(this.getPath(data, this.currentStationData[this.stationName].albumArt)) || urlCoverArt;
                    } else {    
                        this.artworkUrl = this.upsizeImgUrl(lfmArt);
                    }
                    this.listeners = lfmListeners;
                    this.playcount = lfmPlaycount;
                    
                    this.lfmMetaChanged = true;
                    
                    const page = new Page(this.stationName, this);
                    page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, true, this.currentStationData]);
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

        if (this.currentStationData[this.stationName].needPath === true) {
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

    reloadStream() {
        this.shouldReloadStream = true;
        console.log('reload working');
        this.playButton.lastElementChild.className = "spinner-grow text-light";
        this.calculateNextAndPreviousIndices();
        const currentStationKey = stationKeys[this.currentIndex];
        this.handleStationSelect(true, currentStationKey, true);
    }

    addCacheBuster(url) {
        const timestamp = new Date().getTime();
        if (this.stationName === 'radiowestern') {
            return url;
        } else {
            return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
        }
        
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
