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
function handleTimezonesRequest(requestUrl, discordMe) {
    console.log('handling timezones request: search params: ', requestUrl.searchParams);
    let tzName = requestUrl.searchParams.get('name');
    let guildConfigPrefix = requestUrl.searchParams.get('guildConfigPrefix');
    let channel = requestUrl.searchParams.get('channel');
    let matchedTimezones = luxonValidTimezones;
    let returnPage = `<!DOCTYPE HTML>
<html><head>
<meta content="text/html;charset=utf-8" http-equiv="Content-Type">
<meta content="utf-8" http-equiv="encoding">
<link rel="icon" href="animated_favicon.gif" type="image/gif">
<title>D&D Vault - Timezones</title>
<style>
.header {
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: x-large;
    font-weight: bold;
    height: 120px;f
    width: 100%;
    padding-left: 20px;
    padding-top: 15px;
    padding-bottom: 15px;
    background-color: lightblue;
}

#timezones-info {
    font-size: small;
    color: blue;
}

.header-text {
    font-size: small;
}

.header img {
    height: auto;
    width: 50px;
}

.thebody {
    overflow-y: scroll;
    font-family: Arial, Helvetica, sans-serif;
    border-collapse: collapse;
    width: 250px;
    top: 165px;
    left:0px;
    right:0px;
    bottom:0px;
    position:absolute;
    text-align: center;
    margin-left: auto;
    margin-right: auto;
}

.thebody td, .thebody th {
    border: 1px solid #ddd;
    padding: 8px;
}

.thebody tr:nth-child(even){background-color: #f2f2f2;}

.thebody tr:hover {background-color: #ddd;}

.thebody th {
    padding-top: 12px;
    padding-bottom: 12px;
    background-color: #4CAF50;
    color: white;
}
</style>
</head><body>
<div class="header">
<div><img src="${Config.dndVaultIcon}">
D&amp;D Vault - Timezones (@${discordMe.username})</br>
<form method="get" action="/timezones" id="timezones-form">
<input name="name" id="timezones-name">
<input name="auto" id="timezones-auto" type="hidden">
<input name="guildConfigPrefix" id="timezones-guildConfigPrefix" type="hidden">
<input name="channel" id="timezones-channel" type="hidden">
<button type="submit" id="timezones-button" form="timezones-form">Show All / Filter</button></form></div>
<div class="header-text">Click a row to 'copy' the discord command to run to set your timezone.</div>
<div id="timezones-info"></div>
</div>
<div class="thebody">
<table id="timezones"><tr><th>Timezone List</th></tr>`;
    if (tzName) {
        const regex = new RegExp(`${tzName.toLowerCase()}`, 'g');
        matchedTimezones = luxonValidTimezones.filter((timeZoneName) => timeZoneName.toLowerCase().match(regex));
        // console.log(matchedTimezones);
    }
    for (tz of matchedTimezones) {
        returnPage += `<tr><td onclick="navigator.clipboard.writeText('${guildConfigPrefix}timezone ${tz}');document.getElementById('timezones-info').innerHTML='COPIED &quot;${guildConfigPrefix}timezone ${tz}&quot; - now PASTE that into discord.'">
        <!--<form id="discord-form" method="post" action="https://discord.com/channels/${channel}/messages">
<input name="content" value="${guildConfigPrefix}timezone ${tz}" type="hidden">
<div onclick="document.getElementById('discord-form').submit();">${tz}</div>
<div onclick="let copyText='${tz}';copyText.select();copyText.setSelectionRange(0, 99999);document.execCommand('copy');">${tz}</div>
<div onclick="navigator.clipboard.writeText('${guildConfigPrefix}timezone ${tz}');document.getElementById('timezones-info').innerHTML='COPIED &quot;${guildConfigPrefix}timezone ${tz}&quot; - now PASTE that into discord.'">${tz}</div>-->
${tz}
<!--</form>-->
</td></tr>`
    }
    returnPage += `</table></div><script>
const urlParams = new URLSearchParams(window.location.search);
document.getElementById("timezones-guildConfigPrefix").value=urlParams.get("guildConfigPrefix");
document.getElementById("timezones-channel").value=urlParams.get("channel");
if (!urlParams.get("auto")) {
let timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
//console.log(timezone);
document.getElementById("timezones-name").value=timezone;
document.getElementById("timezones-auto").value="true";
document.getElementById("timezones-form").submit();
} else {
document.getElementById("timezones-auto").value=urlParams.get("auto");
}
</script></body></html>`;
    return returnPage;
}

exports.handleTimezonesRequest = handleTimezonesRequest;
