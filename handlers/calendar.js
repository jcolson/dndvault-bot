const EventModel = require('../models/Event');
const utils = require('../utils/utils.js');
const config = require('../handlers/config.js');
const events = require('../handlers/events.js');
const he = require('he');

/**
 *
 * @param {String} userID
 * @param {Array} excludeGuild
 */
async function handleCalendarRequest(userID, excludeGuild) {
    if (!userID) {
        throw new Error('No userID passed!');
    }
    const calendarRefreshHours = Config?.calendarICSRefreshHours ? Config?.calendarICSRefreshHours : 12;
    let returnICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN\r\n';
    returnICS += `URL:${Config.httpServerURL}/calendar?userID=${userID}\r\n`;
    returnICS += 'NAME:DND Vault\r\n';
    returnICS += 'X-WR-CALNAME:DND Vault\r\n';
    returnICS += 'DESCRIPTION:DND Vault events from Discord\r\n';
    returnICS += 'X-WR-CALDESC:DND Vault events from Discord\r\n';
    // returnICS += 'TIMEZONE-ID:Europe/London\r\n';
    // returnICS += 'X-WR-TIMEZONE:Europe/London\r\n';
    returnICS += `REFRESH-INTERVAL;VALUE=DURATION:PT${calendarRefreshHours}H\r\n`;
    returnICS += `X-PUBLISHED-TTL:PT${calendarRefreshHours}H\r\n`;
    returnICS += 'COLOR:34:50:105\r\n';
    returnICS += 'CALSCALE:GREGORIAN\r\n';
    let cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 365);
    let userEvents = await EventModel.find({
        $and: [
            //@todo at some point we can remove the <@! check here, as of 1.2.5 we're storing just the ID
            { $or: [{ 'dm': "<@!" + userID + ">" }, { 'dm': userID }, { 'userID': userID }, { "attendees.userID": userID }] },
            { date_time: { $gt: cutOffDate } }
        ]
    });
    // console.log(events);
    for (currEvent of userEvents) {
        if (!excludeGuild.includes(currEvent.guildID)) {
            let userAttendee;
            for (attendee of currEvent.attendees) {
                if (attendee.userID == userID) {
                    userAttendee = attendee;
                }
            }
            let guildConfig = await config.getGuildConfig(currEvent.guildID);
            returnICS += 'BEGIN:VEVENT\r\n';
            let endDate = new Date(currEvent.date_time);
            endDate.setTime(endDate.getTime() + (currEvent.duration_hours * 60 * 60 * 1000));
            returnICS += `DTEND:${getICSdateFormat(endDate)}\r\n`;
            returnICS += `UID:${currEvent._id}\r\n`;
            returnICS += `DTSTAMP:${getICSdateFormat(new Date())}\r\n`;
            returnICS += `LOCATION:${events.getLinkForEvent(currEvent)}\r\n`;
            // seems like X-ALT-DESC doesn't really work any more
            // returnICS += `X-ALT-DESC;FMTTYPE=text/HTML:<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">\\n<html><title></title><body>${guildConfig.iconURL ? '<img src="' + encodeStringICS(guildConfig.iconURL, true) + '"/><br/>' : ''}🗡${encodeStringICS(currEvent.description, true)}</body></html>\r\n`;
            returnICS += `DESCRIPTION:${encodeStringICS(currEvent.description)}\r\n`;
            returnICS += `URL;VALUE=URI:${events.getLinkForEvent(currEvent)}\r\n`;
            returnICS += `SUMMARY:${utils.EMOJIS.DAGGER}${encodeStringICS(currEvent.title)} ${userAttendee?.standby ? `[${utils.EMOJIS.HOURGLASS}STANDBY]` : ''}[${currEvent.deployedByID ? utils.EMOJIS.CHECK : utils.EMOJIS.X}DEPLOYED] (${encodeStringICS(guildConfig.name)})\r\n`;
            returnICS += `DTSTART:${getICSdateFormat(currEvent.date_time)}\r\n`;
            returnICS += `END:VEVENT\r\n`;
        }
    }
    returnICS += 'END:VCALENDAR\r\n';
    return returnICS;
}

/**
 *
 * @param {String} valueToEncode
 * @param {Boolean} heEncode
 */
function encodeStringICS(valueToEncode, heEncode) {
    valueToEncode = valueToEncode.replace(/\r?\n|\r/g, '\\n');
    return heEncode ? he.encode(valueToEncode) : valueToEncode;
}

function getICSdateFormat(theDate) {
    let hours = utils.stringOfSize(theDate.getHours().toString(), 2, '0', true);
    let minutes = utils.stringOfSize(theDate.getMinutes().toString(), 2, '0', true);
    let year = utils.stringOfSize(theDate.getFullYear().toString(), 4, '0', true);
    let month = utils.stringOfSize((theDate.getMonth() + 1).toString(), 2, '0', true);
    let day = utils.stringOfSize(theDate.getDate().toString(), 2, '0', true);
    let returnString = `${year}${month}${day}T${hours}${minutes}00Z`;
    return returnString;
}

/**
 * example ICS output
 *
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN
URL:http://localhost:8080/calendar?userID=xxxxxx
NAME:DND Vault
X-WR-CALNAME:DND Vault
DESCRIPTION:DND Vault events from Discord
X-WR-CALDESC:DND Vault events from Discord
REFRESH-INTERVAL;VALUE=DURATION:PT6H
X-PUBLISHED-TTL:PT6H
COLOR:34:50:105
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTEND:20210411T180000Z
UID:606f1bd4e7631714c29c8662
DTSTAMP:20210429T104900Z
LOCATION:https://discordapp.com/channels/785567026512527390/806981042413109291/829733974255206403
DESCRIPTION:What to do with the Staff of the Navigator?
URL;VALUE=URI:https://discordapp.com/channels/785567026512527390/806981042413109291/829733974255206403
SUMMARY:🗡Shilcom Session #30 [Deployed? ❎] (Test and Support - D&D Vault)
DTSTART:20210411T140000Z
END:VEVENT
END:VCALENDAR
 */

exports.handleCalendarRequest = handleCalendarRequest;
