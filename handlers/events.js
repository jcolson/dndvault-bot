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
        console.log(eventID);
        eventString = eventString.substring(eventString.indexOf(' ') + 1);
        console.log(eventString);
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
        await msg.channel.send(`<@${msg.member.id}>, the event was successfully edited.`);
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
    if (!eventArray.title) {
        throw new Error('You must include a title for your event.');
    } else if (!eventArray.duration) {
        throw new Error('You must include a duration for your event.');
    } else if (isNaN(eventArray.duration)) {
        throw new Error(`The duration hours needs to be a number, not: "${eventArray.duration}"`);
    } else if (!eventArray.date) {
        throw new Error('You must include a date for your event.');
    } else if (!eventArray.time) {
        throw new Error('You must include a number of player slots for your event.');
    } else if (!eventArray.description) {
        throw new Error('You must include a description for your event.');
    } else if (eventArray.numberslots && isNaN(eventArray.numberslots)) {
        throw new Error(`The number of player slots needs to be a number, not: "${eventArray.numberslots}"`);
    } else if (eventArray.campaign && isNaN(eventArray.campaign)) {
        throw new Error(`The campaign id needs to be a number, not: "${eventArray.campaign}"`);
    } else if (eventArray.campaign) {
        //let campaigns = await CharModel.find().distinct('campaign.id');
        let campaignCharExample = await CharModel.findOne({ guildID: msg.guild.id, "campaign.id": eventArray.campaign });
        if (!campaignCharExample) {
            throw new Error(`The campaign id "${eventArray.campaign}" is not being used by any characters on this server.`);
        }
    }
    // the date parser let's me slap a year on the end and ignores it if it encounters a year prior
    let eventMs = Date.parse(eventArray.date + ' '
        + new Date().getFullYear() + ' '
        + currUser.timezone + ' ' + eventArray.time);
    if (isNaN(eventMs)) {
        throw new Error('I could not understand the date and time that you included.');
    }
    let eventDate = new Date(eventMs);
    // console.log('date ', eventDate);
    let validatedEvent = existingEvent ? existingEvent : new EventModel();
    validatedEvent.guildID = msg.guild.id;
    validatedEvent.title = eventArray.title;
    validatedEvent.dm = eventArray.dm;
    validatedEvent.duration_hours = eventArray.duration;
    validatedEvent.date_time = eventDate;
    validatedEvent.number_player_slots = eventArray.numberslots;
    validatedEvent.campaign = eventArray.campaign;
    validatedEvent.description = eventArray.description;
    validatedEvent.userID = msg.member.id;
    return validatedEvent;
}

/**
 * parse a message like
 * !event create [MISSION_TITLE] @DM [@USER_NAME] at [TIME] for [DURATION_HOURS] on [DATE] with [NUMBER_PLAYER_SLOTS] partof [CAMPAIGN] desc [test]
 * in order to create a mission
 * @param {String} eventString 
 */
function parseEventString(eventString) {
    const separatorArray = [' DMGM ', ' AT ', ' FOR ', ' ON ', ' WITH ', ' PARTOF ', ' DESC '];
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
    // add last index as the length of the string
    sepIndex.push(eventString.length);
    // console.log('all indexes', sepIndex);

    eventArray.title = eventString.substring(0, nextValidIndex(0, sepIndex));
    eventArray.dm = sepIndex[0] != -1 ?
        eventString.substring(sepIndex[0] + separatorArray[0].length, nextValidIndex(1, sepIndex)) :
        undefined;
    eventArray.time = sepIndex[1] != -1 ?
        eventString.substring(sepIndex[1] + separatorArray[1].length, nextValidIndex(2, sepIndex)) :
        undefined;
    eventArray.duration = sepIndex[2] != -1 ?
        eventString.substring(sepIndex[2] + separatorArray[2].length, nextValidIndex(3, sepIndex)) :
        undefined;
    eventArray.date = sepIndex[3] != -1 ?
        eventString.substring(sepIndex[3] + separatorArray[3].length, nextValidIndex(4, sepIndex)) :
        undefined;
    eventArray.numberslots = sepIndex[4] != -1 ?
        eventString.substring(sepIndex[4] + separatorArray[4].length, nextValidIndex(5, sepIndex)) :
        undefined;
    eventArray.campaign = sepIndex[5] != -1 ?
        eventString.substring(sepIndex[5] + separatorArray[5].length, nextValidIndex(6, sepIndex)) :
        undefined;
    eventArray.description = sepIndex[6] != -1 ?
        eventString.substring(sepIndex[6] + separatorArray[6].length, nextValidIndex(7, sepIndex)) :
        undefined;
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
