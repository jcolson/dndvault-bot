const EventModel = require('../models/Event');
const utils = require('../utils/utils.js');
const config = require('../handlers/config.js');
const events = require('../handlers/events.js');
const he = require('he');

/**
 * 
 * @param {*} request 
 * @param {*} response 
 * @param {*} url 
 */
async function handleCalendarRequest(requestUrl) {
    console.log('handling calendar request: search params: ', requestUrl.searchParams);
    const userID = requestUrl.searchParams.get('userID');
    const excludeGuild = requestUrl.searchParams.get('exclude') ? requestUrl.searchParams.get('exclude').split(',') : [];
    if (!userID) {
        throw new Error('No userID passed!');
    }
    let returnICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN\r\n';
    returnICS += `URL:${Config.calendarURL}${Config.calendarURI}?userID=${userID}\r\n`;
    returnICS += 'NAME:DND Vault\r\n';
    returnICS += 'X-WR-CALNAME:DND Vault\r\n';
    returnICS += 'DESCRIPTION:DND Vault events from Discord\r\n';
    returnICS += 'X-WR-CALDESC:DND Vault events from Discord\r\n';
    // returnICS += 'TIMEZONE-ID:Europe/London\r\n';
    // returnICS += 'X-WR-TIMEZONE:Europe/London\r\n';
    returnICS += 'REFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n';
    returnICS += 'X-PUBLISHED-TTL:PT12H\r\n';
    returnICS += 'COLOR:34:50:105\r\n';
    returnICS += 'CALSCALE:GREGORIAN\r\n';
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
        if (!excludeGuild.includes(currEvent.guildID)) {
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
            returnICS += `SUMMARY:🗡${encodeStringICS(guildConfig.name)} - ${encodeStringICS(currEvent.title)}\r\n`;
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
 * 
 * encodeURI
 * 
 * 
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
URL:http://my.calendar/url

NAME:My Calendar Name
X-WR-CALNAME:My Calendar Name
DESCRIPTION:A description of my calendar
X-WR-CALDESC:A description of my calendar
TIMEZONE-ID:Europe/London
X-WR-TIMEZONE:Europe/London
REFRESH-INTERVAL;VALUE=DURATION:PT12H
X-PUBLISHED-TTL:PT12H
COLOR:34:50:105

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
