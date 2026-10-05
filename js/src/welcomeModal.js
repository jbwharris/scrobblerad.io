import { filters, popularStations } from './filterData.js';
import stations from './stations-dist.js';

const KEYS = {
 VISITED: 'scrobblerad_visited',
 REMIND: 'scrobblerad_remind_later'
};

const REMIND_DAYS = 14;

var modal;
var selectedFilters = new Set(); // "country:ca", "format:rock", etc.

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

function populateTags(containerId, items, group) {
 var container = document.getElementById(containerId);
 if (!container) return;
 var frag = document.createDocumentFragment();
 items.forEach(function (item) {
 var btn = document.createElement('button');
 btn.type = 'button';
 btn.className = 'wm-tag-btn';
 btn.textContent = item.label;
 btn.setAttribute('data-filter', group + ':' + item.value);
 btn.addEventListener('click', function () {
 var key = group + ':' + item.value;
 if (selectedFilters.has(key)) {
 selectedFilters.delete(key);
 btn.classList.remove('wm-tag-active');
 } else {
 selectedFilters.add(key);
 btn.classList.add('wm-tag-active');
 }
 });
 frag.appendChild(btn);
 });
 container.appendChild(frag);
}

function shouldShow() {
 var settingsRaw = localStorage.getItem('scrobbleradio-settings');
 if (settingsRaw) {
 try {
 var settings = JSON.parse(settingsRaw);
 if (settings.showWelcome === false) return false;
 if (settings.showWelcome === true) return true;
 } catch (e) { /* ignore corrupt settings */ }
 }
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
 hideAndReveal();
}

function dismissLater() {
 var expiry = Date.now() + REMIND_DAYS * 24 * 60 * 60 * 1000;
 localStorage.setItem(KEYS.REMIND, String(expiry));
 hideAndReveal();
}

function dismissSession() {
 sessionStorage.setItem(KEYS.VISITED, '1');
 hideAndReveal();
}

function hideAndReveal() {
 hide();
 // Dismiss splash — the splash should listen for this event
 document.dispatchEvent(new CustomEvent('scrobblerad:splashDismiss'));
}

function show() {
 if (modal) {
 var cb = modal.querySelector('#wm-dont-show');
 if (cb) cb.checked = false;
 selectedFilters.clear();
 // Clear active states from any previous open
 modal.querySelectorAll('.wm-tag-active').forEach(function (el) {
 el.classList.remove('wm-tag-active');
 });
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
 if (btnCta) btnCta.addEventListener('click', handleCta);
 if (btnRemind) btnRemind.addEventListener('click', dismissLater);

 modal.addEventListener('click', function (e) {
 if (e.target === modal) dismissSession();
 });

 document.addEventListener('keydown', function (e) {
 if (e.key === 'Escape' &&!modal.hidden) dismissSession();
 });

 // Station cards
 modal.querySelectorAll('.wm-station-card').forEach(function (card) {
 card.addEventListener('click', function (e) {
 e.preventDefault();
 var stationId = card.getAttribute('data-station');
 dismissPermanent();
 document.dispatchEvent(new CustomEvent('scrobblerad:playStation', {
 detail: { station: stationId, fromWelcome: true }
 }));
 });
});
}

function handleCta() {
 // Collect selected filters into a structured object
 var filtersObj = {};
 selectedFilters.forEach(function (key) {
 var parts = key.split(':');
 var group = parts[0];
 var value = parts.slice(1).join(':');
 if (!filtersObj[group]) filtersObj[group] = [];
 filtersObj[group].push(value);
 });

 dismissPermanent();

 // Dispatch filter event — your app should listen for this and apply filters
 document.dispatchEvent(new CustomEvent('scrobblerad:applyFilters', {
 detail: filtersObj
 }));
}

function init() {
 modal = document.getElementById('welcomeModal');
 if (!modal) return;

 populatePopular();
 populateTags('wm-countries', filters.countries.filter(function (f) {
 return f.value!== 'all';
 }), 'country');
 populateTags('wm-formats', filters.formats.filter(function (f) {
 return f.value!== 'all';
 }), 'format');
 populateTags('wm-genres', filters.genres.filter(function (f) {
 return f.value!== 'all';
 }), 'genre');

 bindEvents();

 if (shouldShow()) {
 setTimeout(show, 400);
 }
}

export { init };