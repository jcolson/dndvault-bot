const { DateTime } = require('luxon')
const { zones } = require('tzdata')

const luxonValidTimezones = Object.entries(zones)
    .filter(([zoneName, v]) => Array.isArray(v))
    .map(([zoneName, v]) => zoneName)
    .filter(tz => DateTime.local().setZone(tz).isValid);

function handleTimezonesDataRequest(requestUrl) {
    let timezoneData = {};
    timezoneData.timezones = luxonValidTimezones;
    return timezoneData;
}

exports.handleTimezonesDataRequest = handleTimezonesDataRequest;
