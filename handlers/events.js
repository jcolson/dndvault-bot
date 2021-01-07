const EventModel = require('../models/Event');
const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const { MessageEmbed } = require('discord.js');

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
        let eventString = msg.content.substring((guildConfig.prefix + 'event create').length + 1);
        let eventArray = parseEventString(eventString);

        let validatedEvent = await validateEvent(eventArray, msg, currUser);
        await validatedEvent.save();
        await msg.channel.send(`<@${msg.member.id}>, your event was successfully saved as id: ${validatedEvent._id}`);
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
        eventString = eventString.substring(eventString.indexOf(' ') + 1);
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
        await validatedEvent.save();
        await msg.channel.send(`<@${msg.member.id}>, the event, ${eventID} , was successfully edited.`);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
    }
}

async function handleEventRemove(msg, guildConfig) {
    try {
        let eventID = msg.content.substring((guildConfig.prefix + 'event remove').length + 1);
        // console.log(eventID);
        let deleteResponse;
        try {
            deleteResponse = await EventModel.findByIdAndDelete(eventID);
            if (deleteResponse.deletedCount < 1) {
                throw new Error();
            }
        } catch (error) {
            throw new Error('Event not found.');
        }
        await msg.channel.send(`<@${msg.member.id}>, the event, ${eventID} , was successfully removed.`);
        await msg.delete();
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
        const embedEvent = embedForEvent(msg, [showEvent], `Event: ${eventID}`, true);
        await msg.channel.send(embedEvent);
        await msg.delete();
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
    if ((!eventArray.TITLE && !existingEvent && !existingEvent.title) || eventArray.TITLE === null) {
        throw new Error('You must include a title for your event.');
    } else if ((!eventArray.FOR && eventArray.FOR === null && !existingEvent && !existingEvent.duration) || eventArray.FOR === null) {
        throw new Error('You must include a duration for your event.');
    } else if (eventArray.FOR && isNaN(eventArray.FOR)) {
        throw new Error(`The duration hours needs to be a number, not: "${eventArray.duration}"`);
    } else if ((!eventArray.ON && eventArray.ON === null && !existingEvent && !existingEvent.date_time) || eventArray.ON === null) {
        throw new Error('You must include a date for your event.');
    } else if ((!eventArray.AT && eventArray.AT === null && !existingEvent && !existingEvent.date_time) || eventArray.AT === null) {
        throw new Error('You must include a time for your event.');
    } else if ((!eventArray.WITH && eventArray.WITH === null && !existingEvent && !existingEvent.number_player_slots) || eventArray.WITH === null) {
        throw new Error('You must include a number of player slots for your event.');
    } else if ((!eventArray.DESC && eventArray.DESC === null && !existingEvent && !existingEvent.description) || eventArray.DESC === null) {
        throw new Error('You must include a description for your event.');
    } else if (eventArray.WITH && isNaN(eventArray.WITH)) {
        throw new Error(`The number of player slots needs to be a number, not: "${eventArray.WITH}"`);
    } else if (eventArray.PARTOF && isNaN(eventArray.PARTOF)) {
        throw new Error(`The campaign id needs to be a number, not: "${eventArray.PARTOF}"`);
    } else if (eventArray.PARTOF) {
        //let campaigns = await CharModel.find().distinct('campaign.id');
        let campaignCharExample = await CharModel.findOne({ guildID: msg.guild.id, "campaign.id": eventArray.PARTOF });
        if (!campaignCharExample) {
            throw new Error(`The campaign id "${eventArray.PARTOF}" is not being used by any characters on this server.`);
        }
    }

    let validatedEvent = existingEvent ? existingEvent : new EventModel({ guildID: msg.guild.id, userID: msg.member.id });

    let eventDate;
    if (eventArray.ON && eventArray.AT) {
        // the date parser let's me slap a year on the end and ignores it if it encounters a year prior
        let eventMs = Date.parse(eventArray.ON + ' '
            + new Date().getFullYear() + ' '
            + currUser.timezone + ' ' + eventArray.AT);
        if (isNaN(eventMs)) {
            throw new Error(`I could not understand the date and time that you included: ${eventArray.ON} and ${eventArray.AT}`);
        }
        eventDate = new Date(eventMs);
        validatedEvent.date_time = eventDate;
    }

    // console.log(eventArray);
    validatedEvent.title = eventArray.TITLE === null ? undefined : (eventArray.TITLE ? eventArray.TITLE : validatedEvent.title);
    validatedEvent.dm = eventArray.DMGM === null ? undefined : (eventArray.DMGM ? eventArray.DMGM : validatedEvent.dm);;
    validatedEvent.duration_hours = eventArray.FOR === null ? undefined : (eventArray.FOR ? eventArray.FOR : validatedEvent.duration_hours);;
    validatedEvent.number_player_slots = eventArray.WITH === null ? undefined : (eventArray.WITH ? eventArray.WITH : validatedEvent.number_player_slots);;
    validatedEvent.campaign = eventArray.PARTOF === null ? undefined : (eventArray.PARTOF ? eventArray.PARTOF : validatedEvent.campaign);;
    validatedEvent.description = eventArray.DESC === null ? undefined : (eventArray.DESC ? eventArray.DESC : validatedEvent.description);;
    return validatedEvent;
}

/**
 * parse a message like
 * !event create [MISSION_TITLE] @DM [@USER_NAME] at [TIME] for [DURATION_HOURS] on [DATE] with [NUMBER_PLAYER_SLOTS] partof [CAMPAIGN] desc [test]
 * in order to create a mission
 * @param {String} eventString 
 */
function parseEventString(eventString) {
    const separatorArray = ['TITLE', 'DMGM', 'AT', 'FOR', 'ON', 'WITH', 'PARTOF', 'DESC'];
    const eventArray = {};

    // check if all required separators exist
    const sepIndex = [];
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[1], sepIndex[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[2], sepIndex[1]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[3], sepIndex[2]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[4], sepIndex[3]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[5], sepIndex[4]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[6], sepIndex[5]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[7], sepIndex[6]));
    // add last index as the length of the string
    sepIndex.push(eventString.length);
    // console.log('all indexes', sepIndex);

    for (let i = 0; i < separatorArray.length; i++) {
        // console.log('sepind %d, separray %s, separraylen %d, nextValid %d', sepIndex[i], separatorArray[i], separatorArray[i].length + 1, nextValidIndex(i + 1, sepIndex));
        let param = sepIndex[i] != -1 ?
            eventString.substring(sepIndex[i] + separatorArray[i].length + 1, nextValidIndex(i + 1, sepIndex)) :
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
function embedForEvent(msg, eventArray, title, isShow) {
    let returnEmbeds = [];
    // return 3 events for show and 8 events for a list
    let charPerEmbed = isShow ? 3 : 8;
    let eventEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(title)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let i = 0;
    eventArray.forEach((theEvent) => {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(eventEmbed);
            eventEmbed = new MessageEmbed()
                .setColor('#0099ff');
            i = 0;
        }
        eventEmbed.addFields(
            { name: '🗡 Title 🛡', value: `${theEvent.title}` },
            { name: 'DM', value: `${theEvent.dm}`, inline: true },
            { name: 'Date and Time', value: `${theEvent.date_time}`, inline: true },
            { name: 'Duration', value: `${theEvent.duration_hours} hrs`, inline: true },
            { name: 'Player Slots', value: `${theEvent.number_player_slots}`, inline: true },
            { name: 'Created By', value: `<@${theEvent.userID}>`, inline: true },
        );
        if (isShow) {
            eventEmbed.addFields(
                { name: 'Description', value: `${theEvent.description}`, inline: false },
            );
        }
    })
    eventEmbed.addFields(
        { name: '\u200B', value: `Add this BOT to your server. [Click here](${Config.inviteURL})` },
    );
    returnEmbeds.push(eventEmbed);
    return returnEmbeds;
}

exports.handleEventCreate = handleEventCreate;
exports.handleEventShow = handleEventShow;
exports.handleEventEdit = handleEventEdit;
exports.handleEventRemove = handleEventRemove;
