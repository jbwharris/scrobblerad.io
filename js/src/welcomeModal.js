import { filters, popularStations } from './filterData.js';
import stations from './stations-dist.js';

const KEYS = {
 VISITED: 'scrobblerad_visited',
 REMIND: 'scrobblerad_remind_later'
};

const REMIND_DAYS = 14;

var modal;

// Resolves "abc.doublej" → stations.abc.doublej
function resolveStation(key) {
 var parts = key.split('.');
 var obj = stations;
 for (var i = 0; i < parts.length; i++) {
 obj = obj[parts[i]];
 if (!obj) return null;
 }
 return obj && obj.stationName? obj : null;
}

function populatePopular() {
 var container = document.getElementById('wm-popular');
 if (!container) return;
 var frag = document.createDocumentFragment();

 popularStations.forEach(function (key) {
 var station = resolveStation(key);
 if (!station) return;

 var a = document.createElement('a');
 a.href = '#';
 a.className = 'wm-station-card';
 a.setAttribute('data-station', key);

 var img = document.createElement('img');
 // Use the key exactly as-is — no transformations
var imgSrc = 'img/stations/' + key + '.png';
img.src = imgSrc;
 img.alt = station.stationName;
 img.width = 56;
 img.height = 56;
 img.loading = 'lazy';
 img.onerror = function () { this.style.opacity = 0; };

 var span = document.createElement('span');
 span.className = 'wm-station-name';
 span.textContent = station.stationName;

 a.appendChild(img);
 a.appendChild(span);
 frag.appendChild(a);
 });

 container.appendChild(frag);
}

function populateTags(containerId, items) {
 var container = document.getElementById(containerId);
 if (!container) return;
 var frag = document.createDocumentFragment();
 items.forEach(function (item) {
 var a = document.createElement('a');
 a.href = '/?filter=' + encodeURIComponent(item.value);
 a.textContent = item.label;
 a.addEventListener('click', function () {
 localStorage.setItem(KEYS.VISITED, '1');
 });
 frag.appendChild(a);
 });
 container.appendChild(frag);
}

function shouldShow() {
 // Respect the "Show filter modal on launch" setting
 var settingsRaw = localStorage.getItem('scrobbleradio-settings');
 if (settingsRaw) {
 try {
 var settings = JSON.parse(settingsRaw);
 if (settings.showWelcome === false) return false;
 if (settings.showWelcome === true) return true; // force show every launch
 } catch (e) { /* ignore corrupt settings */ }
 }

 // Existing checks (only run when setting is undefined/default)
 if (localStorage.getItem(KEYS.VISITED)) return false;
 if (sessionStorage.getItem(KEYS.VISITED)) return false;
 var remindUntil = localStorage.getItem(KEYS.REMIND);
 if (remindUntil) {
 if (Date.now() < parseInt(remindUntil, 10)) return false;
 localStorage.removeItem(KEYS.REMIND);
 }
 return true;
}

function dismissPermanent() {
 var cb = modal && modal.querySelector('#wm-dont-show');
 if (cb && cb.checked) {
 try {
 var settings = JSON.parse(localStorage.getItem('scrobbleradio-settings') || '{}');
 settings.showWelcome = false;
 localStorage.setItem('scrobbleradio-settings', JSON.stringify(settings));
 } catch (e) { /* ignore */ }
 }
 localStorage.setItem(KEYS.VISITED, '1');
 hide();
}

function dismissLater() {
 var expiry = Date.now() + REMIND_DAYS * 24 * 60 * 60 * 1000;
 localStorage.setItem(KEYS.REMIND, String(expiry));
 hide();
}

function dismissSession() {
 sessionStorage.setItem(KEYS.VISITED, '1');
 hide();
}

function show() {
 if (modal) {
 var cb = modal.querySelector('#wm-dont-show');
 if (cb) cb.checked = false;
 modal.hidden = false;
 }
}

function hide() {
 if (modal) modal.hidden = true;
}

function bindEvents() {
 if (!modal) return;

 var btnClose = modal.querySelector('.wm-close');
 var btnCta = modal.querySelector('.wm-cta');
 var btnRemind = modal.querySelector('.wm-remind');

 if (btnClose) btnClose.addEventListener('click', dismissSession);
 if (btnCta) btnCta.addEventListener('click', dismissPermanent);
 if (btnRemind) btnRemind.addEventListener('click', dismissLater);

 modal.addEventListener('click', function (e) {
 if (e.target === modal) dismissSession();
 });

 document.addEventListener('keydown', function (e) {
 if (e.key === 'Escape' &&!modal.hidden) dismissSession();
 });

 // Station cards: set hash + dispatch event
 modal.querySelectorAll('.wm-station-card').forEach(function (card) {
 card.addEventListener('click', function (e) {
 e.preventDefault();
 var stationId = card.getAttribute('data-station');
 dismissPermanent();
 // Update URL hash first
 window.location.hash = stationId;
 // Then dispatch for your player to catch
 document.dispatchEvent(new CustomEvent('scrobblerad:playStation', {
 detail: { station: stationId }
 }));
 });
 });

 // Filter links: clear hash, set query param
 modal.querySelectorAll('.wm-tags a').forEach(function (link) {
 link.addEventListener('click', function (e) {
 // Let the link navigate normally, but clear any existing hash
 var href = link.getAttribute('href');
 if (href) {
 // Ensure no hash contaminates the filter URL
 link.setAttribute('href', href.split('#')[0]);
 }
 localStorage.setItem(KEYS.VISITED, '1');
 });
 });
}



function init() {
 modal = document.getElementById('welcomeModal');
 if (!modal) return;

 populatePopular();
 populateTags('wm-countries', filters.countries.filter(function (f) {
 return f.value!== 'all';
 }));
 populateTags('wm-formats', filters.formats.filter(function (f) {
 return f.value!== 'all';
 }));
 populateTags('wm-genres', filters.genres.filter(function (f) {
 return f.value!== 'all';
 }));

 bindEvents();

 if (shouldShow()) {
 setTimeout(show, 400);
 }
}

export { init };

