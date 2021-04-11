const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed, Message, User, Guild, TextChannel } = require('discord.js');
const { parse, OUTPUT_TYPES } = require('@holistics/date-parser');
const { DateTime } = require('luxon');
const users = require('../handlers/users.js');
const characters = require('../handlers/characters.js');
const utils = require('../utils/utils.js');

/**
 * Create an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventCreate(msg, msgParms, guildConfig) {
    let eventChannelID = guildConfig.channelForEvents ? guildConfig.channelForEvents : msg.channel.id;
    try {
        // let eventString = msg.content.substring((guildConfig.prefix + 'event create').length);
        let eventCreateResult = await bc_eventCreate(msg.member.id, eventChannelID, msg.guild.id, msgParms, msg);
        if (eventCreateResult) {
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error("Could not create event.");
        }
    } catch (error) {
        console.error('handleEventCreate:', error.message);
        await utils.sendDirectOrFallbackToChannel([
            { name: 'Event Create Error', value: `${error.message}` },
            { name: 'Timezone Lookup', value: `<${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id}>` }
        ], msg);
    }
}

/**
 * broadcast safe method of event creation
 * @param {String} currUserId
 * @param {String} channelIDForEvent
 * @param {String} guildID
 * @param {Array} msgParms
 * @param {Message} msg optional, pass if there was an original message for the event creation
 * @returns
 */
async function bc_eventCreate(currUserId, channelIDForEvent, guildID, msgParms, msg) {
    try {
        let theGuild = client.guilds.cache.get(guildID);
        if (theGuild) {
            let currUser = await UserModel.findOne({ userID: currUserId, guildID: guildID });
            if (!currUser || !currUser.timezone) {
                throw new Error('Please set your timezone first using `timezone [YOUR TIMEZONE]`!');
            } else {
                // let eventArray = parseEventString(eventString);
                let validatedEvent = await validateEvent(msgParms, guildID, currUser);
                let eventChannel = await theGuild.channels.resolve(channelIDForEvent);
                let sentMessage = await eventChannel.send(await embedForEvent(theGuild.iconURL(), [validatedEvent], undefined, true));
                validatedEvent.channelID = sentMessage.channel.id;
                validatedEvent.messageID = sentMessage.id;
                await validatedEvent.save();
                sentMessage.react(utils.EMOJIS.CHECK);
                sentMessage.react(utils.EMOJIS.X);
                sentMessage.react(utils.EMOJIS.PLAY);
                sentMessage.react(utils.EMOJIS.CLOCK);
                sentMessage.react(utils.EMOJIS.TRASH);
                await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Create ${utils.EMOJIS.SHIELD}`, value: `<@${currUserId}> - created event successfully.`, inline: true }], msg ? msg : sentMessage, await client.users.resolve(currUserId), false, sentMessage.url);
                return true;
            }
        } else {
            console.log('events.bc_eventCreate: unknown guild on this shard, ignoring');
        }
    } catch (error) {
        console.error('events.bc_eventCreate:', error.message);
        error.message += ` For Channel: ${channelIDForEvent}`;
        throw error;
    }
    return false;
}

/**
 * Edits a pre-existing event using the event's ID
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventEdit(msg, msgParms, guildConfig) {
    let eventChannelID = guildConfig.channelForEvents ? guildConfig.channelForEvents : msg.channel.id;
    try {
        if (msgParms.length < 2) {
            throw new Error('Not enough parameters, you need to pass at least one editable parameter.');
        }
        const eventIDparam = msgParms.find(p => p.name == 'event_id');
        if (!eventIDparam) {
            throw new Error('Please check the format of your `event edit` command');
        }
        const eventID = eventIDparam.value;
        // console.log(eventID);
        let eventEditResult = await bc_eventEdit(eventID, msg.member.id, eventChannelID, msg.guild.id, guildConfig.arole, msgParms, msg);
        if (eventEditResult) {
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error("Could not edit event.");
        }
    } catch (error) {
        console.error('handleEventEdit:', error);
        await utils.sendDirectOrFallbackToChannel([
            { name: 'Event Edit Error', value: `${error.message}` },
            { name: 'Timezone Lookup', value: `<${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id}>` }
        ], msg);
    }
}

/**
 * broadcast safe method of event creation
 * @param {String} eventID
 * @param {String} currUserId
 * @param {String} channelIDForEvent
 * @param {String} guildID
 * @param {Array} msgParms
 * @param {Message} msg optional, pass if a message was used to create event
 * @returns
 */
async function bc_eventEdit(eventID, currUserId, channelIDForEvent, guildID, guildApprovalRole, msgParms, msg) {
    try {
        // check and make sure that this client is servicing this guild (broadcast safe)
        let theGuild = client.guilds.cache.get(guildID);
        if (theGuild) {
            let currUser = await UserModel.findOne({ userID: currUserId, guildID: guildID });
            if (!currUser || !currUser.timezone) {
                throw new Error('Please set your timezone first using `timezone [YOUR TIMEZONE]`!');
            } else {
                let existingEvent = await EventModel.findById(eventID);
                if (!existingEvent) {
                    throw new Error(`Unknown event id (${eventID})`);
                }
                let guildMember = await theGuild.members.fetch(currUserId);
                // console.debug(`bc_eventEdit:currUserId: ${currUserId} guildMember:`, guildMember);
                if (!await users.hasRoleOrIsAdmin(guildMember, guildApprovalRole) && currUserId != existingEvent.userID) {
                    throw new Error(`Please have <@${existingEvent.userID}> edit, or ask an <@&${guildApprovalRole}> to edit.`);
                }
                // let eventArray = parseEventString(eventString, existingEvent);
                let validatedEvent = await validateEvent(msgParms, guildID, currUser, existingEvent);
                //since we're editing the event, we'll re-remind users
                validatedEvent.reminderSent = undefined;
                let eventMessage;
                try {
                    eventMessage = await (
                        theGuild.channels.resolve(validatedEvent.channelID)
                    ).messages.fetch(validatedEvent.messageID);
                    await eventMessage.edit(await embedForEvent(theGuild.iconURL(), [validatedEvent], undefined, true));
                } catch (error) {
                    console.log(`couldn't edit old event message on edit: ${error.message}`);
                    let eventChannel = await msg.guild.channels.resolve(channelIDForEvent);
                    eventMessage = await eventChannel.send(await embedForEvent(theGuild.iconURL(), [validatedEvent], undefined, true));
                    validatedEvent.channelID = eventMessage.channel.id;
                    validatedEvent.messageID = eventMessage.id;
                    eventMessage.react(utils.EMOJIS.CHECK);
                    eventMessage.react(utils.EMOJIS.X);
                    eventMessage.react(utils.EMOJIS.PLAY);
                    eventMessage.react(utils.EMOJIS.CLOCK);
                    eventMessage.react(utils.EMOJIS.TRASH);
                }
                await validatedEvent.save();
                await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Edit ${utils.EMOJIS.SHIELD}`, value: `<@${currUserId}> - edited event successfully.`, inline: true }], msg ? msg : eventMessage, await client.users.resolve(currUserId), false, eventMessage.url);
                return true;
            }
        } else {
            console.log('events.bc_eventEdit: unknown guild on this shard, ignoring');
        }
    } catch (error) {
        // console.error('events.bc_eventEdit:', error.message);
        error.message += ` For Channel: ${channelIDForEvent}`;
        throw error;
    }
    return false;
}

/**
 * Removes a pre-existing event using the event's ID
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventRemove(msg, msgParms, guildConfig) {
    try {
        let eventID = msgParms[0].value;
        // console.log(eventID);
        let deleteMessage = await removeEvent(msg.guild, msg.member, eventID, guildConfig);
        await utils.sendDirectOrFallbackToChannel(deleteMessage, msg);
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

async function removeEvent(guild, memberUser, eventID, guildConfig) {
    let existingEvent;
    try {
        existingEvent = await EventModel.findById(eventID);
        if (!existingEvent) {
            throw new Error();
        }
    } catch (error) {
        throw new Error('Event not found.');
    }
    if (!await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole) && memberUser.id != existingEvent.userID) {
        throw new Error(`Please have <@${existingEvent.userID}> remove, or ask an \`approver role\` to remove.`);
    }
    await existingEvent.delete();
    let returnMessage = { name: `${utils.EMOJIS.DAGGER} Event Remove ${utils.EMOJIS.SHIELD}`, value: `<@${memberUser.id}> - the event, ${eventID} , was successfully removed.`, inline: true };
    try {
        const eventMessage = await (
            await guild.channels.resolve(existingEvent.channelID)
        ).messages.fetch(existingEvent.messageID);
        await eventMessage.delete();
    } catch (error) {
        console.error(`couldn't delete old event message on edit: ${error.message}`);
    }
    return returnMessage;
}

/**
 * show an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventShow(msg, msgParms, guildConfig) {
    let eventChannel = msg.channel;
    try {
        const eventID = msgParms[0].value;
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
        const embedEvent = await embedForEvent(msg.guild.iconURL(), [showEvent], undefined, true);
        if (guildConfig.channelForEvents) {
            eventChannel = await msg.guild.channels.resolve(guildConfig.channelForEvents);
        }
        const sentMessage = await eventChannel.send(embedEvent);
        if (msg.deletable) {
            await msg.delete();
        }
        try {
            // remove old event message
            const eventMessage = await (
                msg.guild.channels.resolve(showEvent.channelID)
            ).messages.fetch(showEvent.messageID);
            await eventMessage.delete();
        } catch (error) {
            console.error(`couldn't delete old event message on edit: ${error.message}`);
        }
        showEvent.channelID = sentMessage.channel.id;
        showEvent.messageID = sentMessage.id;
        await showEvent.save();
        sentMessage.react(utils.EMOJIS.CHECK);
        sentMessage.react(utils.EMOJIS.X);
        sentMessage.react(utils.EMOJIS.PLAY);
        sentMessage.react(utils.EMOJIS.CLOCK);
        sentMessage.react(utils.EMOJIS.TRASH);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Show ${utils.EMOJIS.SHIELD}`, value: `<@${msg.member.id}> - event displayed successfully.`, inline: true }], msg ? msg : sentMessage, msg.member.user, false, sentMessage.url);
    } catch (error) {
        console.error('handleEventShow:', error.message);
        error.message += ` For Channel: ${eventChannel.name}`;
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * list events that are in the future or n days old
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventList(msg, msgParms, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 3);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate } }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild.iconURL(), eventsArray, `ALL Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            if (msg.deletable) {
                await msg.delete();
            }
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
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventListProposed(msg, msgParms, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 1);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: null }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild.iconURL(), eventsArray, `PROPOSED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            if (msg.deletable) {
                await msg.delete();
            }
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
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventListDeployed(msg, msgParms, guildConfig) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 1);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: { $exists: true, $ne: null } }).sort({ date_time: 'asc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild.iconURL(), eventsArray, `DEPLOYED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`I don't see any DEPLOYED events yet.  Create one with \`event create\`!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * find a param by name, if it's empty string, make it null
 * @param {Array} msgParms
 * @param {String} nameToFind
 * @returns
 */
function findParmIfEmptyMakeNull(msgParms, nameToFind) {
    let foundValue = msgParms.find(p => p.name == nameToFind);
    if (foundValue) {
        foundValue = foundValue.value;
        if (foundValue == '') {
            foundValue = null;
        }
    }
    // console.debug('findParmIfEmptyMakeNull', foundValue);
    return foundValue;
}

/**
 * validate event and return object with proper types
 * @param {Array} msgParms
 * @param {Message} msg
 * @param {UserModel} currUser
 * @returns {EventModel}
 */
async function validateEvent(msgParms, guildID, currUser, existingEvent) {
    let etitle = findParmIfEmptyMakeNull(msgParms, 'title');
    let efor = findParmIfEmptyMakeNull(msgParms, 'for');
    let eon = findParmIfEmptyMakeNull(msgParms, 'on');
    let eat = findParmIfEmptyMakeNull(msgParms, 'at');
    let ewith = findParmIfEmptyMakeNull(msgParms, 'with');
    let edesc = findParmIfEmptyMakeNull(msgParms, 'desc');
    let edmgm = findParmIfEmptyMakeNull(msgParms, 'dmgm');
    edmgm = utils.trimTagsFromId(edmgm);
    let ecampaign = findParmIfEmptyMakeNull(msgParms, 'campaign');

    if ((!etitle && !existingEvent?.title) || etitle === null) {
        throw new Error('You must include a title for your event.');
    } else if ((!efor && !existingEvent?.duration_hours) || efor === null) {
        throw new Error(`You must include a duration for your event, was ${efor}`);
    } else if (efor && isNaN(efor)) {
        throw new Error(`The duration hours needs to be a number, not: "${efor}"`);
    } else if ((!eon && !existingEvent?.date_time) || eon === null) {
        throw new Error('You must include a date for your event.');
    } else if ((!eat && !existingEvent?.date_time) || eat === null) {
        throw new Error('You must include a time for your event.');
    } else if ((!ewith && !existingEvent?.number_player_slots) || ewith === null) {
        throw new Error('You must include a number of player slots for your event.');
    } else if ((!edesc && !existingEvent?.description) || edesc === null) {
        throw new Error('You must include a description for your event.');
    } else if (ewith && isNaN(ewith)) {
        throw new Error(`The number of player slots needs to be a number, not: "${ewith}"`);
    }

    let validatedEvent = existingEvent ? existingEvent : new EventModel({ guildID: guildID, userID: currUser.userID });
    if (eon || eat) {
        let timezoneOffset = getTimeZoneOffset(currUser.timezone);
        console.log('tz offset: ' + timezoneOffset);

        // convert to user's time if this exists already
        let usersOriginalEventDate;
        if (existingEvent?.date_time) {
            usersOriginalEventDate = getDateInDifferentTimezone(existingEvent.date_time, currUser.timezone);
            // new Date(existingEvent.date_time.toLocaleString("en-US", { timeZone: currUser.timezone }));
            // console.log('GMToriginaleventdate %s', existingEvent.date_time);
            // console.log('usersoriginaleventdate %s', usersOriginalEventDate);
        }
        //@todo: figure out a way to get the fuzzy parsing per date and per time working
        let onDate = eon ? eon : formatJustDate(usersOriginalEventDate);
        let atTime = eat ? eat : formatJustTime(usersOriginalEventDate);
        let dateTimeStringToParse = `${onDate} at ${atTime}`;
        let refDate = usersOriginalEventDate ? usersOriginalEventDate : getDateInDifferentTimezone(new Date(), currUser.timezone);
        //new Date(new Date().toLocaleString("en-US", { timeZone: currUser.timezone }));
        // console.log('refDate %s then - on %s at %s', refDate, onDate, atTime);
        let eventDate = parse(dateTimeStringToParse, refDate, { timezoneOffset: timezoneOffset }).start.date();
        // console.log('parsed date %s', eventDate);
        validatedEvent.date_time = eventDate;
    }
    validatedEvent.title = etitle === null ? undefined : (etitle ? etitle : validatedEvent.title);
    validatedEvent.dm = edmgm === null ? undefined : (edmgm ? edmgm : validatedEvent.dm);
    validatedEvent.duration_hours = efor === null ? undefined : (efor ? efor : validatedEvent.duration_hours);
    validatedEvent.number_player_slots = ewith === null ? undefined : (ewith ? ewith : validatedEvent.number_player_slots);
    validatedEvent.campaign = ecampaign === null ? undefined : (ecampaign ? ecampaign : validatedEvent.campaign);
    validatedEvent.description = edesc === null ? undefined : (edesc ? edesc : validatedEvent.description);
    return validatedEvent;
}

function getTimeZoneOffset(timezone) {
    let utcDate = new Date();
    // console.log('getTimeZoneOffset: %s', userDateString);
    let userDateTime = DateTime.fromObject(
        {
            day: utcDate.getDate(),
            month: utcDate.getMonth() + 1,
            year: utcDate.getFullYear(),
            hour: utcDate.getHours(),
            minute: utcDate.getMinutes(),
            zone: timezone
        });
    // console.log('getTimeZoneOffset/DateTime: %s', userDateTime);
    let userDate = userDateTime.toJSDate();
    // console.log('getTimeZoneOffset/userDate: %s', userDate);
    return -Math.ceil((userDate - utcDate) / 60 / 1000);
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
 * @param {String} guildIconURL
 * @param {EventModel[]} charArray
 * @param {String} title
 * @param {Boolean} isShow
 *
 * @returns {MessageEmbed[]}
 */
async function embedForEvent(guildIconURL, eventArray, title, isShow) {
    let returnEmbeds = [];
    // return 3 events for show and 8 events for a list
    let charPerEmbed = isShow ? 1 : 4;
    if (!title && eventArray.length > 0) {
        title = eventArray[0].title;
    } else if (!title) {
        title = 'Event';
    }
    let eventEmbed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setTitle(`${utils.EMOJIS.DAGGER} ${title} ${utils.EMOJIS.SHIELD}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('Event Coordinator', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
        // .setDescription(description)
        .setThumbnail(guildIconURL);
    // .setThumbnail(msg.guild.iconURL());
    let i = 0;
    for (let theEvent of eventArray) {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(eventEmbed);
            eventEmbed = new MessageEmbed()
                .setColor(utils.COLORS.BLUE);
            i = 0;
        }
        let dmgmString = theEvent.dm ? '<@' + theEvent.dm + '>' : 'Unassigned';
        let messageTitleAndUrl = isShow
            ? `${theEvent._id}`
            : `${getEmbedLinkForEvent(theEvent)}`;
        eventEmbed.addFields(
            { name: `${isShow ? '' : utils.EMOJIS.DAGGER}ID`, value: messageTitleAndUrl, inline: isShow },
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
        signUpInfo = `${utils.EMOJIS.CHECK}Sign up ${utils.EMOJIS.X}Withdrawal ▶️Deploy ${utils.EMOJIS.CLOCK}Your TZ and Calendar\n`;
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
    return `[${theEvent.title}](${getLinkForEvent(theEvent)}) ${theEvent._id}`;
}

function getLinkForEvent(theEvent) {
    return `https://discordapp.com/channels/${theEvent.guildID}/${theEvent.channelID}/${theEvent.messageID}`;
}

function formatDate(theDate, includeGMTstring) {
    var options = {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
        hour12: true,
    };
    if (includeGMTstring) {
        options.timeZoneName = 'short';
    }
    return new Intl.DateTimeFormat('en-US', options).format(theDate);
    /**
        let hours = theDate.getHours();
        let amOrPm = hours >= 12 ? 'pm' : 'am';
        hours = (hours % 12) || 12;
        let returnString = `${theDate.getMonth() + 1}/${theDate.getDate()}/${theDate.getFullYear()}, ${hours}:${utils.stringOfSize(theDate.getMinutes().toString(), 2, '0', true)} ${amOrPm}`;
        if (includeGMTstring) {
            returnString += ` GMT`;
        }
        return returnString;
        */
}

function formatJustDate(theDate) {
    let returnString = `${theDate.getMonth() + 1}/${theDate.getDate()}/${theDate.getFullYear()}`;
    return returnString;
}

function formatJustTime(theDate) {
    var options = {
        hour: 'numeric', minute: 'numeric',
        hour12: true,
    };
    // let hours = theDate.getHours();
    // let amOrPm = hours >= 12 ? 'pm' : 'am';
    // hours = (hours % 12) || 12;
    // let returnString = `${hours}:${utils.stringOfSize(theDate.getMinutes().toString(), 2, '0', true)}${amOrPm}`;
    // console.log(returnString);
    let returnString = new Intl.DateTimeFormat('en-US', options).format(theDate);
    // console.log(returnString);
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
        if (reaction.emoji?.name == utils.EMOJIS.CHECK) {
            // console.log(eventForMessage);
            await attendeeAdd(reaction, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.X) {
            // console.log(eventForMessage);
            await attendeeRemove(reaction, user, eventForMessage);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.PLAY) {
            // console.log(eventForMessage);
            await deployEvent(reaction, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.CLOCK) {
            // console.log(eventForMessage);
            await convertTimeForUser(reaction, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.TRASH) {
            await reaction.users.remove(user.id);
            let memberUser = await reaction.message.guild.members.resolve(user.id);
            let deleteMessage = await removeEvent(reaction.message.guild, memberUser, eventForMessage._id, guildConfig);
            await utils.sendDirectOrFallbackToChannel(deleteMessage, reaction.message, user);
        } else {
            console.log('Unknown reaction');
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
        await reaction.users.remove(user.id);
    }
}

async function convertTimeForUser(reaction, user, eventForMessage, guildConfig) {
    let userModel = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    let fieldsToSend = [];
    if (!userModel || !userModel.timezone) {
        fieldsToSend = [
            { name: 'Timezone not set', value: `You must set your timezone via \`timezone [YOUR TIMEZONE]\` in order to convert to your own timezone.`, inline: true },
            { name: 'Timezone Lookup', value: `<${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${reaction.message.channel.id}>` }
        ];
    } else {
        let usersTimeString = getDateStringInDifferentTimezone(eventForMessage.date_time, userModel.timezone);
        fieldsToSend = [
            { name: 'Converted Time', value: `${usersTimeString} ${userModel.timezone}`, inline: true },
            { name: 'Calendar Subscribe', value: `${Config.httpServerURL}/calendar?userID=${user.id}`, inline: true }
        ];
    }
    await utils.sendDirectOrFallbackToChannel(fieldsToSend, reaction.message, user);
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
            eventForMessage.dm = `${user.id}`;
        }
        eventForMessage.deployedByID = user.id;
    }
    await eventForMessage.save();
    await reaction.message.edit(await embedForEvent(reaction.message.guild.iconURL(), [eventForMessage], undefined, true));
}

async function attendeeAdd(reaction, user, eventForMessage, guildConfig) {
    let vaultUser = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    let characterArray = await CharModel.find({ guildID: reaction.message.guild.id, guildUser: user.id, approvalStatus: true }).sort([["campaignOverride", "desc"], ["campaign.id", "desc"]]);
    let character;
    // check array for characters that will work for no campaign
    if (!eventForMessage.campaign) {
        for (let charCheck of characterArray) {
            if (vaultUser?.defaultCharacter) {
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
            } else if (charCheck.id == vaultUser?.defaultCharacter) {
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
            attendee.characterID = character?.id ? character.id : undefined;
            attendee.date_time = new Date();
            alreadySignedUp = true;
        }
    });
    if (!alreadySignedUp) {
        if (eventForMessage.attendees.length < eventForMessage.number_player_slots) {
            eventForMessage.attendees.push({ userID: user.id, characterID: character?.id ? character.id : undefined, date_time: new Date() });
        } else {
            throw new Error(`Could not add another attendee, there are only ${eventForMessage.number_player_slots} total slots available, and they're all taken.`);
        }
    }
    // console.log('Character will be playing: ' + character.name);
    // console.log('attendees: ', eventForMessage.attendees);
    await eventForMessage.save();
    await reaction.message.edit(await embedForEvent(reaction.message.guild.iconURL(), [eventForMessage], undefined, true));
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
    await reaction.message.edit(await embedForEvent(reaction.message.guild.iconURL(), [eventForMessage], undefined, true));
}

async function sendReminders(client) {
    try {
        let toDate = new Date(new Date().getTime() + (Config.calendarReminderMinutesOut * 1000 * 60));
        let guildsToRemind = client.guilds.cache.keyArray();
        let eventsToRemind = await EventModel.find({ reminderSent: null, date_time: { $lt: toDate }, guildID: { $in: guildsToRemind } });
        console.log("sendReminders: for %d unreminded events until %s for %d guilds", eventsToRemind.length, toDate, guildsToRemind.length);
        for (theEvent of eventsToRemind) {
            theEvent.reminderSent = new Date();
            let guild = await (new Guild(client, { id: theEvent.guildID })).fetch();
            let channel = new TextChannel(guild, { id: theEvent.channelID });
            let msg = new Message(client, { id: theEvent.messageID, guild: guild, url: getEmbedLinkForEvent(theEvent) }, channel);
            let eventEmbeds = await embedForEvent(guild.iconURL(), [theEvent], "Reminder of Upcoming Event", true);
            let usersToNotify = [];
            if (theEvent.dm) {
                usersToNotify.push(theEvent.dm);
            }
            for (attendee of theEvent.attendees) {
                usersToNotify.push(attendee.userID);
            }
            usersToNotify = [...new Set(usersToNotify)];
            console.log(`sendReminders: userstonotify for event ${theEvent.id}`, usersToNotify);
            for (userToNotify of usersToNotify) {
                // let user = await (new User(client, { id: '227562842591723521' })).fetch();
                try {
                    let user = await (new User(client, { id: userToNotify })).fetch();
                    await utils.sendDirectOrFallbackToChannelEmbeds(eventEmbeds, msg, user);
                } catch (error) {
                    console.error(`sendReminders: Could not notify user ${userToNotify} due to ${error.message}`);
                }
            }
            await theEvent.save();
        }
    }
    catch (error) {
        console.error("sendReminders", error);
    }
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
exports.sendReminders = sendReminders;
exports.bc_eventCreate = bc_eventCreate;
exports.bc_eventEdit = bc_eventEdit;
