const { DiceRoll } = require('rpg-dice-roller');
const utils = require('../utils/utils.js');

async function handleDiceRoll(msg, guildConfig) {
    try {
        let diceParam = msg.content.substring((guildConfig.prefix + 'roll').length + 1);
        const rollit = new DiceRoll(diceParam);
        // console.debug(`JSON:`, rollit.toJSON());
        // console.debug(`Index of ${rollit.notation} in ${rollit.output} is ${rollit.output.lastIndexOf(':')}`);
        await utils.sendDirectOrFallbackToChannel({ name: `🎲${rollit.notation}🎲`, value: `${rollit.output.substr(rollit.output.lastIndexOf(': ')+2)}` }, msg, undefined, true);
        await msg.delete();

    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleDiceRoll = handleDiceRoll;