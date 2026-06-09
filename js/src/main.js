import { generateRadioButtons, handleStationClick } from './radioButtons.js';
import { RadioPlayer } from './radioPlayer.js';
import stations from './stations-dist.js';
import { getSelectedTags } from './utils.js';


const stationKeys = stations;

const [playButton, skipForward, skipBack] = 
  ["#playButton", "#skipForward", "#skipBack"].map(selector => 
    document.querySelector(selector)
  );

const radioPlayer = new RadioPlayer(playButton, skipForward, skipBack, stationKeys);

// Function to handle tag selection and generate radio buttons
function handleTagSelected() {
  const selectedTags = getSelectedTags();

  // Update URL with current filters
  const url = new URL(window.location);
  if (selectedTags.length > 0) {
    url.searchParams.set('filter', selectedTags.join(','));
  } else {
    url.searchParams.delete('filter');
  }
  window.history.replaceState({}, '', url);

  generateRadioButtons(selectedTags, stations, radioPlayer);
}

function getFilterFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');
  return filterParam ? filterParam.split(',') : [];
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
    // Get filters from URL
    const urlFilters = getFilterFromUrl();

    // If URL has filters, apply them
    if (urlFilters.length > 0) {
        // Set the select elements to match the URL filters
        const [countrySelect, formatSelect, genreSelect] = [
            document.getElementById('tagCountry'),
            document.getElementById('tagFormat'),
            document.getElementById('tagGenre')
        ];

        // Simple mapping - you might need to adjust this based on your actual select options
        urlFilters.forEach(tag => {
            if (countrySelect.querySelector(`option[value="${tag}"]`)) {
                countrySelect.value = tag;
            } else if (formatSelect.querySelector(`option[value="${tag}"]`)) {
                formatSelect.value = tag;
            } else if (genreSelect.querySelector(`option[value="${tag}"]`)) {
                genreSelect.value = tag;
            }
        });
    }

    // Generate radio buttons with current filters
    const selectedTags = getSelectedTags();
    generateRadioButtons(selectedTags, stations, radioPlayer);

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

