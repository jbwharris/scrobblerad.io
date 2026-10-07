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
    const skipCacheBuster = ['radiowestern', 'kexp', 'wrir', 'wprb', 'krcl', 'cbcmusic', 'indie1023', 'wusc', 'cioi'];
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

export function replaceSpecialCharacters(str) {
 if (str == null) return '';
 const strValue = String(str);
 return strValue
.replace(/&apos;|&#039;|'|'|‚|‛|`|´/g, "'")
.replace(/–|—/g, "-")
.replace(/[“”„]/g, '"')
.replace(/…/g, "...")
.replace(/\u00A0/g, " ")
.replace(/[\t\n\r]/g, '')
.replace(/&amp;/g, '&')
.replace(/&lt;/g, '<')
.replace(/&gt;/g, '>')
.replace(/\s*\[.*?\]/g, '')
.replace(/[*/|\\]/g, '')
.replace(/--/g, '-')
.replace(/\s*\(Current Track\)\s*/gi, '')
.replace(/\s-\s.*single.*$/i, '')
.replace(/\b(tUnE yArDs|tune-yards|tuneyards)\b/gi, 'tUnE-yArDs')
.replace(/\b(Lets|Its|Ive|Dont|Cant|Wont|Aint)\b/gi, match => {
 const replacements = {
 Lets: "Let's",
 Its: "It's",
 Ive: "I've",
 Dont: "Don't",
 Cant: "Can't",
 Wont: "Won't",
 Aint: "Ain't",
 Youve: "You've"
 };
 return replacements[match] || match;
 })
.replace(/\b(Somethin|Nothin)\b/gi, match => {
 const replacements = {
 Somethin: "Somethin'",
 Nothin: "Nothin'"
 };
 return replacements[match] || match;
 })
.trim() || '';
}

export function filterSongDetails(song) {
 if (!song) return '';
 return song
.replace(/\s*\(.*?version.*?\)/gi, '')
.replace(/\s-\s.*version.*$/i, '')
.replace(/\s-\s.*kqua.*$/i, '')
.replace(/\s-\s.*mix.*$/i, '')
.replace(/\s*-\s*\([^)]*\)/g, '')
.replace(/\s*\(.*?edit.*?\)/gi, '')
.replace(/\s*\(\s*(feat\.?|ft\.?|featuring).*?\)|\s+(feat\.?|ft\.?|featuring)\s.*$/gi, '')
.replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/i, '')
.replace(/\s*\(.*?clean.*?\)/gi, '')
.replace(/\s-\s.*edit.*$/i, '')
.replace(/[\(\[]\d{4}\s*Mix[\)\]]/gi, '')
.replace(/\s*\(\d{4}\s*-\s*Remaster(ed)?\)/gi, '')
.replace(/\s*\([\d]{4}\s*Remaster(ed)?\)/gi, '')
.replace(/\s*-\s*[\d]{4}\s*Remaster(ed)?/gi, '')
.replace(/\s*-\s*Remaster(ed)?/gi, '')
.replace(/([\)\]])\s*\d{4}.*/, '')
.replace(/\s*[\(\[].*?\b\d{4}\b.*?[\)\]]\s*/g, '')
.replace(/\s*\(.*?\bofficial\b.*?\)/gi, '')
.replace(/\s*\(.*?\bsingle\b.*?\)/gi, '')
.replace(/\s*\(.*?\bLOCAL\b.*?\)/gi, '')
.replace(/\s*\(.*?\bsession\b.*?\)/gi, '')
.replace(/\s*\(.*?\blive\b.*?\)/gi, '')
.replace(/\s*\(.*?\bcover\b.*?\)/gi, '')
.replace(/\s-\s.*single.*$/i, '')
.replace(/\s*\([^)]*$/gi, '')
.trim();
}
