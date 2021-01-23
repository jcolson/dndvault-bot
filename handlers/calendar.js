const EventModel = require('../models/Event');
const utils = require('../utils/utils.js');
const config = require('../handlers/config.js');
const events = require('../handlers/events.js');

/**
 * 
 * @param {*} request 
 * @param {*} response 
 * @param {*} url 
 */
async function handleCalendarRequest(requestUrl) {
    let returnICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN\r\nCALSCALE:GREGORIAN\r\n';
    console.log('handling calendar request: search params: ', requestUrl.searchParams);
    let userID = requestUrl.searchParams.get('userID');
    if (!userID) {
        throw new Error('No userID passed!');
    }
    let cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 7);
    let userEvents = await EventModel.find(
        {
            $and: [
                { $or: [{ 'userID': userID }, { "attendees.userID": userID }] },
                { date_time: { $gt: cutOffDate } }
            ]
        }
    );
    // console.log(events);
    for (currEvent of userEvents) {
        let guildConfig = await config.getGuildConfig(currEvent.guildID);
        returnICS += 'BEGIN:VEVENT\r\n';
        let endDate = new Date(currEvent.date_time);
        endDate.setTime(endDate.getTime() + (currEvent.duration_hours * 60 * 60 * 1000));
        returnICS += `DTEND:${getICSdateFormat(endDate)}\r\n`;
        returnICS += `UID:${currEvent._id}\r\n`;
        returnICS += `DTSTAMP:${getICSdateFormat(new Date())}\r\n`;
        returnICS += `LOCATION:${encodeStringICS(guildConfig.name)}\r\n`;
        returnICS += `DESCRIPTION:${encodeStringICS(currEvent.description)}\r\n`;
        returnICS += `URL;VALUE=URI:${events.getLinkForEvent(currEvent)}\r\n`;
        returnICS += `SUMMARY:${encodeStringICS(currEvent.title)}\r\n`;
        returnICS += `DTSTART:${getICSdateFormat(currEvent.date_time)}\r\n`;
        returnICS += `END:VEVENT\r\n`;
    }
    returnICS += 'END:VCALENDAR\r\n';
    return returnICS;
}

function encodeStringICS(valueToEncode) {
    return valueToEncode.replace(/\r?\n|\r/g,'\\n');
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
 * 
 * encodeURI
 * 
 * 
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTEND:<?= dateToCal($dateend) ?>
UID:<?= uniqid() ?>
DTSTAMP:<?= dateToCal(time()) ?>
LOCATION:<?= escapeString($address) ?>
DESCRIPTION:<?= escapeString($description) ?>
URL;VALUE=URI:<?= escapeString($uri) ?>
SUMMARY:<?= escapeString($summary) ?>
DTSTART:<?= dateToCal($datestart) ?>
END:VEVENT
END:VCALENDAR
 */

exports.handleCalendarRequest = handleCalendarRequest;