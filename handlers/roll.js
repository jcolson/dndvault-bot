const rpgdiceroller = import('rpg-dice-roller');
const { MessageEmbed } = require('discord.js');
const utils = require('../utils/utils.js');

/**
 *
 * @param {Message} msg
 * @param {Array} diceParam
 */
async function handleDiceRoll(msg, diceParam, guildConfig) {
    try {
        if (!guildConfig.rollsEnabled) {
            await utils.sendDirectOrFallbackToChannelError(new Error('Rolls Disabled for this Server'), msg, undefined, false);
            await utils.deleteMessage(msg);
        } else {
            let rollType = diceParam.find(p => p.name == 'roll_type')?.value;
            let notation = diceParam.find(p => p.name == 'notation')?.value;
            if (!notation && !rollType) {
                // handle old school commands still
                notation = diceParam[0]?.value.trim();
                rollType = diceParam.slice(1).map(element => element.value).join(' ').trim();
            }
            if (!notation) {
                notation = '1d20';
            }
            const DiceRoll = (await rpgdiceroller).DiceRoll;
            const rollit = new DiceRoll(notation);
            // console.debug(`handleDiceRoll: ${rollit.output}`);
            let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2, rollit.output.lastIndexOf(' = '));
            let diceRollEmbedArray = embedsForDiceRoll(rollit.notation, rollitValut, rollit.total, rollType);
            await utils.sendDirectOrFallbackToChannelEmbeds(diceRollEmbedArray, msg, undefined, true);
            await utils.deleteMessage(msg);
        }
    } catch (error) {
        console.error(`handleDiceRoll: ${error.message}`);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 *
 * @param {String} notation
 * @param {String} rollitValut
 * @param {Number} total
 * @param {String} rollType
 * @returns {MessageEmbed[]}
 */
function embedsForDiceRoll(notation, rollitValut, total, rollType) {
    const EMBED_FIELD_MAX = 1000;
    const FIELDS_PER_EMBED = 4;
    let diceRollEmbedArray = [];
    let embedFields = [];
    let title = (rollType ? rollType + ' - ' : '') + notation;
    let fieldName = utils.EMOJIS.DICE + title.substring(0, 256 - utils.EMOJIS.DICE.length - utils.EMOJIS.DICE.length) + utils.EMOJIS.DICE;
    // ensure that if the result is larger than 1000 chars we split it up in different discord embed fields
    for (let i = 0; i < rollitValut.length; i += EMBED_FIELD_MAX) {
        const cont = rollitValut.substring(i, Math.min(rollitValut.length, i + EMBED_FIELD_MAX));
        embedFields.push({ name: fieldName, value: `\`${cont}\`` });
        fieldName = utils.EMPTY_FIELD;
        // console.debug(`embedsForDiceRoll: i: ${i} length: ${rollitValut.length}`);
        if (embedFields.length >= FIELDS_PER_EMBED || i + EMBED_FIELD_MAX > rollitValut.length) {
            diceRollEmbedArray.push(new MessageEmbed()
                .setColor(utils.COLORS.GREEN)
                .addFields(embedFields)
            );
            embedFields = [];
        }
    }
    if (diceRollEmbedArray.length > 2) {
        let continuationEmbed = new MessageEmbed()
            .setColor(utils.COLORS.RED)
            .addFields({ name: fieldName, value: `\`... sooooo many dice! ...\`` });
        diceRollEmbedArray.splice(1, diceRollEmbedArray.length - 2, continuationEmbed);
    }
    diceRollEmbedArray[diceRollEmbedArray.length - 1].addFields({ name: 'Total', value: `\`${total}\`` });
    return diceRollEmbedArray;
}

/**
 *
 * @param {Message} msg
 */
async function handleDiceRollStats(msg, diceParam, guildConfig) {
    try {
        if (!guildConfig.rollsEnabled) {
            await utils.sendDirectOrFallbackToChannelError(new Error('Rolls Disabled for this Server'), msg, undefined, false);
            await utils.deleteMessage(msg);
        } else {
            let statRollNotation = '4d6dl1sd';
            let rerollOnes = diceParam.find(p => p.name == 'reroll_ones')?.value;
            if (rerollOnes) {
                statRollNotation = '4d6rdl1sd';
            }
            const statsEmbed = new MessageEmbed()
                .setColor(utils.COLORS.GREEN)
                .setTitle(`${utils.EMOJIS.DICE}D&D 5E Stats Roll${utils.EMOJIS.DICE}`)
                .setAuthor({ name: 'D&D Vault', iconURL: Config.dndVaultIcon, url: `${Config.httpServerURL}/?guildID=${msg.guild?.id}` })
                .setThumbnail(msg.guild?.iconURL());
            let statRollString = '';
            let total = 0;
            const DiceRoll = (await rpgdiceroller).DiceRoll;
            for (let j = 0; j < 6; j++) {
                const rollit = new DiceRoll(statRollNotation);
                let rollitValue = rollit.output.substring(rollit.output.lastIndexOf(': ') + 2);
                total += rollit.total;
                statRollString += `Stat ${j + 1}: \`${rollitValue}\`\n`;
            }
            statsEmbed.addFields({ name: 'Stats Roll', value: statRollString });
            statsEmbed.addFields({ name: 'Total', value: `\`${total}\`` });
            await utils.sendDirectOrFallbackToChannelEmbeds([statsEmbed], msg, undefined, true);
            await utils.deleteMessage(msg);
        }
    } catch (error) {
        console.error('handleDiceRollStats:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;
exports.handleDiceRollStats = handleDiceRollStats;

exports.testables = {
    handleDiceRoll: handleDiceRoll,
    handleDiceRollStats: handleDiceRollStats
}