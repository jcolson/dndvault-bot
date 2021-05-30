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
        let notation = diceParam.map(element => element.value).join(' ').trim();
        if (notation == '') {
            notation = '1d20';
        }
        const rollit = new DiceRoll(notation);
        let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2);
        let diceRollEmbedArray = embedsForDiceRoll(rollit.notation, rollitValut);
        await utils.sendDirectOrFallbackToChannelEmbeds(diceRollEmbedArray, msg, undefined, true);
        utils.deleteMessage(msg);
    } catch (error) {
        console.error(`handleDiceRoll: ${error.message}`);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 *
 * @param {String} notation
 * @param {String} rollitValut
 * @returns {MessageEmbed[]}
 */
function embedsForDiceRoll(notation, rollitValut) {
    const EMBED_FIELD_MAX = 1000;
    const FIELDS_PER_EMBED = 4;
    let diceRollEmbedArray = [];
    let embedFields = [];
    // ensure that if the result is larger than 1000 chars we split it up in different discord embed fields
    for (let i = 0; i < rollitValut.length; i += EMBED_FIELD_MAX) {
        const cont = rollitValut.substring(i, Math.min(rollitValut.length, i + EMBED_FIELD_MAX));
        embedFields.push({ name: `${utils.EMOJIS.DICE}${notation.substring(0, 253)}${utils.EMOJIS.DICE}`, value: `${cont}` });
        // console.debug(`embedsForDiceRoll: i: ${i} length: ${rollitValut.length}`);
        if (embedFields.length >= FIELDS_PER_EMBED || i + EMBED_FIELD_MAX > rollitValut.length) {
            diceRollEmbedArray.push(new MessageEmbed()
                .setColor(utils.COLORS.GREEN)
                .addFields(embedFields)
            );
            embedFields = [];
        }
    }
    return diceRollEmbedArray;
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
            .setAuthor('D&D Vault', Config.dndVaultIcon, `${Config.httpServerURL}/?guildID=${msg.guild?.id}`)
            .setThumbnail(msg.guild.iconURL());
        for (let j = 0; j < 6; j++) {
            const rollit = new DiceRoll('4d6dl1sd');
            let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2);
            statsEmbed.addFields({ name: `Stat ${j + 1}`, value: `${rollitValut}` });
        }
        await utils.sendDirectOrFallbackToChannelEmbeds(statsEmbed, msg, undefined, true);
        utils.deleteMessage(msg);
    } catch (error) {
        console.error('handleDiceRollStats:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;
exports.handleDiceRollStats = handleDiceRollStats;
