const { MessageReaction, MessageEmbed } = require("discord.js");

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
    let embed = new MessageEmbed()
        .setColor('#0099ff');
    for (let field of fields) {
        field.name = field.name && field.name != '' ? field.name : 'UNSET';
        field.value = field.value && field.value != '' ? field.value : 'UNSET';
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
        if (embedsArray.length < 1) {
            throw new Error('No embeds passed to send');
        }
        let memberToSend;
        if (user) {
            memberToSend = await msg.guild.members.fetch(user.id);
        } else if (msg) {
            memberToSend = msg.member;
        } else {
            console.error('sendDirectOrFallbackToChannelEmbeds: no valid reaction, message or user was passed to be able to respond.');
            throw new Error('no valid reaction, message or user was passed to be able to respond.');
        }
        // console.log('membertosend: ' + memberToSend.id);
        // console.log('msg member: ' + msg.member.id);
        let linkForMessage = getLinkForMessage(msg);
        if (linkForMessage) {
            embedsArray[embedsArray.length - 1].addFields({ name: '\u200B', value: `[Go Back To Message](${linkForMessage})`, inline: false });
        }
        let messageSent = false;
        if (memberToSend && !skipDM) {
            try {
                for (let embed of embedsArray) {
                    await memberToSend.send(embed);
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

exports.stringOfSize = stringOfSize;
exports.getLinkForMessage = getLinkForMessage;
exports.sendDirectOrFallbackToChannel = sendDirectOrFallbackToChannel;
exports.sendDirectOrFallbackToChannelEmbeds = sendDirectOrFallbackToChannelEmbeds;
exports.sendDirectOrFallbackToChannelError = sendDirectOrFallbackToChannelError;
