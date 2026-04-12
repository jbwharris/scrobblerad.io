export function getTimezoneOffset(d, tz) {
  const a = d.toLocaleString("ja", {timeZone: tz}).split(/[/\s:]/);
  a[1]--;
  const t1 = Date.UTC.apply(null, a);
  const t2 = new Date(d).setMilliseconds(0);
  return (t2 - t1) / 60 / 1000;
}


export function checkStaleData(timezone, timestamp, spinUpdated, duration, trackEnd, song) {  
    let staleData = '';

    if ((!timezone && !timestamp && !spinUpdated) || (!timestamp && spinUpdated == true) || (timestamp === undefined && !this.getNestedValue(this.currentStationData, this.stationKey, 'spinPath', null) && !timezone)) {
        return staleData;
    }

    let apiUpdatedData;
    // Fix timezoneTime creation
    let timezoneTime = new Date().toLocaleString("en-US", { 
        timeZone: timezone, 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false,
        timeZoneName: 'longOffset'
    });

    if (timestamp && !trackEnd) {
        apiUpdatedData = this.convertTimestamp(timestamp, timezone);
    } else if (timestamp && trackEnd) {
        apiUpdatedData = this.convertTimestamp(trackEnd, timezone);
    } else if (spinUpdated && this.stationKey == 'cbcmusic') {
        apiUpdatedData = this.convertTimestamp(spinUpdated, timezone);
    } else if (spinUpdated && this.stationKey !== 'cbcmusic') {
        // Handle timestamp conversion and formatting

        let spinUpdatedData = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);

        const now = new Date();
        let spinOffset = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            timeZoneName: 'longOffset'
        });

        const parts = spinOffset.formatToParts(now);
        const lookup = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        apiUpdatedData = `${spinUpdatedData} ${lookup.timeZoneName}`;

        apiUpdatedData = Date.parse(apiUpdatedData);
    } else if ((timezone && !timestamp)) {
        if (song !== this.song) {
            // Song changed: Set a new fallback timestamp
            this.fallbackTimestamp = Date.parse(timezoneTime);
            apiUpdatedData = this.fallbackTimestamp;
        } else if (this.fallbackTimestamp) {
            // Same song: Retain the previously assigned timestamp
            apiUpdatedData = this.fallbackTimestamp;
        }
    }

    // Convert formatted times to epoch
    timezoneTime = Date.parse(timezoneTime);


    // some stations have a pretty huge timing offset between the API and the stream, so this is an attempt to make it so the songs might be more likely to be showing the song data at the same time the song is actually playing. 
    if ((this.getNestedValue(this.currentStationData, this.stationKey, 'offset', null) + apiUpdatedData) < timezoneTime) {
        apiUpdatedData = (this.getNestedValue(this.currentStationData, this.stationKey, 'offset', null) + apiUpdatedData);
        timezoneTime = (this.getNestedValue(this.currentStationData, this.stationKey, 'offset', null) + timezoneTime);
    }



    // some stations have duration data and tend to switch the track too early. This calculated a duration, except if there's a trackEnd already defined in the API, then it doesn't need to be calculated and we just use that value
    if (duration && !trackEnd) {

        this.duration = duration;

        if (this.duration > 0) {
            apiUpdatedData = apiUpdatedData + duration;
        } else {
            // Check if duration is already in epoch format (milliseconds)
            const isEpoch = (value) => typeof value === 'number' && value >= 1000 && value < 1e13;

            // Convert duration to epoch if necessary
            const epochDuration = isEpoch(this.duration) ? this.duration : this.convertDurationToMilliseconds(this.duration);

            if (duration <= 600) {
                apiUpdatedData = apiUpdatedData + (duration * 1000);
               // console.log('apiUpdatedData', apiUpdatedData)
            } else if (epochDuration > 0) {
                apiUpdatedData = apiUpdatedData + epochDuration;
            } else {
                apiUpdatedData = apiUpdatedData + duration; // Get end time of the song
                console.log('apiUpdatedData else', apiUpdatedData)
            }

            console.log("apiUpdatedData + duration =", apiUpdatedData);
        }
    }

    if (apiUpdatedData.toString().length == 10) {
        apiUpdatedData = apiUpdatedData * 1000;
        console.log('apiUpdatedData x 1000', apiUpdatedData);
    } else if (apiUpdatedData.toString().length > 13) {
        // Convert to string before slicing
        apiUpdatedData = Number.parseInt(apiUpdatedData.toString().slice(0, 13), 10);
    }


    this.lastKnownUpdatedTime = apiUpdatedData;
    console.log("this.lastKnownUpdatedTime", this.lastKnownUpdatedTime)

    // Calculate time difference
    const timeDifference = (timezoneTime - apiUpdatedData) / 1000;
    console.log('apiUpdatedData', apiUpdatedData, 'timezoneTime', timezoneTime, 'timeDifference', timeDifference);

    // Check if the data is stale (older than 15 minutes)
    if ((timeDifference > 900 || timeDifference < -900) && apiUpdatedData !== "") {
        staleData = 'Streaming data is stale';
    }

    return { staleData };
}

export function convertDurationToMilliseconds(durationStr) {
    // Split the string into parts based on ':'
    const parts = durationStr.split(':');

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let milliseconds = 0;

    // Determine the format based on the number of parts
    if (parts.length === 3) {
        // Format: HH:MM:SS.sss
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
        const secondsParts = parts[2].split('.');
        seconds = parseInt(secondsParts[0], 10) || 0;
        milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) / Math.pow(10, secondsParts[1].length) * 1000 : 0;
    } else if (parts.length === 2) {
        // Format: MM:SS or MM:SS.sss
        minutes = parseInt(parts[0], 10) || 0;
        const secondsParts = parts[1].split('.');
        seconds = parseInt(secondsParts[0], 10) || 0;
        milliseconds = secondsParts[1] ? parseInt(secondsParts[1], 10) / Math.pow(10, secondsParts[1].length) * 1000 : 0;
    } else {
        throw new Error('Invalid duration format');
    }

    // Calculate total milliseconds
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds);
}

export function convertTimestamp(timestamp, timezone, spinUpdated) {

    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
    const isEpoch = /^\d{10,13}$/.test(timestamp); // Check for 10 or 13 digits
    const isUTC = typeof timestamp === 'string' && timestamp.trim().endsWith('Z');
    const dateWithoutTimezoneRegex = /^(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2}$/;
    const mmddyyyyRegex = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/; // MM-DD-YYYY HH:mm:ss
    const yyyymmddhhmmRegex = /^20\d{10}$/; // YYYYMMDDHHMM starting with 20
    const yyyymmddhhmmssRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

    if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {
       // console.log('is string timezone')
        return new Date(timestamp).getTime(); // ⬅️ Epoch
    }

    if (dateWithoutTimezoneRegex.test(timestamp)) {
       // console.log('is dateWithoutTimezoneRegex')
        timestamp = this.formatTimeInTimezone(timezone, timestamp, spinUpdated);
        return new Date(timestamp).getTime(); // ⬅️ Epoch
    }

    if (yyyymmddhhmmssRegex.test(timestamp)) {
      //  console.log('is yyyymmddhhmmssRegex')
        const [datePart, timePart] = timestamp.split(' ');
        const [year, month, day] = datePart.split('-'); // Correct order: YYYY-MM-DD

        // Convert to desired format (MM/DD/YYYY, HH:mm:ss GMT)
        const formattedDate = `${month}/${day}/${year}`;
        const formattedTime = timePart; // Time remains the same
        const formattedTimestamp = `${formattedDate}, ${formattedTime} GMT`;

        return new Date(formattedTimestamp).getTime(); // ⬅️ Epoch
    }

    if (yyyymmddhhmmRegex.test(timestamp)) {
       // console.log('is yyyymmddhhmmRegex')
        const year = parseInt(timestamp.substring(0, 4), 10);
        const month = parseInt(timestamp.substring(4, 6), 10) - 1;
        const day = parseInt(timestamp.substring(6, 8), 10);
        const hour = parseInt(timestamp.substring(8, 10), 10);
        const minute = parseInt(timestamp.substring(10, 12), 10);
        return new Date(year, month, day, hour, minute).getTime(); // ⬅️ Epoch
    }

    if (isEpoch) {

     //   console.log('is epoch')
        const epoch = Number(timestamp);
        return epoch < 1e12 ? epoch * 1000 : epoch; // ⬅️ Epoch in ms
    }

    if (isUTC || this.getNestedValue(this.currentStationData, this.stationKey, 'timezone', null) == "UTC") {

       // console.log('is UTC')
        return new Date(timestamp).getTime(); // ⬅️ Epoch
    }

    if (typeof timestamp === 'string' && isoRegex.test(timestamp)) {

      //  console.log('is string iso')
        if (timestamp.endsWith('+0000')) {
            timestamp = timestamp.replace('+0000', 'Z');
        }
        return new Date(timestamp).getTime(); // ⬅️ Epoch
    }

    if (mmddyyyyRegex.test(timestamp) || mmddyyyyRegex.test(this.formattedTimestamp)) {
      //  console.log('is mmddyyyyRegex')
        const [datePart, timePart] = timestamp.split(' ');
        const [month, day, year] = datePart.split('-');
        const formattedTimestamp = `${year}-${month}-${day}T${timePart}`;
        timestamp = this.formatTimeInTimezone(timezone, formattedTimestamp, spinUpdated);
        timestamp = timestamp.replace(/([-+]\d{2})(\d{2})$/, "$1:$2");
        return new Date(timestamp).getTime(); // ⬅️ Epoch
    }

    return new Date(timestamp).getTime(); // fallback

}

export function formatTimeInTimezone(timezone, timestamp, spinUpdated) {
    let apiUpdatedTime = '';

    console.log('timestamp', timestamp, 'spinUpdated',  spinUpdated);


    const convertTo24HourFormat = (time12h) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');

            if (modifier === 'PM' && hours !== '12') {
                hours = parseInt(hours, 10) + 12;
            } else if (modifier === 'AM' && hours === '12') {
                hours = '00';
            }

            return `${hours}:${minutes}`;
        };


    // Format the current date and time in the specified timezone
    const currentDatePart = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false,
    });

    const currentTimezonePart = new Date().toLocaleString('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
    }).split(' ').pop();

    console.log('timezone', timezone);

    // If there's a spinUpdated time, convert it to 24-hour format
    if ((spinUpdated && spinUpdated !== true) && this.stationKey !== 'cbcmusic') {
        const updated24Hour = convertTo24HourFormat(spinUpdated);
        apiUpdatedTime = `${currentDatePart} ${updated24Hour}`;
        console.log('spinUpdated apiUpdatedTime', apiUpdatedTime)
    } else if ((spinUpdated && spinUpdated !== true) && this.stationKey == 'cbcmusic') {
        apiUpdatedTime = this.convertTimestamp(spinUpdated, timezone);
        console.log('spinUpdated apiUpdatedTime', apiUpdatedTime)
    }

    // Format the API-supplied timestamp, if provided, with timezone handling
    if (timestamp) {
        const date = new Date(timestamp);
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour12: false,
            timeZoneName: 'shortOffset',
        });

        const parts = formatter.formatToParts(date);
        let offsetPart = parts.find(part => part.type === 'timeZoneName')?.value;

        if (offsetPart.startsWith('GMT')) {
            offsetPart = offsetPart.replace('GMT', '');
        }

        const match = offsetPart.match(/([+-])(\d+)/);
        if (match) {
            const sign = match[1];
            const hours = match[2].padStart(2, '0');
            const minutes = '00';
            offsetPart = `${sign}${hours}${minutes}`;
        }

        if (timezone == "UTC") {
            offsetPart = offsetPart.concat('Z');
        }

        timestamp = timestamp.replace(' ', 'T').replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2").replace(/([-+]\d{2})(\d{2})$/, "$1:$2") + offsetPart;

        apiUpdatedTime = timestamp;

        console.log('apiUpdatedTime', apiUpdatedTime)
    }
    return apiUpdatedTime;
}
