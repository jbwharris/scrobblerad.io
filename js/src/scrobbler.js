import { updateHistory, renderScrobbleHistory, setTrackLiked } from './history.js';

let lastFmBaseScrobbleUrl = "https://ws.audioscrobbler.com/2.0/";
// Public app identifier only — required client-side for the Last.fm OAuth
// redirect (it is already visible in that browser URL by design).
const APIKEY = "1eda135bc7d7e3ef4815d11f9990d60c";
// The shared secret must never ship to the browser: all signed requests are
// now signed server-side by proxy.php, which holds it instead.
const LASTFM_PROXY_URL = "proxy.php?action=lastfm";

export function startLastFmAuth() {
 const authUrl = `https://www.last.fm/api/auth/?api_key=${APIKEY}&cb=${encodeURIComponent(window.location.href)}`;
 window.location.href = authUrl;
}

export function removeTokenFromUrl() {
 const { history, location } = window;
 if (!history ||!history.replaceState) return;

 const url = new URL(location.href);

 // Remove a leading path segment that looks like a Last.fm token
 if (/^\/-[A-Za-z0-9._-]{4,}\/?$/.test(url.pathname)) {
 url.pathname = "/";
 }

 // Remove?token=... from the query string
 if (url.searchParams.has("token")) {
 url.searchParams.delete("token");
 }

 // Remove?token=... if it ended up after the hash
 url.hash = url.hash.replace(/[?&]token=[^&]*/g, "");

 const cleaned = url.toString();
 if (cleaned!== location.href) {
 history.replaceState({}, document.title, cleaned);
 }
}

export function authenticateFM(callback) {
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  window.dispatchEvent(new CustomEvent("lastfm-auth-changed"));
  let isLoggedin = false;
  if (userCookie) {
    try {
      const userData = JSON.parse(userCookie);
      // Only consider us logged in if the session key actually exists
      if (userData && userData.key) {
        isLoggedin = true;
      }
    } catch (e) {
      console.error("Error parsing user cookie:", e);
      // If JSON is malformed, clear it so we can re-auth
      Cookies.remove("scrobbleradio-lastfm-user");
    }
  }
  if (isLoggedin) {
    updateAuthButton();
    if (callback) callback();
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  if (!token) {
    const authUrl = `https://www.last.fm/api/auth/?api_key=${APIKEY}&cb=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
    window.location.href = authUrl;
    return;
  }
  // Exchange token for session key + username (signed server-side by proxy.php)
  const body = new URLSearchParams({ method: "auth.getSession", token: token });
  fetch(LASTFM_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    })
    .then(res => res.json())
    .then(data => {
      if (data?.session?.key) {
        const userKey = data.session.key;
        const username = data.session.name;
        // Fetch user info (including avatar), also signed server-side
        const userInfoBody = new URLSearchParams({ method: "user.getInfo", user: username });
        return fetch(LASTFM_PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: userInfoBody
          })
          .then(res => res.json())
          .then(userData => {
            console.log("Full user.getInfo response:", userData); // Debug: Log the entire response
            // Extract the medium-sized avatar URL
            let avatarUrl = "";
            if (userData?.user?.image) {
              const mediumImage = userData.user.image.find(img => img.size === "medium");
              if (mediumImage && mediumImage["#text"]) {
                avatarUrl = mediumImage["#text"];
              }
            }
            // Save all data to a single cookie
            const userCookie = {
              key: userKey,
              username: username,
              avatar: avatarUrl
            };
            Cookies.set("scrobbleradio-lastfm-user", JSON.stringify(userCookie), {
              expires: 30,
              path: '/',
              sameSite: 'Lax'
            });
            updateAuthButton();
            if (callback) callback();
          });
      } else {
        console.error("Failed to get session key:", data);
      }
    })
    .catch(err => console.error("Auth error:", err));
}

export function updateNowPlaying(track) {
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  if (!userCookie) return;
  const userData = JSON.parse(userCookie);
  const userKey = userData.key;
  if (!userKey) return;
  const body = new URLSearchParams({
    method: "track.updateNowPlaying",
    artist: track.trackArtist,
    track: track.trackTitle,
    album: track.trackAlbum,
    albumArtist: track.trackArtist,
    sk: userKey
  });
  fetch(LASTFM_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    })
    .then(res => res.json())
    .then(data => {
      console.log("🎧 Now playing updated", track.trackArtist, track.trackTitle);
      renderScrobbleHistory(); // Trigger UI update on success
    })
    .catch(err => {
      console.error("❌ Now Playing error:", err);
      renderScrobbleHistory(); // Trigger UI update even on error so the art still shows
    });
}
export async function isAlreadyScrobbledOnServer(username, artist, track) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?api_key=${APIKEY}&method=user.getrecenttracks&user=${encodeURIComponent(username)}&format=json&limit=5`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Error fetching Last.fm recent tracks:", response.statusText);
      return false;
    }
    const data = await response.json();
    const recentTracks = data.recenttracks?.track || [];
    // If no tracks returned, it's definitely not a duplicate
    if (!Array.isArray(recentTracks)) {
      return false;
    }
    const currentArtistLower = artist.toLowerCase();
    const currentTrackLower = track.toLowerCase();
    return recentTracks.some(t => {
      // Defensive check: Ensure artist and track are valid strings
      if (typeof t.artist !== 'string' || typeof t.track !== 'string') {
        return false;
      }
      return (
        t.artist.toLowerCase() === currentArtistLower &&
        t.track.toLowerCase() === currentTrackLower
      );
    });
  } catch (error) {
    console.error("Error in isAlreadyScrobbledOnServer:", error);
    // Fallback to false so we don't block scrobbling if the check fails
    return false;
  }
}
export async function scrobbleIt(track) {
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  if (!userCookie) return;
  const userData = JSON.parse(userCookie);
  const userKey = userData.key;
  const username = userData.username; // We need the username now
  if (!userKey || !username) return;
  if (!track.trackTitle || !track.trackArtist || !track.trackTimestamp) {
    console.info("Missing required track info:", track);
    return;
  }
  // 1. Local Duplicate Check (Fast)
  const scrobbleHistory = JSON.parse(localStorage.getItem("scrobbleHistory") || "[]");
  const isLocalDuplicate = scrobbleHistory.some(entry =>
    entry.artist.toLowerCase() === track.trackArtist.toLowerCase() &&
    entry.title.toLowerCase() === track.trackTitle.toLowerCase()
  );
  if (isLocalDuplicate) {
    console.log("🚫 Skipping local duplicate scrobble");
    return;
  }
  // 2. Server Duplicate Check (Cross-device)
  console.log("🔍 Checking Last.fm server for cross-device duplicates...");
  const isServerDuplicate = await isAlreadyScrobbledOnServer(username, track.trackArtist, track.trackTitle);
  if (isServerDuplicate) {
    console.log("🚫 Skipping server-side duplicate scrobble");
    return;
  }
  // 3. Proceed with Scrobbling (Existing logic follows...)
  let data = `method=track.scrobble&artist=${encodeURIComponent(track.trackArtist)}&track=${encodeURIComponent(track.trackTitle)}&timestamp=${track.trackTimestamp}&sk=${userKey}`;
  if (track.trackAlbum) {
    data += `&album=${encodeURIComponent(track.trackAlbum)}&albumArtist=${encodeURIComponent(track.trackArtist)}`;
  }
  fetch(LASTFM_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data,
    })
    .then(response => response.json())
    .then(responseData => {
      if (responseData.error) {
        console.error("Scrobble error:", responseData.message);
      } else {
        const wasAccepted = responseData.scrobbles?. ['@attr']?.accepted > 0;
        if (wasAccepted) {
          console.log("😎 Scrobble accepted!");
          updateHistory(track);
        }
      }
    })
    .catch(error => console.error("Scrobble error:", error));
}


export function loveOrUnloveTrack(track, shouldLove) {
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  if (!userCookie) return Promise.resolve(false);
  const userData = JSON.parse(userCookie);
  const userKey = userData.key;
  if (!userKey || !track.trackArtist || !track.trackTitle) return Promise.resolve(false);
  const method = shouldLove ? "track.love" : "track.unlove";
  const body = new URLSearchParams({
    method,
    artist: track.trackArtist,
    track: track.trackTitle,
    sk: userKey
  });
  return fetch(LASTFM_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        console.error(`${method} error:`, data.message);
        return false;
      }
      console.log(shouldLove ? "❤️ Loved" : "💔 Un-loved", track.trackArtist, "-", track.trackTitle);
      return true;
    })
    .catch(err => {
      console.error(`${method} error:`, err);
      return false;
    });
}

export function likeTrack(track) { return loveOrUnloveTrack(track, true); }

export function unlikeTrack(track) { return loveOrUnloveTrack(track, false); }

document.addEventListener("DOMContentLoaded", () => {
 const urlParams = new URLSearchParams(window.location.search);
 const token = urlParams.get("token");
 if (token) {
 authenticateFM(() => {
 updateAuthButton();
 });
 } else {
 updateAuthButton();
 }

 // Always clean up stray tokens from the URL, whether they landed
 // in the query string or got baked into the path by Last.fm's redirect
 removeTokenFromUrl();

 // Like/unlike: history.js dispatches, we perform the Last.fm API call
 const historyContainer = document.getElementById("scrobble-history-container");
 if (historyContainer) {
 historyContainer.addEventListener("history-like", async (e) => {
 const { track, wasLiked } = e.detail;
 const ok = wasLiked? await unlikeTrack(track) : await likeTrack(track);
 if (ok) {
 setTrackLiked(track,!wasLiked);
 renderScrobbleHistory(track);
 }
 });
 }
});

export function updateAuthButton() {
 const userCookie = Cookies.get("scrobbleradio-lastfm-user");
 const userData = userCookie? JSON.parse(userCookie) : null;
 const avatarBtn = document.getElementById("avatar-btn");
 const avatarImg = document.getElementById("avatar-img");
 const gearBtn = document.getElementById("settings-gear-btn");
 const avatarMenu = document.getElementById("avatar-menu");

 const dropdownAvatar = document.getElementById("dropdown-avatar");
 const dropdownUsername = document.getElementById("dropdown-username");
 const dropdownSince = document.getElementById("dropdown-since");

 if (avatarBtn) {
 if (userData?.key) {
 gearBtn.hidden = true;
 avatarMenu.hidden = false;
 avatarImg.src = userData.avatar || "../img/icons/favicon-96x96.png";
 avatarImg.alt = userData.username;
 avatarBtn.title = userData.username;
 avatarBtn.setAttribute("aria-haspopup", "true");

 // Populate dropdown profile summary
 dropdownAvatar.src = userData.avatar || "../img/icons/favicon-96x96.png";
 dropdownAvatar.alt = userData.username;
 dropdownUsername.textContent = userData.username;
 if (userData.registered) {
 const date = new Date(userData.registered * 1000);
 dropdownSince.textContent = `Member since ${date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
 } else {
 dropdownSince.textContent = "";
 }
 } else {
 gearBtn.hidden = false;
 avatarMenu.hidden = true;
 avatarBtn.title = "Login with Last.fm";
 avatarBtn.removeAttribute("aria-haspopup");

 // Clear dropdown profile summary
 dropdownAvatar.src = "";
 dropdownAvatar.alt = "";
 dropdownUsername.textContent = "";
 dropdownSince.textContent = "";
 }
 }
}