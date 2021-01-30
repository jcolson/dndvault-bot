const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed } = require('discord.js');
const { parse, OUTPUT_TYPES } = require('@holistics/date-parser');
const users = require('../handlers/users.js');
const characters = require('../handlers/characters.js');
const utils = require('../utils/utils.js');

/**
 * Create an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventCreate(msg, guildConfig) {
    try {
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser || !currUser.timezone) {
            throw new Error('Please set your timezone first using `timezone [YOUR TIMEZONE]`!');
        }
        let eventString = msg.content.substring((guildConfig.prefix + 'event create').length);
        let eventArray = parseEventString(eventString);

        let validatedEvent = await validateEvent(eventArray, msg, currUser);
        let sentMessage = await msg.channel.send(await embedForEvent(msg, [validatedEvent], `Event`, true));
        validatedEvent.channelID = sentMessage.channel.id;
        validatedEvent.messageID = sentMessage.id;
        await validatedEvent.save();
        await sentMessage.react('✅');
        await sentMessage.react('❎');
        await sentMessage.react('▶️');
        await sentMessage.react('🕟');
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

async function handleEventEdit(msg, guildConfig) {
    try {
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser || !currUser.timezone) {
            throw new Error('Please set your timezone first using `timezone [YOUR TIMEZONE]`!');
        }
        let eventString = msg.content.substring((guildConfig.prefix + 'event edit').length + 1);
        const eventID = eventString.substring(0, eventString.indexOf(' '));
        // console.log(eventID);
        if (eventID.length < 1) {
            throw new Error('Not enough parameters');
        }
        eventString = eventString.substring(eventString.indexOf(' '));
        let existingEvent;
        try {
            existingEvent = await EventModel.findById(eventID);
            if (!existingEvent) {
                throw new Error();
            }
        } catch (error) {
            throw new Error('Event not found.');
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != existingEvent.userID) {
            throw new Error(`Please have <@${msg.member.id}> edit, or ask an <@&${guildConfig.arole}> to edit.`);
        }
        let eventArray = parseEventString(eventString, existingEvent);
        let validatedEvent = await validateEvent(eventArray, msg, currUser, existingEvent);
        let eventMessage;
        try {
            eventMessage = await (
                await (
                    await client.guilds.fetch(validatedEvent.guildID)
                ).channels.resolve(validatedEvent.channelID)
            ).messages.fetch(validatedEvent.messageID);
            await eventMessage.edit(await embedForEvent(msg, [validatedEvent], `Event`, true));
        } catch (error) {
            console.log(`couldn't edit old event message on edit: ${error.message}`);
            eventMessage = await msg.channel.send(await embedForEvent(msg, [validatedEvent], `Event`, true));
            validatedEvent.channelID = eventMessage.channel.id;
            validatedEvent.messageID = eventMessage.id;
            await eventMessage.react('✅');
            await eventMessage.react('❎');
            await eventMessage.react('▶️');
            await eventMessage.react('🕟');
        }
        await validatedEvent.save();
        await utils.sendDirectOrFallbackToChannel([{ name: '🗡 Event Edit 🛡', value: `<@${msg.member.id}> - edited event successfully.`, inline: true }], eventMessage, msg.author);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

async function handleEventRemove(msg, guildConfig) {
    try {
        let eventID = msg.content.substring((guildConfig.prefix + 'event remove').length + 1);
        // console.log(eventID);
        let existingEvent;
        try {
            existingEvent = await EventModel.findById(eventID);
            if (!existingEvent) {
                throw new Error();
            }
        } catch (error) {
            throw new Error('Event not found.');
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != existingEvent.userID) {
            throw new Error(`Please have <@${msg.member.id}> remove, or ask an <@&${guildConfig.arole}> to remove.`);
        }
        await existingEvent.delete();
        await utils.sendDirectOrFallbackToChannel([{ name: '🗡 Event Remove 🛡', value: `<@${msg.member.id}> - the event, ${eventID} , was successfully removed.`, inline: true }], msg);
        await msg.delete();
        try {
            const eventMessage = await (
                await (
                    await client.guilds.fetch(existingEvent.guildID)
                ).channels.resolve(existingEvent.channelID)
            ).messages.fetch(existingEvent.messageID);
            await eventMessage.delete();
        } catch (error) {
            console.error(`couldn't delete old event message on edit: ${error.message}`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * show an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventShow(msg, guildConfig) {
    try {
        const eventID = msg.content.substring((guildConfig.prefix + 'event show').length + 1);
        let showEvent;
        try {
            showEvent = await EventModel.findById(eventID);
            if (!showEvent) {
                throw new Error();
            }
        } catch (error) {
            throw new Error('Event not found.');
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            throw new Error(`Please ask an \`approver role\` to re-show this event if needed, it should be available [here](${getLinkForEvent(showEvent)}).`);
        }
        const embedEvent = await embedForEvent(msg, [showEvent], `Event: ${eventID}`, true);
        const sentMessage = await msg.channel.send(embedEvent);
        await msg.delete();
        try {
            // remove old event message
            const eventMessage = await (
                await (
                    await client.guilds.fetch(showEvent.guildID)
                ).channels.resolve(showEvent.channelID)
            ).messages.fetch(showEvent.messageID);
            await eventMessage.delete();
        } catch (error) {
            console.error(`couldn't delete old event message on edit: ${error.message}`);
        }
        showEvent.channelID = sentMessage.channel.id;
        showEvent.messageID = sentMessage.id;
        await showEvent.save();
        await sentMessage.react('✅');
        await sentMessage.react('❎');
        await sentMessage.react('▶️');
        await sentMessage.react('🕟');
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * list events that are in the future or n days old
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventList(msg, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 3);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate } }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg, eventsArray, `All Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any events yet.  Create one with \`event create\`!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * list PROPOSED (not deployed) events that are in the future or n days old
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventListProposed(msg, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 1);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: null }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg, eventsArray, `PROPOSED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any PROPOSED events yet.  Create one with \`event create\`!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * list DEPLOYED events that are in the future or n days old
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventListDeployed(msg, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 1);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: { $ne: null } }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg, eventsArray, `DEPLOYED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any DEPLOYED events yet.  Create one with \`event create\`!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * validate event and return object with proper types
 * @param {Array} eventArray
 * @param {Message} msg
 * @param {UserModel} currUser
 * @returns {EventModel}
 */
async function validateEvent(eventArray, msg, currUser, existingEvent) {
    if ((!eventArray['!TITLE'] && !existingEvent && !existingEvent.title) || eventArray['!TITLE'] === null) {
        throw new Error('You must include a title for your event.');
    } else if ((!eventArray['!FOR'] && eventArray['!FOR'] === null && !existingEvent && !existingEvent.duration) || eventArray['!FOR'] === null) {
        throw new Error('You must include a duration for your event.');
    } else if (eventArray['!FOR'] && isNaN(eventArray['!FOR'])) {
        throw new Error(`The duration hours needs to be a number, not: "${eventArray['!FOR']}"`);
    } else if ((!eventArray['!ON'] && eventArray['!ON'] === null && !existingEvent && !existingEvent.date_time) || eventArray['!ON'] === null) {
        throw new Error('You must include a date for your event.');
    } else if ((!eventArray['!AT'] && eventArray['!AT'] === null && !existingEvent && !existingEvent.date_time) || eventArray['!AT'] === null) {
        throw new Error('You must include a time for your event.');
    } else if ((!eventArray['!WITH'] && eventArray['!WITH'] === null && !existingEvent && !existingEvent.number_player_slots) || eventArray['!WITH'] === null) {
        throw new Error('You must include a number of player slots for your event.');
    } else if ((!eventArray['!DESC'] && eventArray['!DESC'] === null && !existingEvent && !existingEvent.description) || eventArray['!DESC'] === null) {
        throw new Error('You must include a description for your event.');
    } else if (eventArray['!WITH'] && isNaN(eventArray['!WITH'])) {
        throw new Error(`The number of player slots needs to be a number, not: "${eventArray['!WITH']}"`);
    }

    let validatedEvent = existingEvent ? existingEvent : new EventModel({ guildID: msg.guild.id, userID: msg.member.id });

    if (eventArray['!ON'] || eventArray['!AT']) {
        let timezoneOffset = getTimeZoneOffset(currUser.timezone);
        // console.log('tz offset: ' + timezoneOffset);

        // convert to user's time if this exists already
        let usersOriginalEventDate;
        if (existingEvent && existingEvent.date_time) {
            usersOriginalEventDate = getDateInDifferentTimezone(existingEvent.date_time, currUser.timezone);// new Date(existingEvent.date_time.toLocaleString("en-US", { timeZone: currUser.timezone }));
            // console.log('GMToriginaleventdate %s', existingEvent.date_time);
            // console.log('usersoriginaleventdate %s', usersOriginalEventDate);
        }
        //@todo: figure out a way to get the fuzzy parsing per date and per time working
        let onDate = eventArray['!ON'] ? eventArray['!ON'] : formatJustDate(usersOriginalEventDate);
        let atTime = eventArray['!AT'] ? eventArray['!AT'] : formatJustTime(usersOriginalEventDate);
        let dateTimeStringToParse = `${onDate} at ${atTime}`;
        let refDate = usersOriginalEventDate ? usersOriginalEventDate : getDateInDifferentTimezone(new Date(), currUser.timezone);//new Date(new Date().toLocaleString("en-US", { timeZone: currUser.timezone }));
        // console.log('refDate %s then - on %s at %s', refDate, onDate, atTime);
        let eventDate = parse(dateTimeStringToParse, refDate, { timezoneOffset: timezoneOffset }).start.date();
        // console.log('parsed date %s', eventDate);
        validatedEvent.date_time = eventDate;
    }

    // console.log(eventArray);
    validatedEvent.title = eventArray['!TITLE'] === null ? undefined : (eventArray['!TITLE'] ? eventArray['!TITLE'] : validatedEvent.title);
    validatedEvent.dm = eventArray['!DMGM'] === null ? undefined : (eventArray['!DMGM'] ? eventArray['!DMGM'] : validatedEvent.dm);
    validatedEvent.duration_hours = eventArray['!FOR'] === null ? undefined : (eventArray['!FOR'] ? eventArray['!FOR'] : validatedEvent.duration_hours);
    validatedEvent.number_player_slots = eventArray['!WITH'] === null ? undefined : (eventArray['!WITH'] ? eventArray['!WITH'] : validatedEvent.number_player_slots);
    validatedEvent.campaign = eventArray['!CAMPAIGN'] === null ? undefined : (eventArray['!CAMPAIGN'] ? eventArray['!CAMPAIGN'] : validatedEvent.campaign);
    validatedEvent.description = eventArray['!DESC'] === null ? undefined : (eventArray['!DESC'] ? eventArray['!DESC'] : validatedEvent.description);
    let changeDetected = false;
    for (let key of Object.keys(eventArray)) {
        if (eventArray[key]) {
            changeDetected = true;
        }
    }
    if (!changeDetected) {
        throw new Error("No changes where detected, please verify your `event edit` command");
    }
    return validatedEvent;
}

function getTimeZoneOffset(timezone) {
    let utcDate = new Date();
    let utcDateString = utcDate.toUTCString();
    let userDateString = utcDateString.substring(0, utcDateString.length - 3) + timezone;
    let userDate = new Date(userDateString);
    return -Math.ceil((userDate - utcDate) / 60 / 1000);
}

/**
 * parse a message like
 * !event create !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] !campaign [CAMPAIGN] !desc [test]
 * in order to create a mission
 * @param {String} eventString 
 */
function parseEventString(eventString) {
    const separatorArray = ['!TITLE', '!DMGM', '!AT', '!FOR', '!ON', '!WITH', '!CAMPAIGN', '!DESC'];
    const eventArray = {};
    // console.log(`"${eventString}`);
    // check if all required separators exist
    const sepIndex = [];
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[1], sepIndex[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[2], sepIndex[1]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[3], sepIndex[2]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[4], sepIndex[3]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[5], sepIndex[4]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[6], sepIndex[5]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[7], sepIndex[6]));
    // add last index as the length of the string
    sepIndex.push(eventString.length + 1);
    // console.log('all indexes', sepIndex);

    for (let i = 0; i < separatorArray.length; i++) {
        // console.log('sepind %d, separray %s, separraylen %d, nextValid %d', sepIndex[i], separatorArray[i], separatorArray[i].length + 1, nextValidIndex(i + 1, sepIndex));
        let paramValue = sepIndex[i] != -1 ?
            eventString.substring(sepIndex[i] + separatorArray[i].length + 2, nextValidIndex(i + 1, sepIndex)) :
            undefined;
        // allow the 'unsetting' of parameters
        // console.log('sepind %s & paramvalue %s', sepIndex[i], paramValue);
        if (sepIndex[i] != -1 && !paramValue) {
            paramValue = null;
        }
        eventArray[separatorArray[i]] = paramValue;
    }
    // console.log('array', eventArray);
    return eventArray;
}

/**
 * for the indexes passed, starting at startindex, find the next index value that isn't a -1
 * @param {Number} startindex 
 * @param {Array} sepIndexArray 
 */
function nextValidIndex(startindex, sepIndexArray) {
    for (let i = startindex; i < sepIndexArray.length; i++) {
        if (sepIndexArray[i] != -1) {
            return sepIndexArray[i];
        }
    }
}

/**
 * returns the MessageEmbed(s) for an array of events passed
 * 
 * @param {Message} msg
 * @param {EventModel[]} charArray
 * @param {String} title
 * @param {Boolean} isShow
 * 
 * @returns {MessageEmbed[]}
 */
async function embedForEvent(msg, eventArray, title, isShow) {
    let returnEmbeds = [];
    // return 3 events for show and 8 events for a list
    let charPerEmbed = isShow ? 1 : 4;
    let eventEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(title)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let i = 0;
    for (let theEvent of eventArray) {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(eventEmbed);
            eventEmbed = new MessageEmbed()
                .setColor('#0099ff');
            i = 0;
        }
        let dmgmString = theEvent.dm ? theEvent.dm : 'Unassigned';
        let messageTitleAndUrl = isShow
            ? `${theEvent.title} id: ${theEvent._id}`
            : `${getEmbedLinkForEvent(theEvent)}`;
        eventEmbed.addFields(
            { name: '🗡 Title 🛡', value: messageTitleAndUrl, inline: false },
            { name: 'DMGM', value: `${dmgmString}`, inline: true },
            { name: 'Date and Time', value: `${formatDate(theEvent.date_time, true)}\nfor ${theEvent.duration_hours} hrs`, inline: true },
            { name: 'Deployed By', value: `${theEvent.deployedByID ? '<@' + theEvent.deployedByID + '>' : 'Pending ...'}`, inline: true },
        );
        if (!isShow) {
            eventEmbed.addFields({ name: `Attendees`, value: `${theEvent.attendees ? '(' + theEvent.attendees.length : '(' + 0}/${theEvent.number_player_slots + ')'}`, inline: true },);
        }
        if (theEvent.campaign) {
            eventEmbed.addField('Campaign', theEvent.campaign, true);
        }
        let attendees = await getStringForAttendees(theEvent);
        if (isShow) {
            eventEmbed.addFields(
                // { name: 'Player Slots', value: `${theEvent.number_player_slots}`, inline: true },
                { name: 'Author', value: `<@${theEvent.userID}>`, inline: true },
                { name: `Attendees${theEvent.attendees ? ' (' + theEvent.attendees.length : ' (' + 0}/${theEvent.number_player_slots + ')'}`, value: `${attendees}`, inline: true },
                { name: 'Description', value: `${theEvent.description}`, inline: false },
            );
        }
    }
    let signUpInfo = '';
    if (isShow) {
        signUpInfo = `✅ Sign up | ❎ Remove yourself | ▶️ Deploy | 🕟 Convert time\n`;
    }
    eventEmbed.addFields(
        {
            name: '\u200B', value: `
${signUpInfo}Add this BOT to your server. [Click here](${Config.inviteURL})`
        },
    );
    returnEmbeds.push(eventEmbed);
    return returnEmbeds;
}

/**
 * returns string for attendees that is not over 1024 characters (embed field value limit)
 * @param {String} event 
 */
async function getStringForAttendees(event) {
    let attendees = '';
    for (let attendee of event.attendees) {
        // console.log('attendee: ' + attendee);
        // console.log('guildid %s charid %s guilduser %s', event.guildID, attendee.characterID, attendee.userID);
        let charString = '';
        if (attendee.characterID) {
            let char = await CharModel.findOne({ guildID: event.guildID, id: attendee.characterID, guildUser: attendee.userID });
            // console.log('attendee char',char.name);

            if (char) {
                charString = ` w/${characters.stringForCharacterShort(char)}`;
            }
        }
        attendees += `<@${attendee.userID}>${charString},\n`;
    }
    attendees = (attendees != '' ? attendees.substring(0, attendees.length - 2) : 'None yet').substring(0, 1024);
    return attendees;
}

function getEmbedLinkForEvent(theEvent) {
    return `[${theEvent.title}](${getLinkForEvent(theEvent)}) (id: ${theEvent._id})`;
}

function getLinkForEvent(theEvent) {
    return `https://discordapp.com/channels/${theEvent.guildID}/${theEvent.channelID}/${theEvent.messageID}`;
}

function formatDate(theDate, includeGMTstring) {
    let hours = theDate.getHours();
    let amOrPm = hours >= 12 ? 'pm' : 'am';
    hours = (hours % 12) || 12;
    let returnString = `${theDate.getMonth() + 1}/${theDate.getDate()}/${theDate.getFullYear()}, ${hours}:${utils.stringOfSize(theDate.getMinutes().toString(), 2, '0', true)} ${amOrPm}`;
    if (includeGMTstring) {
        returnString += ` GMT`;
    }
    return returnString;
}

function formatJustDate(theDate) {
    let returnString = `${theDate.getMonth() + 1}/${theDate.getDate()}/${theDate.getFullYear()}`;
    return returnString;
}

function formatJustTime(theDate) {
    let hours = theDate.getHours();
    let amOrPm = hours >= 12 ? 'pm' : 'am';
    hours = (hours % 12) || 12;
    let returnString = `${hours}:${utils.stringOfSize(theDate.getMinutes().toString(), 2, '0', true)}${amOrPm}`;
    return returnString;
}

async function handleReactionAdd(reaction, user, guildConfig) {
    try {
        // The reaction is now also fully available and the properties will be reflected accurately:
        // console.log(`${reaction.count} user(s) have given the same reaction to this message!`);

        let eventForMessage = await EventModel.findOne({ guildID: reaction.message.guild.id, channelID: reaction.message.channel.id, messageID: reaction.message.id });
        if (!eventForMessage) {
            console.log('Did not find event for reaction.');
            return;
        }
        // console.log('about to save');
        await eventForMessage.save();
        // console.log(reaction.emoji);
        if (reaction.emoji && reaction.emoji.name == '✅') {
            // console.log(eventForMessage);
            await attendeeAdd(reaction, user, eventForMessage, guildConfig);
        } else if (reaction.emoji && reaction.emoji.name == '❎') {
            // console.log(eventForMessage);
            await attendeeRemove(reaction, user, eventForMessage);
        } else if (reaction.emoji && reaction.emoji.name == '▶️') {
            // console.log(eventForMessage);
            await deployEvent(reaction, user, eventForMessage, guildConfig);
        } else if (reaction.emoji && reaction.emoji.name == '🕟') {
            // console.log(eventForMessage);
            await convertTimeForUser(reaction, user, eventForMessage, guildConfig);
        } else {
            console.log('Unknown reaction');
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
    } finally {
        await reaction.users.remove(user.id);
    }
}

async function convertTimeForUser(reaction, user, eventForMessage, guildConfig) {
    let userModel = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    if (!userModel || !userModel.timezone) {
        throw new Error(`You must set your timezone via \`timezone [YOUR TIMEZONE]\` in order to convert to your own timezone.`);
    } else {
        let usersTimeString = getDateStringInDifferentTimezone(eventForMessage.date_time, userModel.timezone);
        await utils.sendDirectOrFallbackToChannel([
            { name: 'Converted Time', value: `${usersTimeString} ${userModel.timezone}`, inline: true },
            { name: 'Calendar Subscribe', value: `${Config.calendarURL}${Config.calendarURI}?userID=${user.id}`, inline: true }
        ], reaction.message, user);
    }
}

function getDateStringInDifferentTimezone(date, tzString) {
    let convertedDate = getDateInDifferentTimezone(date, tzString);
    return formatDate(convertedDate, false);
}

function getDateInDifferentTimezone(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
}

async function deployEvent(reaction, user, eventForMessage, guildConfig) {
    let dmgmID;
    if (eventForMessage.dm) {
        dmgmID = eventForMessage.dm.substring(3, eventForMessage.dm.length - 1);
    }
    // console.log('dmgm', dmgmID);
    let userMember = await reaction.message.guild.members.fetch(user.id);
    if (!await users.hasRoleOrIsAdmin(userMember, guildConfig.arole) && user.id != eventForMessage.userID && user.id != dmgmID) {
        throw new Error(`Please have <@${eventForMessage.userID}> deploy, or ask an \`approval role\` to deploy.`);
    }
    if (eventForMessage.deployedByID) {
        eventForMessage.deployedByID = null;
    } else {
        if (!eventForMessage.dm) {
            eventForMessage.dm = `<@${user.id}>`;
        }
        eventForMessage.deployedByID = user.id;
    }
    await eventForMessage.save();
    await reaction.message.edit(await embedForEvent(reaction.message, [eventForMessage], `Event`, true));
}

async function attendeeAdd(reaction, user, eventForMessage, guildConfig) {
    let vaultUser = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    let characterArray = await CharModel.find({ guildID: reaction.message.guild.id, guildUser: user.id, approvalStatus: true }).sort([["campaignOverride", "desc"], ["campaign.id", "desc"]]);
    let character;
    // check array for characters that will work for no campaign
    if (!eventForMessage.campaign) {
        for (let charCheck of characterArray) {
            if (vaultUser && vaultUser.defaultCharacter) {
                if (charCheck.id == vaultUser.defaultCharacter) {
                    character = charCheck;
                }
            } else if (!character) {
                character = charCheck;
            }
        }
    } else { // check array for characters that will work for a campaign
        let characterBackup, characterDefault;
        for (let charCheck of characterArray) {
            if (charCheck.campaignOverride == eventForMessage.campaign || charCheck.campaign.id == eventForMessage.campaign) {
                character = charCheck;
            } else if (vaultUser && vaultUser.defaultCharacter && charCheck.id == vaultUser.defaultCharacter) {
                characterDefault = charCheck;
            } else if (!guildConfig.requireCharacterForEvent && !character && !characterBackup) { //if characters aren't required for a campaign and a character hasn't been found yet, use the first one
                characterBackup = charCheck;
            }
        }
        character = character ? character : (characterDefault && !guildConfig.requireCharacterForEvent ? characterDefault : (characterBackup && !guildConfig.requireCharacterForEvent ? characterBackup : undefined));
    }
    if (!character) {
        if (eventForMessage.campaign && guildConfig.requireCharacterForEvent) {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have an approved character and that it's campaign is set to ${eventForMessage.campaign}.`);
        } else if (guildConfig.requireCharacterForEvent) {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have set \`!default\` character for events with no campaign set.`);
        } else {
            console.log(`Could not locate an eligible character to join the mission, but guild doesn't require.`);
        }
    }
    if (!eventForMessage.attendees) {
        eventForMessage.attendees = [];
    }
    let alreadySignedUp = false;
    eventForMessage.attendees.forEach((attendee) => {
        if (attendee.userID == user.id) {
            attendee.characterID = character && character.id ? character.id : undefined;
            attendee.date_time = new Date();
            alreadySignedUp = true;
        }
    });
    if (!alreadySignedUp) {
        if (eventForMessage.attendees.length < eventForMessage.number_player_slots) {
            eventForMessage.attendees.push({ userID: user.id, characterID: character && character.id ? character.id : undefined, date_time: new Date() });
        } else {
            throw new Error(`Could not add another attendee, there are only ${eventForMessage.number_player_slots} total slots available, and they're all taken.`);
        }
    }
    // console.log('Character will be playing: ' + character.name);
    // console.log('attendees: ', eventForMessage.attendees);
    await eventForMessage.save();
    await reaction.message.edit(await embedForEvent(reaction.message, [eventForMessage], `Event`, true));
}

async function attendeeRemove(reaction, user, eventForMessage) {
    // console.log('attendees: ', eventForMessage.attendees);

    if (!eventForMessage.attendees) {
        eventForMessage.attendees = [];
    }
    eventForMessage.attendees.forEach((attendee, index) => {
        if (attendee.userID == user.id) {
            eventForMessage.attendees.splice(index, 1);
        }
    });
    // console.log(eventForMessage);
    await eventForMessage.save();
    await reaction.message.edit(await embedForEvent(reaction.message, [eventForMessage], `Event`, true));
}

exports.handleEventCreate = handleEventCreate;
exports.handleEventShow = handleEventShow;
exports.handleEventEdit = handleEventEdit;
exports.handleEventRemove = handleEventRemove;
exports.handleEventList = handleEventList;
exports.handleReactionAdd = handleReactionAdd;
exports.handleEventListProposed = handleEventListProposed;
exports.handleEventListDeployed = handleEventListDeployed;
exports.getLinkForEvent = getLinkForEvent;
