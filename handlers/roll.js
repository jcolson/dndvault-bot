const { DiceRoll } = require('rpg-dice-roller');
const utils = require('../utils/utils.js');

async function handleDiceRoll(msg, guildConfig) {
    try {
        let diceParam = msg.content.substring((guildConfig.prefix + 'roll').length + 1);
        const rollit = new DiceRoll(diceParam);

        await utils.sendDirectOrFallbackToChannel({ name: 'Roll Output', value: `${rollit.output}` }, msg, undefined, true);
        await msg.delete();

    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;