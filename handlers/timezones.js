const { DateTime } = require('luxon')
const { zones } = require('tzdata')

const luxonValidTimezones = Object.entries(zones)
    .filter(([zoneName, v]) => Array.isArray(v))
    .map(([zoneName, v]) => zoneName)
    .filter(tz => DateTime.local().setZone(tz).isValid);

/**
 * 
 * @param {URL} requestUrl 
 */
function handleTimezonesRequest(requestUrl) {
    console.log('handling timezones request: search params: ', requestUrl.searchParams);
    let tzName = requestUrl.searchParams.get('name');
    let returnPage = `<html><head><title>D&D Vault - Timezones</title>
    <style>
#timezones {
  font-family: Arial, Helvetica, sans-serif;
  border-collapse: collapse;
  width: 100%;
}

#timezones td, #timezones th {
  border: 1px solid #ddd;
  padding: 8px;
}

#timezones tr:nth-child(even){background-color: #f2f2f2;}

#timezones tr:hover {background-color: #ddd;}

#timezones th {
  padding-top: 12px;
  padding-bottom: 12px;
  text-align: left;
  background-color: #4CAF50;
  color: white;
}
</style>
    </head><body><table id="timezones"><tr><th>D&D Vault - Timezones</th></tr><tr><td><form method="get" action="/timezones" id="timezones-form"><input name="name"><button type="submit" form="timezones-form">Filter</button></form></td></tr>`;
    if (tzName) {
        const regex = new RegExp(`${tzName.toLowerCase()}`, 'g');
        const matchedTimezones = luxonValidTimezones.filter((timeZoneName) => timeZoneName.toLowerCase().match(regex));
        // console.log(matchedTimezones);
        for (tz of matchedTimezones) {
            returnPage += `<tr><td>${tz}</td></tr>`
        }
    } else {
        for (tz of luxonValidTimezones) {
            returnPage += `<tr><td>${tz}</td></tr>`
        }
    }
    returnPage += `</title></body></html>`;
    return returnPage;
}

exports.handleTimezonesRequest = handleTimezonesRequest;