const { MessageEmbed, APIMessage } = require("discord.js");
const CharModel = require('../models/Character');
const UserModel = require('../models/User');
const EventModel = require('../models/Event');
const GuildModel = require('../models/Guild');

const MAX_EMBED_SIZE = 5950;
const MESSAGE_TOO_LARGE_RESPONSE = `Resulting message is too large for discord.`;

const COLORS = {
    BLUE: '0099ff',
    GREEN: '#57f542',
    RED: '#fc0335',
};

const EMOJIS = {
    EDIT: `\uD83D\uDCDD`,
    TRASH: `\u{1F5D1}`,
    ONE: `\u0031\uFE0F\u20E3`,
    TWO: `\u0032\uFE0F\u20E3`,
    THREE: `\u0033\uFE0F\u20E3`,
    FOUR: `\u0034\uFE0F\u20E3`,
    FIVE: `\u0035\uFE0F\u20E3`,
    SIX: `\u0036\uFE0F\u20E3`,
    SEVEN: `\u0037\uFE0F\u20E3`,
    EIGHT: `\u0038\uFE0F\u20E3`,
    NINE: `\u0039\uFE0F\u20E3`,
    TEN: `\uD83D\uDD1F`,
    YES: `\uD83D\uDC4D`,
    NO: `\uD83D\uDC4E`,
    MAYBE: `\uD83E\uDD37`,
    CHECK: `\u2705`,
    X: `\u274E`,
    PLAY: `\u25B6\uFE0F`,
    REPEAT: `\uD83D\uDD01`,
    CLOCK: `\uD83D\uDD5F`,
    DAGGER: `\uD83D\uDDE1`,
    SHIELD: `\uD83D\uDEE1`,
    ASTERISK: `\u2733`,
    DICE: `\uD83C\uDFB2`,
};

/**
 *
 * @param {EmbedFieldData[]} fields
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM
 */
async function sendDirectOrFallbackToChannelError(error, msg, user, skipDM, urlToLinkBank) {
    let embed = new MessageEmbed()
        .setAuthor('DND Vault', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
        .setColor(COLORS.RED);
    embed.addFields({ name: `Error`, value: `<@${user ? user.id : msg.author ? msg.author.id : 'unknown user'}> - ${error.message}` });
    return sendDirectOrFallbackToChannelEmbeds([embed], msg, user, skipDM, urlToLinkBank);
}

/**
 *
 * @param {EmbedFieldData[]} fields
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM
 */
async function sendDirectOrFallbackToChannel(fields, msg, user, skipDM, urlToLinkBank) {
    if (!Array.isArray(fields)) {
        fields = [fields];
    }
    let embed = new MessageEmbed()
        .setAuthor('DND Vault', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
        .setColor(COLORS.BLUE);
    for (let field of fields) {
        field.name = typeof field.name !== 'undefined' && '' + field.name != '' ? field.name : 'UNSET';
        field.value = typeof field.value !== 'undefined' && '' + field.value != '' ? field.value : 'UNSET';
    }
    embed.addFields(fields);
    return sendDirectOrFallbackToChannelEmbeds([embed], msg, user, skipDM, urlToLinkBank);
}

/**
 *
 * @param {MessageEmbed[]} embedsArray
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM
 */
async function sendDirectOrFallbackToChannelEmbeds(embedsArray, msg, user, skipDM, urlToLinkBank) {
    try {
        if (!Array.isArray(embedsArray)) {
            embedsArray = [embedsArray];
        }
        if (embedsArray.length < 1) {
            throw new Error('No embeds passed to send');
        }
        if (!user && msg) {
            user = msg.author;
        }
        if (!urlToLinkBank) {
            urlToLinkBank = msg.url;
        }
        if (!user) {
            throw new Error('no valid message or user was passed to be able to respond.');
        }
        // console.log('user: ' + user.id);
        // console.log('msg member: ' + msg.member.id);
        let messageSent = false;
        let sentMessage;
        if (user && !skipDM) {
            try {
                if (urlToLinkBank) {
                    let goBackMessage = '[Go Back To Message]';
                    // ensure that if this embed was 'reused', that we don't add the gobackmessage repeatedly
                    let lastFieldValue = embedsArray[embedsArray.length - 1].fields[embedsArray[embedsArray.length - 1].fields.length - 1].value;
                    // console.debug('sendDirectOrFallbackToChannelEmbeds: ', embedsArray[embedsArray.length - 1].fields);
                    if (!lastFieldValue.startsWith(goBackMessage)) {
                        // console.debug(`last field did not start with ${goBackMessage}`, embedsArray[embedsArray.length - 1].fields[embedsArray[embedsArray.length - 1].fields.length - 1]);
                        embedsArray[embedsArray.length - 1].addFields({ name: '\u200B', value: `${goBackMessage}(${urlToLinkBank})`, inline: false });
                    }
                }
                // if it's an interaction (slash command) and there is only 1 embed, then just reply with it
                if (msg.interaction && embedsArray.length == 1) {
                    for (let embed of embedsArray) {
                        clientWsReply(msg.interaction, embed);
                    }
                    // otherwise reply with the array of embeds, directly to user, and then follow up with the ws response to the interaction
                } else {
                    for (let embed of embedsArray) {
                        if (lengthOfEmbed(embed) > MAX_EMBED_SIZE) {
                            console.error(`sendDirectOrFallbackToChannelEmbeds: ${MESSAGE_TOO_LARGE_RESPONSE}`);
                            sentMessage = await user.send(MESSAGE_TOO_LARGE_RESPONSE);
                        } else {
                            sentMessage = await user.send(embed);
                        }
                    }
                }
                messageSent = true;
            } catch (error) {
                console.error('sendDirectOrFallbackToChannelEmbeds: could not DC with user, will fallback to channel send. - %s %s', error.message, error);
            }
        }
        if (!messageSent && (msg.channel || msg.interaction)) {
            try {
                if (msg.interaction && embedsArray.length == 1) {
                    for (let embed of embedsArray) {
                        clientWsReply(msg.interaction, embed);
                    }
                    // otherwise reply with the array of embeds, directly to user, and then follow up with the ws response to the interaction
                } else {
                    for (let embed of embedsArray) {
                        embed.addFields({ name: `Responding To`, value: `<@${user.id}>`, inline: false });
                        if (lengthOfEmbed(embed) > MAX_EMBED_SIZE) {
                            console.error(`sendDirectOrFallbackToChannelEmbeds: ${MESSAGE_TOO_LARGE_RESPONSE}`);
                            sentMessage = await msg.channel.send(MESSAGE_TOO_LARGE_RESPONSE);
                        } else {
                            sentMessage = await msg.channel.send(embed);
                        }
                    }
                }
                messageSent = true;
            } catch (error) {
                error.message += ': could not channel send.';
                throw error;
            }
        }
        if (messageSent && sentMessage && msg.interaction) {
            let interactionEmbed = new MessageEmbed()
                .setAuthor('DND Vault', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
                .setColor(embedsArray[embedsArray.length - 1].color ? embedsArray[embedsArray.length - 1].color : COLORS.GREEN)
                .addField('Response', `[Check your here](${sentMessage.url}) for response.`);
            clientWsReply(msg.interaction, interactionEmbed);
        }
        if (!messageSent) {
            throw new Error('No channel or DM method to send message.');
        }
    } catch (error) {
        console.error('sendDirectOrFallbackToChannelEmbeds: - %s', error.message);
    }
}

/**
 * function to send simple text content
 * @param {String} content
 * @param {Message} msg
 * @param {User} user
 */
async function sendSimpleDirectOrFallbackToChannel(content, msg, user) {
    let sentMessage;
    try {
        sentMessage = await user.send(content);
    } catch (error) {
        console.error('could not send via DC; trying channel', error);
        try {
            sentMessage = await msg.channel.send(content);
        } catch (error) {
            console.error('could not send via DC or channel', error);
        }
    }
}

/**
 * find the approximate size of an embed
 * @param {MessageEmbed} embed
 * @returns {number}
 */
function lengthOfEmbed(embed) {
    let embedLength = (embed.title ? embed.title.length : 0)
        + (embed.url ? embed.url.length : 0)
        + (embed.description ? embed.description.length : 0)
        + (embed.footer?.text ? embed.footer.text.length : 0)
        + (embed.author?.name ? embed.author.name.length : 0);
    for (let field of embed.fields) {
        // embed.fields.forEach((field) => {
        embedLength += field.name.length + field.value.length;
    }
    // console.log('lengthOfEmbed: %d', embedLength);
    return embedLength;
}

/**
 *
 * @param {Message} msg
 * @param {String} roleID
 * @returns {Role}
 */
async function retrieveRoleForID(guild, roleID) {
    // console.debug('retrieveRoleForID: %s', roleID);
    let roleForID = await guild.roles.resolve(roleID);
    // console.debug('retrieveRoleForID: name: %s ', roleForID);
    return roleForID;
}

/**
 *
 * @param {Guild} guild
 * @param {String} roleName
 * @returns {Role}
 */
async function retrieveRoleForName(guild, roleName) {
    let roleForName;
    // ensure that the guild is populated ... this sometimes can not be populated on a new server join
    // guild = await guild.fetch();
    console.log('retrieveRoleForName: about to fetch roles cache');
    await guild.roles.fetch();
    // console.log('retrieveRoleForName: roles: ', guild.roles.cache);
    for (let [key, role] of guild.roles.cache) {
        // console.log(`retrieveRoleForName: ${key}:${role.name}`);
        if (role.name == roleName || '@' + role.name == roleName) {
            roleForName = role;
        }
    }
    // console.log("found rolename: " + roleForName.id);
    return roleForName;
}

/**
 *
 * @param {Array} stringArray
 * @returns {String}
 */
function appendStringsForEmbedChanges(stringArray) {
    let fieldSize = 16;
    let separator = ' | ';
    return appendStringsForEmbed(stringArray, fieldSize, separator);
}

/**
 *
 * @param {Array} stringArray
 * @param {Integer or Array<Integers>} fieldSize
 * @param {String} separator
 * @param {Boolean} dontQuote
 * @param {String} padChar
 * @returns
 */
function appendStringsForEmbed(stringArray, fieldSize, separator, dontQuote, padChar) {
    if (!Array.isArray(fieldSize)) {
        fieldSize = [fieldSize];
    }
    let returnValue = '';
    let quote = '`';
    if (dontQuote) {
        quote = '';
    }
    let i = 0;
    stringArray.forEach((value) => {
        let fieldSizeForField = fieldSize.length > i ? fieldSize[i] : fieldSize[fieldSize.length - 1];
        // if field is a mentionable, lets not wrap it in quote
        if (value.startsWith('<')) {
            returnValue = returnValue + stringOfSize(value, fieldSizeForField, padChar) + separator;
        } else {
            returnValue = returnValue + quote + stringOfSize(value, fieldSizeForField, padChar) + quote + separator;
        }
        i++;
    })
    return returnValue.substring(0, returnValue.length - separator.length);
}

function stringOfSize(value, size, padChar, padBefore) {
    if (!padChar) {
        padChar = ' ';
    }
    value = value.substring(0, size);
    if (value.length < size) {
        if (padBefore) {
            value = padChar.repeat(size - value.length) + value;
        } else {
            value = value + padChar.repeat(size - value.length);
        }
    }
    return value;
}

function trimAndElipsiseStringArray(strArrayToTrim, totalFinalLength) {
    let elipses = '\n...';
    let buffer = elipses.length;
    totalFinalLength = totalFinalLength - buffer;
    let stringToReturn = strArrayToTrim.join('\n');
    while (stringToReturn.length >= totalFinalLength) {
        let lastIndex = stringToReturn.lastIndexOf('\n');
        if (lastIndex == -1) {
            stringToReturn = stringToReturn.substring(0, totalFinalLength - buffer) + elipses;
        } else {
            stringToReturn = stringToReturn.substring(0, lastIndex);
            if (stringToReturn.length <= totalFinalLength - buffer) {
                stringToReturn += elipses;
            }
        }
    }
    return stringToReturn;
}

/**
 * Return a url to this message
 * https://discord.com/channels/@me/795116627309232158/827549541494161419
 * https://discord.com/channels/785567026512527390/791376005935136768/827549498246561823
 * @param {String} guildId
 * @param {String} channelId
 * @param {String} messageId
 * @returns
 */
function getDiscordUrl(guildId, channelId, messageId) {
    if (!guildId) {
        guildId = '@me';
    }
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Evaluate if the value passed represents a 'true'
 * @param {} value
 * @returns
 */
function isTrue(value) {
    if (typeof (value) === 'string') {
        value = value.trim().toLowerCase();
    }
    switch (value) {
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default:
            return false;
    }
}

/**
 * ensure that the bot has proper permissions in the channel
 * @param {Message} msg
 */
async function checkChannelPermissions(msg) {
    // throw new Error(`test error`);
    //check that I have the proper permissions
    let requiredPerms = ['MANAGE_MESSAGES', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
    if (msg.interaction) {
        // interactions don't remove old messages or send messages to the channel, so can ignore those permission in this case.
        requiredPerms = ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
    }
    let botPerms = msg.channel.permissionsFor(msg.guild.me);
    // console.debug("channel perms: ", botPerms);
    // if (!await botPerms.has(requiredPerms)) {
    //     throw new Error(`Server channel (${msg.channel.name}) is missing a Required Permission (please inform a server admin to remove the bot from that channel or ensure the bot has the following permissions): ${requiredPerms}`);
    // }
    for (reqPerm of requiredPerms) {
        if (!await botPerms.has(reqPerm)) {
            throw new Error(`Server channel (${msg.channel.name}) is missing a Required Permission for the bot to function properly (please inform a server admin to remove the bot from that channel or ensure the bot has the following permission: ${reqPerm}).`);
        }
    }
    // debug info below for permissions debugging in a channel
    // for (let [permOverKey, permOver] of msg.channel.permissionOverwrites.entries()) {
    //     let permOverKeyRoleName = (await utils.retrieveRoleForID(msg.guild, permOverKey)).name;
    //     console.log(permOverKeyRoleName + ': allowed:', permOver.allow);
    //     for (allowed of await permOver.allow.toArray()) {
    //         console.log(allowed);
    //     }
    //     console.log(permOverKeyRoleName + ': denied:', permOver.deny);
    //     for (denied of permOver.deny.toArray()) {
    //         console.log(denied);
    //     }
    // }
    // for (perm of msg.guild.me.permissions) {
    //     console.log(perm);
    // }
}

/**
 * remove tags from an snowflake tag passed
 * @param {String} idToTrim
 * @returns {String}
 */
function trimTagsFromId(idToTrim) {
    if (idToTrim) {
        // idToTrim = '227562842591723521';
        const tagRegex = /^([^0-9]*)([0-9]*)([^0-9]*)$/;
        let matches = tagRegex.exec(idToTrim);
        // console.debug('matches', matches);
        if (matches.length > 2) {
            //get the second grouping, which is third in the array
            idToTrim = matches[2];
        }
    }
    return idToTrim;
}

/**
 * sending messages for websockets
 */
async function clientWsReply(interaction, replyMessage) {
    try {
        letdata = {
            content: replyMessage,
        }
        //check for embeds
        if (typeof replyMessage === 'object') {
            if (lengthOfEmbed(replyMessage) > MAX_EMBED_SIZE) {
                console.error(`clientWsReply: ${MESSAGE_TOO_LARGE_RESPONSE}`);
                data = {
                    content: MESSAGE_TOO_LARGE_RESPONSE
                }
            } else {
                data = await createAPIMessage(interaction, replyMessage);
            }
        }
        await client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: data
            }
        });
    } catch (error) {
        console.error('Caught error while trying to send WsReply', error);
    }
}

/**
 * Create APIMessage for interaction embeds
 * @param {*} interaction
 * @param {*} content
 * @returns
 */
async function createAPIMessage(interaction, content) {
    const channel = await client.channels.fetch(interaction.channel_id);
    if (channel) {
        const { data, files } = await APIMessage.create(channel, content).resolveData().resolveFiles();
        return { ...data, files };
    } else {
        console.error(`interaction`, interaction);
        throw new Error(`channel did not resolve for interaction.channel_id: ${interaction.channel_id}`);
    }

}

/**
 * remove all data for a guild
 * @param {Guild} guild
 */
async function removeAllDataForGuild(guild) {
    // console.info(`removeAllDataForGuild: ${guild.id}(${guild.name})`);
    let charsDeleted = await CharModel.deleteMany({ guildID: guild.id });
    let usersDeleted = await UserModel.deleteMany({ guildID: guild.id });
    let eventsDeleted = await EventModel.deleteMany({ guildID: guild.id });
    let configDeleted = await GuildModel.deleteMany({ guildID: guild.id });
    GuildCache.del(guild.id);
    console.info(`removeAllDataForGuild: ${guild.id}(${guild.name}): chars: ${charsDeleted.deletedCount} users: ${usersDeleted.deletedCount} events: ${eventsDeleted.deletedCount} config: ${configDeleted.deletedCount}`);
}

/**
 * Check if discord commands have changed
 * @param {Object} registeredCommands
 * @param {Object} commandsToRegister
 * @param {Boolean} stopAfterThis used for recursive call
 * @returns {Boolean} true if changed; false if no change
 */
function checkIfCommandsChanged(registeredCommands, commandsToRegister, stopAfterThis) {
    console.info(`checkIfCommandsChanged: ---START COMMAND CHECK---`);
    let registerCommands = false;
    for (const command of registeredCommands) {
        // console.debug("registerCommands: checkForRemove", command.name);
        if (!commandsToRegister.find(c => {
            // console.debug(c.name);
            if (c.name == command.name) {
                // console.debug('command options', command.options);
                if (!c.options && !command.options) {
                    //no options for either, it's a match
                    console.info(`checkIfCommandsChanged: MATCH ${c.name} -> option:NO OPTIONS`);
                    return true;
                } else {
                    for (const regOpt of command.options) {
                        let optMatched = false;
                        for (const toRegOpt of c.options) {
                            if (regOpt.name.toLowerCase() == toRegOpt.name.toLowerCase() && isTrue(regOpt.required) == isTrue(toRegOpt.required)) {
                                console.info(`checkIfCommandsChanged: MATCH ${c.name} -> option:${regOpt.name}:${toRegOpt.name} and req:${regOpt.required}:${toRegOpt.required}`);
                                optMatched = true;
                                break;
                            }
                        }
                        if (!optMatched) {
                            //option could not be found, not a match
                            console.info(`checkIfCommandsChanged: *NO* MATCH ${c.name} -> option:${regOpt.name} and req:${regOpt.required}`);
                            return false;
                        }
                    }
                }
                //didn't fail to find any options, it's a match
                return true;
            }
            // failed to find command name match, it's not a match
            return false;
        })) {
            //couldn't find a complete command and options that matched, register all again
            registerCommands = true;
            break;
        }
    }
    // recursively call the other way around
    if (!registerCommands && !stopAfterThis) {
        console.info(`checkIfCommandsChanged: ---START RECURSE---`);
        registerCommands = checkIfCommandsChanged(commandsToRegister, registeredCommands, !stopAfterThis);
    }
    return registerCommands;
}

function transformCommandsToDiscordFormat(commandsToTransform) {
    let commandsToRegister = [];
    for (let [commandKey, commandValue] of Object.entries(commandsToTransform)) {
        if (commandValue.slash) {
            commandsToRegister.push(
                commandValue
            );
        }
    }
    return commandsToRegister;
}

function strikeThrough(text) {
    return text
        .split('')
        .map(char => char + '\u0336')
        .join('')
}

exports.stringOfSize = stringOfSize;
exports.sendDirectOrFallbackToChannel = sendDirectOrFallbackToChannel;
exports.sendDirectOrFallbackToChannelEmbeds = sendDirectOrFallbackToChannelEmbeds;
exports.sendDirectOrFallbackToChannelError = sendDirectOrFallbackToChannelError;
exports.sendSimpleDirectOrFallbackToChannel = sendSimpleDirectOrFallbackToChannel;
exports.lengthOfEmbed = lengthOfEmbed;
exports.retrieveRoleForID = retrieveRoleForID;
exports.retrieveRoleForName = retrieveRoleForName;
exports.appendStringsForEmbed = appendStringsForEmbed;
exports.appendStringsForEmbedChanges = appendStringsForEmbedChanges;
exports.trimAndElipsiseStringArray = trimAndElipsiseStringArray;
exports.checkChannelPermissions = checkChannelPermissions;
exports.isTrue = isTrue;
exports.getDiscordUrl = getDiscordUrl;
exports.clientWsReply = clientWsReply;
exports.COLORS = COLORS;
exports.EMOJIS = EMOJIS;
exports.removeAllDataForGuild = removeAllDataForGuild;
exports.trimTagsFromId = trimTagsFromId;
exports.checkIfCommandsChanged = checkIfCommandsChanged;
exports.transformCommandsToDiscordFormat = transformCommandsToDiscordFormat;
exports.strikeThrough = strikeThrough;
