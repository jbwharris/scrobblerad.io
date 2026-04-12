import { generateRadioButtons, handleStationClick } from './radioButtons.js';
import { RadioPlayer } from './radioPlayer.js';
import stations from './stations-dist.js';

const stationKeys = Object.keys(stations);

const [playButton, skipForward, skipBack, reloadStream] = 
  ["#playButton", "#skipForward", "#skipBack", "#reloadStream"].map(selector => 
    document.querySelector(selector)
  );

const radioPlayer = new RadioPlayer(playButton, skipForward, skipBack, reloadStream, stationKeys);

// Function to get all selected tags from the select elements
function getSelectedTags() {
  const tagCountry = document.getElementById('tagCountry').value;
  const tagFormat = document.getElementById('tagFormat').value;
  const tagGenre = document.getElementById('tagGenre').value;

  // Filter out 'all' values and return an array of selected tags
  return [tagCountry, tagFormat, tagGenre].filter(tag => tag !== 'all');
}

// Function to handle tag selection and generate radio buttons
function handleTagSelected() {
  const selectedTags = getSelectedTags();
  generateRadioButtons(selectedTags, stations, radioPlayer);
}

// Add event listeners to the select elements
const tagCountrySelect = document.getElementById('tagCountry');
const tagFormatSelect = document.getElementById('tagFormat');
const tagGenreSelect = document.getElementById('tagGenre');

tagCountrySelect.addEventListener('change', handleTagSelected);
tagFormatSelect.addEventListener('change', handleTagSelected);
tagGenreSelect.addEventListener('change', handleTagSelected);

// Initial load with default tags
generateRadioButtons(['all'], stations, radioPlayer);

const stationSelectDiv = document.getElementById('stationSelect');
stationSelectDiv.addEventListener('click', (event) => handleStationClick(event, radioPlayer));


document.addEventListener('DOMContentLoaded', async function() {
    // Generate the radio buttons first
    await generateRadioButtons("all", stations, radioPlayer, stationKeys);

    radioPlayer.jumpToStationFromHash();

    const defaultStation = stationKeys[0];
    radioPlayer.handleStationSelect(false, defaultStation, null, true);

    const stationSelect = document.getElementById('stationSelect');
    if (stationSelect) {
        stationSelect.addEventListener('change', (event) => {
            const stationKey = event.target.value;
            const direction = true; 
            radioPlayer.handleStationSelect(direction, stationKey, null, true);
        }, { once: true });
    } else {
        console.error('Element with ID "stationSelect" not found.');
    }

    // Detect fullscreen mode (PWA standalone) and apply CSS class
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('fullscreen-mode');
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

