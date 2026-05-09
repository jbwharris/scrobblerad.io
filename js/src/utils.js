export function hasTag(station, targetTag) {
  if (station.tags.includes(targetTag)) {
    return true;
  }
  for (const tag of station.tags) {
    if (Array.isArray(tag)) {
      if (hasTag({ tags: tag }, targetTag)) {
        return true;
      }
    }
  }
  return false;
}

export function animateElement(element, duration = 2000) {
    element.classList.add("animated", "fadeIn");
    setTimeout(() => {
        element.classList.remove("animated", "fadeIn");
    }, duration);
}

export function formatCompactNumber(number) {
  if (number < 1000) {
    return number;
  } else if (number >= 1000 && number < 1_000_000) {
    return (number / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else if (number >= 1_000_000 && number < 1_000_000_000) {
    return (number / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (number >= 1_000_000_000 && number < 1_000_000_000_000) {
    return (number / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
}

export function addCacheBuster(url) {
    const timestamp = Date.now();
    const skipCacheBuster = ['radiowestern', 'kexp', 'wrir', 'wprb', 'krcl', 'cbcmusic', 'indie1023', 'wusc'];
    if (skipCacheBuster.includes(this.stationKey) ) {
        return url;
    }
    return url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
}

export function debounce(func, wait) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function upsizeImgUrl(url) {
    if (url) {
        return url.replace(/\d{3}x\d{3}/g, '500x500');
    }
}

export function getSelectedTags() {
  const tagCountry = document.getElementById('tagCountry').value;
  const tagFormat = document.getElementById('tagFormat').value;
  const tagGenre = document.getElementById('tagGenre').value;

  // Filter out 'all' values and return an array of selected tags
  return [tagCountry, tagFormat, tagGenre].filter(tag => tag !== 'all');
}

export function flattenStations(stationsObj, prefix = '') {
    let stations = [];
    for (const [key, value] of Object.entries(stationsObj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // If it's a station (has stationName and tags)
        if (value?.stationName && Array.isArray(value?.tags)) {
            stations.push({
                stationKey: fullKey,
                stationDisplayName: value.stationName,
                tags: value.tags
            });
        }

        // Recurse into nested objects (whether it's a station or group)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            stations = stations.concat(this.flattenStations(value, fullKey));
        }
    }
    return stations;
}


export const isHidden = (station) => station.tags && station.tags.includes('hidden');
