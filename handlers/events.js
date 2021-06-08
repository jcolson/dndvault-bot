const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed, Message, User, Guild, TextChannel, GuildMember } = require('discord.js');
const { parse } = require('@holistics/date-parser');
const { DateTime } = require('luxon');
const { Types } = require('mongoose');
const users = require('../handlers/users.js');
const characters = require('../handlers/characters.js');
const utils = require('../utils/utils.js');
const config = require('../handlers/config.js');

/**
 * Create an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventCreate(msg, msgParms, guildConfig) {
    let eventChannelID = guildConfig.channelForEvents ? guildConfig.channelForEvents : msg.channel.id;
    try {
        let eventCreateResult = await bc_eventCreate(msg.member.id, eventChannelID, msg.guild.id, msgParms, msg);
        if (eventCreateResult) {
            utils.deleteMessage(msg);
        } else {
            throw new Error("Could not create event.");
        }
    } catch (error) {
        console.error('handleEventCreate:', error.message);
        await utils.sendDirectOrFallbackToChannel([
            { name: 'Event Create Error', value: `${error.message}` },
            { name: 'Timezone Lookup', value: `[Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id})` }
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
                throw new Error('Please set your timezone first using `/timezone [YOUR TIMEZONE]`!');
            } else {
                let validatedEvent = await validateEvent(msgParms, guildID, currUser);
                await validatedEvent.save();
                let eventChannel = await theGuild.channels.resolve(channelIDForEvent);
                let sentMessage = await eventShow(theGuild, eventChannel, validatedEvent._id);
                await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Create ${utils.EMOJIS.SHIELD}`, value: `<@${currUserId}> - created event successfully.`, inline: true }], msg ? msg : sentMessage, await client.users.resolve(currUserId), false, sentMessage.url);
                return true;
            }
        } else {
            console.info('events.bc_eventCreate: unknown guild on this shard, ignoring');
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
            utils.deleteMessage(msg);
        } else {
            throw new Error("Could not edit event.");
        }
    } catch (error) {
        console.error('handleEventEdit:', error);
        await utils.sendDirectOrFallbackToChannel([
            { name: 'Event Edit Error', value: `${error.message}` },
            { name: 'Timezone Lookup', value: `[Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id})` }
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
                throw new Error('Please set your timezone first using `/timezone [YOUR TIMEZONE]`!');
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
                let validatedEvent = await validateEvent(msgParms, guildID, currUser, existingEvent);
                //since we're editing the event, we'll re-remind users
                validatedEvent.reminderSent = undefined;
                await validatedEvent.save();
                let eventChannel = await msg.guild.channels.resolve(channelIDForEvent);
                let eventMessage = await eventShow(theGuild, eventChannel, validatedEvent._id);
                await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Edit ${utils.EMOJIS.SHIELD}`, value: `<@${currUserId}> - edited event successfully.`, inline: true }], msg ? msg : eventMessage, await client.users.resolve(currUserId), false, eventMessage.url);
                return true;
            }
        } else {
            console.log('events.bc_eventEdit: unknown guild on this shard, ignoring');
        }
    } catch (error) {
        error.message += ` For Channel: ${channelIDForEvent}`;
        throw error;
    }
    return false;
}

/**
 * Allows approver to add a player to an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventSignup(msg, msgParms, guildConfig) {
    try {
        const eventIDparam = msgParms.find(p => p.name == 'event_id');
        if (!eventIDparam) {
            throw new Error(`Please ensure to pass the event id that you wish to have signed up to.`);
        }
        const eventUserIDparam = msgParms.find(p => p.name == 'user_id');
        if (!eventUserIDparam) {
            throw new Error(`Please ensure to pass the player's user id that you wish to signup.`);
        }
        const eventToAlter = await EventModel.findById(eventIDparam.value);
        if (!eventToAlter) {
            throw new Error(`Could not locate event ${eventIDparam.value}`);
        }
        const eventMessage = await (
            await msg.guild.channels.resolve(eventToAlter.channelID)
        ).messages.fetch(eventToAlter.messageID);
        const userToSignup = await client.users.fetch(eventUserIDparam.value);
        if (!userToSignup) {
            throw new Error(`Could not locate player/user ${eventUserIDparam.value}`);
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != eventToAlter?.userID) {
            throw new Error(`Please have <@${eventToAlter?.userID}> signup this player, or ask an \`approver role\` to do so.`);
        }
        await attendeeAdd(eventMessage, userToSignup, eventToAlter, guildConfig);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Signup ${utils.EMOJIS.SHIELD}`, value: `<@${userToSignup.id}> Signed Up To Event.`, inline: true }], msg, msg.author, false, eventMessage.url);
        utils.deleteMessage(msg);
    } catch (error) {
        console.error('handleEventSignup:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * Allows approver to withdraw a player from an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventWithdrawal(msg, msgParms, guildConfig) {
    try {
        const eventIDparam = msgParms.find(p => p.name == 'event_id');
        if (!eventIDparam) {
            throw new Error(`Please ensure to pass the event id that you wish to have signed up to.`);
        }
        const eventUserIDparam = msgParms.find(p => p.name == 'user_id');
        if (!eventUserIDparam) {
            throw new Error(`Please ensure to pass the player's user id that you wish to signup.`);
        }
        const eventToAlter = await EventModel.findById(eventIDparam.value);
        if (!eventToAlter) {
            throw new Error(`Could not locate event ${eventIDparam.value}`);
        }
        const eventMessage = await (
            await msg.guild.channels.resolve(eventToAlter.channelID)
        ).messages.fetch(eventToAlter.messageID);
        const userToSignup = await client.users.fetch(eventUserIDparam.value);
        if (!userToSignup) {
            throw new Error(`Could not locate player/user ${eventUserIDparam.value}`);
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != eventToAlter?.userID) {
            throw new Error(`Please have <@${eventToAlter?.userID}> withdraw this player, or ask an \`approver role\` to do so.`);
        }
        await attendeeRemove(eventMessage, userToSignup, eventToAlter, guildConfig);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Withdrawal ${utils.EMOJIS.SHIELD}`, value: `<@${userToSignup.id}> Withdrawn From Event.`, inline: true }], msg, msg.author, false, eventMessage.url);
        utils.deleteMessage(msg);
    } catch (error) {
        console.error('handleEventWithdrawal:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
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
        utils.deleteMessage(msg);
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * remove event from db (if can find it) and the Discord message
 * @param {Guild} guild
 * @param {GuildMember} memberUser
 * @param {String} eventID
 * @param {GuildModel} guildConfig
 * @param {Message} existingEventMessage optional
 * @returns
 */
async function removeEvent(guild, memberUser, eventID, guildConfig, existingEventMessage) {
    let returnMessage;
    try {
        let existingEvent = await EventModel.findById(eventID);
        if (!await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole) && memberUser.id != existingEvent?.userID) {
            throw new Error(`Please have <@${existingEvent?.userID}> remove, or ask an \`approver role\` to remove.`);
        }
        if (existingEvent) {
            await existingEvent.delete();
            let channelId = existingEvent?.channelID ? existingEvent.channelID : existingEventMessage?.channel?.id;
            let messageId = existingEvent?.messageID ? existingEvent.messageID : existingEventMessage?.id;
            const eventMessage = await (
                await guild.channels.resolve(channelId)
            ).messages.fetch(messageId);
            if (eventMessage) {
                await eventMessage.edit(await embedForEvent(guild, [existingEvent], undefined, true, memberUser.id));
                await eventMessage.reactions.removeAll();
            }
        }
        returnMessage = { name: `${utils.EMOJIS.DAGGER} Event Remove ${utils.EMOJIS.SHIELD}`, value: `<@${memberUser.id}> - the event, ${eventID} , was successfully removed.`, inline: true };
    } catch (error) {
        console.error(`removeEvent: couldn't remove event`, error);
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
    try {
        const eventID = msgParms[0].value;
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            throw new Error(`Please ask an \`approver role\` to re-show this event if needed, it should be available [here](${getLinkForEvent(showEvent)}).`);
        }
        let sentMessage = await eventShow(msg.guild, msg.channel, eventID);
        utils.deleteMessage(msg);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Show ${utils.EMOJIS.SHIELD}`, value: `<@${msg.member.id}> - event displayed successfully.`, inline: true }], msg ? msg : sentMessage, msg.member.user, false, sentMessage.url);
    } catch (error) {
        console.error('handleEventShow:', error.message);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * show an event
 * @param {Guild} guild
 * @param {Channel} msgChannel
 * @param {String} eventID
 * @param {GuildModel} guildConfig
 * @returns {Message} sentMessage
 */
async function eventShow(guild, msgChannel, eventID) {
    let sentMessage;
    let eventChannel = msgChannel;
    try {
        let showEvent = await EventModel.findById(eventID);
        if (!showEvent) {
            throw new Error('Event not found.');
        }
        const embedEvent = await embedForEvent(guild, [showEvent], undefined, true);
        let guildConfig = await config.confirmGuildConfig(guild);
        if (guildConfig?.channelForEvents) {
            // console.debug(`eventShow: channelForEvents: ${guildConfig.channelForEvents}`);
            eventChannel = new TextChannel(guild, { id: guildConfig.channelForEvents });
            // eventChannel = await guild.channels.resolve(guildConfig.channelForEvents);
        }
        let rolesToPing = utils.parseAllTagsFromString(showEvent.description);
        sentMessage = await eventChannel.send(`${rolesToPing ? 'Attention: ' + rolesToPing.toString() : ''}`, embedEvent);
        if (showEvent.channelID && showEvent.messageID) {
            try {
                // remove old event message
                // let oldEventMessageChannel = await guild.channels.resolve(showEvent.channelID);
                let oldEventMessageChannel = new TextChannel(guild, { id: showEvent.channelID });
                // console.debug(`eventShow: ${showEvent.channelID} oldEventMessageChannel:`, oldEventMessageChannel);
                const eventMessage = await oldEventMessageChannel.messages.fetch(showEvent.messageID);
                await eventMessage.delete();
            } catch (error) {
                console.info(`eventShow: couldn't delete old event message: ${error.message}`);
            }
        }
        showEvent.channelID = sentMessage.channel.id;
        showEvent.messageID = sentMessage.id;
        await showEvent.save();
        sentMessage.react(utils.EMOJIS.CHECK);
        sentMessage.react(utils.EMOJIS.X);
        sentMessage.react(utils.EMOJIS.PLAY);
        sentMessage.react(utils.EMOJIS.CLOCK);
        sentMessage.react(utils.EMOJIS.EDIT);
        sentMessage.react(utils.EMOJIS.TRASH);
    } catch (error) {
        console.error('eventShow:', error.message);
        error.message += ` For Channel: ${eventChannel?.name}`;
        throw error;
    }
    return sentMessage;
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
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `ALL Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            utils.deleteMessage(msg);
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
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `PROPOSED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            utils.deleteMessage(msg);
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
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `DEPLOYED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            utils.deleteMessage(msg);
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
    let erecurEvery = findParmIfEmptyMakeNull(msgParms, 'recur_every');

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
        console.debug('validateEvent: tz offset: ' + timezoneOffset);

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
        let eventDateParsed = parse(dateTimeStringToParse, refDate, { timezoneOffset: timezoneOffset });
        if (!eventDateParsed) {
            throw new Error(`Could not determine date and time from arguments passed in (date: ${onDate}, time: ${atTime})`);
        }
        let eventDate = eventDateParsed.start.date();
        // console.log('parsed date %s', eventDate);
        validatedEvent.date_time = eventDate;
    }
    if (validatedEvent.date_time < new Date()) {
        throw new Error(`Date for any event being created or edited, must be in the future (${formatDateInDifferentTimezone(validatedEvent.date_time, currUser.timezone)} is in the past).`);
    }
    validatedEvent.title = etitle === null ? undefined : (etitle ? etitle : validatedEvent.title);
    validatedEvent.dm = edmgm === null ? undefined : (edmgm ? edmgm : validatedEvent.dm);
    validatedEvent.duration_hours = efor === null ? undefined : (efor ? efor : validatedEvent.duration_hours);
    validatedEvent.number_player_slots = ewith === null ? undefined : (ewith ? ewith : validatedEvent.number_player_slots);
    validatedEvent.campaign = ecampaign === null ? undefined : (ecampaign ? ecampaign : validatedEvent.campaign);
    validatedEvent.description = edesc === null ? undefined : (edesc ? edesc : validatedEvent.description);
    validatedEvent.recurEvery = erecurEvery === null || 0 ? undefined : (erecurEvery ? erecurEvery : validatedEvent.recurEvery);
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
 * returns the MessageEmbed(s) for an array of events passed
 *
 * @param {String} guildIconURL
 * @param {EventModel[]} charArray
 * @param {String} title
 * @param {Boolean} isShow
 *
 * @returns {MessageEmbed[]}
 */
async function embedForEvent(guild, eventArray, title, isShow, removedBy) {
    let returnEmbeds = [];
    // return 3 events for show and 8 events for a list
    let charPerEmbed = isShow ? 1 : 4;
    if (removedBy) {
        title = utils.strikeThrough(eventArray[0].title);
    } else if (!title && eventArray.length > 0) {
        title = eventArray[0].title;
    } else if (!title) {
        title = 'Event';
    }
    let eventEmbed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setTitle(`${utils.EMOJIS.DAGGER} ${title} ${utils.EMOJIS.SHIELD}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('Event Coordinator', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${guild?.id}`)
        // .setDescription(description)
        .setThumbnail(guild.iconURL());
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
        if (removedBy) {
            eventEmbed.setColor(utils.COLORS.RED);
            eventEmbed.addFields({ name: `${utils.EMOJIS.TRASH}EVENT REMOVED by${utils.EMOJIS.TRASH}`, value: `<@${removedBy}>`, inline: false });
        }
        eventEmbed.addFields(
            { name: `${isShow ? '' : utils.EMOJIS.DAGGER}ID`, value: messageTitleAndUrl, inline: isShow },
            { name: 'DMGM', value: `${dmgmString}`, inline: true },
            { name: 'Date and Time', value: `${formatDate(theEvent.date_time, true)}\nfor ${theEvent.duration_hours} hrs${theEvent.recurEvery ? `, ${utils.EMOJIS.REPEAT}every ${theEvent.recurEvery} day(s)` : ``}`, inline: true },
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
    if (isShow) {
        eventEmbed.addFields(
            {
                name: '\u200B', value: `${utils.EMOJIS.CHECK}Sign up ${utils.EMOJIS.X}Withdraw ▶️Deploy\n${utils.EMOJIS.CLOCK}Your TZ and Calendar ${utils.EMOJIS.EDIT}DC edit command ${utils.EMOJIS.TRASH}Remove\n`
            },
        );
    }
    returnEmbeds.push(eventEmbed);
    // console.debug(`embedForEvent:`, returnEmbeds);
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

/**
 *
 * @param {Date} theDate
 * @returns {String}
 */
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
        // console.debug(`${reaction.count} user(s) have given the same reaction to this message!`);
        let eventForMessage = await EventModel.findOne({ guildID: reaction.message.guild.id, channelID: reaction.message.channel.id, messageID: reaction.message.id });
        if (!eventForMessage) {
            console.info('handleReactionAdd: Did not find event for reaction.');
        }
        if (reaction.emoji?.name == utils.EMOJIS.CHECK && eventForMessage) {
            // console.debug(eventForMessage);
            await attendeeAdd(reaction.message, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.X && eventForMessage) {
            // console.debug(eventForMessage);
            await attendeeRemove(reaction.message, user, eventForMessage);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.PLAY && eventForMessage) {
            // console.debug(eventForMessage);
            await deployEvent(reaction, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.CLOCK && eventForMessage) {
            // console.debug(eventForMessage);
            await convertTimeForUser(reaction, user, eventForMessage, guildConfig);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.EDIT && eventForMessage) {
            // console.debug(eventForMessage);
            await utils.sendDirectOrFallbackToChannel({ name: `Edit Event Helper`, value: `Copy/Paste the following message into the appropriate channel on your server to start the event edit command.` }, reaction.message, user);
            await utils.sendSimpleDirectOrFallbackToChannel(`\`/event_edit event_id:${eventForMessage.id}\``, reaction.message, user);
            await reaction.users.remove(user.id);
        } else if (reaction.emoji?.name == utils.EMOJIS.TRASH && eventForMessage) {
            let memberUser = await reaction.message.guild.members.resolve(user.id);
            let deleteMessage = await removeEvent(reaction.message.guild, memberUser, eventForMessage?._id, guildConfig, reaction.message);
            await utils.sendDirectOrFallbackToChannel(deleteMessage, reaction.message, user);
            await reaction.users.remove(user.id);
        } else {
            console.log(`handleReactionAdd: EventFromDb: ${eventForMessage ? true : false} Reaction: ${reaction.emoji?.name}`);
        }
    } catch (error) {
        console.error('handleReactionAdd:', error);
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
        await reaction.users.remove(user.id);
    }
}

/**
 * report to show event attendance
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventAttendance(msg, msgParms, guildConfig) {
    try {
        const refDate = new Date();
        let fromDate = msgParms.find(p => p.name == 'from_date');
        // console.debug(`fromdate:`, fromDate);
        if (fromDate) {
            fromDate = parse(fromDate.value, refDate).start.date();
        } else {
            fromDate = new Date('1 Jan 1970 00:00:00 GMT');
        }
        let endDate = msgParms.find(p => p.name == 'end_date');
        // console.debug(`endDate:`, endDate);
        if (endDate) {
            endDate = parse(endDate.value, refDate).start.date();
        } else {
            endDate = new Date();
        }
        // console.debug(`fromdate: ${fromDate} endDate: ${endDate}`);
        const attendanceRows = await EventModel.aggregate([
            {
                '$match': {
                    '$and': [
                        {
                            'guildID': msg.guild.id
                        }, {
                            'date_time': {
                                '$gt': fromDate
                            }
                        }, {
                            'date_time': {
                                '$lt': endDate
                            }
                        }
                    ]
                }
            }, {
                '$unwind': '$attendees'
            }, {
                '$project': {
                    'attendees': 1
                }
            }, {
                '$group': {
                    '_id': '$attendees.userID',
                    'count': {
                        '$sum': 1
                    }
                }
            }, {
                '$sort': {
                    'count': -1
                }
            }
        ]);
        for (row of attendanceRows) {
            row.character = await retrieveCharacterToUse(msg.guild.id, row._id);
        }
        let eventAttendanceEmbed = embedForEventAttendance(attendanceRows, `${utils.EMOJIS.DAGGER}Event Attendance from ${formatJustDate(fromDate)} to ${formatJustDate(endDate)}${utils.EMOJIS.SHIELD}`, guildConfig.guildIconURL);
        await utils.sendDirectOrFallbackToChannelEmbeds(eventAttendanceEmbed, msg);
        if (msg.deletable) {
            msg.delete();
        }
    } catch (error) {
        console.error('handleEventAttendance', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function embedForEventAttendance(attendanceRows, title, guildIconURL) {
    const rowsPerField = 12;
    let eventAttendanceEmbed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setAuthor('Event Coordinator', Config.dndVaultIcon, `${Config.httpServerURL}`)
        .setThumbnail(guildIconURL);
    const fieldLength = [6, 31, 21];
    const separator = '|';
    let reportArray = [utils.appendStringsForEmbed([`# SESH`, `CHARACTER`, `PLAYER`], fieldLength, separator)];
    let rowCount = 0;
    for (row of attendanceRows) {
        reportArray.push(utils.appendStringsForEmbed([row.count + '', characters.stringForCharacterShort(row.character), '<@' + row._id + '>'], fieldLength, separator));
        if (++rowCount > rowsPerField) {
            rowCount = 0;
            eventAttendanceEmbed.addFields({ name: title, value: utils.trimAndElipsiseStringArray(reportArray, 1024) });
            title = `\u200B`;
            reportArray = [];
        }
        // console.debug(`${row._id} - ${row.count}`);
    }
    if (reportArray.length > 0) {
        eventAttendanceEmbed.addFields({ name: title, value: utils.trimAndElipsiseStringArray(reportArray, 1024) });
    }
    return eventAttendanceEmbed;
}

async function convertTimeForUser(reaction, user, eventForMessage, guildConfig) {
    let userModel = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    let fieldsToSend = [];
    if (!userModel || !userModel.timezone) {
        fieldsToSend = [
            { name: 'Timezone not set', value: `<@${user.id}>, you have no Timezone set yet, use \`/timezone Europe/Berlin\`, for example, or [Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${reaction.message.guild.id}&channel=${reaction.message.channel.id})`, inline: true },
            { name: 'iCalendar Subscription Info', value: `[Youtube: How To Subscribe to D&DVault's iCalendar](https://youtu.be/CEnUVG9wGwQ)\n[Right click this link and \`Copy Link\`](${Config.httpServerURL}/calendar?userID=${user.id})` }
        ];
    } else {
        let usersTimeString = formatDateInDifferentTimezone(eventForMessage.date_time, userModel.timezone);
        fieldsToSend = [
            { name: 'Converted Time', value: `${usersTimeString} ${userModel.timezone}`, inline: true },
            { name: 'iCalendar Subscription Info', value: `[Youtube: How To Subscribe to D&DVault's iCalendar](https://youtu.be/CEnUVG9wGwQ)\n[Right click this link and \`Copy Link\`](${Config.httpServerURL}/calendar?userID=${user.id})` }
        ];
    }
    await utils.sendDirectOrFallbackToChannel(fieldsToSend, reaction.message, user);
}

function formatDateInDifferentTimezone(date, tzString) {
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
    await reaction.message.edit(await embedForEvent(reaction.message.guild, [eventForMessage], undefined, true));
}

/**
 *
 * @param {String} guildID
 * @param {String} userID
 * @param {String} campaign - optional
 * @returns {CharModel}
 */
async function retrieveCharacterToUse(guildID, userID, campaign, requireCampaignCharacterForEvent) {
    let vaultUser = await UserModel.findOne({ guildID: guildID, userID: userID });
    let characterArray = await CharModel.find({ guildID: guildID, guildUser: userID, approvalStatus: true }).sort([["campaignOverride", "desc"], ["campaign.id", "desc"]]);
    let character;
    // check array for characters that will work for no campaign
    if (!campaign) {
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
            if (charCheck.campaignOverride == campaign || charCheck.campaign.id == campaign) {
                character = charCheck;
            } else if (charCheck.id == vaultUser?.defaultCharacter) {
                characterDefault = charCheck;
            } else if (!requireCampaignCharacterForEvent && !character && !characterBackup) { //if characters aren't required for a campaign and a character hasn't been found yet, use the first one
                characterBackup = charCheck;
            }
        }
        character = character ? character : (characterDefault && !requireCampaignCharacterForEvent ? characterDefault : (characterBackup && !requireCampaignCharacterForEvent ? characterBackup : undefined));
    }
    return character;
}

/**
 *
 * @param {Message} message
 * @param {User} user
 * @param {EventModel} eventForMessage
 * @param {GuildModel} guildConfig
 */
async function attendeeAdd(message, user, eventForMessage, guildConfig) {
    let character = await retrieveCharacterToUse(message.guild.id, user.id, eventForMessage.campaign, guildConfig.requireCampaignCharacterForEvent);
    if (!character) {
        if (eventForMessage.campaign && guildConfig.requireCharacterForEvent) {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have an approved character and that it's campaign is set to ${eventForMessage.campaign}.`);
        } else if (guildConfig.requireCharacterForEvent) {
            throw new Error(`Could not locate an eligible character to join the mission <${getLinkForEvent(eventForMessage)}>.  Make sure you have set \`!default\` character for events with no campaign set.`);
        } else {
            console.info(`attendeeAdd: Could not locate an eligible character to join the mission, but guild doesn't require.`);
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
    await eventForMessage.save();
    await message.edit(await embedForEvent(message.guild, [eventForMessage], undefined, true));
}

/**
 *
 * @param {Message} message
 * @param {User} user
 * @param {EventModel} eventForMessage
 */
async function attendeeRemove(message, user, eventForMessage) {
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
    await message.edit(await embedForEvent(message.guild, [eventForMessage], undefined, true));
}

async function sendReminders(client) {
    try {
        let toDate = new Date(new Date().getTime() + (Config.calendarReminderMinutesOut * 1000 * 60));
        let guildsToRemind = client.guilds.cache.keyArray();
        let eventsToRemind = await EventModel.find({ reminderSent: null, date_time: { $lt: toDate }, guildID: { $in: guildsToRemind } });
        console.log("sendReminders: for %d unreminded events until %s for %d guilds", eventsToRemind.length, toDate, guildsToRemind.length);
        for (theEvent of eventsToRemind) {
            theEvent.reminderSent = new Date();
            try {
                await theEvent.save();
            } catch (error) {
                console.info(`sendReminders: avoiding race condition on saving theEvent between reminders and recurring events ${theEvent._id}: ${error.message}`);
                continue;
            }
            let guild = await (new Guild(client, { id: theEvent.guildID })).fetch();
            let channel = new TextChannel(guild, { id: theEvent.channelID });
            let msg = new Message(client, { id: theEvent.messageID, guild: guild, url: getEmbedLinkForEvent(theEvent) }, channel);
            let eventEmbeds = await embedForEvent(guild, [theEvent], `Reminder for ${theEvent.title}`, true);
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
        }
    }
    catch (error) {
        console.error("sendReminders", error);
    }
}

async function recurEvents(client) {
    try {
        // assume '1' hours after the event start time is a comfortable time to schedule a recurrent
        let toDate = new Date(new Date().getTime() - (1 * 1000 * 60 * 60));
        let guildsToRecur = client.guilds.cache.keyArray();
        let eventsToRecur = await EventModel.find({ recurComplete: null, recurEvery: { $ne: null }, date_time: { $lt: toDate }, guildID: { $in: guildsToRecur } });
        console.log("recurEvents: for %d events until %s for %d guilds", eventsToRecur.length, toDate, guildsToRecur.length);
        for (theEvent of eventsToRecur) {
            theEvent.recurComplete = new Date();
            try {
                await theEvent.save();
            } catch (error) {
                console.info(`recurEvents: avoiding race condition on saving theEvent between reminders and recurring events ${theEvent._id}`);
                continue;
            }
            let theRecurEvent = new EventModel();
            theRecurEvent._id = Types.ObjectId();
            console.debug(`recurEvents: id: ${theRecurEvent._id}`);

            theRecurEvent.guildID = theEvent.guildID;
            theRecurEvent.dm = theEvent.dm;
            theRecurEvent.duration_hours = theEvent.duration_hours;
            theRecurEvent.number_player_slots = theEvent.number_player_slots;
            theRecurEvent.campaign = theEvent.campaign;
            theRecurEvent.description = theEvent.description;
            theRecurEvent.userID = theEvent.userID;
            theRecurEvent.recurEvery = theEvent.recurEvery;

            theRecurEvent.date_time = new Date(theEvent.date_time.getTime() + (theEvent.recurEvery * 1000 * 60 * 60 * 24));
            console.debug(`recurEvents: New recurred date_time: ${theRecurEvent.date_time}`);

            var titleOccuranceIntegerMatch = theEvent.title.match(/ [0-9]*$/);
            console.debug(`recurEvents: titleOccuranceIntegerMatch ${titleOccuranceIntegerMatch?.length}:`, titleOccuranceIntegerMatch);
            if (titleOccuranceIntegerMatch?.length > 0) {
                let newOccuranceInteger = ' ' + (parseInt(titleOccuranceIntegerMatch[0]) + 1);
                console.debug(`recurEvents: replacing occurance number with ${newOccuranceInteger}`);
                theRecurEvent.title = theEvent.title.replace(/ [0-9]*$/, newOccuranceInteger);
            } else {
                theRecurEvent.title = theEvent.title + ' 2';
            }
            console.debug(`recurEvents: New title: ${theRecurEvent.title}`);
            await theRecurEvent.save();

            let guild = await (new Guild(client, { id: theRecurEvent.guildID })).fetch();
            let channel = new TextChannel(guild, { id: theEvent.channelID });
            await eventShow(guild, channel, theRecurEvent._id);
        }
    }
    catch (error) {
        console.error("recurEvents", error);
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
exports.handleEventAttendance = handleEventAttendance;
exports.handleEventSignup = handleEventSignup;
exports.handleEventWithdrawal = handleEventWithdrawal;
exports.getLinkForEvent = getLinkForEvent;
exports.sendReminders = sendReminders;
exports.recurEvents = recurEvents;
exports.bc_eventCreate = bc_eventCreate;
exports.bc_eventEdit = bc_eventEdit;
