const { MessageEmbed } = require("discord.js");

/**
 * 
 * @param {Message} msg 
 */
function getLinkForMessage(msg) {
    if (!msg.guild) {
        return undefined;
    }
    return `https://discordapp.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id}`;
}

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
    embed.addFields({ name: `Error`, value: `<@${msg.member.id}> - ${error.message}` });
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
        let linkForMessage = getLinkForMessage(msg);
        if (linkForMessage) {
            embedsArray[embedsArray.length - 1].addFields({ name: '\u200B', value: `[Go Back To Message](${linkForMessage})`, inline: false });
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
        if (!messageSent) {
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
    let roles = await guild.roles.fetch();
    // console.log('roles', roles);
    for (let role of roles.array()) {
        // roles.array().forEach((role) => {
        // console.log("role: " + role.name + ' : ' + roleName);
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

function isTrue(value){
    if (typeof(value) === 'string'){
        value = value.trim().toLowerCase();
    }
    switch(value){
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

exports.stringOfSize = stringOfSize;
exports.getLinkForMessage = getLinkForMessage;
exports.sendDirectOrFallbackToChannel = sendDirectOrFallbackToChannel;
exports.sendDirectOrFallbackToChannelEmbeds = sendDirectOrFallbackToChannelEmbeds;
exports.sendDirectOrFallbackToChannelError = sendDirectOrFallbackToChannelError;
exports.lengthOfEmbed = lengthOfEmbed;
exports.retrieveRoleForID = retrieveRoleForID;
exports.retrieveRoleIdForName = retrieveRoleIdForName;
exports.appendStringsForEmbed = appendStringsForEmbed;
exports.appendStringsForEmbedChanges = appendStringsForEmbedChanges;
exports.isTrue = isTrue;
