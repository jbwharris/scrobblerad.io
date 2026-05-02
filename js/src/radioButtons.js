import { hasTag } from './utils.js';
import { currentTag as currentTagModule } from './constants.js';

export let currentTag = currentTagModule; // Create a local mutable reference

export function generateRadioButtons(tags = ['all'], stations, radioPlayer) {
  // Flatten all stations into a list of station objects
  const allStations = [];
  for (const key in stations) {
    const station = stations[key];
    if (station.stationName) {
      // Main station
      allStations.push({
        stationKey: key, // Use the object key as stationKey
        stationDisplayName: station.stationName,
        tags: station.tags || [], // Ensure tags exist
        group: null,
      });
    }

    // Detect sub-stations by checking for nested objects
    for (const subKey in station) {
      if (subKey !== 'stationName' && subKey !== 'tags' && typeof station[subKey] === 'object') {
        const subStation = station[subKey];
        if (subStation.stationName) {
          const subStationKey = `${key}.${subKey}`; // Combine keys for sub-stations
          allStations.push({
            stationKey: subStationKey, // Use the combined key as stationKey
            stationDisplayName: subStation.stationName,
            tags: subStation.tags || [], // Ensure tags exist
            group: key, // Reference to the parent station
          });
        }
      }
    }
  }

  let filteredStations = allStations;

  // Filter stations based on the selected tags
  if (tags.length > 0 && !tags.includes('all')) {
    filteredStations = allStations.filter(station => 
      tags.every(tag => hasTag(station, tag))
    );
   } else {
    // When 'all' is selected (or no tags), exclude any station that has the 'hidden' tag
    filteredStations = allStations.filter(station => !hasTag(station, 'hidden'));
  }

  // Clear the station select div and display a message if no stations match
  const stationSelectDiv = document.getElementById('stationSelect');
  stationSelectDiv.innerHTML = '';

  if (filteredStations.length === 0) {
    const noStationsMessage = document.createElement('p');
    noStationsMessage.textContent = 'No stations match the selected filters.';
    stationSelectDiv.appendChild(noStationsMessage);
    return; // Exit early since there are no stations to display
  }

  // Generate radio buttons for filtered stations
  const fragment = document.createDocumentFragment();

  filteredStations.forEach(station => {
    const button = document.createElement('button');
    button.name = station.stationKey;
    button.textContent = station.stationDisplayName; // Use the display name

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'station';
    input.value = station.stationKey;
    input.checked = station.stationKey === radioPlayer.stationKey;

    const img = document.createElement('img');
    img.src = `img/stations/${station.stationKey}.png`; // Use the key for image path
    img.width = '45';
    img.height = '45';
    img.loading = 'lazy';
    img.alt = station.stationDisplayName;
    img.title = station.stationDisplayName;

    button.appendChild(input);
    button.prepend(img);
    fragment.appendChild(button);
  });

  stationSelectDiv.appendChild(fragment);
}

export function handleStationClick(event, radioPlayer) {
  const clickedButton = event.target.closest('button');
  if (clickedButton) {
    const stationKey = clickedButton.name; 
    const stationDisplayName = clickedButton.textContent;
    window.location.hash = `#${stationKey}`;
    radioPlayer.handleStationSelect(null, stationKey, stationDisplayName, true);
  }
}
