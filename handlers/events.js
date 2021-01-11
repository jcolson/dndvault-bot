const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed } = require('discord.js');
const { parse, OUTPUT_TYPES } = require('@holistics/date-parser');
const users = require('../handlers/users.js');
const characters = require('../handlers/characters.js');

/**
 * Create an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventCreate(msg, guildConfig) {
    try {
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser || !currUser.timezone) {
            throw new Error('Please set your timezone first using `timezone set`!');
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
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
    }
}

async function handleEventEdit(msg, guildConfig) {
    try {
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser || !currUser.timezone) {
            throw new Error('Please set your timezone first using `timezone set`!');
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

        let eventArray = parseEventString(eventString, existingEvent);
        let validatedEvent = await validateEvent(eventArray, msg, currUser, existingEvent);
        try {
            const eventMessage = await (
                await (
                    await client.guilds.fetch(validatedEvent.guildID)
                ).channels.resolve(validatedEvent.channelID)
            ).messages.fetch(validatedEvent.messageID);
            await eventMessage.edit(await embedForEvent(msg, [validatedEvent], `Event`, true));
            // await eventMessage.delete();
        } catch (error) {
            console.log(`couldn't edit old event message on edit: ${error.message}`);
            let sentMessage = await msg.channel.send(await embedForEvent(msg, [validatedEvent], `Event`, true));
            validatedEvent.channelID = sentMessage.channel.id;
            validatedEvent.messageID = sentMessage.id;
            await sentMessage.react('✅');
            await sentMessage.react('❎');
        }
        await validatedEvent.save();
        let responseMessage = new MessageEmbed();
        responseMessage.addFields({ name: '🗡 You 🛡', value: `<@${msg.member.id}>`, inline: true },
            { name: `Successfully Edited`, value: getEmbedLinkForEvent(validatedEvent), inline: true });
        await msg.channel.send(responseMessage);
        //await msg.channel.send(`<@${msg.member.id}> ... Successfully edited: ${getLinkForEvent(validatedEvent)}`);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
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
        await existingEvent.delete();
        await msg.channel.send(`<@${msg.member.id}>, the event, ${eventID} , was successfully removed.`);
        await msg.delete();
        try {
            const eventMessage = await (
                await (
                    await client.guilds.fetch(existingEvent.guildID)
                ).channels.resolve(existingEvent.channelID)
            ).messages.fetch(existingEvent.messageID);
            await eventMessage.delete();
        } catch (error) {
            console.log(`couldn't delete old event message on edit: ${error.message}`);
        }
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
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
        if (!await users.hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            throw new Error(`Please ask an approver to re-show this event if needed, it should be available here: ${getLinkForEvent(showEvent)}`);
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
            console.log(`couldn't delete old event message on edit: ${error.message}`);
        }
        showEvent.channelID = sentMessage.channel.id;
        showEvent.messageID = sentMessage.id;
        await showEvent.save();
        await sentMessage.react('✅');
        await sentMessage.react('❎');
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
    }
}

/**
 * list event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventList(msg, guildConfig) {
    try {
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: new Date().getDate() - 5 } }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg, eventsArray, `All Events`, false);
            for (let eventEmbed of embedEvents) {
                // await embedEvents.forEach(async (eventEmbed) => {
                await msg.channel.send(eventEmbed);
            }
            await msg.delete();
        } else {
            await msg.reply(`<@${msg.member.id}>, I don't see any events yet.`);
        }
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
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
    } else if (eventArray['!CAMPAIGN']) {
        //let campaigns = await CharModel.find().distinct('campaign.id');
        let campaignCharExample = await CharModel.findOne({ guildID: msg.guild.id, "campaignOverride": eventArray['!CAMPAIGN'] });
        if (!campaignCharExample) {
            campaignCharExample = await CharModel.findOne({ guildID: msg.guild.id, "campaign.id": eventArray['!CAMPAIGN'] });
            if (!campaignCharExample) {
                throw new Error(`The campaign id "${eventArray['!CAMPAIGN']}" is not being used by any characters on this server.`);
            }
        }
    }

    let validatedEvent = existingEvent ? existingEvent : new EventModel({ guildID: msg.guild.id, userID: msg.member.id });

    if (eventArray['!ON'] || eventArray['!AT']) {
        let timezoneOffset = getTimeZoneOffset(currUser.timezone);
        // console.log('tz offset: ' + timezoneOffset);

        // convert to user's time if this exists already
        let usersOriginalEventDate;
        if (existingEvent && existingEvent.date_time) {
            usersOriginalEventDate = new Date(existingEvent.date_time.toLocaleString("en-US", { timeZone: currUser.timezone }));
            // console.log('GMToriginaleventdate %s', existingEvent.date_time);
            // console.log('usersoriginaleventdate %s', usersOriginalEventDate);
        }
        //@todo: figure out a way to get the fuzzy parsing per date and per time working
        let onDate = eventArray['!ON'] ? eventArray['!ON'] : formatJustDate(usersOriginalEventDate);
        let atTime = eventArray['!AT'] ? eventArray['!AT'] : formatJustTime(usersOriginalEventDate);
        let dateTimeStringToParse = onDate + ' ' + atTime;
        let refDate = usersOriginalEventDate ? usersOriginalEventDate : new Date();
        // console.log('refDate %s then - on %s at %s resulting in %s', refDate, onDate, atTime, dateTimeStringToParse);

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
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[0] + ' '));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[1] + ' ', sepIndex[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[2] + ' ', sepIndex[1]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[3] + ' ', sepIndex[2]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[4] + ' ', sepIndex[3]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[5] + ' ', sepIndex[4]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[6] + ' ', sepIndex[5]));
    sepIndex.push(eventString.toUpperCase().indexOf(' ' + separatorArray[7] + ' ', sepIndex[6]));
    // add last index as the length of the string
    sepIndex.push(eventString.length + 1);
    // console.log('all indexes', sepIndex);

    for (let i = 0; i < separatorArray.length; i++) {
        // console.log('sepind %d, separray %s, separraylen %d, nextValid %d', sepIndex[i], separatorArray[i], separatorArray[i].length + 1, nextValidIndex(i + 1, sepIndex));
        let param = sepIndex[i] != -1 ?
            eventString.substring(sepIndex[i] + separatorArray[i].length + 2, nextValidIndex(i + 1, sepIndex)) :
            undefined;
        // allow the 'unsetting' of parameters
        if (sepIndex[i] != -1 && !param) {
            param = null;
        }
        eventArray[separatorArray[i]] = param;
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
        let messageTitleAndUrl = isShow
            ? `${theEvent.title} id: ${theEvent._id}`
            : `${getEmbedLinkForEvent(theEvent)}`;
        eventEmbed.addFields(
            { name: '🗡 Title 🛡', value: messageTitleAndUrl, inline: false },
            { name: 'DM', value: `${theEvent.dm}`, inline: true },
            { name: 'Date and Time', value: `${formatDate(theEvent.date_time)}`, inline: true },
            { name: 'Duration', value: `${theEvent.duration_hours} hrs`, inline: true },
        );
        if (theEvent.campaign) {
            eventEmbed.addField('Campaign', theEvent.campaign, true);
        }
        let attendees = await getStringForAttendees(theEvent);
        if (isShow) {
            eventEmbed.addFields(
                { name: 'Deployed By', value: `${theEvent.deployedByID ? '<@' + theEvent.deployedByID + '>' : 'Pending ...'}`, inline: true },
                { name: 'Player Slots', value: `${theEvent.number_player_slots}`, inline: true },
                { name: 'Created By', value: `<@${theEvent.userID}>`, inline: true },
                { name: 'Attendees', value: `${attendees}`, inline: true },
                { name: 'Description', value: `${theEvent.description}`, inline: false },
            );
        }
    }
    let signUpInfo = '';
    if (isShow) {
        signUpInfo = `✅ - Sign up for event | ❎ - Remove yourself\n`;
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

async function getStringForAttendees(event) {
    let attendees = '';
    for (let attendee of event.attendees) {
        console.log('attendee: ' + attendee);
        // await event.attendees.forEach(async (attendee) => {
        console.log('guildid %s charid %s guilduser %s', event.guildID, attendee.characterID, attendee.userID);
        let char = await CharModel.findOne({ guildID: event.guildID, id: attendee.characterID, guildUser: attendee.userID });
        console.log(char.name);
        let charString = '';
        if (char) {
            charString = ' (' + characters.stringForCharacter(char) + ')';
        }
        attendees += `<@${attendee.userID}>${charString},`;
    }
    return attendees != '' ? attendees.substring(0, attendees.length - 1) : 'None yet';
}

function getEmbedLinkForEvent(theEvent) {
    return `[${theEvent.title}](${getLinkForEvent(theEvent)}) (id: ${theEvent._id})`;
}

function getLinkForEvent(theEvent) {
    return `https://discordapp.com/channels/${theEvent.guildID}/${theEvent.channelID}/${theEvent.messageID}`;
}

function formatDate(date) {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
        throw Error('Intl.DateTimeFormat not available in this environment');
    }
    let validTZ = Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZoneName: 'short'
    });
    let validDateString = validTZ.format(date);
    // console.log('formatDate %s', validDateString);
    return validDateString;
}

function formatJustDate(date) {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
        throw Error('Intl.DateTimeFormat not available in this environment');
    }
    let validTZ = Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
    let validDateString = validTZ.format(date);
    // console.log('valid tz %s', validDateString);
    return validDateString;
}

function formatJustTime(date) {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
        throw Error('Intl.DateTimeFormat not available in this environment');
    }
    let validTZ = Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric'
    });
    console.log('b4formatJustTime: %s', date);
    let validDateString = validTZ.format(date);
    console.log('formatJustTime: %s', validDateString);
    return validDateString;
}

async function handleReactionAdd(reaction, user) {
    try {
        // The reaction is now also fully available and the properties will be reflected accurately:
        console.log(`${reaction.count} user(s) have given the same reaction to this message!`);

        let eventForMessage = await EventModel.findOne({ guildID: reaction.message.guild.id, channelID: reaction.message.channel.id, messageID: reaction.message.id });
        if (!eventForMessage) {
            console.log('Did not find event for reaction.');
            return;
        }
        console.log('about to save');
        await eventForMessage.save();
        // console.log(reaction.emoji);
        if (reaction.emoji && reaction.emoji.name == '✅') {
            // console.log(eventForMessage);
            await attendeeAdd(reaction, user, eventForMessage);
        } else if (reaction.emoji && reaction.emoji.name == '❎') {
            // console.log(eventForMessage);
            await attendeeRemove(reaction, user, eventForMessage);
        } else {
            console.log('Unknown reaction');
        }
    } catch (error) {
        await reaction.message.channel.send(`<@${user.id}> ... ${error.message}`);
    } finally {
        await reaction.users.remove(user.id);
    }
}

async function attendeeAdd(reaction, user, eventForMessage) {
    let charParams;
    if (!eventForMessage.campaign) {
        console.log('guildid %s and userid %s', reaction.message.guild.id, user.id);
        let vaultUser = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
        if (vaultUser) {
            charParams = { guildID: reaction.message.guild.id, guildUser: user.id, id: vaultUser.defaultCharacter, approvalStatus: true };
        } else {
            throw new Error(`Make sure you have set \`!default\` character for events with no campaign set.`);
        }
    } else {
        charParams = {
            "$and": [
                {
                    "guildID": reaction.message.guild.id,
                    "guildUser": user.id,
                    "approvalStatus": true,
                    "isUpdate": false
                },
                {
                    "$or": [
                        {
                            "campaignOverride": eventForMessage.campaign
                        },
                        {
                            "campaign.id": eventForMessage.campaign
                        }
                    ]
                }
            ]
        };
    }
    let character = await CharModel.findOne(charParams);
    if (!character) {
        if (eventForMessage.campaign) {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have an approved character and that it's campaign is set to ${eventForMessage.campaign}.`);
        } else {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have set \`!default\` character for events with no campaign set.`);
        }
    }
    if (!eventForMessage.attendees) {
        eventForMessage.attendees = [];
    }
    let alreadySignedUp = false;
    eventForMessage.attendees.forEach((attendee) => {
        if (attendee.userID == user.id) {
            attendee.characterID = character.id;
            attendee.date_time = new Date();
            alreadySignedUp = true;
        }
    });
    if (!alreadySignedUp) {
        eventForMessage.attendees.push({ userID: user.id, characterID: character.id, date_time: new Date() });
    }
    console.log('Character will be playing: ' + character.name);
    console.log('attendees: ', eventForMessage.attendees);
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
