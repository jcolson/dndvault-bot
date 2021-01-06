const { MessageEmbed } = require('discord.js');
async function handleHelp(msg, guildConfig, inviteURL) {
    try {
        const charEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Help for D&D Vault BOT')
            .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot');
        if (guildConfig) {
            charEmbed.setDescription(`Current Command Prefix is "${guildConfig.prefix}"`);
            charEmbed.setThumbnail(msg.guild.iconURL());
        }
        charEmbed.addFields(
            {
                name: 'Help', value: `
            \`- [x] help\`
            \`- [x] register [DNDBEYOND_URL]\` - \`register a character in the vault from dndbeyond\`
            \`- [ ] list\`
            \`  - [x] {no args}\` - \`list YOUR registered characters within vault\`
            \`  - [x] all\` - \`list all characters\`
            \`  - [ ] approved\` - \`list all approved\`
            \`  - [x] queued\` - \`list all characters queued for approval\`
            \`  - [x] user [@USER_NAME] \`- \`list all characters by discord user\`
            \`  - [x] campaign [CAMPAIGN_ID] - list all characters registered for a campaign\`
            `},
            {
                name: '\u200B', value: `
            \`- [ ] show\`
            \`  - [x] {no args}[CHAR_ID]\` - \`show a user's character from the vault\`
            \`  - [ ] queued [CHAR_ID] - show a currently queued (changes not approved) character from the vault\`
            \`- [x] update [DNDBEYOND_URL]\` - \`request an update a character from dndbeyond to the vault\`
            \`- [x] remove [CHAR_ID]\` - \`remove a character (or pending update) from the vault\`
            \`- [x] approve [CHAR_ID]\` - \`approve a new/updated character within vault\`
            \`- [x] changes [CHAR_ID]\` - \`display changes for an unapproved character update\`
            \`- [x] config\`
            \`  - [x] {no args}\` - \`show config\`
            \`  - [x] arole [NEW_ROLE]\` - \`modify approver role (allows user to approve characters)\`
            \`  - [x] prole [NEW_ROLE]\` - \`modify player role (allows user to use bot)\`
            \`  - [x] prefix [NEW_PREFIX]\` - \`modify the command prefix\`
            ` },
        );
        charEmbed.addFields(
            { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + inviteURL + ')' },
        );
        if (guildConfig) {
            await msg.member.send(charEmbed);
            await msg.delete();
        } else {
            await msg.channel.send(charEmbed);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}
exports.handleHelp = handleHelp;
