const { DiceRoll } = require('rpg-dice-roller');
const { MessageEmbed } = require('discord.js');
const utils = require('../utils/utils.js');

/**
 *
 * @param {Message} msg
 * @param {Array} diceParam
 */
async function handleDiceRoll(msg, diceParam) {
    try {
        const rollit = new DiceRoll(diceParam.map(element => element.value).join(' '));
        let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2);
        let embedFields = [];
        // ensure that if the result is larger than 1000 chars we split it up in different discord embed fields
        for (let i = 0; i < rollitValut.length; i += 1000) {
            const cont = rollitValut.substring(i, Math.min(rollitValut.length, i + 1000));
            embedFields.push({ name: `${utils.EMOJIS.DICE}${rollit.notation}${utils.EMOJIS.DICE}`, value: `${cont}` });
        }
        await utils.sendDirectOrFallbackToChannel(embedFields, msg, undefined, true);
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        console.error('handleDiceRoll:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 *
 * @param {Message} msg
 * @param {Array} diceParam
 */
async function handleDiceRollStats(msg, diceParam) {
    try {
        const statsEmbed = new MessageEmbed()
            .setColor(utils.COLORS.BLUE)
            .setTitle(`${utils.EMOJIS.DICE}D&D 5E Stats Roll${utils.EMOJIS.DICE}`)
            .setAuthor('DND Vault', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
            .setThumbnail(msg.guild.iconURL());
        for (let j = 0; j < 6; j++) {
            const rollit = new DiceRoll('4d6dl1sd');
            let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2);
            statsEmbed.addFields({ name: `Stat ${j + 1}`, value: `${rollitValut}` });
        }
        await utils.sendDirectOrFallbackToChannelEmbeds(statsEmbed, msg, undefined, true);
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        console.error('handleDiceRollStats:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;
exports.handleDiceRollStats = handleDiceRollStats;
