import { startLastFmAuth, updateAuthButton } from './scrobbler.js';

const SETTINGS_KEY = 'scrobbleradio-settings';

const SWATCH_COLOURS = [
 'hsla(326, 47%, 55%, 1)', // pink
 'hsla(269, 68%, 62%, 1)', // purple
 'hsla(205, 66%, 43%, 1)', // blue
 'hsla(176, 55%, 47%, 1)', // teal
 'hsla(160, 48%, 43%, 1)', // green
 'hsla(66, 66%, 52%, 1)', // yellow
 'hsla(21, 72%, 52%, 1)' // orange
];

export function getSettings() {
 try {
 return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
 } catch {
 return {};
 }
}

export function saveSettings(settings) {
 localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function openSettingsModal() {
 console.log("openSettingsModal called");
 const modal = document.getElementById('settingsModal');
 if (!modal) return;
 console.log("modal found, hidden before:", modal.hasAttribute('hidden'));
 modal.removeAttribute('hidden');
 console.log("hidden after:", modal.hasAttribute('hidden'));

 const settings = getSettings();
 document.getElementById('setting-show-welcome').checked = settings.showWelcome!== false;
 document.getElementById('setting-resume-station').checked = settings.resumeStation!== false;
 renderColourSwatches();

 const themeMode = settings.themeMode || 'system';
 const themeRadio = document.querySelector(`input[name="themeMode"][value="${themeMode}"]`);
 if (themeRadio) themeRadio.checked = true;

 updateSettingsAuthButton();
}

export function closeSettingsModal() {
 const modal = document.getElementById('settingsModal');
 if (modal) modal.setAttribute('hidden', '');
}

export function initSettingsUI() {
 const gearBtn = document.getElementById('settings-gear-btn');
 const avatarBtn = document.getElementById('avatar-btn');
 const avatarDropdown = document.getElementById('avatar-dropdown');
 const settingsBtn = document.getElementById('settings-btn');
 const logoutBtn = document.getElementById('logout-btn');
 const settingsClose = document.getElementById('settings-close');
 const settingsSave = document.getElementById('settings-save');
 const loginProviders = document.querySelectorAll('.login-provider');
 const savedColour = getSettings().uiColour;
 if (savedColour) applyUserUiColor(savedColour);

 // Gear button → open settings
 gearBtn?.addEventListener('click', openSettingsModal);

 avatarBtn?.addEventListener("click", (e) => {
 e.stopPropagation();
 avatarDropdown.classList.toggle("open");
 avatarBtn.setAttribute("aria-expanded", avatarDropdown.classList.contains("open"));
 });

 // Close dropdown on outside click
 document.addEventListener('click', (e) => {
 if (!avatarBtn?.contains(e.target) &&!avatarDropdown?.contains(e.target)) {
 avatarBtn?.setAttribute('aria-expanded', 'false');
 }
 });

 // Settings button from dropdown
 settingsBtn?.addEventListener('click', () => {
 openSettingsModal();
 });

 // Logout
 logoutBtn?.addEventListener('click', () => {
 Cookies.remove("scrobbleradio-lastfm-user", { path: "/" });
 updateAuthButton();
 updateSettingsAuthButton();
 });

 // Close modal
 settingsClose?.addEventListener('click', closeSettingsModal);

 // Apply saved theme on load
 const savedTheme = getSettings().themeMode || 'system';
 applyThemeMode(savedTheme);

 // Theme radio change
 document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
 radio.addEventListener('change', () => {
 const settings = getSettings();
 settings.themeMode = radio.value;
 saveSettings(settings);
 applyThemeMode(radio.value);
 });
 });

 // Save settings
 settingsSave?.addEventListener('click', () => {
 const settings = getSettings();
 settings.showWelcome = document.getElementById('setting-show-welcome').checked;
 settings.resumeStation = document.getElementById('setting-resume-station').checked;
 saveSettings(settings);
 closeSettingsModal();
 });

 loginProviders.forEach(btn => {
 const provider = btn.dataset.provider;

 if (provider === 'lastfm') {
 updateSettingsAuthButton(btn);

 btn.addEventListener('click', () => {
 const currentCookie = Cookies.get("scrobbleradio-lastfm-user");
 const currentUser = currentCookie? JSON.parse(currentCookie) : null;

 if (currentUser?.key) {
 Cookies.remove("scrobbleradio-lastfm-user", { path: "/" });
 updateAuthButton();
 updateSettingsAuthButton(btn);
 } else {
 startLastFmAuth();
 }
 });
 } else {
 btn.disabled = true;
 btn.title = 'Coming soon';
 }
 });
}

function applyUserUiColor(color) {
 document.documentElement.style.setProperty('--user-ui-color', color);
}

function renderColourSwatches() {
 const container = document.getElementById('ui-colour-swatches');
 if (!container) return;
 container.innerHTML = '';
 const current = getSettings().uiColour || SWATCH_COLOURS[0];

 SWATCH_COLOURS.forEach(color => {
 const swatch = document.createElement('button');
 swatch.className = 'colour-swatch';
 swatch.style.backgroundColor = color;
 swatch.dataset.color = color;
 swatch.setAttribute('aria-label', `Set UI colour to ${color}`);
 if (color === current) swatch.classList.add('active');
 swatch.addEventListener('click', () => {
 applyUserUiColor(color);
 const settings = getSettings();
 settings.uiColour = color;
 saveSettings(settings);
 });
 container.appendChild(swatch);
 });
}

function applyThemeMode(mode) {
 const root = document.documentElement;
 if (mode === 'system') {
 root.removeAttribute('data-bs-theme');
 } else {
 root.setAttribute('data-bs-theme', mode);
 }
}

export function updateSettingsAuthButton(btn = document.querySelector('.login-provider[data-provider="lastfm"]')) {
 if (!btn) return;

 const userCookie = Cookies.get("scrobbleradio-lastfm-user");
 const userData = userCookie? JSON.parse(userCookie) : null;

 if (!btn.querySelector('.icon-lastfm')) {
 btn.prepend(Object.assign(document.createElement('i'), { className: 'icon-lastfm' }));
 }

 let label = btn.querySelector('.auth-label');
 if (!label) {
 label = document.createElement('span');
 label.className = 'auth-label';
 btn.appendChild(label);
 }
 label.textContent = userData?.key
? `Logout (${userData.username})`
 : 'Login with Last.fm';
}

window.addEventListener("lastfm-auth-changed", () => updateSettingsAuthButton());

document.addEventListener("DOMContentLoaded", () => updateSettingsAuthButton());