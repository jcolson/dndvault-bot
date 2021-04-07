const { MessageEmbed } = require('discord.js');
const utils = require('../utils/utils.js');

/**
 * return help info about bot
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {String} prefix
 */
async function handleHelp(msg, msgParms, prefix) {
    try {
        const charEmbedArray = [];
        let charEmbed = new MessageEmbed()
            .setColor(utils.COLORS.BLUE)
            .setTitle('Help for D&D Vault BOT')
            .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
            .setDescription(`Current Command Prefix is "${prefix}"
            [If you have any issues or ideas, please let us know here.](https://github.com/jcolson/dndvault-bot/issues/new)`);
        if (msg.guild) {
            charEmbed.setThumbnail(msg.guild.iconURL());
        }
        charEmbed.addFields(
            {
                name: 'HELP', value: `
We recommend that you use our slash \`/\` commands instead of the prefix commands now. Just start typing with a \`/\` and look for all the commands that are available to you in the bot. They are MUCH easier to use!

If you would like to see all commands available, [they are on the github website here](https://github.com/jcolson/dndvault-bot#commands)
`},
        );
        charEmbed.addFields(
            { name: '\u200B', value: `Add this BOT to your server. [Click here](${Config.inviteURL})` },
        );
        charEmbedArray.push(charEmbed);
        await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
        console.error(`handleHelp: ${error.message}`);
    }
}
exports.handleHelp = handleHelp;
