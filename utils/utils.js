const { MessageEmbed } = require("discord.js");

/**
 * 
 * @param {EmbedFieldData[]} fields 
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM 
 */
async function sendDirectOrFallbackToChannelError(error, msg, user, skipDM) {
    let embed = new MessageEmbed()
        .setColor('#0099ff');
    embed.addFields({ name: `Error`, value: `<@${user ? user.id : msg.member ? msg.member.id : 'unknown user'}> - ${error.message}` });
    return sendDirectOrFallbackToChannelEmbeds([embed], msg, user, skipDM);
}

/**
 * 
 * @param {EmbedFieldData[]} fields 
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM 
 */
async function sendDirectOrFallbackToChannel(fields, msg, user, skipDM) {
    if (!Array.isArray(fields)) {
        fields = [fields];
    }
    let embed = new MessageEmbed()
        .setColor('#0099ff');
    for (let field of fields) {
        field.name = typeof field.name !== 'undefined' && '' + field.name != '' ? field.name : 'UNSET';
        field.value = typeof field.value !== 'undefined' && '' + field.value != '' ? field.value : 'UNSET';
    }
    embed.addFields(fields);
    return sendDirectOrFallbackToChannelEmbeds([embed], msg, user, skipDM);
}

/**
 * 
 * @param {MessageEmbed[]} embedsArray 
 * @param {Message} msg will be used to determine link back, as well as user if user is not passed
 * @param {User} user will be used to DM
 * @param {Boolean} skipDM 
 */
async function sendDirectOrFallbackToChannelEmbeds(embedsArray, msg, user, skipDM) {
    try {
        if (!Array.isArray(embedsArray)) {
            embedsArray = [embedsArray];
        }
        if (embedsArray.length < 1) {
            throw new Error('No embeds passed to send');
        }
        if (!user && msg) {
            user = msg.author;
        } else if (!user) {
            console.error('sendDirectOrFallbackToChannelEmbeds: no valid message or user was passed to be able to respond.');
            throw new Error('no valid message or user was passed to be able to respond.');
        }
        // console.log('user: ' + user.id);
        // console.log('msg member: ' + msg.member.id);
        if (msg.url) {
            let goBackMessage = '[Go Back To Message]';
            // ensure that if this embed was 'reused', that we don't add the gobackmessage repeatedly
            let lastFieldValue = embedsArray[embedsArray.length - 1].fields[embedsArray[embedsArray.length - 1].fields.length - 1].value;
            if (!lastFieldValue.startsWith(goBackMessage)) {
                embedsArray[embedsArray.length - 1].addFields({ name: '\u200B', value: `${goBackMessage}(${msg.url})`, inline: false });
            }
        }
        let messageSent = false;
        if (user && !skipDM) {
            try {
                for (let embed of embedsArray) {
                    await user.send(embed);
                }
                messageSent = true;
            } catch (error) {
                console.error('sendDirectOrFallbackToChannelEmbeds: could not DC with user, will fallback to channel send. - %s %s', error.message, error);
            }
        }
        if (!messageSent && msg.channel) {
            try {
                for (let embed of embedsArray) {
                    await msg.channel.send(embed);
                }
            } catch (error) {
                console.error('sendDirectOrFallbackToChannelEmbeds: could not channel send. - %s', error.message);
                throw error;
            }
        }
    } catch (error) {
        console.error('sendDirectOrFallbackToChannelEmbeds: - %s', error.message);
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
        + (embed.footer && embed.footer.text ? embed.footer.text.length : 0)
        + (embed.author && embed.author.name ? embed.author.name.length : 0);
    for (let field of embed.fields) {
        // embed.fields.forEach((field) => {
        embedLength += field.name.length + field.value.length;
    }
    console.log('EmbedLengthCheck: %d', embedLength);
    return embedLength;
}

/**
 * 
 * @param {Message} msg 
 * @param {String} roleID 
 * @returns {Role}
 */
async function retrieveRoleForID(guild, roleID) {
    // console.log('retrieveRoleID: %s', roleID);
    let roleForID = await guild.roles.resolve(roleID);
    // console.log('retrieveRoleID, name: %s ', roleForID.name);
    return roleForID;
}

/**
 * 
 * @param {Guild} guild 
 * @param {String} roleName 
 * @returns {Role}
 */
async function retrieveRoleIdForName(guild, roleName) {
    let roleForName;
    // ensure that the guild is populated ... this sometimes can not be populated on a new server join
    // guild = await guild.fetch();
    console.log('retrieveRoleIdForName: about to fetch roles cache');
    await guild.roles.fetch();
    // console.log('retrieveRoleIdForName: roles: ', guild.roles.cache);
    for (let [key, role] of guild.roles.cache) {
        // console.log(`retrieveRoleIdForName: ${key}:${role.name}`);
        if (role.name == roleName || '@' + role.name == roleName) {
            roleForName = role;
        }
    }
    // console.log("found rolename: " + roleForName.id);
    return roleForName.id;
}

function appendStringsForEmbedChanges(stringArray) {
    let fieldSize = 16;
    let separator = ' | ';
    return appendStringsForEmbed(stringArray, fieldSize, separator);
}

function appendStringsForEmbed(stringArray, fieldSize, separator, dontQuote, padChar) {
    let returnValue = '';
    let quote = '`';
    if (dontQuote) {
        quote = '';
    }
    stringArray.forEach((value) => {
        returnValue = returnValue + quote + stringOfSize(value, fieldSize, padChar) + quote + separator;
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
    //check that I have the proper permissions
    let requiredPerms = ['MANAGE_MESSAGES', 'SEND_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
    let botPerms = msg.channel.permissionsFor(msg.guild.me);
    // if (!await botPerms.has(requiredPerms)) {
    //     throw new Error(`Server channel (${msg.channel.name}) is missing a Required Permission (please inform a server admin to remove the bot from that channel or ensure the bot has the following permissions): ${requiredPerms}`);
    // }
    for (reqPerm of requiredPerms) {
        if (!await botPerms.has(reqPerm)) {
            throw new Error(`Server channel (${msg.channel.name}) is missing a Required Permission (please inform a server admin to remove the bot from that channel or ensure the bot has the following permission: ${reqPerm}`);
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

exports.stringOfSize = stringOfSize;
exports.sendDirectOrFallbackToChannel = sendDirectOrFallbackToChannel;
exports.sendDirectOrFallbackToChannelEmbeds = sendDirectOrFallbackToChannelEmbeds;
exports.sendDirectOrFallbackToChannelError = sendDirectOrFallbackToChannelError;
exports.lengthOfEmbed = lengthOfEmbed;
exports.retrieveRoleForID = retrieveRoleForID;
exports.retrieveRoleIdForName = retrieveRoleIdForName;
exports.appendStringsForEmbed = appendStringsForEmbed;
exports.appendStringsForEmbedChanges = appendStringsForEmbedChanges;
exports.checkChannelPermissions = checkChannelPermissions;
exports.isTrue = isTrue;
