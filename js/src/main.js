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
    // 1. Generate the radio buttons first
    await generateRadioButtons("all", stations, radioPlayer, stationKeys);

    // 2. DECISION LOGIC: Hash vs Default
    const hash = window.location.hash;
    if (hash) {
        // If there is a hash (e.g. #wfmu), jump to it
        radioPlayer.jumpToStationFromHash();
    } else {
        // If no hash, load the very first station in your list
        const defaultStation = stationKeys[0];
        radioPlayer.handleStationSelect(false, defaultStation, null, true);
    }

    // 3. Setup the select element listener (only once)
    const stationSelect = document.getElementById('stationSelect');
    if (stationSelect) {
        stationSelect.addEventListener('change', (event) => {
            const stationKey = event.target.value;
            radioPlayer.handleStationSelect(true, stationKey, null, true);
        }, { once: true });
    }

    // ... (The rest of your PWA/Fullscreen/Scroll logic remains the same)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('fullscreen-mode');
    }

    const container = document.querySelector('.mobile-swipe');
    const panel2 = document.getElementById('panel2');
    if (container && panel2) {
        container.scrollTo({
            left: panel2.offsetLeft,
            behavior: 'smooth'
        });
    }
}, { once: true });

