const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed, Message, User, Guild, TextChannel, Permissions } = require('discord.js');
const { parse } = require('@holistics/date-parser');
const { DateTime } = require('luxon');
const { Types } = require('mongoose');
const users = require('../handlers/users.js');
const characters = require('../handlers/characters.js');
const utils = require('../utils/utils.js');
const config = require('../handlers/config.js');

const SESSION_PLANNING_PERMS = ['MANAGE_CHANNELS', 'MANAGE_ROLES'];

/**
 * Create an event
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleEventCreate(msg, msgParms, guildConfig) {
    let eventChannelID = guildConfig.channelForEvents ? guildConfig.channelForEvents : msg.channel.id;
    try {
        let eventCreateResult = await bc_eventCreate(msg.member.id, eventChannelID, msg.guild.id, guildConfig.arole, guildConfig.eventRequireApprover, msgParms, msg);
        if (eventCreateResult) {
            await utils.deleteMessage(msg);
        } else {
            throw new Error("Could not create event.");
        }
    } catch (error) {
        console.error('handleEventCreate:', error.message);
        await utils.sendDirectOrFallbackToChannelError(error, msg, undefined, undefined, undefined,
            [{ name: 'Timezone Lookup', value: `[Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id})` }]);
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
async function bc_eventCreate(currUserId, channelIDForEvent, guildID, guildApprovalRole, eventRequireApprover, msgParms, msg) {
    try {
        let theGuild = client.guilds.cache.get(guildID);
        if (theGuild) {
            let guildMember = await theGuild.members.fetch(currUserId);
            let currUser = await UserModel.findOne({ userID: currUserId, guildID: guildID });
            if (!currUser || !currUser.timezone) {
                throw new Error('Please set your timezone first using `/timezone [YOUR TIMEZONE]`!');
            } else if (!eventRequireApprover || (eventRequireApprover && await users.hasRoleOrIsAdmin(guildMember, guildApprovalRole))) {
                let validatedEvent = await validateEvent(msgParms, guildID, currUser);
                await validatedEvent.save();
                let eventChannel = await theGuild.channels.resolve(channelIDForEvent);
                let sentMessage = await eventShow(theGuild, eventChannel, validatedEvent._id);
                await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Create ${utils.EMOJIS.SHIELD}`, value: `<@${currUserId}> - created event successfully.`, inline: true }], msg ? msg : sentMessage, await client.users.resolve(currUserId), false, sentMessage.url);
                return true;
            } else {
                throw new Error('Please have an `approver` create this event.')
            }
        } else {
            console.info('events.bc_eventCreate: unknown guild on this shard, ignoring');
        }
    } catch (error) {
        console.error('events.bc_eventCreate:', error);
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
        let eventIDparam = msgParms.find(p => p.name == 'event_id');
        if (!eventIDparam) {
            throw new Error('Please check the format of your `event edit` command');
        }
        // sometimes event id (from mobile) get's passed with an additional space at the end, so trim()
        let eventEditResult = await bc_eventEdit(eventIDparam.value.trim(), msg.member.id, eventChannelID, msg.guild.id, guildConfig.arole, guildConfig.eventRequireApprover, msgParms, msg);
        if (eventEditResult) {
            await utils.deleteMessage(msg);
        } else {
            throw new Error("Could not edit event.");
        }
    } catch (error) {
        console.error('handleEventEdit:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg, undefined, undefined, undefined,
            [{ name: 'Timezone Lookup', value: `[Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id})` }]);
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
async function bc_eventEdit(eventID, currUserId, channelIDForEvent, guildID, guildApprovalRole, eventRequireApprover, msgParms, msg) {
    try {
        // check and make sure that this client is servicing this guild (broadcast safe)
        let theGuild = client.guilds.cache.get(guildID);
        if (theGuild) {
            let currUser = await UserModel.findOne({ userID: currUserId, guildID: guildID });
            if (!currUser || !currUser.timezone) {
                throw new Error('Please set your timezone first using `/timezone [YOUR TIMEZONE]`!');
            } else {
                let existingEvent;
                try {
                    existingEvent = await EventModel.findById(eventID);
                    if (!existingEvent) {
                        throw new Error(`Unknown event id (${eventID})`);
                    }
                } catch (error) {
                    throw new Error(`Unknown event id (${eventID})`);
                }
                let guildMember = await theGuild.members.fetch(currUserId);
                // console.debug(`bc_eventEdit:currUserId: ${currUserId} guildMember:`, guildMember);
                if (!await users.hasRoleOrIsAdmin(guildMember, guildApprovalRole) && currUserId != existingEvent.userID) {
                    throw new Error(`Please have <@${existingEvent.userID}> edit, or ask an <@&${guildApprovalRole}> to edit.`);
                }
                if (eventRequireApprover && !await users.hasRoleOrIsAdmin(guildMember, guildApprovalRole)) {
                    throw new Error('Please have an `approver` edit this event.')
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
        let eventToAlter;
        try {
            eventToAlter = await EventModel.findById(eventIDparam.value);
            if (!eventToAlter) {
                throw new Error(`Could not locate event ${eventIDparam.value}`);
            }
        } catch (error) {
            throw new Error(`Could not locate event ${eventIDparam.value}`);
        }
        let eventMessage;
        try {
            eventMessage = await (
                await msg.guild.channels.resolve(eventToAlter.channelID)
            ).messages.fetch(eventToAlter.messageID);
        } catch (error) {
            throw new Error(`Could not locate event message, it may have been removed (on accident?), republish it with the \`/event_show\` command first.`);
        }
        const userToSignup = await client.users.fetch(eventUserIDparam.value);
        if (!userToSignup) {
            throw new Error(`Could not locate player/user ${eventUserIDparam.value}`);
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != eventToAlter?.userID) {
            throw new Error(`Please have <@${eventToAlter?.userID}> signup this player, or ask an \`approver role\` to do so.`);
        }
        await attendeeAdd(eventMessage, userToSignup, eventToAlter, guildConfig);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Signup ${utils.EMOJIS.SHIELD}`, value: `<@${userToSignup.id}> Signed Up To Event.`, inline: true }], msg, msg.author, false, eventMessage.url);
        await utils.deleteMessage(msg);
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
        let eventToAlter;
        try {
            eventToAlter = await EventModel.findById(eventIDparam.value);
            if (!eventToAlter) {
                throw new Error(`Could not locate event ${eventIDparam.value}`);
            }
        } catch (error) {
            throw new Error(`Could not locate event ${eventIDparam.value}`);
        }
        let eventMessage;
        try {
            eventMessage = await (
                await msg.guild.channels.resolve(eventToAlter.channelID)
            ).messages.fetch(eventToAlter.messageID);
        } catch (error) {
            throw new Error(`Could not locate event message, it may have been removed (on accident?), republish it with the \`/event_show\` command first.`);
        }
        const userToSignup = await client.users.fetch(eventUserIDparam.value);
        if (!userToSignup) {
            throw new Error(`Could not locate player/user ${eventUserIDparam.value}`);
        }
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole) && msg.member.id != eventToAlter?.userID) {
            throw new Error(`Please have <@${eventToAlter?.userID}> withdraw this player, or ask an \`approver role\` to do so.`);
        }
        await attendeeRemove(eventMessage, userToSignup, eventToAlter, guildConfig);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Withdrawal ${utils.EMOJIS.SHIELD}`, value: `<@${userToSignup.id}> Withdrawn From Event.`, inline: true }], msg, msg.author, false, eventMessage.url);
        await utils.deleteMessage(msg);
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
        let deleteMessage = await removeEvent(msg.guild, msg.member, eventID, guildConfig);
        await utils.sendDirectOrFallbackToChannel(deleteMessage, msg);
        await utils.deleteMessage(msg);
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
    let existingEvent = await EventModel.findById(eventID);
    // console.log(eventID);
    if (!await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole) && memberUser.id != existingEvent?.userID) {
        throw new Error(`Please have <@${existingEvent?.userID}> remove, or ask an \`approver role\` to remove.`);
    }
    if (existingEvent) {
        try {
            await maintainPlanningChannels(guild, existingEvent, guildConfig, true);
        } catch (error) {
            console.error(`removeEvent: Could not remove associated planning channel for this event ${existingEvent._id}.`, error);
        }
        await existingEvent.delete();
        let channelId = existingEvent?.channelID ? existingEvent.channelID : existingEventMessage?.channel?.id;
        let messageId = existingEvent?.messageID ? existingEvent.messageID : existingEventMessage?.id;
        let eventMessage;
        try {
            eventMessage = await (
                await guild.channels.resolve(channelId)
            ).messages.fetch(messageId);
            await eventMessage.edit({ embeds: await embedForEvent(guild, [existingEvent], undefined, true, memberUser.id) });
            await eventMessage.reactions.removeAll();
        } catch (error) {
            console.error(`removeEvent: Could not locate event message, it may have been removed already ... event removed without removing the associated message embed`);
        }
        returnMessage = { name: `${utils.EMOJIS.DAGGER} Event Remove ${utils.EMOJIS.SHIELD}`, value: `<@${memberUser.id}> - the event, \`${eventID}\`, was successfully removed.`, inline: true };
    } else {
        throw new Error(`<@${memberUser.id}> - the event, \`${eventID}\`, could not be located, so was \`not\` removed.`);
        // returnMessage = { name: `${utils.EMOJIS.DAGGER} Event Remove ${utils.EMOJIS.SHIELD}`, value: `<@${memberUser.id}> - the event, \`${eventID}\`, could not be located, so was \`not\` removed.`, inline: true };
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
            throw new Error(`Please ask an \`approver role\` to re-show this event if needed.`);
        }
        let sentMessage = await eventShow(msg.guild, msg.channel, eventID);
        await utils.deleteMessage(msg);
        await utils.sendDirectOrFallbackToChannel([{ name: `${utils.EMOJIS.DAGGER} Event Show ${utils.EMOJIS.SHIELD}`, value: `<@${msg.member.id}> - event displayed successfully.`, inline: true }], msg ? msg : sentMessage, msg.member.user, false, sentMessage.url);
    } catch (error) {
        console.error('handleEventShow:', error.message);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * show an event
 * update the messageID in the event to reflect the new embed
 * call the create planning channel for the event, if needed (also done when a player signs up or withdrawals)
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
        let showEvent;
        try {
            showEvent = await EventModel.findById(eventID);
            if (!showEvent) {
                throw new Error(`Event id ${eventID} not found.`);
            }
        } catch (error) {
            throw new Error(`Event id ${eventID} not found.`);
        }
        let guildConfig = await config.confirmGuildConfig(guild);
        if (guildConfig?.channelForEvents) {
            // console.debug(`eventShow: channelForEvents: ${guildConfig.channelForEvents}`);
            // eventChannel = new TextChannel(guild, { id: guildConfig.channelForEvents });
            try {
                eventChannel = await guild.channels.resolve(guildConfig.channelForEvents);
                if (!eventChannel) {
                    console.error(`eventShow: invalid channelForEvents (${guildConfig.channelForEvents}) channel configured, falling back to msgChannel`);
                    eventChannel = msgChannel;
                }
            } catch (error) {
                console.error(`eventShow: invalid channelForEvents (${guildConfig.channelForEvents}) channel configured, falling back to msgChannel: ${error.message}`);
                eventChannel = msgChannel;
            }
        }
        try {
            await maintainPlanningChannels(guild, showEvent, guildConfig);
        } catch (error) {
            console.error(`eventShow: had an issue maintaining planning channel`, error);
        }
        let embedEvent = await embedForEvent(guild, [showEvent], undefined, true);
        let rolesToPing = utils.parseAllTagsFromString(showEvent.description);
        // console.debug(`eventShow:`, embedEvent);
        sentMessage = await eventChannel.send({
            content: `${rolesToPing ? 'Attention: ' + rolesToPing.toString() : utils.EMPTY_FIELD}`,
            embeds: embedEvent
        });
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
        if (showEvent.planningChannel) {
            try {
                let planningChannel = await guild.channels.resolve(showEvent.planningChannel);
                await planningChannel.bulkDelete((await planningChannel.messages.fetchPinned()).filter(m => m.author.id == guild.me.id));
                let messageSent = await planningChannel.send({
                    embeds: [new MessageEmbed()
                        .setColor(utils.COLORS.BLUE)
                        .setThumbnail(guild.iconURL())
                        .addField(`Event Planning Channel For`, `${getEmbedLinkForEvent(showEvent)}`)]
                });
                await messageSent.pin();
            } catch (error) {
                console.error(`eventShow: had an issue sending event embed to planning channel`, error);
            }
        }
    } catch (error) {
        console.error('eventShow:', error);
        error.message += `; chref: ${eventChannel?.name}`;
        throw error;
    }
    return sentMessage;
}

/**
 * function to maintain both the voice and text planning channels for an event
 *
 * @param {Guild} guild
 * @param {EventModel} eventToMaintain
 * @param {GuildModel} guildConfig
 * @param {Boolean} removeChannel
 */
async function maintainPlanningChannels(guild, eventToMaintain, guildConfig, removeChannel) {
    if (guildConfig.eventPlanCat) {
        eventToMaintain.planningChannel = await maintainPlanningChannel(guild, eventToMaintain, eventToMaintain.planningChannel, guildConfig.eventPlanCat, 'attendees', removeChannel, false);
    }
    if (guildConfig.eventVoiceCat) {
        eventToMaintain.voiceChannel = await maintainPlanningChannel(guild, eventToMaintain, eventToMaintain.voiceChannel, guildConfig.eventVoiceCat, guildConfig.eventVoicePerms, removeChannel, true);
    }
}

/**
 * function to create planning channel if required for an event
 * also adds players to the channel if required
 * also removes players from the channel if required
 * removes channel if removeChannel is true
 *
 * @param {Guild} guild
 * @param {EventModel} eventToMaintain
 * @param {String} eventChannel the event planningChannel or event voiceChannel to maintain
 * @param {String} guildConfigCategory
 * @param {Boolean} removeChannel
 * @param {Boolean} isVoiceChannel
 * @returns {String} eventToMaintain.planningChannel
 */
async function maintainPlanningChannel(guild, eventToMaintain, eventChannel, guildConfigCategory, eventVoicePerms, removeChannel, isVoiceChannel) {
    if (guildConfigCategory) {
        if (!await guild.me.permissions.has(SESSION_PLANNING_PERMS)) {
            throw new Error(`In order to use Event Planning Category Channels, an administrator must grant the bot these server wide permissions: ${SESSION_PLANNING_PERMS}`);
        }
        if (removeChannel) {
            if (eventChannel) {
                console.debug(`maintainPlanningChannel: Removing planning channel (${eventChannel}) for event: ${eventToMaintain._id}.`);
                let planningChannel = await guild.channels.resolve(eventChannel);
                if (!planningChannel) {
                    console.debug(`maintainPlanningChannel: could not resolve the planning channel ${eventChannel}, so couldn't remove it.`);
                    eventChannel = undefined;
                } else {
                    await planningChannel.delete();
                }
            }
        } else {
            let playersToAdd = [];
            for (let attendee of eventToMaintain.attendees) {
                if (!attendee.standby) {
                    playersToAdd.push(attendee.userID);
                }
            }
            if (eventToMaintain.dm) {
                playersToAdd.push(eventToMaintain.dm);
            }
            // playersToAdd.push(eventToMaintain.userID);
            playersToAdd = [...new Set(playersToAdd)];
            let playersInChannelShouldBe = [...new Set(playersToAdd)];
            playersInChannelShouldBe.push(guild.me.id);
            // console.debug(`maintainPlanningChannel: initial list of new players to add`, playersToAdd);

            let channelNameShouldBe = eventToMaintain.title.substring(0, 90).replace(/[^0-9a-zA-Z]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
            // if there is no channel for this event yet, lets make one
            if (eventChannel) {
                let planningChannel = await guild.channels.resolve(eventChannel);
                // if we couldn't resolve the planning channel, unset it so we recreate it
                if (!planningChannel) {
                    console.debug(`maintainPlanningChannel: could not resolve the planning channel ${eventChannel}, we'll need to recreate it`);
                    eventChannel = undefined;
                }
            }
            if (!eventChannel) {
                let planCategory = await guild.channels.resolve(guildConfigCategory);
                if (!planCategory) {
                    throw new Error(`Could not locate event planning category <#${guildConfigCategory}>`)
                }
                let permissionOverwrites = [{
                    id: guild.me.id,
                    allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT],
                }, {
                    id: guild.roles.everyone,
                    allow: (eventVoicePerms == 'everyone_listen' || eventVoicePerms == 'everyone_speak') ?
                        [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT] : [],
                    deny: (eventVoicePerms != 'everyone_listen' && eventVoicePerms != 'everyone_speak') ?
                        [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT] :
                        (eventVoicePerms == 'everyone_listen') ?
                            [Permissions.FLAGS.SPEAK] :
                            [],
                }];
                for (let playerToAdd of playersToAdd) {
                    try {
                        let playerMember = await guild.members.fetch(playerToAdd);
                        console.debug(`maintainPlanningChannel: player to add perms: ${playerToAdd}`);
                        permissionOverwrites.push({
                            id: playerMember.id,
                            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK],
                        });
                    } catch (error) {
                        console.error(`maintainPlanningChannel: could not add player, ${playerToAdd}, due to error: ${error.message}`);
                    }
                }
                let channelParms = {
                    type: isVoiceChannel ? 'GUILD_VOICE' : 'GUILD_TEXT',
                    parent: planCategory,
                    permissionOverwrites: permissionOverwrites,
                };
                // console.debug(`maintainPlanningChannel: channelParms:`, channelParms);
                eventChannel = (await guild.channels.create(channelNameShouldBe, channelParms)).id;
                console.debug(`maintainPlanningChannel: planning channel id: ${eventChannel}`);
            }
            // ensure planning channel exists
            // now maintain the channel's name (could need to change if title of event changed)
            // now maintain players once we have a channel
            if (!eventChannel) {
                throw new Error(`Could not ensure a planning channel for this event`);
            }
            let planningChannel = await guild.channels.resolve(eventChannel);
            console.info(`maintainPlanningChannel: planningChannel resolved `, planningChannel.id);
            if (planningChannel.name != channelNameShouldBe) {
                console.info(`maintainPlanningChannel: renaming channel from ${planningChannel.name} to ${channelNameShouldBe}`)
                try {
                    planningChannel = await planningChannel.setName(channelNameShouldBe);
                } catch (error) {
                    console.error(`maintainPlanningChannel: error caught renaming channel`, error);
                }
                console.debug(`maintainPlanningChannel: COMPLETED renaming channel from ${planningChannel.name} to ${channelNameShouldBe}`)
            }
            for (let [memberKey, permOverwrite] of planningChannel.permissionOverwrites.cache) {
                // console.debug(`maintainPlanningChannel: existing permissionOverwrites key ${memberKey}:`, permOverwrite);
                if (permOverwrite.type == 'member') {
                    let addIDidx = playersToAdd.findIndex((userID) => { return userID == memberKey });
                    if (addIDidx >= 0) {
                        playersToAdd.splice(addIDidx, 1);
                    }
                    let removeID = playersInChannelShouldBe.find((userID) => { return userID == memberKey });
                    if (!removeID) {
                        await permOverwrite.delete();
                    }
                }
            }
            console.debug(`maintainPlanningChannel: new players to add`, playersToAdd);
            // console.debug(`maintainPlanningChannel: old players to remove`, playersToRemove);
            for (let playerAdd of playersToAdd) {
                console.debug(`maintainPlanningChannel: adding: '${playerAdd}'`, playerAdd);
                try {
                    let guildMemberAdd = await guild.members.fetch(playerAdd);
                    await planningChannel.permissionOverwrites.create(guildMemberAdd, { VIEW_CHANNEL: true, CONNECT: true, SPEAK: true }, { type: 1 });
                } catch (error) {
                    console.error(`maintainPlanningChannel: attendee, ${playerAdd}, may no longer be on server, couldn't maintain them for event ${eventToMaintain._id}: ${error.message}`);
                }
            }
        }
    } else {
        console.debug(`maintainPlanningChannel: no event planning category set, don't need to maintain event planning channels`);
    }
    return eventChannel;
}

/**
 * list events that are in the future or n days old
 * @param {Message} msg
 */
async function handleEventList(msg) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 365);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate } }).sort({ date_time: 'desc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `ALL Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await utils.deleteMessage(msg);
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
 */
async function handleEventListProposed(msg) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 365);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: null }).sort({ date_time: 'desc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `PROPOSED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await utils.deleteMessage(msg);
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
 */
async function handleEventListDeployed(msg) {
    try {
        let cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - 365);
        let eventsArray = await EventModel.find({ guildID: msg.guild.id, date_time: { $gt: cutOffDate }, deployedByID: { $exists: true, $ne: null } }).sort({ date_time: 'desc' });
        if (eventsArray.length > 0) {
            const embedEvents = await embedForEvent(msg.guild, eventsArray, `DEPLOYED Events`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(embedEvents, msg);
            await utils.deleteMessage(msg);
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
    // console.debug(`findParmIfEmptyMakeNull: ${nameToFind}: ${foundValue?.value}`);
    if (foundValue) {
        foundValue = foundValue.value;
        // console.debug('findParmIfEmptyMakeNull: foundValue: ', foundValue);
        if (foundValue === '') {
            // console.debug('findParmIfEmptyMakeNull: foundValue == \'\'', foundValue);
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
    // console.debug(`validateEvent: ewith: ${ewith}`);
    // null's are forced value updates to clear other attributes
    if ((!etitle && !existingEvent?.title) || etitle === null) {
        throw new Error('You must include a title for your event.');
    } else if ((!efor && !existingEvent?.duration_hours) || efor === null) {
        throw new Error(`You must include a duration for your event, was ${efor}`);
    } else if (efor && isNaN(efor)) {
        throw new Error(`The duration hours needs to be a number (ex: 3 or 3.5), not: "${efor}"`);
    } else if ((!eon && !existingEvent?.date_time) || eon === null) {
        throw new Error('You must include a date for your event.');
    } else if ((!eat && !existingEvent?.date_time) || eat === null) {
        throw new Error('You must include a time for your event.');
    } else if ((!ewith && !existingEvent?.number_player_slots && ewith != 0 && existingEvent?.number_player_slots != 0) || ewith === null) {
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
        }
        let refDate = usersOriginalEventDate ? usersOriginalEventDate : getDateInDifferentTimezone(new Date(), currUser.timezone);
        let onDate;
        try {
            onDate = eon ? formatJustDate(parse(eon, refDate)?.start.date()) : formatJustDate(usersOriginalEventDate);
        } catch (error) {
            throw new Error(`Could not parse the date \`${eon ? eon : usersOriginalEventDate}\`, please pass a date conforming to this format: \`10/28/1990\``);
        }
        // parser thinks times with no colons are years ...  how would it now?  help it out
        if (eat && !isNaN(eat)) {
            eat = eat.substring(0, eat.length - 2) + ':' + eat.substr(eat.length - 2);
        }
        // console.debug(`validateEvent: ${parse(eat, refDate)?.start.date()}`);
        let atTime = eat ? formatJustTime(parse(eat, refDate)?.start.date()) : formatJustTime(usersOriginalEventDate);
        let dateTimeStringToParse = `${onDate} at ${atTime}`;
        console.debug('validateEvent: refDate %s then - on %s at %s', refDate, onDate, atTime);
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
    validatedEvent.number_player_slots = ewith === null ? undefined : (ewith || ewith == 0 ? ewith : validatedEvent.number_player_slots);
    validatedEvent.campaign = ecampaign === null ? undefined : (ecampaign ? ecampaign : validatedEvent.campaign);
    validatedEvent.description = edesc === null ? undefined : (edesc ? edesc : validatedEvent.description);
    validatedEvent.recurEvery = erecurEvery === null || erecurEvery == 0 ? undefined : (erecurEvery ? erecurEvery : validatedEvent.recurEvery);
    return validatedEvent;
}

function getTimeZoneOffset(timezone) {
    let utcDate = new Date();
    console.debug('getTimeZoneOffset: timezone %s', timezone);
    let userDateTime = DateTime.fromObject(
        {
            day: utcDate.getDate(),
            month: utcDate.getMonth() + 1,
            year: utcDate.getFullYear(),
            hour: utcDate.getHours(),
            minute: utcDate.getMinutes()
        }, { zone: timezone });
    // console.log('getTimeZoneOffset/DateTime: %s', userDateTime);
    let userDate = userDateTime.toJSDate();
    // console.log('getTimeZoneOffset/userDate: %s', userDate);
    return -Math.ceil((userDate - utcDate) / 60 / 1000);
}

/**
 * returns the MessageEmbed(s) for an array of events passed
 *
 * @param {Guild} guild
 * @param {EventModel[]} eventArray
 * @param {String} title
 * @param {Boolean} isShow
 * @param {String} removedBy
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
        // trim the title to 1024 including the emojis and spaces
        .setTitle(`${utils.EMOJIS.DAGGER} ${title.substring(0, 1024 - utils.EMOJIS.DAGGER.length - utils.EMOJIS.SHIELD.length - 2)} ${utils.EMOJIS.SHIELD}`)
        // .setURL('https://discord.js.org/')
        .setAuthor({ name: 'Event Coordinator', iconURL: Config.dndVaultIcon, url: `${Config.httpServerURL}/?guildID=${guild?.id}` })
        // .setDescription('test')
        .setThumbnail(guild.iconURL());
    let i = 0;
    for (let theEvent of eventArray) {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(eventEmbed);
            eventEmbed = new MessageEmbed()
                .setColor(utils.COLORS.BLUE);
            i = 0;
        }
        let messageTitleAndUrl = isShow
            ? `${theEvent._id.toString()}`
            : `${getEmbedLinkForEvent(theEvent)}`;
        if (removedBy) {
            eventEmbed.setColor(utils.COLORS.RED);
            eventEmbed.addFields({ name: `${utils.EMOJIS.TRASH}EVENT REMOVED by${utils.EMOJIS.TRASH}`, value: `<@${removedBy}>`, inline: false });
        }
        let principals = `Author:\n<@${theEvent.userID}>`;
        if (theEvent.deployedByID) {
            principals += `\nDeployed By:\n<@${theEvent.deployedByID}>`;
        }
        if (theEvent.dm) {
            principals += `\nDMGM:\n<@${theEvent.dm}>`;
        }
        let epochEventDateTime = Math.floor(theEvent.date_time / 1000);
        // console.debug(`embedForEvent: epoch date: ${epochEventDateTime}`);
        eventEmbed.addFields(
            { name: `${isShow ? '' : utils.EMOJIS.DAGGER}ID`, value: messageTitleAndUrl, inline: isShow },
            { name: 'Principals', value: principals, inline: true },
            { name: 'Date and Time', value: `<t:${epochEventDateTime}:f> (<t:${epochEventDateTime}:R>)\nfor ${theEvent.duration_hours} hrs${theEvent.recurEvery ? `, ${utils.EMOJIS.REPEAT}every ${theEvent.recurEvery} day(s)` : ``}`, inline: true }
        );
        if (!isShow) {
            eventEmbed.addFields({ name: `Attendees`, value: `${stringForAttendeesLength(theEvent)}`, inline: true },);
        }
        if (theEvent.campaign) {
            eventEmbed.addField('Campaign', theEvent.campaign, true);
        }
        if (isShow) {
            let attendees = await getStringForAttendees(theEvent);
            // console.debug(`embedForEvent: attendees: `, attendees);
            if (attendees != ``) {
                eventEmbed.addFields(
                    { name: `Attendees${stringForAttendeesLength(theEvent)}`, value: `${attendees}`, inline: true }
                );
            } else {
                eventEmbed.addFields(
                    { name: `Attendees`, value: `${stringForAttendeesLength(theEvent)}`, inline: true }
                );
            }
            let standbys = await getStringForAttendees(theEvent, true);
            if (standbys != ``) {
                eventEmbed.addFields(
                    { name: `Standbys`, value: `${standbys}`, inline: true }
                );
            }
            if (theEvent.planningChannel) {
                eventEmbed.addFields({ name: 'Event Planning Channel', value: `<#${theEvent.planningChannel}>`, inline: true });
            }
            if (theEvent.voiceChannel) {
                eventEmbed.addFields({ name: 'Event Voice Channel', value: `<#${theEvent.voiceChannel}>`, inline: true });
            }
            eventEmbed.addFields({ name: 'Description', value: `${theEvent.description.substring(0, 1024)}`, inline: false });
        }
    }
    if (isShow && !removedBy) {
        eventEmbed.addFields(
            {
                name: utils.EMPTY_FIELD, value: `${utils.EMOJIS.CHECK}Sign up ${utils.EMOJIS.X}Withdraw ▶️Deploy\n${utils.EMOJIS.CLOCK}Your TZ and Calendar ${utils.EMOJIS.EDIT}DC edit command ${utils.EMOJIS.TRASH}Remove\n`
            },
        );
    }
    returnEmbeds.push(eventEmbed);
    // console.debug(`embedForEvent:`, returnEmbeds);
    return returnEmbeds;
}

/**
 *
 * @param {EventModel} theEvent
 * @returns {String} ex: (0/15)
 */
function stringForAttendeesLength(theEvent, standbys) {
    return `(${getNumberAttendees(theEvent, standbys)}/${theEvent.number_player_slots})`;
}

/**
 * retrieve number of attendees (or standby attendees)
 * @param {EventModel} theEvent
 * @param {Boolean} standbys
 * @returns {Number}
 */
function getNumberAttendees(theEvent, standbys) {
    let attCount = 0;
    for (let attendee of theEvent.attendees) {
        if (utils.isTrue(standbys) == utils.isTrue(attendee.standby)) {
            attCount++;
        }
    }
    return attCount;
}

/**
 * returns string for attendees that is not over 1024 characters (embed field value limit)
 * @param {String} event
 * @param {Boolean} standbys retrieve string for standby attendees
 */
async function getStringForAttendees(event, standbys) {
    let attendees = ``;
    for (let attendee of event.attendees) {
        // console.log('attendee: ' + attendee);
        // console.log('guildid %s charid %s guilduser %s', event.guildID, attendee.characterID, attendee.userID);
        if (utils.isTrue(standbys) == utils.isTrue(attendee.standby)) {
            let charString = '';
            if (attendee.characterID) {
                let char = await CharModel.findOne({ guildID: event.guildID, id: attendee.characterID, guildUser: attendee.userID });
                // console.log('attendee char',char.name);
                if (char) {
                    charString = `\n\`w/\`${characters.stringForCharacterShort(char)}`;
                }
            }
            attendees += `<@${attendee.userID}>${charString},\n`;
        }
    }
    attendees = (attendees != '' ? attendees.substring(0, attendees.length - 2) : ``).substring(0, 1024);
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
        const member = await reaction.message.guild.members.fetch(user);
        if (!await users.hasRoleOrIsAdmin(member, guildConfig.prole)) {
            //, <@&${guildConfig.prole}>,
            throw new Error(`Please ensure that you are a member of the player role before attempting to interact.`);
        }
        // console.debug(`${reaction.count} user(s) have given the same reaction to this message!`);
        let eventForMessage = await EventModel.findOne({ guildID: reaction.message.guild.id, channelID: reaction.message.channel.id, messageID: reaction.message.id });
        if (!eventForMessage) {
            console.info('handleReactionAdd: Did not find event for reaction.');
        } else {
            // scrub users that are no longer on server
            let index = 0;
            for (let attendee of eventForMessage.attendees) {
                let attendeeUser;
                try {
                    attendeeUser = await reaction.message.guild.members.fetch({ user: attendee.userID, force: true });
                } catch (error) {
                    console.debug(`${attendee.userID} is not in guild any longer ...`);
                }
                console.debug(`handleReactionAdd: is member (${attendee.userID}) deleted? ${attendeeUser?.deleted}`)
                if (!attendeeUser || attendeeUser?.deleted) {
                    console.info(`handleReactionAdd: removing an attendee that is no longer in guild: ${attendee.userID}`);
                    eventForMessage.attendees.splice(index, 1);
                } else {
                    // increase index if we didn't splice
                    index++;
                }
            }
            // console.debug(`handleReactionAdd: attendees: `, eventForMessage.attendees);
            await eventForMessage.save();
        }
        if (reaction.emoji?.name == utils.EMOJIS.CHECK && eventForMessage) {
            await attendeeAdd(reaction.message, user, eventForMessage, guildConfig);
        } else if (reaction.emoji?.name == utils.EMOJIS.X && eventForMessage) {
            await attendeeRemove(reaction.message, user, eventForMessage, guildConfig);
        } else if (reaction.emoji?.name == utils.EMOJIS.PLAY && eventForMessage) {
            await deployEvent(reaction, user, eventForMessage, guildConfig);
        } else if (reaction.emoji?.name == utils.EMOJIS.CLOCK && eventForMessage) {
            await convertTimeForUser(reaction, user, eventForMessage, guildConfig);
        } else if (reaction.emoji?.name == utils.EMOJIS.EDIT && eventForMessage) {
            await utils.sendDirectOrFallbackToChannel({ name: `Edit Event Helper`, value: `Copy/Paste the following message into the appropriate channel on your server to start the event edit command.` }, reaction.message, user);
            await utils.sendSimpleDirectOrFallbackToChannel(`\`/event_edit event_id:${eventForMessage.id}\``, reaction.message, user);
        } else if (reaction.emoji?.name == utils.EMOJIS.TRASH && eventForMessage) {
            let memberUser = await reaction.message.guild.members.resolve(user.id);
            let deleteMessage = await removeEvent(reaction.message.guild, memberUser, eventForMessage?._id, guildConfig, reaction.message);
            await utils.sendDirectOrFallbackToChannel(deleteMessage, reaction.message, user);
        } else {
            console.log(`handleReactionAdd: EventFromDb: ${eventForMessage ? true : false} Reaction: ${reaction.emoji?.name}`);
        }
    } catch (error) {
        console.error('handleReactionAdd:', error);
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
    } finally {
        // console.debug(`handleReactionAdd: clean up all reactions, except for bot's`);
        const reactionUsers = await reaction.users.fetch();
        for (let [_, reactionUser] of reactionUsers) {
            // console.debug(`handleReactionAdd: guildUser: ${reaction.message.guild.me.id} user:`, reactionUser);
            if (reactionUser.id != reaction.message.guild.me.id) {
                await reaction.users.remove(reactionUser.id);
            }
        }
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
        for (let row of attendanceRows) {
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
        .setAuthor({ name: 'Event Coordinator', iconURL: Config.dndVaultIcon, url: `${Config.httpServerURL}` })
        .setThumbnail(guildIconURL);
    const fieldLength = [6, 31, 21];
    const separator = '|';
    let reportArray = [utils.appendStringsForEmbed([`# SESH`, `CHARACTER`, `PLAYER`], fieldLength, separator)];
    let rowCount = 0;
    for (let row of attendanceRows) {
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

async function convertTimeForUser(reaction, user, eventForMessage) {
    let userModel = await UserModel.findOne({ guildID: reaction.message.guild.id, userID: user.id });
    let fieldsToSend = [];
    let epochEventDateTime = Math.floor(eventForMessage.date_time / 1000);
    if (!userModel || !userModel.timezone) {
        fieldsToSend = [
            { name: 'Timezone not set', value: `<@${user.id}>, you have no Timezone set yet, use \`/timezone Europe/Berlin\`, for example, or [Click Here to Lookup and Set your Timezone](${Config.httpServerURL}/timezones?guildID=${reaction.message.guild.id}&channel=${reaction.message.channel.id})\n\nEvent in Discord time: <t:${epochEventDateTime}:f> (<t:${epochEventDateTime}:R>)`, inline: true },
            { name: 'iCalendar Subscription Info', value: `[Youtube: How To Subscribe to D&D Vault's iCalendar](https://youtu.be/CEnUVG9wGwQ)\n\n[Right click this link and \`Copy Link\`](${Config.httpServerURL}/calendar?userID=${user.id})` }
        ];
    } else {
        let usersTimeString = formatDateInDifferentTimezone(eventForMessage.date_time, userModel.timezone);
        fieldsToSend = [
            { name: 'Converted Time', value: `${userModel.timezone}: ${usersTimeString}\nDiscord time: <t:${epochEventDateTime}:f> (<t:${epochEventDateTime}:R>)`, inline: true },
            { name: 'iCalendar Subscription Info', value: `[Youtube: How To Subscribe to D&D Vault's iCalendar](https://youtu.be/CEnUVG9wGwQ)\n\n[Right click this link and \`Copy Link\`](${Config.httpServerURL}/calendar?userID=${user.id})` }
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
        // @todo check database, this is not needed anymore
        dmgmID = utils.trimTagsFromId(eventForMessage.dm);
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
            eventForMessage.dm = user.id;
        }
        eventForMessage.deployedByID = user.id;
    }
    try {
        await maintainPlanningChannels(reaction.message.guild, eventForMessage, guildConfig);
    } catch (error) {
        console.error(`deployEvent: encountered error maintaining planning channel`, error);
    }
    await eventForMessage.save();
    await reaction.message.edit({ embeds: await embedForEvent(reaction.message.guild, [eventForMessage], undefined, true) });
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
    let alreadySignedUp;
    eventForMessage.attendees.forEach((attendee) => {
        if (attendee.userID == user.id) {
            attendee.characterID = character?.id ? character.id : undefined;
            attendee.date_time = new Date();
            alreadySignedUp = attendee;
        }
    });
    // if attendee is not already part of attendees list ... (standby or not)
    if (!alreadySignedUp) {
        if (getNumberAttendees(eventForMessage) < eventForMessage.number_player_slots) {
            eventForMessage.attendees.push({ userID: user.id, characterID: character?.id ? character.id : undefined, date_time: new Date(), standby: false });
        } else if (guildConfig.enableStandbyQueuing) {
            eventForMessage.attendees.push({ userID: user.id, characterID: character?.id ? character.id : undefined, date_time: new Date(), standby: true });
        } else {
            throw new Error(`Could not add another attendee, there are only ${eventForMessage.number_player_slots} total slots available, and they're all taken.`);
        }
    }
    // else if attendee IS already signed up AND enable standby queuing is enabled AND attendee is a standby
    else if (guildConfig.enableStandbyQueuing && alreadySignedUp?.standby) {
        // if number of attendees is less than max player slots, pivot the attendee away from a standby
        // this is an edge case, as generally this would happen upon attendeeRemove ... but it could happen if the event's
        // number_player_slots had been edited
        if (getNumberAttendees(eventForMessage) < eventForMessage.number_player_slots) {
            alreadySignedUp.standby = false;
        }
    }
    try {
        await maintainPlanningChannels(message.guild, eventForMessage, guildConfig);
    } catch (error) {
        console.error(`attendeeAdd: encountered error maintianing planning channel`, error);
    }
    await eventForMessage.save();
    await message.edit({ embeds: await embedForEvent(message.guild, [eventForMessage], undefined, true) });
}

/**
 *
 * @param {Message} message
 * @param {User} user
 * @param {EventModel} eventForMessage
 */
async function attendeeRemove(message, user, eventForMessage, guildConfig) {
    // console.log('attendees: ', eventForMessage.attendees);

    if (!eventForMessage.attendees) {
        eventForMessage.attendees = [];
    }
    eventForMessage.attendees.forEach((attendee, index) => {
        if (attendee.userID == user.id) {
            eventForMessage.attendees.splice(index, 1);
        }
    });
    // if enable standby queuing is enabled, switch the next standby to active
    if (guildConfig.enableStandbyQueuing) {
        if (getNumberAttendees(eventForMessage) < eventForMessage.number_player_slots) {
            for (let attendee of eventForMessage.attendees) {
                if (attendee.standby) {
                    attendee.standby = false;
                    break;
                }
            }
        }
    }
    // console.log(eventForMessage);
    try {
        await maintainPlanningChannels(message.guild, eventForMessage, guildConfig);
    } catch (error) {
        console.error(`attendeeRemove: encountered error maintaining planning channel`, error);
    }
    await eventForMessage.save();
    await message.edit({ embeds: await embedForEvent(message.guild, [eventForMessage], undefined, true) });
}

async function sendReminders(client) {
    try {
        let toDate = new Date(new Date().getTime() + (Config.calendarReminderMinutesOut * 1000 * 60));
        let guildsToRemind = Array.from(client.guilds.cache.keys());
        let eventsToRemind = await EventModel.find({ reminderSent: null, date_time: { $lt: toDate }, guildID: { $in: guildsToRemind } });
        console.info("sendReminders: for %d unreminded events until %s for %d guilds", eventsToRemind.length, toDate, guildsToRemind.length);
        for (let theEvent of eventsToRemind) {
            try {
                theEvent.reminderSent = new Date();
                try {
                    await theEvent.save();
                } catch (error) {
                    console.info(`sendReminders: avoiding race condition on saving theEvent between reminders and recurring events ${theEvent._id}: ${error.message}`);
                    continue;
                }
                let guild = await (new Guild(client, { id: theEvent.guildID })).fetch();
                if (!theEvent.channelID || !theEvent.messageID) {
                    throw new Error(`sendReminders: this event (${theEvent.id}) is malformed, there is no channelID or messageID, skipping.`);
                }
                let msg = new Message(client, { id: theEvent.messageID, guild_id: theEvent.guildID, channel_id: theEvent.channelID });
                let eventEmbeds = await embedForEvent(guild, [theEvent], `Reminder for ${theEvent.title}`, true);
                let usersToNotify = [];
                if (theEvent.dm) {
                    usersToNotify.push(theEvent.dm);
                }
                for (let attendee of theEvent.attendees) {
                    if (!attendee.standby) {
                        usersToNotify.push(attendee.userID);
                    }
                }
                usersToNotify = [...new Set(usersToNotify)];
                console.info(`sendReminders: userstonotify for event ${theEvent.id}`, usersToNotify);
                for (let userToNotify of usersToNotify) {
                    // let user = await (new User(client, { id: '227562842591723521' })).fetch();
                    try {
                        let user = await (new User(client, { id: userToNotify })).fetch();
                        await utils.sendDirectOrFallbackToChannelEmbeds(eventEmbeds, msg, user);
                    } catch (error) {
                        console.error(`sendReminders: Could not notify user ${userToNotify} due to ${error.message}`);
                    }
                }
            } catch (error) {
                console.error(`sendReminders: could not send reminders for guildId: ${theEvent.guildID}; channelID: ${theEvent.channelID}; messageID: ${theEvent.messageID}; eventID: ${theEvent._id}`, error);
            }
        }
    }
    catch (error) {
        console.error("sendReminders: ", error);
    }
}

async function recurEvents(client) {
    try {
        // assume '1' hours after the event start time is a comfortable time to schedule a recurrent
        let toDate = new Date(new Date().getTime() - (1 * 1000 * 60 * 60));
        let guildsToRecur = Array.from(client.guilds.cache.keys());
        let eventsToRecur = await EventModel.find({ recurComplete: null, recurEvery: { $ne: null }, date_time: { $lt: toDate }, guildID: { $in: guildsToRecur } });
        console.info("recurEvents: for %d events until %s for %d guilds", eventsToRecur.length, toDate, guildsToRecur.length);
        for (let theEvent of eventsToRecur) {
            theEvent.recurComplete = new Date();
            try {
                await theEvent.save();
            } catch (error) {
                console.info(`recurEvents: avoiding race condition on saving theEvent between reminders and recurring events ${theEvent._id}`);
                continue;
            }
            if (!theEvent.channelID) {
                console.info(`recurEvents: previous event (${theEvent._id}) didn't have a channel id ... possibly misconfigured server, will not recur this event and propogate the issue...`);
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

            // let guild = await (new Guild(client, { id: theRecurEvent.guildID })).fetch();
            let guild = await client.guilds.fetch(theRecurEvent.guildID);
            let channel = await guild.channels.resolve(theEvent.channelID);
            // let channel = new TextChannel(guild, { id: theEvent.channelID });
            await eventShow(guild, channel, theRecurEvent._id);
        }
    }
    catch (error) {
        console.error("recurEvents: ", error);
    }
}

/**
 * removes old session planning channels
 */
async function removeOldSessionPlanningChannels(client) {
    try {
        let guildsToRemoveChannels = Array.from(client.guilds.cache.keys());
        // will need a mongo pipeline to figure out which channels to remove
        const channelsToRemove = await EventModel.aggregate(
            [{
                $match: {
                    $and: [
                        {
                            guildID: {
                                $in: guildsToRemoveChannels
                            }
                        },
                        {
                            planningChannel: {
                                $ne: null
                            }
                        }
                    ]
                }
            }, {
                $lookup: {
                    from: 'guilds',
                    localField: 'guildID',
                    foreignField: 'guildID',
                    as: 'guildDocs'
                }
            }, {
                $project: {
                    planningChannel: 1,
                    date_time: 1,
                    guildID: 1,
                    todayMinusEventPlanDays: {
                        $toDate: {
                            $subtract: [Date.now(), {
                                $multiply: [1000, 3600, 24, {
                                    '$arrayElemAt': ['$guildDocs.eventPlanDays', 0]
                                }]
                            }]
                        }
                    },
                }
            }, {
                $match: {
                    $expr: {
                        $lt: ['$date_time', '$todayMinusEventPlanDays']
                    }
                }
            }]
        );
        console.info("removeOldSessionPlanningChannels: for %d channels for %d guilds", channelsToRemove.length, guildsToRemoveChannels.length);
        for (let row of channelsToRemove) {
            try {
                let existingEvent = await EventModel.findById(row._id);
                existingEvent.planningChannel = undefined;
                await existingEvent.save();
                let guild = await client.guilds.fetch(row.guildID);
                let planningChannel = await guild.channels.resolve(row.planningChannel);
                await planningChannel.delete();
            } catch (error) {
                console.error(`removeOldSessionPlanningChannels: Could not remove an old session planning channel (${row.planningChannel}) for event: ${row._id}.`, error);
            }
        }
    } catch (error) {
        console.error("removeOldSessionPlanningChannels: ", error);
    }
}

/**
 * removes old session voice channels
 */
async function removeOldSessionVoiceChannels(client) {
    try {
        let guildsToRemoveChannels = Array.from(client.guilds.cache.keys());
        // will need a mongo pipeline to figure out which channels to remove
        const channelsToRemove = await EventModel.aggregate(
            [{
                $match: {
                    $and: [
                        {
                            guildID: {
                                $in: guildsToRemoveChannels
                            }
                        },
                        {
                            voiceChannel: {
                                $ne: null
                            }
                        }
                    ]
                }
            }, {
                $lookup: {
                    from: 'guilds',
                    localField: 'guildID',
                    foreignField: 'guildID',
                    as: 'guildDocs'
                }
            }, {
                $project: {
                    voiceChannel: 1,
                    date_time: 1,
                    guildID: 1,
                    todayMinusEventPlanDays: {
                        $toDate: {
                            $subtract: [Date.now(), {
                                $multiply: [1000, 3600, 24, {
                                    '$arrayElemAt': ['$guildDocs.eventPlanDays', 0]
                                }]
                            }]
                        }
                    },
                }
            }, {
                $match: {
                    $expr: {
                        $lt: ['$date_time', '$todayMinusEventPlanDays']
                    }
                }
            }]
        );
        console.info("removeOldSessionVoiceChannels: for %d channels for %d guilds", channelsToRemove.length, guildsToRemoveChannels.length);
        for (let row of channelsToRemove) {
            try {
                let existingEvent = await EventModel.findById(row._id);
                existingEvent.voiceChannel = undefined;
                await existingEvent.save();
                let guild = await client.guilds.fetch(row.guildID);
                let voiceChannel = await guild.channels.resolve(row.voiceChannel);
                await voiceChannel.delete();
            } catch (error) {
                console.error(`removeOldSessionVoiceChannels: Could not remove an old session voice channel (${row.voiceChannel}) for event: ${row._id}.`, error);
            }
        }
    } catch (error) {
        console.error("removeOldSessionVoiceChannels: ", error);
    }
}

/**
 * removes old event posts
 */
async function removeOldEventPosts(client) {
    try {
        let guildsToRemovePosts = Array.from(client.guilds.cache.keys());
        // will need a mongo pipeline to figure out which messages to remove
        const messagesToRemove = await EventModel.aggregate(
            [
                {
                    '$match': {
                        '$and': [
                            {
                                guildID: {
                                    $in: guildsToRemovePosts
                                }
                            }, {
                                messageID: {
                                    $ne: null
                                }
                            }, {
                                channelID: {
                                    $ne: null
                                }
                            }
                        ]
                    }
                }, {
                    $lookup: {
                        from: 'guilds',
                        localField: 'guildID',
                        foreignField: 'guildID',
                        as: 'guildDocs'
                    }
                }, {
                    $project: {
                        date_time: 1,
                        guildID: 1,
                        channelID: 1,
                        messageID: 1,
                        guildEventPostAuto: {
                            '$arrayElemAt': [
                                '$guildDocs.eventPostAuto', 0
                            ]
                        },
                        todayMinusEventPlanDays: {
                            $toDate: {
                                $subtract: [Date.now(), {
                                    $multiply: [1000, 3600, 24, {
                                        '$arrayElemAt': ['$guildDocs.eventPlanDays', 0]
                                    }]
                                }]
                            }
                        }
                    }
                }, {
                    $match: {
                        $expr: {
                            $lt: ['$date_time', '$todayMinusEventPlanDays']
                        }
                    }
                }, {
                    $match: {
                        $expr: {
                            $eq: [
                                true, '$guildEventPostAuto'
                            ]
                        }
                    }
                }
            ]
        );
        console.info("removeOldEventPosts: for %d messages for %d guilds", messagesToRemove.length, guildsToRemovePosts.length);
        for (let row of messagesToRemove) {
            try {
                let existingEvent = await EventModel.findById(row._id);
                existingEvent.messageID = undefined;
                existingEvent.channelID = undefined;
                await existingEvent.save();
                let guild = await client.guilds.fetch(row.guildID);
                let eventChannel = await guild.channels.resolve(row.channelID);
                let messageToRemove = await eventChannel.messages.fetch(row.messageID)
                await messageToRemove.delete();
            } catch (error) {
                console.error(`removeOldEventPosts: Could not remove an old event message (${row.messageID}) for event: ${row._id}.`, error);
            }
        }
    } catch (error) {
        console.error("removeOldEventPosts: ", error);
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
exports.removeOldSessionPlanningChannels = removeOldSessionPlanningChannels;
exports.removeOldSessionVoiceChannels = removeOldSessionVoiceChannels;
exports.removeOldEventPosts = removeOldEventPosts;
exports.bc_eventCreate = bc_eventCreate;
exports.bc_eventEdit = bc_eventEdit;
exports.SESSION_PLANNING_PERMS = SESSION_PLANNING_PERMS;

//for testing
exports.testables = {
    embedForEvent: embedForEvent
};
