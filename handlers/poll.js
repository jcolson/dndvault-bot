const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const { MessageEmbed, User } = require('discord.js');

const POLLSTER_AUTHOR = 'Pollster';
const POLLSTER_MULTIPLE_ALLOWED = ' (Multiple answers allowed)';
const POLLSTER_AUTHOR_FIELD_NAME = 'Author';

/**
 *
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handlePoll(msg, msgParms, guildConfig) {
    let pollChannel = msg.channel;
    try {
        let allowMultiple = msgParms.find(p => p.name == 'allow_multiple');
        if (allowMultiple !== null && allowMultiple !== undefined) {
            // msgparms is not mutable, create a copy
            msgParms = msgParms.slice();
            // console.debug(`handlePoll: `, msgParms);
            // second element removed (allow_multiple), so that this works with the old ! commands
            msgParms.splice(1, 1);
        }
        allowMultiple = utils.isTrue(allowMultiple?.value);
        let thePoll = parseMessageForPoll(msgParms);
        if (guildConfig.channelForPolls) {
            pollChannel = await msg.guild.channels.resolve(guildConfig.channelForPolls);
        }
        // let rows = utils.getButtonsForEmojis(thePoll.choices.length, thePoll.emojis, true);
        let sentMessage = await pollChannel.send({ embeds: [embedForPoll(msg, thePoll, allowMultiple)] });
        // let sentMessage = await pollChannel.send({ embeds: [embedForPoll(msg, thePoll, allowMultiple)], components: rows });
        for (let i = 0; i < thePoll.choices.length; i++) {
            sentMessage.react(thePoll.emojis[i]);
        }
        sentMessage.react(utils.EMOJIS.TRASH);
        await utils.sendDirectOrFallbackToChannel({ name: `${utils.EMOJIS.DAGGER} Poll Create ${utils.EMOJIS.SHIELD}`, value: `<@${msg.author.id}> - created poll successfully.`, inline: true }, msg, undefined, undefined, sentMessage.url);
        await utils.deleteMessage(msg);
    } catch (error) {
        error.message += ` For Channel: ${pollChannel?.name}`;
        console.error('handlePoll:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function embedForPoll(msg, thePoll, allowMultiple) {
    let title = `${thePoll.question ? thePoll.question : ''}${allowMultiple ? POLLSTER_MULTIPLE_ALLOWED : ''}`;
    // console.debug(`embedForPoll: ${title} // ${thePoll.question} // ${allowMultiple}`);
    let pollQuestion;
    if (title.length > 255) {
        if (allowMultiple) {
            title = `Poll${allowMultiple ? POLLSTER_MULTIPLE_ALLOWED : ''}`;
        } else {
            title = `Poll`;
        }
        pollQuestion = thePoll.question.substring(0, 1023);
    }
    let pollEmbed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setAuthor({ name: POLLSTER_AUTHOR, iconURL: Config.dndVaultIcon, url: `${Config.httpServerURL}/?guildID=${msg.guild?.id}` })
        .setThumbnail(msg.guild.iconURL());
    if (title) {
        pollEmbed.setTitle(title);
    }
    if (pollQuestion) {
        pollEmbed.addFields({ name: 'Question', value: pollQuestion });
    }
    let description = '';
    for (let i = 0; i < thePoll.choices.length; i++) {
        description += `${thePoll.emojis[i]} - ${thePoll.choices[i]}\n`;
    }
    // pollEmbed.setDescription(description);
    pollEmbed.addFields({ name: 'Options', value: description });
    pollEmbed.addFields({ name: POLLSTER_AUTHOR_FIELD_NAME, value: `<@${msg.author.id}>` });
    return pollEmbed;
}

function parseMessageForPoll(pollParams) {
    if (pollParams.length > 11) {
        throw new Error('Too many choices, please reduce to 10 or fewer');
    }
    // console.debug(`parseMessageForPoll:`, pollParams);
    let thePoll = {};
    if (pollParams.length > 0) {
        thePoll.question = pollParams[0].value;
        // console.debug(`parseMessageForPoll: ${thePoll.question}`)
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
        console.log('handleReactionAdd...' + reaction.emoji?.name);
        let pollAuthor;
        for (let field of reaction.message.embeds[0].fields) {
            if (field.name == POLLSTER_AUTHOR_FIELD_NAME) {
                // use utils method for this
                pollAuthor = field.value.substring(2, field.value.length - 1);
            }
        }
        let memberUser = await reaction.message.guild.members.resolve(user.id);
        // handle trashbin (delete poll)
        if (reaction.emoji.name == utils.EMOJIS.TRASH) {
            if (user.id == pollAuthor || await users.hasRoleOrIsAdmin(memberUser, guildConfig.arole)) {
                // if (false) {
                await reaction.users.remove(user.id);
                if (reaction.message.embeds.length > 0) {
                    reaction.message.embeds[0].setTitle(`Removed: ${reaction.message.embeds[0].title}`);
                    let resultsString = ``;
                    for (let aReaction of reaction.message.reactions.cache.values()) {
                        if (aReaction.emoji.name != utils.EMOJIS.TRASH) {
                            resultsString += `${aReaction.emoji.name}:${aReaction.count}\n`;
                        }
                    }
                    if (resultsString === ``) {
                        resultsString = "N/A";
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
            // console.debug(`handleReactionAdd: ${reaction.message.embeds[0].title}`);
            // if this is a multiple answer allowed poll, don't remove previous reactions
            let multAnswer = reaction.message.embeds[0].title && reaction.message.embeds[0].title.endsWith(POLLSTER_MULTIPLE_ALLOWED) ? true : false;
            if (reaction.message.embeds.length > 0 && !multAnswer) {
                for (let aReaction of reaction.message.reactions.cache.values()) {
                    if (aReaction.emoji.name != reaction.emoji.name) {
                        if (aReaction.users.cache.size == 0) {
                            await aReaction.users.fetch();
                        }
                        for (let [_, aUser] of aReaction.users.cache) {
                            // for (let aUser of aReaction.users.cache.array()) {
                            if (aUser.id == user.id) {
                                aReaction.users.remove(user.id);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('handleReactionAdd:', error);
        await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
    }
}

exports.handlePoll = handlePoll;
exports.handleReactionAdd = handleReactionAdd;
exports.POLLSTER_AUTHOR = POLLSTER_AUTHOR;

exports.testables = {
    handlePoll: handlePoll,
    handleReactionAdd: handleReactionAdd,
    POLLSTER_AUTHOR_FIELD_NAME: POLLSTER_AUTHOR_FIELD_NAME
}
