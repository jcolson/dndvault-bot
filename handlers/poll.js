const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const { MessageEmbed, User } = require('discord.js');

/**
 *
 * @param {Message} msg
 * @param {GuildModel} guildConfig
 */
async function handlePoll(msg, guildConfig) {
    let pollChannel = msg.channel;
    try {
        let params = msg.content.substring((guildConfig.prefix + 'poll').length + 1);
        let thePoll = parseMessageForPoll(params);
        if (guildConfig.channelForPolls) {
            pollChannel = await msg.guild.channels.resolve(guildConfig.channelForPolls);
        }
        let sentMessage = await pollChannel.send(embedForPoll(msg, thePoll));
        for (let i = 0; i < thePoll.choices.length; i++) {
            await sentMessage.react(thePoll.emojis[i]);
        }
        await sentMessage.react(`\u{1F5D1}`);
        await utils.sendDirectOrFallbackToChannel({ name: '🗡 Poll Create 🛡', value: `<@${msg.member.id}> - created poll successfully.`, inline: true }, sentMessage, msg.author);
        await msg.delete();
    } catch (error) {
        console.error('handlePoll:', error.message);
        error.message += ` For Channel: ${pollChannel.name}`;
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
    pollEmbed.addFields({ name: 'Author', value: `<@${msg.author.id}>` });
    let description = '';
    for (let i = 0; i < thePoll.choices.length; i++) {
        description += `${thePoll.emojis[i]} - ${thePoll.choices[i]}\n`;
        // pollEmbed.addFields({ name: thePoll.emojis[i], value: thePoll.choices[i] });
    }
    pollEmbed.setDescription(description);
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
            thePoll.emojis = [`\uD83D\uDC4D`, `\uD83D\uDC4E`, `\uD83E\uDD37`];
        }
    }

    return thePoll;
}

async function handleReactionAdd(reaction, user, guildConfig) {
    try {
        console.log('handleReactionAdd...' + reaction.emoji.name);
        let pollAuthor = reaction.message.embeds[0].fields[0].value;
        pollAuthor = pollAuthor.substring(2, pollAuthor.length - 1);
        // console.log('user info %s and %s', user.id, pollAuthor);
        let memberUser = await reaction.message.guild.members.resolve(user.id);
        // handle trashbin (delete poll)
        if (reaction.emoji.name == `\u{1F5D1}`) {
            if (user.id == pollAuthor || await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole)) {
                // if (false) {
                await reaction.users.remove(user.id);
                if (reaction.message.embeds.length > 0) {
                    reaction.message.embeds[0].setTitle(`Removed: ${reaction.message.embeds[0].title}`);
                    for (aReaction of reaction.message.reactions.cache.values()) {
                        reaction.message.embeds[0].addFields({ name: `${aReaction.emoji.name}`, value: `${aReaction.count}` });
                        // console.log(`${aReaction.emoji.name}:${aReaction.count}`);
                    }
                }
                try {
                    await utils.sendDirectOrFallbackToChannelEmbeds(reaction.message.embeds, reaction.message, user);
                    if (user.id != pollAuthor) {
                        let pollAuthUser = await (new User(reaction.client, { id: pollAuthor })).fetch();
                        await utils.sendDirectOrFallbackToChannelEmbeds(reaction.message.embeds, reaction.message, pollAuthUser);
                    }
                } catch (error) {
                    console.error("could not notify poll author and trashbin'er", error);
                }
                await reaction.message.delete();
            } else {
                await reaction.users.remove(user.id);
                throw new Error(`Please have <@${pollAuthor}> remove, or ask an \`approver role\` to remove.`);
            }
        } else {
            for (aReaction of reaction.message.reactions.cache.values()) {
                // console.log('reaction name ' + aReaction.emoji.name);
                if (aReaction.emoji.name != reaction.emoji.name) {
                    // console.log('reaction didnot match areaction ' + aReaction.emoji.name);
                    // console.log('cache', aReaction.users.cache.array().length);
                    if (aReaction.users.cache.array().length == 0) {
                        await aReaction.users.fetch();
                    }
                    for (aUser of aReaction.users.cache.array()) {
                        // console.log('user: ', aUser.id, user.id);
                        if (aUser.id == user.id) {
                            // console.log("removing ... ", user.id);
                            aReaction.users.remove(user.id);
                        }
                    }
                }
            }
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
    }
}

exports.handlePoll = handlePoll;
exports.handleReactionAdd = handleReactionAdd;
