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
            .setAuthor({ name: 'D&D Vault', iconURL: Config.dndVaultIcon, url: `${Config.httpServerURL}/?guildID=${msg.guild?.id}` })
            .setDescription(`Current Command Prefix is "${prefix}"
            [If you have any issues or ideas, please let us know here.](https://github.com/jcolson/dndvault-bot/issues/new)`);
        if (msg.guild) {
            charEmbed.setThumbnail(msg.guild.iconURL());
        }
        charEmbed.addFields(
            {
                name: 'HELP', value: `
We recommend that you use our slash \`/\` commands instead of the old prefix commands (such as \`${prefix}help\`) now. Just start typing with a \`/\` and look for all the commands that are available to you in the bot. They are MUCH easier to use!

If you would like to see all commands available, [they are on the github website here](https://github.com/jcolson/dndvault-bot#commands).
`},
        );
        charEmbedArray.push(charEmbed);
        await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
        await utils.deleteMessage(msg);
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
        console.error(`handleHelp: ${error.message}`);
    }
}
exports.handleHelp = handleHelp;
