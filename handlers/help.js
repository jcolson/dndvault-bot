const { MessageEmbed } = require('discord.js');
const utils = require('../utils/utils.js');

async function handleHelp(msg, guildConfig, inviteURL) {
    try {
        const charEmbedArray = [];
        let charEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Help for D&D Vault BOT')
            .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot');
        if (msg.guild) {
            charEmbed.setDescription(`Current Command Prefix is "${guildConfig.prefix}"`);
            charEmbed.setThumbnail(msg.guild.iconURL());
        }
        charEmbed.addFields(
            {
                name: 'Do not type brackets ([]) in parameters', value: `
\`\`\`fix
- [x] help
- [x] register
    - [x] manual [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN} - create a stub character, do not use spaces in any of the parameters except the campaign
    - [x] [DNDBEYOND_URL] - register a character in the vault from dndbeyond
- [x] update
    - [x] manual [CHAR_ID] [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN} - update a stub character, do not use spaces in any of the parameters except the campaign
    - [x] [DNDBEYOND_URL] - request an update a character from dndbeyond to the vault
- [x] remove [CHAR_ID] {@USER_NAME} - remove a character (or pending update) from the vault, if username is passed, remove for that user
- [x] approve [CHAR_ID] - approve a new/updated character within vault
- [x] changes [CHAR_ID] - display changes for an unapproved character update
- [ ] campaigns - list all campaigns for server
\`\`\``},
            {
                name: '\u200B', value: `
\`\`\`fix
- [x] campaign [CHAR_ID] [CAMPAIGN_ID] - update character to override dndbeyond's campaign name, this does NOT update dndbeyond's campaign
- [x] default
  - [x] {no args} - show current default character
  - [x] [CHAR_ID] - set your default character id to be used for events/missions with no campaign
- [ ] list
  - [x] {no args} - list YOUR registered characters within vault
  - [x] all - list all characters
  - [ ] approved - list all approved
  - [x] queued - list all characters queued for approval
  - [x] user [@USER_NAME] - list all characters by discord user
  - [x] campaign [CAMPAIGN_ID] - list all characters registered for a campaign
\`\`\``},
            {
                name: '\u200B', value: `
\`\`\`fix
- [ ] show
  - [x] [CHAR_ID] - show a user's character from the vault
  - [ ] queued [CHAR_ID] - show a currently queued (changes not approved) character from the vault
- [x] timezone
  - [x] {no args} - view your timezone
  - [x] [TIMEZONE] - set your timezone (required for interacting with events)
- [x] poll ["Poll Question"] {"Response 0"} {"Response 1"} {"Response 2"} {"Response 3"} ...
\`\`\``});
        charEmbedArray.push(charEmbed);
        charEmbed = new MessageEmbed()
            .setColor('#0099ff');
        charEmbed.addFields(
            {
                name: '\u200B', value: `
\`\`\`fix
- [ ] event
  - [x] create !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] {!campaign [CAMPAIGN]} !desc [MISSION_DESC_REGION_PLAYSTYLE] - creates an event PROPOSAL that users can sign up for
  - [x] edit [MISSION_ID] !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] !campaign [CAMPAIGN] !desc [MISSION_DESC_REGION_PLAYSTYLE] - edits an existing event PROPOSAL that users can sign up for - everything is optional for a partial edit
\`\`\``},
            {
                name: '\u200B', value: `
\`\`\`fix
  - [x] show [MISSION_ID] - replace the posting for an event (if it got deleted by accident)
  - [x] remove [MISSION_ID] - removes mission event
  - [x] list - list all future events (and events from the past few days) (PROPOSed and DEPLOYed)
  - [ ] list my - list all future events you are signed up for or are a DMGM for
  - [ ] list past [DAYS] - list past events for the last DAYS (PROPOSed and DEPLOYed)
  - [x] list proposed - list all future PROPOSED events
  - [x] list deployed - list all future DEPLOYED events
  - [ ] list campaign [CAMPAIGN_ID] - list all future events for a campaign
  - [ ] list campaign proposed [CAMPAIGN_ID] - list all future DEPLOYed events for a campaign
  - [ ] list campaign deployed [CAMPAIGN_ID] - list all future PROPOSEed events for a campaign
\`\`\``},
            {
                name: '\u200B', value: `
\`\`\`fix
- [x] config - show BOT config
  - [x] {no args} - show config
  - [x] arole [@ROLE] - modify approver role (allows user to approve characters)
  - [x] prole [@ROLE] - modify player role (allows user to use bot)
  - [x] prefix [NEW_PREFIX] - modify the command prefix
  - [x] approval [BOOLEAN] - does character registration and updates require arole approval?
  - [x] campaign [BOOLEAN] - require that a user have matching character for event's campaigns
  - [x] pollchannel [#CHANNEL] - send all polls to this channel
  - [x] eventchannel [#CHANNEL] - send all events to this channel
\`\`\``},
        );
        charEmbed.addFields(
            { name: '\u200B', value: `Add this BOT to your server. [Click here](${inviteURL})` },
        );
        charEmbedArray.push(charEmbed);
        await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
        if (msg.guild) {
            try {
                await msg.delete();
            } catch (error) {
                console.error(`handleHelp: ${error.message}`);
            }
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
        console.error(`handleHelp: ${error.message}`);
    }
}
exports.handleHelp = handleHelp;
