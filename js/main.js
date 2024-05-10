const urlCoverArt = "../img/defaultArt.png";

const stationKeys = Object.keys(stations);

function generateRadioButtons() {
    const stationSelectDiv = document.getElementById('stationSelect');
    const elements = [];

    stationKeys.forEach((stationKey) => {
        const station = stations[stationKey];
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.id = stationKey;
        input.name = 'station';
        input.value = stationKey;

        if (stationKey === radioPlayer.stationName) {
            input.checked = true;
        }

        const textNode = document.createTextNode(station.stationName);
        label.appendChild(input);
        label.appendChild(textNode);
        elements.push(label);
    });

    // Append all elements to the stationSelectDiv once
    stationSelectDiv.append(...elements);
}

// Define the animateElement function
function animateElement(element, duration = 2000) {
  element.classList.add("animated", "fadeIn");

  // Remove the class after the specified duration
  setTimeout(() => {
    element.classList.remove("animated", "fadeIn");
  }, duration);
}

class Page {
    constructor(stationName, radioPlayer) {
        this.stationName = stationName;
        this.title = stations[this.stationName].stationName;
        this.radioPlayer = radioPlayer;

        // Cache DOM elements
        this.currentSongElement = document.getElementById("title");
        this.currentArtistElement = document.getElementById("artist");
        this.currentAlbumElement = document.getElementById("album");
        this.currentListenersElement = document.getElementById("listeners");
        this.coverArtElement = document.getElementById("albumArt");
        this.radioNameElement = document.getElementById("radioName");
        this.stationLocationElement = document.getElementById("stationLocation");

        // Setup media session
        this.setupMediaSession('', '', ''); // Pass initial values for song, artist, and artwork URL
    }

    changeTitlePage() {
        document.title = this.title;
    }

    refreshCurrentData(values) {
        const [song, artist, album, artworkUrl, listeners, playcount, updateArt] = values;

        let nf = new Intl.NumberFormat('en-US');

        // Delay cover art update to ensure animation completes
        setTimeout(() => {
            // Update cover art
            this.coverArtElement.onload = () => {
                // Update background and animate cover art
                document.documentElement.style.setProperty("--albumArt", `url("${artworkUrl}")`);
                animateElement(this.coverArtElement);

                // Set radio station name and location
                this.radioNameElement.href = stations[this.stationName].webUrl;
                animateElement(this.radioNameElement);
                this.radioNameElement.innerHTML = this.title;
                this.stationLocationElement.innerHTML = stations[this.stationName].location;

                // Animate and update metadata
                this.animateAndUpdateElement(this.currentSongElement, song);
                this.animateAndUpdateElement(this.currentArtistElement, artist);
                this.animateAndUpdateElement(this.currentAlbumElement, album);
                if (listeners && playcount) {
                    this.animateAndUpdateElement(this.currentListenersElement, `Listeners: ${nf.format(listeners)} | Playcount: ${nf.format(playcount)}`);
                }

                // Configure media session with the latest information
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
                artwork: [
                    {
                        src: artworkUrl,
                    },
                ],
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                console.log('User clicked "Next Track" icon.');
                this.radioPlayer.skipForward();
            });

            navigator.mediaSession.setActionHandler('previoustrack', () => {
                console.log('User clicked "Previous Track" icon.');
                this.radioPlayer.skipBackward();
            });

            navigator.mediaSession.setActionHandler('play', async () => {
                console.log('User clicked "Play" icon.');
                this.radioPlayer.togglePlay();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                console.log('User clicked "Pause" icon.');
                this.radioPlayer.togglePlay();
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
        this.previousDataResponse = null;

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

        document.getElementById("stationSelect").addEventListener("click", (event) => {
        if (event.target && event.target.matches("input[name='station']")) {
                const newStationName = event.target.value;
                radioPlayer.handleStationSelect(event, newStationName); // Pass the event and station name
            }
        });
        this.skipForwardButton.addEventListener("click", this.skipForward);
        this.skipBackButton = document.getElementById("skipBackButton");
        this.skipBackButton.addEventListener("click", this.skipBackward.bind(this));
        this.calculateNextAndPreviousIndices();
    }

    calculateNextAndPreviousIndices() {
        this.currentIndex = stationKeys.indexOf(this.stationName);
        this.nextIndex = (this.currentIndex + 1) % stationKeys.length;
        this.previousIndex = (this.currentIndex - 1 + stationKeys.length) % stationKeys.length;
    }

    handleStationSelect(event, stationName) {
        let newStationName = stationName;

        if (!newStationName && event.target && event.target.matches("input[name='station']")) {
            newStationName = event.target.value;
        }

        if (newStationName) {
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

            // Create a new Audio object for the selected station
            const newAudio = new Audio(stations[newStationName].streamUrl);
            newAudio.onloadedmetadata = () => {
                // Audio loaded, now delete previous audio and update reference
                if (this.audio) {
                    this.audio = null; // Delete previous audio
                }
                this.audio = newAudio; // Update reference to new audio
                this.play(); // Start playback

                fetchDataAndRefreshPage();
                this.streamingInterval = setInterval(fetchDataAndRefreshPage, 25000); // Set new interval
            };

            newAudio.onerror = (error) => {
                // Handle audio loading error
                console.error('Error loading audio:', error);
                // You can add code here to display a message to the user or take other appropriate actions.
            };

            this.audio.pause(); // Pause the previous audio

            // Start loading audio (metadata will trigger the rest)
            newAudio.load();

            const fetchDataAndRefreshPage = () => {
                this.getStreamingData();
            };

            const page = new Page(this.stationName, this);
            page.changeTitlePage();

            // Check the radio button associated with the selected station
            const radioInput = document.querySelector(`input[name='station'][value='${newStationName}']`);
            if (radioInput) {
                radioInput.checked = true;
            }
        }
    }

    extractSongAndArtist(data, stationName) {
        let song = (
            this.getPath(data, stations[stationName].song) || ""
        ).replace(/&apos;/g, "'");
        let artist = (
            this.getPath(data, stations[stationName].artist) || ""
        ).replace(/&apos;/g, "'");
        let album = (
            this.getPath(data, stations[stationName].album) || ""
        ).replace(/&apos;/g, "'");


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

            let regexPattern = /^(.*) \- (.*)/;
            
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
                    if (match[3]) {
                        album = match[3].trim();
                    }

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

            // stringPath handles feeds that aren't JSON responses. There are a few stations that have just the data, or an HTML response that can still be parsed
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

            if (stations[stationName].htmlResponse === true) { 

                // Assuming the HTML response is stored in a variable named 'response'
                let htmlParser = new DOMParser();
                let doc = htmlParser.parseFromString(data, 'text/html');

                // Get src from img tag
                let imgSrc = doc.querySelector('#rff-main-np-cover').getAttribute('src');

                // Get contents of div.trackName
                let trackName = doc.querySelector('.trackName').textContent.trim();

                // Get album from span#rff-comfy-np-album
                let album = doc.querySelector('#rff-comfy-np-album').textContent.trim();

                console.log("Image source:", imgSrc);
                console.log("Track name:", trackName);
                console.log("Album:", album);

            }



        // Check if any filtered values are present in the song or artist
        const filteredValues = stations[stationName].filter || [];

        console.log("filtered values:", filteredValues, "song:", song, "artist:", artist, "album:", album);

        const hasFilteredValue = filteredValues.some(value => {
            return song.includes(value) || artist.includes(value);
        });

       console.log("song or artist has filtered term?", hasFilteredValue);

        // Check if the stationName or a phone number exists in the match data
        const stationNameExists = String(song).includes(stationName) || String(artist).includes(stationName);
        const phoneNumberExists = /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(song) || /\b[\+]?[(]?[0-9]{2,6}[)]?[-\s\.]?[-\s\/\.0-9]{3,15}\b/m.test(artist);

        // If either filteredValues, stationName, a phone number exists or there is no value for song, set song and artist accordingly
        if (stationNameExists || phoneNumberExists || hasFilteredValue ) {
            song = 'Station data is taking a break';
            artist = '';
        } else if (!song || !artist) {
            song = 'Station data is currently missing';
            artist = '';
        }

        let currentSong = song.replace(/&amp;/g, "&");
        let currentArtist = artist.replace(/&amp;/g, "&");
        currentArtist = currentArtist.replace("  ", " ");
        let currentAlbum = album.replace(/&amp;/g, "&");

        if (/([^a-zA-Z0-9])single([^a-zA-Z0-9])/i.test(currentAlbum)) {
            currentAlbum = currentSong;
            console.log("changed from single to currentSong", currentAlbum);
        }   

        console.log("currentSong", currentSong, "currentArtist", currentArtist, "currentAlbum", currentAlbum);
        return { song: currentSong, artist: currentArtist, album: currentAlbum };
    }

    getLfmMeta(currentSong, currentArtist, currentAlbum, callback) {
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

            console.log("currentAlbum:", currentAlbum);

            if (currentAlbum) {
                lfmMethod = 'album.getInfo';
                lfmQueryField = 'album';
                lfmDataField = currentAlbum;
            } else {
                lfmMethod = 'track.getInfo';
                lfmQueryField = 'track';
                lfmDataField = currentSong;
            }

            const lfmQueryUrl = `https://ws.audioscrobbler.com/2.0/?method=${lfmMethod}&artist=${encodeURIComponent(
                filter.filterField('artist', currentArtist),
            )}&${lfmQueryField}=${encodeURIComponent(
                filter.filterField(lfmQueryField, lfmDataField),
            )}&api_key=09498b5daf0eceeacbcdc8c6a4c01ccb&&autocorrect=1&format=json&limit=1`;

            console.log("lfmQueryUrl:", lfmQueryUrl);

            const lfmxhr = new XMLHttpRequest();
            const lfmQuery = new URL(lfmQueryUrl);

            lfmxhr.open("GET", lfmQuery, true);
            lfmxhr.onreadystatechange = () => {
                if (lfmxhr.readyState === 4) {
                    if (lfmxhr.status === 200) {
                        const lfmData = JSON.parse(lfmxhr.responseText);
                        let lfmArt = '';
                        let lfmAlbum = '';
                        let lfmSong = '';
                        let lfmArtist = '';
                        let lfmListeners = 0;
                        let lfmPlaycount = 0;


                        if (lfmData.error !== 6) {
                            if (currentAlbum) {
                                lfmArt = lfmData.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.album?.name || '');
                                lfmSong = filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.album?.artist) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.album.listeners;
                                lfmPlaycount = lfmData.album.playcount;
                            } else {
                                lfmArt = lfmData.track?.album?.image[3]["#text"] || urlCoverArt;
                                lfmAlbum = filter.filterField('album', lfmData.track?.album?.title || '');
                                lfmSong = filter.filterField('track', lfmData.track?.name) || filter.filterField('track', currentSong) || 'No streaming data currently available';
                                lfmArtist = filter.filterField('artist', lfmData.track?.artist?.name) || filter.filterField('artist', currentArtist) || '';
                                lfmListeners = lfmData.track.listeners || '';
                                lfmPlaycount = lfmData.track.playcount || '';
                            }
                        } else {
                            // If album.getInfo failed, retry with track.getInfo
                            if (lfmMethod === 'album.getInfo') {
                                getLfmMeta(currentSong, currentArtist, currentSong, callback);
                                return;
                            } else {
                                lfmArt = urlCoverArt;
                                lfmAlbum = '';
                            }
                        }

                        // Call the callback function with the retrieved values
                        callback([lfmArt, lfmAlbum, lfmSong, lfmArtist, lfmListeners, lfmPlaycount]);

                    } else if (lfmxhr.status === 404 && lfmMethod === 'album.getInfo') {
                        // If album.getInfo returns 404, retry with track.getInfo
                        getLfmMeta(currentSong, currentArtist, currentSong, callback);
                    } else {
                        console.error("Error: ", lfmxhr.statusText);
                        // Optionally call the callback with null values or an error message
                        callback(null);
                    }
                }
            };
            lfmxhr.onerror = function() {
                console.error("Request failed");
                callback(null);
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
            .catch((error) => console.error("Error fetching streaming data:", error));
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
            page.refreshCurrentData([staleData || song, '', '', urlCoverArt, true]);
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
        this.calculateNextAndPreviousIndices(); // Recalculate indices
        const nextStationName = stationKeys[this.nextIndex];
        this.handleStationSelect(null, nextStationName); // For skipForward
    }

    skipBackward() {
        this.calculateNextAndPreviousIndices(); // Recalculate indices
        const previousStationName = stationKeys[this.previousIndex];
        this.handleStationSelect(null, previousStationName); // For skipForward
    }

    updateButtonIcon() {
        this.button.lastElementChild.className = this.isPlaying
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