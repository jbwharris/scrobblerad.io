// history.js
// Scrobble history UI + local state. No Last.fm API calls — those live in scrobbler.js.
// Talks to scrobbler.js via the 'history-like' CustomEvent.

const STORAGE_KEY = 'scrobbleHistory';
const LIKED_KEY = 'scrobbleradio-liked-tracks';
const MAX_ITEMS = 10;
const FALLBACK_ART = '../img/defaultArt.png';

let currentTrack = null;

/* ---------- Scrobble history storage ---------- */

export function getHistory() {
 try {
 return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
 } catch {
 return [];
 }
}

function setHistory(items) {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function updateHistory(track) {
 const items = getHistory();
 items.push({
 artist: track.trackArtist,
 title: track.trackTitle,
 albumArt: track.trackAlbumArt,
 trackLastFmUrl: track.trackLastFmUrl,
 timestamp: track.trackTimestamp
 });
 if (items.length > MAX_ITEMS) items.splice(0, items.length - MAX_ITEMS);
 setHistory(items);
 renderScrobbleHistory();
}

/* ---------- Relative time ---------- */

function formatRelativeTime(ts) {
 const diffMs = Date.now() - ts * 1000;
 if (diffMs < 60000) return 'just now';
 const mins = Math.floor(diffMs / 60000);
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}hrs ago`;
 const days = Math.floor(hrs / 24);
 if (days >= 7) {
 return new Date(ts * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
 }
 return `${days}d ago`;
}

/* ---------- Liked-track local state ---------- */

export function getLikedTracks() {
 try {
 return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]');
 } catch {
 return [];
 }
}

export function trackKey(artist, title) {
 return `${artist.toLowerCase()}::${title.toLowerCase()}`;
}

export function isTrackLiked(track) {
 return getLikedTracks().includes(trackKey(track.trackArtist, track.trackTitle));
}

export function setTrackLiked(track, liked) {
 const key = trackKey(track.trackArtist, track.trackTitle);
 const likedTracks = getLikedTracks();
 if (liked &&!likedTracks.includes(key)) {
 likedTracks.push(key);
 } else if (!liked) {
 const idx = likedTracks.indexOf(key);
 if (idx!== -1) likedTracks.splice(idx, 1);
 }
 localStorage.setItem(LIKED_KEY, JSON.stringify(likedTracks));
}

/* ---------- Auth check (cookie peek only, no API) ---------- */

function isLastFmAuthed() {
 const cookie = document.cookie.split('; ').find(row => row.startsWith('scrobbleradio-lastfm-user='));
 if (!cookie) return false;
 try {
 const data = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
 return!!data.key;
 } catch {
 return false;
 }
}

/* ---------- Rendering ---------- */

export function renderScrobbleHistory(track) {
 const container = document.getElementById('scrobble-history-container');
 if (!container) return;

 if (track) currentTrack = track;
 const history = getHistory();
 const authed = isLastFmAuthed();
 let html = '';

 // 1. NOW PLAYING SECTION
 if (currentTrack && currentTrack.trackTitle) {
 const rawArt = currentTrack.trackAlbumArt;
 const displayArt = (typeof rawArt === 'string')? rawArt : FALLBACK_ART;
 const displayTitle = currentTrack.trackTitle;
 const displayArtist = currentTrack.trackArtist;
 const isLiked = isTrackLiked(currentTrack);
 const lastFmLink = currentTrack.trackLastFmUrl?
 `<a href="${currentTrack.trackLastFmUrl}" target="_blank" rel="noopener">${displayTitle}</a>` :
 displayTitle;

 html += `
 <div class="history-item now-playing">
 <div class="history-art-wrapper">
 <img src="${displayArt}" class="history-art">
 <div class="live-badge">LIVE</div>
 </div>
 <div class="history-track-info">
 <div class="history-track-title">${lastFmLink}</div>
 <div class="history-track-artist">${displayArtist}</div>
 </div>
 ${authed? `
 <button class="like-btn${isLiked? ' liked' : ''}"
 aria-label="${isLiked? 'Unlike' : 'Like'} this track"
 aria-pressed="${isLiked}"
 title="${isLiked? 'Unlike on Last.fm' : 'Love on Last.fm'}">
 <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
 <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
 </svg>
 </button>` : ''}
 </div>`;
 }

 [...history].reverse().forEach(item => {
 const historyArt = (typeof item.albumArt === 'string')? item.albumArt : FALLBACK_ART;
 const time = formatRelativeTime(item.timestamp);
 const historyLink = item.trackLastFmUrl?
 `<a href="${item.trackLastFmUrl}" target="_blank" rel="noopener">${item.title}</a>` :
 item.title;
 const isLiked = isTrackLiked({ trackArtist: item.artist, trackTitle: item.title });
 html += `
 <div class="history-item">
 <div class="history-art-wrapper">
 <img src="${historyArt}" class="history-art">
 </div>
 <div class="history-track-info">
 <div class="history-track-title">${historyLink}</div>
 <div class="history-track-artist">${item.artist}</div>
 <div class="history-track-time">${time}</div>
 </div>
 ${authed? `
 <button class="like-btn${isLiked? ' liked' : ''}"
 data-artist="${item.artist}" data-title="${item.title}"
 aria-label="${isLiked? 'Unlike' : 'Like'} this track"
 aria-pressed="${isLiked}"
 title="${isLiked? 'Unlike on Last.fm' : 'Love on Last.fm'}">
 <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
 <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
 </svg>
 </button>` : ''}
 </div>`;
});

 container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
 const container = document.getElementById('scrobble-history-container');
 if (container) {
 container.addEventListener('click', (e) => {
 const btn = e.target.closest('.like-btn');
 if (!btn) return;

 let track;
 if (btn.dataset.artist && btn.dataset.title) {
 // History item — reconstruct track from data attributes
 track = {
 trackArtist: btn.dataset.artist,
 trackTitle: btn.dataset.title
 };
 } else if (currentTrack) {
 // Now-playing — use the cached track
 track = currentTrack;
 } else {
 return;
 }

 const wasLiked = btn.classList.contains('liked');
 container.dispatchEvent(new CustomEvent('history-like', {
 detail: { track, wasLiked }
 }));
 });
 }
 renderScrobbleHistory();
});