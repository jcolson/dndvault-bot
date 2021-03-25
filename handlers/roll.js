const { DiceRoll } = require('rpg-dice-roller');
const utils = require('../utils/utils.js');

async function handleDiceRoll(msg, guildConfig) {
    try {
        let diceParam = msg.content.substring((guildConfig.prefix + 'roll').length + 1);
        const rollit = new DiceRoll(diceParam);
        // console.debug(`JSON:`, rollit.toJSON());
        // console.debug(`Index of ${rollit.notation} in ${rollit.output} is ${rollit.output.lastIndexOf(':')}`);
        let rollitValut = rollit.output.substring(rollit.output.lastIndexOf(': ')+2);
        let embedFields = [];
        for (let i = 0; i < rollitValut.length; i += 1000) {
            const cont = rollitValut.substring(i, Math.min(rollitValut.length, i + 1000));
            embedFields.push({ name: `🎲${rollit.notation}🎲`, value: `${cont}` });
        }
        await utils.sendDirectOrFallbackToChannel(embedFields, msg, undefined, true);
        await msg.delete();

    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;