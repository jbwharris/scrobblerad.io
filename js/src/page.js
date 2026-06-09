import { animateElement, formatCompactNumber } from './utils.js';
import { urlCoverArt } from './constants.js';

export class Page {
    constructor(stationKey, radioPlayer, handleStationClick) {
        this.stationKey = stationKey;
        this.radioPlayer = radioPlayer;
        this.handleStationClick = handleStationClick; // Store handleStationClick

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
        const [song, artist, album, artworkUrl, listeners, playcount, userPlaycount, errorMessage] = values;
        const station = this.radioPlayer.currentStationData; // Now radioPlayer is defined

        // Clear any existing scrobble timeout when new data arrives
        if (this.scrobbleTimeout) {
            clearTimeout(this.scrobbleTimeout);
            this.scrobbleTimeout = null;
        }

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

        const parts = [];
        if (listeners !== null && playcount !== null) {
            parts.push(`Listeners: ${this.formatCompactNumber(listeners)}`, `Plays: ${this.formatCompactNumber(playcount)}`);
            
            if (userPlaycount > 0) {
                parts.push(`User Plays: ${this.formatCompactNumber(userPlaycount)}`);
            }
        }

        const listenerText = parts.length > 0 ? parts.join(' | ') : '';
        clone.querySelector('#listeners').textContent = listenerText;


        const albumArtEl = clone.querySelector('#albumArt');

        // Validate and update artwork, then set this.artworkUrl
        this.radioPlayer.validateArtworkUrl(artworkUrl).then(isValid => {
            if (isValid) {
                const effectiveUrl = /^https?:\/\//i.test(artworkUrl) ? artworkUrl : `../${artworkUrl}`;
                this.artworkUrl = artworkUrl;
                albumArtEl.src = this.artworkUrl;
                albumArtEl.alt = `${song} by ${artist}`;
                albumArtEl.title = `${song} by ${artist}`;
                document.documentElement.style.setProperty("--albumArt", `url("${effectiveUrl}")`);
            } else {
                albumArtEl.src = `../img/stations/${this.stationKey}.png`;
                albumArtEl.alt = `${this.radioPlayer.stationDisplayName}`;
                albumArtEl.title = `${this.radioPlayer.stationDisplayName}`;
            }
        });

        clone.querySelector('#radioNameLink').href = this.radioPlayer.getNestedValue(this.radioPlayer.currentStationData, this.stationKey, 'webUrl', null);
        clone.querySelector('#radioName').textContent = this.radioPlayer.stationDisplayName;
       clone.querySelector('#stationLocation').textContent = this.radioPlayer.getNestedValue(this.radioPlayer.currentStationData, this.stationKey, 
        'location', null); 

        playerMetaElement.appendChild(clone);
        document.getElementById("playermeta").classList.remove("opacity-50");

        animateElement(playerMetaElement);
        document.querySelector('#panel2').click();

       this.setupMediaSession(song, artist, this.artworkUrl, errorMessage);
    }

    setupMediaSession(song, artist, artworkUrl, errorMessage) {
        if (!song || song.includes("<br/>")) {
            return;
        }

        let albumDisplay = '';
        if (errorMessage) {
            albumDisplay = '';
        } else if (artist === 'currently loading') {
            albumDisplay = '';
        } else if ((song && artist) && artist !== 'currently loading') {
            albumDisplay = `Now playing on ${this.radioPlayer.stationDisplayName}`;
        }

        // Ensure stationArt always has a valid value
        let stationArt = `../img/stations/${this.stationKey}.png`; // Default to stationArt
        if (artworkUrl && (artworkUrl !== urlCoverArt || artworkUrl !== stationArt ) ) {
            stationArt = artworkUrl;
        }

        console.log('artworkUrl', artworkUrl, 'urlCoverArt', urlCoverArt, 'stationArt', stationArt)

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
                document.title = `${song} - ${artist} | ${this.radioPlayer.stationDisplayName} on scrobblerad.io`;
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

    destroy() {

        if (this.scrobbleTimeout) {
            clearTimeout(this.scrobbleTimeout);
            this.scrobbleTimeout = null;
        }

    }

}