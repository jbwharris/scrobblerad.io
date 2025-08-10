"use strict";
let lastFmBaseScrobbleUrl = "https://ws.audioscrobbler.com/2.0/";
const APIKEY = "1eda135bc7d7e3ef4815d11f9990d60c";
const SECRET = "d006f6c9ede4f8d566110fdd5369dbe6";

function removeTokenFromUrl() {
    const { history, location } = window;
    const { search } = location;

    if (search && search.includes('token') && history && history.replaceState) {
        // Remove token from URL
        const cleanSearch = search.replace(/(\&|\?)token([_A-Za-z0-9=\.%]+)/g, '').replace(/^&/, '?');
        
        // Replace search params with clean params
        const cleanURL = location.origin + location.pathname + (cleanSearch || '');
        
        // Use browser history API to clean the params
        history.replaceState({}, document.title, cleanURL);
    }
}

function authenticateFM(callback) {
    // Check if already authenticated
    const existingKey = Cookies.get("scrobbleradio-lastfm-key");

    if (existingKey) {
        console.log("Already authenticated. Updating UI...");
        updateAuthButton();
        if (callback) callback();
        return;
    }

    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    // If no token, redirect to Last.fm for authentication
    if (!token) {
        console.log("No token found. Redirecting to Last.fm...");
        const authUrl = `https://www.last.fm/api/auth/?api_key=${APIKEY}&cb=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
        window.location.href = authUrl;
        return;
    }

    removeTokenFromUrl();

    // Prepare request to exchange token for session key
    const sig = md5(`api_key${APIKEY}methodauth.getSessiontoken${token}${SECRET}`);
    const body = new URLSearchParams({
        method: "auth.getSession",
        api_key: APIKEY,
        token: token,
        api_sig: sig,
        format: "json"
    });

    // Fetch session key from Last.fm
    fetch(lastFmBaseScrobbleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
    })
    .then(res => res.json())
    .then(data => {
        console.log("Session Data:", data);
        if (data?.session?.key) {
            const userKey = data.session.key;

            // Save userKey to cookie
            Cookies.set("scrobbleradio-lastfm-key", userKey, {
                expires: 30,
                path: '/',
                sameSite: 'Lax'
            });

            // Update UI and call callback
            updateAuthButton();
            if (callback) callback();
        } else {
            console.error("Failed to get session key:", data);
        }
    })
    .catch(err => console.error("Auth error:", err));
}


function updateNowPlaying(track) {
 // console.log("🎵 Now Playing update triggered for", track);
  
  const userKey = Cookies.get("scrobbleradio-lastfm-key");
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
    console.log("🎧 Now playing updated");
  })
  .catch(err => console.error("❌ Now Playing error:", err));
}

function scrobbleIt(track) {
  const userKey = Cookies.get("scrobbleradio-lastfm-key");

  if (!track.trackTitle || !track.trackArtist || !track.trackTimestamp) {
    console.info("Missing required track info:", track);
    return;
  }

  // 🔄 Always pull fresh history
  const scrobbleHistory = JSON.parse(Cookies.get("scrobbleHistory") || "[]");

  // ✅ Check for duplicates based only on artist and title
  const isDuplicate = scrobbleHistory.some(entry =>
    entry.artist.toLowerCase() === track.trackArtist.toLowerCase() &&
    entry.title.toLowerCase() === track.trackTitle.toLowerCase()
  );


  if (isDuplicate) {
    console.log("🚫 Skipping duplicate scrobble:", track);
    return;
  }

  // Build the signature string (parameters must be in alphabetical order!)
  let sigParts = "";

  // Include album only if present
  if (track.trackAlbum) {
    sigParts += "album" + track.trackAlbum;
    sigParts += "albumArtist" + track.trackArtist;
  }

  sigParts += "api_key" + APIKEY;
  sigParts += "artist" + track.trackArtist;
  sigParts += "methodtrack.scrobble"; // method should be included in the signature string
  sigParts += "sk" + userKey;
  sigParts += "timestamp" + track.trackTimestamp;
  sigParts += "track" + track.trackTitle;
  sigParts += SECRET;

  // Generate the MD5 hash signature
  const sig = md5(sigParts);

  // Build POST data
  let data =
    "method=track.scrobble" +
    "&api_key=" + APIKEY +
    "&artist=" + encodeURIComponent(track.trackArtist) +
    "&track=" + encodeURIComponent(track.trackTitle) +
    "&timestamp=" + track.trackTimestamp +
    "&sk=" + userKey +
    "&api_sig=" + sig +
    "&format=json";

  if (track.trackAlbum) {
    data += "&album=" + encodeURIComponent(track.trackAlbum)+
    "&albumArtist=" + encodeURIComponent(track.trackArtist);
  }

  // Log the request details for debugging
  console.log("Scrobbling:", {
    artist: track.trackArtist,
    title: track.trackTitle,
    album: track.trackAlbum,
    albumArtist: track.trackArtist,
    timestamp: track.trackTimestamp,
    sig: sig
  });

  // Send the request using fetch
  fetch(lastFmBaseScrobbleUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: data,
  })
    .then(response => response.json())  // Parse the JSON response
    .then(responseData => {
      // console.log("Scrobble response:", responseData);
      if (responseData.error) {
        console.error("Scrobble error:", responseData.message);
      } else {
        const wasAccepted = responseData.scrobbles?.['@attr']?.accepted > 0;

        if (wasAccepted) {
          console.log("😎 Scrobble accepted!");
          updateHistory(track);
        } else {
          console.warn("😬 Scrobble ignored by Last.fm:", responseData);
        }
      }
    })
    .catch(error => {
      console.error("Scrobble error:", error);
    });
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
    const userKey = Cookies.get("scrobbleradio-lastfm-key");

    if (button) {
        if (!userKey) {
            button.innerHTML = '<i class="icon-lastfm"></i> Login with Last.fm';
            button.onclick = () => {
                const authUrl = `https://www.last.fm/api/auth/?api_key=${APIKEY}&cb=${encodeURIComponent(window.location.origin + window.location.pathname)}`;
                window.location.href = authUrl;
            };
        } else {
            button.innerHTML = '<i class="icon-lastfm"></i> Logout of Last.fm';
            button.onclick = () => {
                Cookies.remove("scrobbleradio-lastfm-key");
                alert("Logged out of Last.fm");
                updateAuthButton();
            };
        }
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