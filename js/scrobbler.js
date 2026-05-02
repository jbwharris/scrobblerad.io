"use strict";
let lastFmBaseScrobbleUrl = "https://ws.audioscrobbler.com/2.0/";
const APIKEY = "1eda135bc7d7e3ef4815d11f9990d60c";
const SECRET = "d006f6c9ede4f8d566110fdd5369dbe6";

function removeTokenFromUrl() {
    const { history, location } = window;
    if (!history || !history.replaceState) return;

    let cleanPathname = location.pathname;
    let cleanSearch = location.search;

    // 1. Handle Pathname Token (e.g., / -Cv3_jE3)
    // This regex looks for:
    // - A dash: "-"
    // - Followed by 4 or more characters: "[a-zA-Z0-9._-]{4,}"
    //   (This includes letters, numbers, dots, underscores, and dashes)
    // - The 'g' flag ensures it catches it anywhere in the path
    cleanPathname = cleanPathname.replace(/-[a-zA-Z0-9._-]{4,}/g, "");

    // 2. Handle Query String Token (e.g., ?token=123)
    if (cleanSearch && cleanSearch.includes('token')) {
        cleanSearch = cleanSearch.replace(/(\&|\?)token([_A-Za-z0-9=\.%]+)/g, '').replace(/^&/, '?');
        if (cleanSearch === '?') cleanSearch = '';
    }

    const cleanURL = location.origin + cleanPathname + cleanSearch;

    if (cleanURL !== location.href) {
        history.replaceState({}, document.title, cleanURL);
    }
}

function authenticateFM(callback) {
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
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

  // Exchange token for session key + username
  const sig = md5(`api_key${APIKEY}methodauth.getSessiontoken${token}${SECRET}`);
  const body = new URLSearchParams({
    method: "auth.getSession",
    api_key: APIKEY,
    token: token,
    api_sig: sig,
    format: "json"
  });

  fetch(lastFmBaseScrobbleUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  })
  .then(res => res.json())
  .then(data => {
    if (data?.session?.key) {
      const userKey = data.session.key;
      const username = data.session.name;

      // Fetch user info (including avatar)
      const userInfoSig = md5(`api_key${APIKEY}methoduser.getInfouser${username}${SECRET}`);
      const userInfoBody = new URLSearchParams({
        method: "user.getInfo",
        api_key: APIKEY,
        user: username,
        api_sig: userInfoSig,
        format: "json"
      });

      return fetch(lastFmBaseScrobbleUrl, {
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

        console.log("Extracted avatar URL:", avatarUrl); // Debug: Log the avatar URL

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


function updateNowPlaying(track) {
 // console.log("🎵 Now Playing update triggered for", track);
  
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  if (!userCookie) return;
  
  const userData = JSON.parse(userCookie);
  const userKey = userData.key; 

  if (!userKey) return;
  const sigBase =
    "album" + track.trackAlbum +
    "albumArtist" + track.trackArtist +
    "api_key" + APIKEY +
    "artist" + track.trackArtist +
    "methodtrack.updateNowPlaying" +
    "sk" + userKey +
    "track" + track.trackTitle +
    SECRET;

  const sig = md5(sigBase);

  const body = new URLSearchParams({
    method: "track.updateNowPlaying",
    api_key: APIKEY,
    artist: track.trackArtist,
    track: track.trackTitle,
    album: track.trackAlbum,
    albumArtist: track.trackArtist,
    sk: userKey,
    api_sig: sig,
    format: "json"
  });

  fetch(lastFmBaseScrobbleUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  })
  .then(res => res.json())
  .then(data => {
    console.log("🎧 Now playing updated", track.trackArtist, track.trackTitle );
  })
  .catch(err => console.error("❌ Now Playing error:", err));
}

async function isAlreadyScrobbledOnServer(username, artist, track) {
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

        console.log('recentTracks', recentTracks, 'recentTracks', currentArtistLower, 'currentTrackLower', currentTrackLower);

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

async function scrobbleIt(track) {
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
  const scrobbleHistory = JSON.parse(Cookies.get("scrobbleHistory") || "[]");
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
  let sigParts = "";
  if (track.trackAlbum) {
    sigParts += "album" + track.trackAlbum;
    sigParts += "albumArtist" + track.trackArtist;
  }
  sigParts += "api_key" + APIKEY;
  sigParts += "artist" + track.trackArtist;
  sigParts += "methodtrack.scrobble";
  sigParts += "sk" + userKey;
  sigParts += "timestamp" + track.trackTimestamp;
  sigParts += "track" + track.trackTitle;
  sigParts += SECRET;

  const sig = md5(sigParts);

  let data = `method=track.scrobble&api_key=${APIKEY}&artist=${encodeURIComponent(track.trackArtist)}&track=${encodeURIComponent(track.trackTitle)}&timestamp=${track.trackTimestamp}&sk=${userKey}&api_sig=${sig}&format=json`;

  if (track.trackAlbum) {
    data += `&album=${encodeURIComponent(track.trackAlbum)}&albumArtist=${encodeURIComponent(track.trackArtist)}`;
  }

  fetch(lastFmBaseScrobbleUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data,
  })
  .then(response => response.json())
  .then(responseData => {
    if (responseData.error) {
      console.error("Scrobble error:", responseData.message);
    } else {
      const wasAccepted = responseData.scrobbles?.['@attr']?.accepted > 0;
      if (wasAccepted) {
        console.log("😎 Scrobble accepted!");
        updateHistory(track);
      }
    }
  })
  .catch(error => console.error("Scrobble error:", error));
}

function updateHistory(track) {
  let scrobbleHistory = JSON.parse(Cookies.get("scrobbleHistory") || "[]");

  scrobbleHistory.push({
    artist: track.trackArtist,
    title: track.trackTitle,
    timestamp: track.trackTimestamp
  });

  // Keep only the last 4
  if (scrobbleHistory.length > 5) {
    scrobbleHistory = scrobbleHistory.slice(-5);
  }

  Cookies.set("scrobbleHistory", JSON.stringify(scrobbleHistory), { expires: 1 });
}


// Attach to global scope
window.updateNowPlaying = updateNowPlaying;
window.scrobbleIt = scrobbleIt;

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
});

function updateAuthButton() {
  const button = document.getElementById("lastfm-auth");
  const userCookie = Cookies.get("scrobbleradio-lastfm-user");
  const userData = userCookie ? JSON.parse(userCookie) : null;

  if (button) {
    // Unified button structure (icon + text)
    const icon = '<i class="icon-lastfm"></i>';
    const avatar = userData?.avatar
      ? `<img src="${userData.avatar}" alt="${userData.username}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">`
      : icon; // Fallback to icon if no avatar

    const text = userData?.key
      ? `${userData.username} (Logout)`
      : "Login with Last.fm";

    button.innerHTML = `${avatar} ${text}`;

    // Set click handler
    button.onclick = () => {
      if (userData?.key) {
        Cookies.remove("scrobbleradio-lastfm-user");
      } else {
        const authUrl = `https://www.last.fm/api/auth/?api_key=${APIKEY}&cb=${encodeURIComponent(window.location.href)}`;
        window.location.href = authUrl;
      }
      updateAuthButton();
    };
  }
}



// Ensure the token is removed when the page loads if present
document.addEventListener("DOMContentLoaded", () => {
    removeTokenFromUrl();

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
        authenticateFM(() => {
            updateAuthButton();
        });
    } else {
        updateAuthButton();
    }
});