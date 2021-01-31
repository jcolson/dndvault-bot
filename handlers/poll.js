const utils = require('../utils/utils.js');
const { MessageEmbed } = require('discord.js');

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handlePoll(msg, guildConfig) {
    try {
        let params = msg.content.substring((guildConfig.prefix + 'poll').length + 1);
        let thePoll = parseMessageForPoll(params);
        let sentMessage = await msg.channel.send(embedForPoll(msg, thePoll));
        for (let i = 0; i < thePoll.choices.length; i++) {
            await sentMessage.react(thePoll.emojis[i]);
        }
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function embedForPoll(msg, thePoll) {
    let pollEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`${thePoll.question}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('Pollster', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    for (let i = 0; i < thePoll.choices.length; i++) {
        pollEmbed.addFields({ name: thePoll.emojis[i], value: thePoll.choices[i] });
    }
    return pollEmbed;
}

function parseMessageForPoll(params) {
    var pollRegex = /[^\s"]+|"([^"]*)"/gi;
    var pollParams = [];
    do {
        //Each call to exec returns the next regex match as an array
        var match = pollRegex.exec(params);
        if (match != null) {
            //Index 1 in the array is the captured group if it exists
            //Index 0 is the matched text, which we use if no captured group exists
            pollParams.push(match[1] ? match[1] : match[0]);
        }
    } while (match != null);
    if (pollParams.length > 11) {
        throw new Error('Too many choices, please reduce to 10 or fewer');
    }
    let thePoll = {};
    if (pollParams.length > 0) {
        thePoll.question = pollParams[0];
        if (pollParams.length > 1) {
            thePoll.choices = pollParams.slice(1);
            thePoll.emojis = [`\u0030\uFE0F\u20E3`, `\u0031\uFE0F\u20E3`, `\u0032\uFE0F\u20E3`, `\u0033\uFE0F\u20E3`,
                `\u0034\uFE0F\u20E3`, `\u0035\uFE0F\u20E3`, `\u0036\uFE0F\u20E3`, `\u0037\uFE0F\u20E3`, `\u0038\uFE0F\u20E3`,
                `\u0039\uFE0F\u20E3`];
        } else {
            thePoll.choices = ['Yes', 'No', 'Maybe'];
            thePoll.emojis = [`\u1F44d`, `\u1F44e`, `\u1F937`];
        }
    }

    return thePoll;
}

async function handleReactionAdd(reaction, user, guildConfig) {
    try {
        console.log('handleReactionAdd...' + reaction.emoji.name);
        for (aReaction of reaction.message.reactions.cache.values()) {
            // console.log('reaction name ' + aReaction.emoji.name);
            if (aReaction.emoji.name != reaction.emoji.name) {
                // console.log('reaction didnot match areaction ' + aReaction.emoji.name);
                // for (aUser of await aReaction.users.fetch()) {
                    // console.log('user: ',aUser);
                    // if (aUser.id = user.id) {
                        // console.log("removing ... ");
                        await aReaction.users.remove(user);
                    // }
                // }
            }
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
    }
}

exports.handlePoll = handlePoll;
exports.handleReactionAdd = handleReactionAdd;
