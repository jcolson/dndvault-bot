const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const { MessageEmbed, User } = require('discord.js');

/**
 *
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handlePoll(msg, msgParms, guildConfig) {
    let pollChannel = msg.channel;
    try {
        // let params = msg.content.substring((guildConfig.prefix + 'poll').length + 1);
        let thePoll = parseMessageForPoll(msgParms);
        if (guildConfig.channelForPolls) {
            pollChannel = await msg.guild.channels.resolve(guildConfig.channelForPolls);
        }
        // console.debug('thePoll', thePoll);
        let sentMessage = await pollChannel.send(embedForPoll(msg, thePoll));
        // console.debug("sentMessage", sentMessage);
        for (let i = 0; i < thePoll.choices.length; i++) {
            sentMessage.react(thePoll.emojis[i]);
        }
        sentMessage.react(utils.EMOJIS.TRASH);
        await utils.sendDirectOrFallbackToChannel({ name: `${utils.EMOJIS.DAGGER} Poll Create ${utils.EMOJIS.SHIELD}`, value: `<@${msg.member.id}> - created poll successfully.`, inline: true }, msg, undefined, undefined, sentMessage.url);
        utils.deleteMessage(msg);
    } catch (error) {
        error.message += ` For Channel: ${pollChannel.name}`;
        console.error('handlePoll:', error.message);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function embedForPoll(msg, thePoll) {
    let pollEmbed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setTitle(`${thePoll.question}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('Pollster', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
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

function parseMessageForPoll(pollParams) {
    // console.debug("poll params:", pollParams);
    if (pollParams.length > 11) {
        throw new Error('Too many choices, please reduce to 10 or fewer');
    }
    let thePoll = {};
    if (pollParams.length > 0) {
        thePoll.question = pollParams[0].value;
        if (pollParams.length > 1) {
            thePoll.choices = pollParams.slice(1).map(entity => entity.value);
            thePoll.emojis = [utils.EMOJIS.ONE, utils.EMOJIS.TWO, utils.EMOJIS.THREE,
            utils.EMOJIS.FOUR, utils.EMOJIS.FIVE, utils.EMOJIS.SIX, utils.EMOJIS.SEVEN,
            utils.EMOJIS.EIGHT, utils.EMOJIS.NINE, utils.EMOJIS.TEN];
        } else {
            thePoll.choices = ['Yes', 'No', 'Maybe'];
            thePoll.emojis = [utils.EMOJIS.YES, utils.EMOJIS.NO, utils.EMOJIS.MAYBE];
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
        if (reaction.emoji.name == utils.EMOJIS.TRASH) {
            if (user.id == pollAuthor || await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole)) {
                // if (false) {
                await reaction.users.remove(user.id);
                if (reaction.message.embeds.length > 0) {
                    reaction.message.embeds[0].setTitle(`Removed: ${reaction.message.embeds[0].title}`);
                    let resultsString = ``;
                    for (aReaction of reaction.message.reactions.cache.values()) {
                        if (aReaction.emoji.name != utils.EMOJIS.TRASH) {
                            resultsString += `${aReaction.emoji.name}:${aReaction.count}\n`;
                        }
                    }
                    reaction.message.embeds[0].addFields({ name: `Poll Results`, value: `${resultsString}` });
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
