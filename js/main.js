const urlCoverArt = "img/defaultArt.png";
let stationKeys = Object.keys(stations); // Change to let to allow modification
let skipCORS = ''; // This will store the result of CORS check

async function generateRadioButtons() {
  skipCORS = await isCORSEnabled('https://api.wnyc.org/api/v1/whats_on/'); // Use the outer variable

  const stationSelectDiv = document.getElementById('stationSelect');

  // Clear the container to prevent duplicates
  stationSelectDiv.innerHTML = '';

  const fragment = document.createDocumentFragment();

  // Filter station keys based on the CORS condition
  stationKeys = stationKeys.filter((stationKey) => {
    const station = stations[stationKey];
    if (skipCORS === false && station.cors) {
      delete stations[stationKey]; // Remove from stations object
      return false; // Filter out this station key
    }
    return true; // Keep the station
  });

  // Now generate buttons for the remaining stations
  stationKeys.forEach((stationKey) => {
    const station = stations[stationKey];
    const button = document.createElement('button');
    button.name = stationKey; // Set the button's name to the stationKey
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

    // Attach the input to the button
    button.appendChild(input);
    button.prepend(img);
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
        const [song, artist, album, artworkUrl, listeners, playcount, , currentStationData, errorMessage] = values;

        setTimeout(() => {
            const updateMetadata = () => {
                if ((!song && !artist) || !artworkUrl || !currentStationData[this.stationName]) {
                    return;
                }
                let stationArt;

                if (artworkUrl == urlCoverArt) {
                    stationArt = `img/stations/${this.stationName}.png`;
                } else {
                    stationArt = artworkUrl;
                }

                const playerMetaElement = document.querySelector('div.playermeta');
                playerMetaElement.textContent = ''; // Clear existing content

                const template = document.querySelector('#meta');
                const clone = document.importNode(template.content, true);

                // Update the template content with the current data
                clone.querySelector('#title').innerHTML = song;
                clone.querySelector('#artist').textContent = artist;
                clone.querySelector('#album').textContent = album;
                clone.querySelector('#listeners').textContent = 
                    listeners !== null && playcount !== null ? `Listeners: ${this.formatCompactNumber(listeners)} | Plays: ${this.formatCompactNumber(playcount)}` : '';

                clone.querySelector('#albumArt').src = stationArt || artworkUrl; // Update the image source
                clone.querySelector('#albumArt').alt = `${song} by ${artist}`;
                const radioNameLink = clone.querySelector('#radioNameLink');
                radioNameLink.href = currentStationData[this.stationName].webUrl;
                clone.querySelector('#radioName').textContent = currentStationData[this.stationName].stationName;
                clone.querySelector('#stationLocation').textContent = currentStationData[this.stationName].location;

                playerMetaElement.appendChild(clone);


                document.getElementById("playermeta").classList.remove("opacity-50");

                const backgroundUrl = artworkUrl === urlCoverArt ? `url("../${stationArt}")` : `url("${stationArt}")`;
                document.documentElement.style.setProperty("--albumArt", backgroundUrl);

                // Animate the entire playermeta container
                animateElement(playerMetaElement);

                // Simulate a click on #panel2 after the animation
                document.querySelector('#panel2').click();

                this.setupMediaSession(song, artist, artworkUrl, errorMessage);
            };

            // Prefetch the image and call updateMetadata once it's loaded
            const img = new Image();
            img.onload = () => {
                setTimeout(updateMetadata, 0); // Call updateMetadata immediately after the image has loaded
            };
            img.src = artworkUrl; // Trigger the image loading
        }, 1500);
    }

    setupMediaSession(song, artist, artworkUrl, errorMessage) {

        if (song.includes("<br/>")) {
            return;
        }

        let albumDisplay = '';
        if (errorMessage) {
            albumDisplay = '';
        } else if (artist == 'currently loading') {
            albumDisplay = ''
        } else if ((song && artist) && artist !== 'currently loading' ) {
            albumDisplay = `Now playing on ${this.displayStationName}`;
        }

        let stationArt;

        if (artworkUrl == urlCoverArt) {
            stationArt = `img/stations/${this.stationName}.png`;
        } else {
            stationArt = artworkUrl;
        }

        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song,
                artist: artist || '',
                album: albumDisplay || '',
                duration: Infinity,
                startTime: 0,
                artwork: [{ src: stationArt }],
            });


            // Update document title
            if (!song && !artist || artist == 'currently loading') {
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
        this.currentStationData = null;
        this.audio = new Audio();
        this.playButton = buttonElement;
        this.skipForwardButton = skipForwardButton;
        this.skipBackButton = skipBackButton;
        this.reloadStreamButton = reloadStreamButton;
        this.isPlaying = null;
        this.stationName = "";
        this.previousDataResponse = null;
        this.prevExtractedData = null;
        this.pauseTimeout = null; // Timer for pause duration
        this.shouldReloadStream = false; // Flag to indicate if the stream should be reloaded
        this.stations = document.querySelectorAll('.station');
        this.debounceTimeout = null; // Store debounce timeout ID
        this.firstRun = true;
        this.streamingInterval = null; // Initialize streamingInterval here
        this.canAutoplay = false;
        this.errorMessage = false;
        this.getLfmMeta = this.getLfmMeta.bind(this);
        this.songMetadataChanged = false;

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

        if (firstRun) {
            page.setupMediaSession(this.currentStationData[stationName].stationName, 'currently loading', urlCoverArt, false);
            page.refreshCurrentData([`${this.currentStationData[stationName].stationName}<br/> currently loading`, '', '', urlCoverArt, null, null, true, this.currentStationData], true);
            this.playButton.lastElementChild.className = "spinner-grow text-light";
            this.lfmMetaChanged = false;
            console.log(stationName);
            this.stationName = stationName;
            this.updateArt = true;
            this.isPlaying = true;
            this.songMetadataChanged = false;
            firstRun = false;
        }

        const debouncedSetupAudio = this.debounce(() => {
            if (!this.isPlaying) return;

            if (!this.currentStationData[this.stationName]) {
                console.error("currentStationData is undefined or null");
                return;
            }

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
            .trim() || '';                           // Fallback if string is empty

            const filterSongDetails = song => {
                if (!song) return ''; // Return an empty string if song is undefined
                return song
                    .replace(/\s*\(.*?version.*?\)/gi, '') // Removes text in brackets containing "version"
                    .replace(/\s-\s.*version.*$/i, '')    // Removes " - Radio Version" or similar
                    .replace(/\s*\(.*?edit.*?\)/gi, '')   // Removes text in brackets containing "edit"
                    .replace(/\s-\s.*edit.*$/i, '')       // Removes " - Radio Edit" or similar
                    .replace(/[\(\[]\d{4}\s*Mix[\)\]]/gi, '') // Removes text in parentheses or square brackets containing "Mix"
                    .replace(/\s*\([\d]{4}\s*Remaster(ed)?\)/gi, '') // Removes "(2022 Remaster)" or "(2022 Remastered)"
                    .replace(/\s*-\s*[\d]{4}\s*Remaster(ed)?/gi, '') // Removes "- 2022 Remaster" or "- 2022 Remastered"
                    .replace(/\s*\(.*?\bofficial\b.*?\)/gi, '') // Removes "(Official)" or variations like "(original & official)"
                    .replace(/\s*-\s*Remaster(ed)?/gi, '') // Removes "- Remaster" or "- Remastered" (CASE-INSENSITIVE)
                    .replace(/([\)\]])\s*\d{4}.*/, '$1') // Removes anything after a closing bracket if followed by a year (e.g., "1972")
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

        if (this.currentStationData[this.stationName].htmlPath) {
            song = filterSongDetails(data.song) || '';
            artist = this.applyFilters('artist', data.artist) || '';
            album = this.applyFilters('album', data.album) || '';
            albumArt = data.albumArt || '';
            spinUpdated = data.spinUpdated || '';
        }

        if (this.currentStationData[this.stationName].orbPath) {
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
                album = this.applyFilters('album', match[3]?.trim()) || '';
                albumArt = match[4]?.trim() || urlCoverArt;
                spinUpdated = match[5]?.trim() || '';

                if (this.currentStationData[this.stationName].flipMeta) {
                    [song, artist] = [artist, song];
                }
            } else {
                console.log('No match found');
            }
        }

        if (this.currentStationData[this.stationName].htmlPath) {

            if (match) {
                song = filterSongDetails(match[1]?.trim()) || '';
                artist = this.applyFilters('artist', match[2]?.trim()) || '';
                album = this.applyFilters('album', match[3]?.trim()) || '';
                albumArt = match[4]?.trim() || urlCoverArt;
                spinUpdated = match[5]?.trim() || '';

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
            return ['Station data contains filtered terms', null, null, urlCoverArt, '', '', true];
        } else if ((!song && !artist) || (song && !artist)) {
            // Returning the message indicating missing data
            return ['Station data is currently missing', null, null, urlCoverArt, '', '', true];
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

            if (mbData.releases?.length && (lfmData.error === 6 || isLfmArtMissing)) {
                mbResult = [
                        `https://coverartarchive.org/release/${mbData.releases[0]?.id}/front-500`,
                        this.applyFilters('album', mbData.releases[0]['release-group']?.title) || currentAlbum,
                        this.applyFilters('track', mbData.releases[0]?.title) || currentSong,
                        mbData.releases[0]['artist-credit'][0]?.name || currentArtist
                ];

                if ((mbResult[3] != currentArtist ) || (mbResult[2] != currentSong)) {

                    // check if the result is close enough to merit running again. Sometimes MB will fine a completely new artist or song, which isn't what we want
                    if ((this.jaccardSimilarity(mbResult[3], currentArtist) >= .6) || (this.jaccardSimilarity(mbResult[2], currentSong) >= .6)) {
                        this.songMetadataChanged = true;  // Flag the change
                        //if the result is similar enough to the currentArtist, rerun the function
                        return this.getLfmMeta(mbResult[2], mbResult[3], mbResult[1], mbResult[0], 'song');
                    }
                }

                if ((mbResult[0] !== '') && (!currentArt || isLfmArtMissing)) {
                    // return album art, album, song, artist, lfm listeners & playcount
                    return [mbResult[0], mbResult[1], mbResult[2], mbResult[3], lfmListeners, lfmPlaycount];
                }
            }

            let finalAlbumArt = currentArt && currentArt !== urlCoverArt ? currentArt : (lfmResult[0] || (mbResult ? mbResult[0] : urlCoverArt));

            if (lfmData.error !== 6 ) {
                // return album art, album, song, artist, lfm listeners & playcount
                return [finalAlbumArt, lfmResult[1] || currentAlbum || '', lfmResult[2] || currentSong, lfmResult[3] || currentArtist, lfmResult[4] || null, lfmResult[5] || null];
            } else {
                // return album art, album, song, artist, lfm listeners & playcount
                return [finalAlbumArt, currentAlbum || '', currentSong, currentArtist, null, null];
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
        mbQueryUrl = `https://musicbrainz.org/ws/2/release?fmt=json&query=title:+"${encodeURIComponent(this.applyFilters('track', currentSong))}"^3%20${encodeURIComponent(currentSong)}%20artistname:+"${encodeURIComponent(this.applyFilters('artist', currentArtist))}"^4${encodeURIComponent(this.applyFilters('artist', currentArtist))}&limit=3`;

        return [lfmQueryUrl, mbQueryUrl];
    }

    jaccardSimilarity(str1, str2) {
        const set1 = new Set(str1.toLowerCase().split(" "));
        const set2 = new Set(str2.toLowerCase().split(" "));
        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    checkUrlValidity(url) {
        return fetch(url, { method: 'HEAD' })
            .then(response => response.ok)
            .catch(error => {
                console.error('Error fetching URL:', url, error);
                return false;
            });
    }

    getStreamingData() {
        if (this.isPlaying || this.isPlaying == null) {
            
            if (!this.stationName) return;

            if ([this.stationName] == 'cbcmusic') {
                const cbcData = document.querySelector('span.player-radio-name span:last-child')?.textContent.trim() || '';

                console.log("cbcData", cbcData);

                // Compare the current data response with the previous one
                if (this.isDataSameAsPrevious(cbcData)) {
                    return;
                }

                // Store the current data response for future comparison
                this.previousDataResponse = cbcData;
                // Process the new data response
                this.processData(cbcData);
            }

            if (this.isPlaying && !this.shouldReloadStream) {

                let stationUrl = this.addCacheBuster(this.currentStationData[this.stationName].apiUrl);

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
                            contentType.includes('application/javascript'))) {
                            return response.text().then((data) => ({ data, contentType }));
                        } else {
                            throw new Error(`Unsupported content type or missing content-type header: ${contentType}`);
                        }
                    })
                    .then(({ data, contentType }) => {
                        if (contentType && contentType.includes('text/html') && 
                            !this.currentStationData[this.stationName].phpString) {
                            
                            // Parse the HTML response
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(data, 'text/html');
                            data = this.extractDataFromHTML(doc);
                            
                        } else if (contentType && contentType.includes('application/javascript')) {
                            // Extract the HTML content from the JavaScript response
                            const htmlContent = this.extractHTMLFromJS(data);
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(htmlContent, 'text/html');
                            data = this.extractDataFromHTML(doc);
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

                        // Add a property to store the timestamp of the last data update
                        this.lastDataUpdateTime = null;  // Initially null

                        // Your existing logic to check if the data is the same
                        if (this.isDataSameAsPrevious(data)) {
                            // Check if it's been more than 900 seconds since the last update
                            if (this.lastDataUpdateTime && (Date.now() - this.lastDataUpdateTime) > 900000) {
                                console.log("Data is the same, but it's now stale");
                                // Process the data even though it's the same because it's stale
                                this.previousDataResponse = data; // Update even if we skip processing
                                this.processData(data);
                            }
                            
                            return; // If data is the same and not stale, exit
                        } 

                        if (this.songMetadataChanged) {
                                console.log("Skipping update: song metadata was altered externally.");
                                this.songMetadataChanged = false; // Reset flag
                                return; // Stop further processing
                            }

                        console.log("Data changed, processing update.");

                        // Process the new data response
                        this.previousDataResponse = data; // Update even if we skip processing
                        this.processData(data);

                        // Update the timestamp to reflect the new data was processed
                        this.lastDataUpdateTime = Date.now();

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
        const replaceEnDashWithEmDash = str => str.replace(/—/g, '—');
        const replaceHyphenWithEmDash = str => str.replace(/—/g, '—');

        if (this.currentStationData[this.stationName].htmlString) {
            const htmlString = replaceHyphenWithEmDash(doc.querySelector('div.hidden-xs')?.textContent.trim() || 'No streaming data currently available').replace(/\s+/g,' ').trim();
            return htmlString;
        }

        const song = replaceEnDashWithEmDash(doc.querySelector('span.song')?.textContent.trim() || 'No streaming data currently available');
        const artist = replaceEnDashWithEmDash(doc.querySelector('span.artist')?.textContent.trim() || '');
        const album = replaceEnDashWithEmDash(doc.querySelector('span.release')?.textContent.trim() || '');
        const albumArt = doc.querySelector('img')?.src || '';
        const spinUpdated = doc.querySelector('td.spin-time a')?.textContent.trim() || '';

        // Return the extracted data in the format expected by processData
        return {song, artist, album, albumArt, spinUpdated};
    }

   // Function to compare the current data response with the previous one
    isDataSameAsPrevious(data) {
        // Compare data with previousDataResponse and return true if they are the same, false otherwise
        return JSON.stringify(data) === JSON.stringify(this.previousDataResponse);
    }

    changeTimeZone(date, timeZone) {
      if (typeof date === 'string') {
        return new Date(
          new Date(date).toLocaleString('en-US', {
            timeZone,
          }),
        );
      }

      return new Date(
        date.toLocaleString('en-US', {
          timeZone,
        }),
      );
    }                               

     processData(data) {
        // Check if data and stationName are available
        if (data && this.stationName) {
            const extractedData = this.extractSongAndArtist(data, this.stationName);

            // Ensure extractedData is valid and handle cases where no song or artist is found
            if (!extractedData || extractedData.length === 0) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData(['No streaming data to show', '', '', urlCoverArt, null, null, true, this.currentStationData], true);
                return;
            }

            this.hasLoadedData = true;
            const [song, artist, album, albumArt, spinUpdated, queryType, errorMsg] = extractedData;

            // Predefined values
            const timezone = this.currentStationData[this.stationName].timezone;
            let timestamp;

            if ([this.stationName] == 'indie1023') {
                timestamp = `${this.getPath(data, this.currentStationData[this.stationName].timestamp[0])} ${this.getPath(data, this.currentStationData[this.stationName].timestamp[1])}`;
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

            if (this.currentStationData[this.stationName].altPath && !song) {
                if ([this.stationName] == 'indie1023') {
                    timestamp = `${this.getPath(data, this.currentStationData[this.stationName].timestamp[2])} ${this.getPath(data, this.currentStationData[this.stationName].timestamp[3])}`;
                    console.log('102.3 timestamp', timestamp);
                } else {
                    timestamp = this.getPath(data, this.currentStationData[this.stationName].timestamp2);
                    console.log('altpath timestamp', timestamp);
                }
            }

            // Format and check stale data in a separate function
            const { staleData } = this.checkStaleData(timezone, timestamp, spinUpdated, this.getPath(data, this.currentStationData[this.stationName].duration), song);

            if ((staleData === "Live365 past") && (this.song)) {
                if (song.toLowerCase() !== this.song.toLowerCase()) {
                    return;   
                }
            } else if (this.song == "Station data is currently missing" && !staleData ) {
                return;
            }

            // Compare the extractedData response with the previous one
            if (JSON.stringify(this.prevExtractedData) === JSON.stringify(extractedData)) {
                return;
            } else {
                this.prevExtractedData = extractedData;
            }

            // Handle stale data or invalid song
            if ((staleData) || song === 'No streaming data currently available' || errorMsg) {
                const page = new Page(this.stationName, this);
                page.refreshCurrentData([(staleData || song), '', '', urlCoverArt, null, null, true, this.currentStationData, true]);
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

                    // Validate the album art only after getting lfmArt
                    const artworkToValidate = lfmArt === urlCoverArt ? albumArt : lfmArt;

                    // Start validating the album art URL asynchronously
                    this.checkUrlValidity(artworkToValidate).then(isValid => {
                        const validatedArt = isValid ? artworkToValidate : urlCoverArt;

                        // Upsize the validated album art if needed
                        this.artworkUrl = this.upsizeImgUrl(validatedArt) || urlCoverArt;
                        this.listeners = lfmListeners || null;
                        this.playcount = lfmPlaycount || null;

                        // Mark metadata as changed
                        this.lfmMetaChanged = true;

                        // Refresh the page with updated data
                        const page = new Page(this.stationName, this);
                        page.refreshCurrentData([this.song, this.artist, this.album, this.artworkUrl, this.listeners, this.playcount, true, this.currentStationData], this.errorMessage);
                    }).catch(error => {
                        console.error('Error during album art validation:', error);
                    });

                }).catch(error => {
                    console.error('Error processing data:', error);
                });
            }

        }
    }

    checkStaleData(timezone, timestamp, spinUpdated, duration, song) {

        let staleData = '';

        if ((!timezone && !timestamp && !spinUpdated) || (!timestamp && spinUpdated == true) || (timestamp === undefined && !this.currentStationData[this.stationName].spinPath && !timezone)) {
            return staleData;
        }

        let apiUpdatedData;
        let timezoneTime = new Date().toLocaleString("en-US", { 
            timeZone: timezone, 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false,
            timeZoneName: 'short'
        });

        timezoneTime = new Date(timezoneTime).toISOString();


        if (timestamp) {

            console.log('timestamp', timestamp);
            apiUpdatedData = this.convertTimestamp(timestamp, timezone);
        } else if (spinUpdated) {
            // Handle timestamp conversion and formatting
            apiUpdatedData = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
        } else if ((timezone && !timestamp)) {
            console.log('timezone and no timestamp', timestamp);

            if (song !== this.song) {
                // Song changed: Set a new fallback timestamp
                this.fallbackTimestamp = timezoneTime;
                apiUpdatedData = this.fallbackTimestamp;
            } else if (this.fallbackTimestamp) {
                // Same song: Retain the previously assigned timestamp
                apiUpdatedData = this.fallbackTimestamp;
            }
        }

        // Convert formatted times to epoch
        timezoneTime = Date.parse(timezoneTime);
        apiUpdatedData = Date.parse(apiUpdatedData);

        // For Live365 apis that skip back and forth with the data (for whatever reason). This checks if the end of the song is still in the future to ensure it doesn't change the song data back to an old song only to jump back again next api check
        if (this.currentStationData[this.stationName].isFuture) {

            if (duration) {
                console.log("apiUpdatedData + duration", apiUpdatedData, "+", duration * 1000, "=", apiUpdatedData + (duration * 1000));
                apiUpdatedData = apiUpdatedData + (duration * 1000); // Get end time of the song
            }

            // Prevent backtracking to older songs
            if (this.lastKnownUpdatedTime && apiUpdatedData < this.lastKnownUpdatedTime) {
                console.log("Skipping older song data — already showing newer content.");
                staleData = "Older than current song";
            }

            const pastThreshold = Date.now() - 120000; // 120 seconds in the past
            const futureThreshold = Date.now() - 240000; // 240 seconds in the future

            if ((apiUpdatedData < pastThreshold) && (apiUpdatedData > futureThreshold)) {
                console.log('song data is more than 120 seconds in the past');
                staleData = "Waiting for newer song data";
            } else if (apiUpdatedData < Date.now()) {
                console.log('song data is slightly in the past but still recent');
            } else {
                console.log('song data is still in the future');
            }

            // If we make it here and pass all checks, accept the new song
            this.lastKnownUpdatedTime = apiUpdatedData;
        }



        // some stations have a pretty huge timing offset between the API and the stream, so this is an attempt to make it so the songs might be more likely to be showing the song data at the same time the song is actually playing. 
        if ((this.currentStationData[this.stationName].offset + apiUpdatedData) < timezoneTime) {
            apiUpdatedData = (this.currentStationData[this.stationName].offset + apiUpdatedData);
        }

        // Calculate time difference
        const timeDifference = (timezoneTime - apiUpdatedData) / 1000;
        console.log('apiUpdatedData', apiUpdatedData, 'timezoneTime', timezoneTime, 'timeDifference', timeDifference);


        // Check if the data is stale (older than 15 minutes)
        if (timeDifference > 900 && apiUpdatedData !== "") {
            staleData = 'Streaming data is stale';
        }

        return { staleData };
    }

    convertTimestamp(timestamp, timezone, spinUpdated) {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
        const isEpoch = /^\d{10,13}$/.test(timestamp); // Check for 10 or 13 digits
        const isUTC = typeof timestamp === 'string' && timestamp.trim().endsWith('Z');
        const dateWithoutTimezoneRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}$/;
        const mmddyyyyRegex = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/; // MM-DD-YYYY HH:mm:ss
        const yyyymmddhhmmRegex = /^20\d{10}$/; // YYYYMMDDHHMM starting with 20


        // Handle ISO format timestamps (e.g., 2025-01-08T16:00:00.000Z)
        if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {
            
            // If the timestamp ends with 'Z' (UTC), return it directly
            if (timestamp.endsWith('Z')) {
                return new Date(timestamp).toISOString(); // Return the ISO string
            }

            // If it doesn't have a timezone offset, let's handle it properly
            if (!timestamp.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(timestamp)) {
                timestamp = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
            }

            return new Date(timestamp).toISOString(); // Return the ISO string
        }


        // Handle YYYYMMDDHHMM format (starts with 20)
        if (yyyymmddhhmmRegex.test(timestamp)) {
            const year = parseInt(timestamp.substring(0, 4), 10);
            const month = parseInt(timestamp.substring(4, 6), 10) - 1; // Months are 0-indexed
            const day = parseInt(timestamp.substring(6, 8), 10);
            const hour = parseInt(timestamp.substring(8, 10), 10);
            const minute = parseInt(timestamp.substring(10, 12), 10);

            const date = new Date(year, month, day, hour, minute);
            timestamp = date.toISOString();
            return timestamp;
        }

        // Handle Unix Epoch timestamps (10-13 digits)
        if (isEpoch) {
            const epoch = Number(timestamp); // Ensure it's treated as a number
            if (epoch < 1e12) { // If it's in seconds, convert to milliseconds
                timestamp = epoch * 1000;
            } else {
                timestamp = epoch;
            }
            timestamp = new Date(timestamp).toISOString();
            return timestamp;
        }

        // Handle ISO format timestamps with 'Z' (UTC)
        if (isUTC) {
            console.log('getting to UTC?');
            return new Date(timestamp).toISOString();
        }

        // Handle ISO format timestamps without 'Z'
        if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {
            if (timestamp.endsWith('+0000')) {
                timestamp = timestamp.replace('+0000', 'Z'); // Convert to 'Z' for UTC
                timestamp = new Date(timestamp).toISOString();
            }
        }

        // Handle timestamps without a timezone
        else if (dateWithoutTimezoneRegex.test(timestamp)) {
            timestamp = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
            timestamp = new Date(timestamp).toISOString();
        }

        // Handle MM-DD-YYYY HH:mm:ss format
        else if (mmddyyyyRegex.test(timestamp)) {
            const [datePart, timePart] = timestamp.split(' ');
            const [month, day, year] = datePart.split('-');
            const formattedTimestamp = `${year}-${month}-${day}T${timePart}`;

            timestamp = this.formatTimeInTimezone(timezone, formattedTimestamp, spinUpdated);
            timestamp = timestamp.replace(/([-+]\d{2})(\d{2})$/, "$1:$2"); // Adjust timezone offset
            timestamp = new Date(timestamp).toISOString();
        }

        return timestamp;
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
            apiUpdatedTime = `${currentDatePart} ${updated24Hour} ${currentTimezonePart}`;
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


    upsizeImgUrl(url) {
        if (url) {
            return url.replace(/\d{3}x\d{3}/g, '500x500');
        }
    }

    getPath(obj, prop) {
        if (!obj || typeof obj !== 'object' || !prop) {
            return undefined; // Handle invalid arguments
        }

        // Split the property path by "." for multi-layer paths
        const parts = prop.split(".");
        let current = obj;

        // Traverse the object for each part of the path
        for (let i = 0; i < parts.length; i++) {
            if (current[parts[i]] === undefined) {
                return undefined; // Return undefined if any part of the path is not found
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
            document.getElementById("playermeta").classList.add("opacity-50");
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
        document.getElementById("panel1")
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
