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



