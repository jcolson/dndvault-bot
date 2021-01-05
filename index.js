const path = require('path');
const fetch = require('node-fetch');
const { Client, DiscordAPIError, MessageEmbed, Role, Guild } = require('discord.js');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
const { update } = require('./models/Guild');
const { stat } = require('fs');
const client = new Client();
const GuildCache = {};
const StatLookup = { 1: 'Strength', 2: 'Dexterity', 3: 'Constitution', 4: 'Intelligence', 5: 'Wisdom', 6: 'Charisma' };
const SkillLookup = {
    '3': 'acrobatics', '11': 'animalHandling', '6': 'arcana', '2': 'athletics', '16': 'deception', '7': 'history',
    '12': 'insight', '17': 'intimidation', '8': 'investigation', '13': 'medicine', '9': 'nature', '14': 'perception',
    '18': 'performance', '19': 'persuasion', '10': 'religion', '4': 'sleightOfHand', '5': 'stealth', '15': 'survival'
}
const RacialBonusLookup = {
    1: { 'Mountain dwarf': 2, 'Dragonborn': 2, 'Half-Orc': 2, 'Human': 1 },
    2: { 'Elf': 2, 'Halfling': 2, 'Forest gnome': 1, 'Human': 1 },
    3: { 'Dwarf': 2, 'Stout halfling': 1, 'Rock gnome': 1, 'Half-Orc': 1, 'Human': 1 },
    4: { 'High elf': 1, 'Gnome': 2, 'Tiefling': 1, 'Human': 1 },
    5: { 'Hill Dwarf': 1, 'Wood elf': 1, 'Human': 1 },
    6: { 'Half-elf': 2, 'Drow': 1, 'Lightfoot halfling': 1, 'Dragonborn': 1, 'Tiefling': 2, 'Human': 1 }
};

const DEFAULT_CONFIGDIR = __dirname;
const Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));

/**
 * connect to the mongodb
 */
(async () => {
    await connect('mongodb://' + Config.mongoUser + ':' + Config.mongoPass + '@' + Config.mongoServer + ':' + Config.mongoPort + '/dnd', {
        // await connect('mongodb://docker.karma.net/dnd', {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
    console.log('user: ' + Config.mongoUser);
    return client.login(Config.token);
})();

client.on('ready', () => console.info(`logged in as ${client.user.tag}`));

client.on('message', async (msg) => {
    if (!msg.guild) {
        console.log(`msg: DIRECT:${msg.author.nickname}:${msg.content}`);
        if (msg.content === 'help') {
            handleHelp(msg);
        }
        return;
    }
    let guildConfig = await confirmGuildConfig(msg);
    if (!msg.content.startsWith(guildConfig.prefix)) return;
    console.log(`msg: ${msg.guild.name}:${msg.member.nickname}:${msg.content}`);
    if (!hasRoleOrIsAdmin(msg, guildConfig.prole)) {
        await msg.reply(msg.member.nickname + ', ' + 'please have an admin add you to the proper player role to use this bot');
        return;
    }
    if (msg.content === guildConfig.prefix + 'help') {
        handleHelp(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'register')) {
        handleRegister(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'update')) {
        handleUpdate(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'changes')) {
        handleChanges(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list campaign')) {
        handleListCampaign(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list user')) {
        handleListUser(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list all')) {
        handleListAll(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list queued')) {
        handleListQueued(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list')) {
        handleList(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'remove')) {
        handleRemove(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config prefix')) {
        handleConfigPrefix(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config arole')) {
        handleConfigArole(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config prole')) {
        handleConfigProle(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config')) {
        handleConfig(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'approve')) {
        handleApprove(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'changes')) {
        handleChanges(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'show')) {
        handleShow(msg, guildConfig);
    }
});

async function handleHelp(msg, guildConfig) {
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
            { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + Config.inviteURL + ')' },
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

/**
 * Show a character
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleShow(msg, guildConfig) {
    try {
        const charID = parseCharIdFromURL(msg.content, 'show', guildConfig.prefix);
        const showUser = await CharModel.findOne({ id: charID, isUpdate: false, guildID: msg.guild.id });
        const embedChar = embedForCharacter(msg, [showUser], 'Show Character');
        await msg.channel.send(embedChar);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRegister(msg, guildConfig) {
    try {
        const charID = parseCharIdFromURL(msg.content, 'register', guildConfig.prefix);
        const settings = { method: "Get" };
        let response = await fetch('https://character-service.dndbeyond.com/character/v3/character/' + charID, settings);
        let charJSON = await response.json();
        if (response.status != 200 || charJSON.success == false) {
            throw new Error('Sorry, that URL or dndbeyond-id contains no character data');
        };
        let charData = Object.assign({}, charJSON.data);
        const req = await CharModel.findOne({ id: charData.id, isUpdate: false, guildID: msg.guild.id });
        if (req) {
            // console.log(req);
            throw new Error('Sorry, this character has already been registered, use `update` command instead.');
        }
        let char = new CharModel(charData);
        char.guildUser = msg.member.id;
        char.guildID = msg.guild.id;
        char.approvalStatus = false;
        await char.save();
        await msg.channel.send(msg.member.nickname + ', ' + char.name + '/' + char.race.fullName + '/' + char.classes[0].definition.name + ' is now registered');
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleUpdate(msg, guildConfig) {
    try {
        const charID = parseCharIdFromURL(msg.content, 'update', guildConfig.prefix);
        const settings = { method: "Get" };
        let response = await fetch('https://character-service.dndbeyond.com/character/v3/character/' + charID, settings);
        let charJSON = await response.json();
        if (response.status != 200 || charJSON.success == false) {
            throw new Error('Sorry, that URL or dndbeyond-id contains no character data');
        };
        let charData = Object.assign({}, charJSON.data);
        const checkRegisterStatus = await CharModel.findOne({ id: charData.id, isUpdate: false, guildID: msg.guild.id });
        if (!checkRegisterStatus) {
            throw new Error('Sorry, this character has not been registered and approved yet.  `register ' + charData.id + '` it first.');
        } else if (checkRegisterStatus.approvalStatus == false) {
            throw new Error('Sorry, this character is currently pending register approval.  `remove ' + charData.id + '` and then re-register if you would like to replace the `register` request');
        }
        // charData.id = charData.id + '_update';
        const req = await CharModel.findOne({ id: charData.id, isUpdate: true, guildID: msg.guild.id });
        if (req) {
            throw new Error('Sorry, this character has already has an update pending.  `remove ' + charData.id + '` if you would like to replace the update request');
        }
        let char = new CharModel(charData);
        char.guildUser = msg.member.id;
        char.guildID = msg.guild.id;
        char.approvalStatus = false;
        char.isUpdate = true;
        await char.save();
        await msg.channel.send(msg.member.nickname + ', ' + char.name + '/' + char.race.fullName + '/' + char.classes[0].definition.name + ' now has an update pending.');
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * 
 * @param {String} commandStringWithURL 
 * @param {String} command 
 * @param {String} prefix 
 * @returns {String}
 */
function parseCharIdFromURL(commandStringWithURL, command, prefix) {
    let charID;
    try {
        const charURL = commandStringWithURL.substring((prefix + command).length + 1);
        console.log('char url: ' + charURL);
        let urlSplitArray = charURL.split('/');
        charID = urlSplitArray.pop();
        console.log('char id: "' + charID + '"');
        if (isNaN(charID) || isNaN(parseInt(charID))) {
            charID = urlSplitArray.pop();
            console.log('char id: "' + charID + '"');
            if (isNaN(charID) || isNaN(parseInt(charID))) {
                throw new Error("Invalid URL passed for your registration, it needs to be a dndbeyond character URL.");
            }
        }
    } catch (error) {
        throw new Error('Could not locate character id in url');
    }
    return charID;
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleList(msg, guildConfig) {
    try {
        let charArrayUpdates = await CharModel.find({ guildUser: msg.member.id, guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildUser: msg.member.id, guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, `${msg.member.displayName}'s Characters in the Vault`);
            charEmbedArray.forEach(async (charEmbed) => {
                await msg.channel.send(charEmbed);
            })
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters for you`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

function getIdsFromCharacterArray(charArray) {
    let names = [];
    charArray.forEach((char) => {
        names.push(char.id);
    });
    return names;
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleListQueued(msg, guildConfig) {
    try {
        const charArray = await CharModel.find({ guildID: msg.guild.id, approvalStatus: false });
        if (charArray.length > 0) {
            const charEmbed = embedForCharacter(msg, charArray, 'Characters pending approval');
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any queued changes to characters awaiting approval right now ... go play some D&D!`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

async function handleListAll(msg, guildConfig) {
    try {
        let charArrayUpdates = await CharModel.find({ guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbed = embedForCharacter(msg, charArray, 'All Characters in the Vault');
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters \`register\` one!`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

async function handleListCampaign(msg, guildConfig) {
    try {
        let campaignToList = msg.content.substring((guildConfig.prefix + 'list campaign').length + 1);
        let charArrayUpdates = await CharModel.find({ guildID: msg.guild.id, 'campaign.id': campaignToList, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildID: msg.guild.id, 'campaign.id': campaignToList, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbed = embedForCharacter(msg, charArray, `All Characters in campaign "${campaignToList}"`);
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters \`register\` one!`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

async function handleListUser(msg, guildConfig) {
    try {
        let userToList = msg.content.substring((guildConfig.prefix + 'list user').length + 1);
        userToList = userToList.substring(3, userToList.length - 1)
        let charArrayUpdates = await CharModel.find({ guildUser: userToList, guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildUser: userToList, guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            let memberGuild = await client.guilds.fetch(guildConfig.guildID);
            let guildMember = await memberGuild.members.fetch(msg.member.id);
            const charEmbed = embedForCharacter(msg, charArray, `All Characters for ${guildMember.displayName} in the Vault`);
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters for ${userToList}`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * 
 * @param {CharModel[]} charArray
 * @returns {MessageEmbed}
 */
function embedForCharacter(msg, charArray, title) {
    let returnEmbeds = [];
    const charPerEmbed = 3;
    let charEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(title)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let i = 0;
    charArray.forEach((char) => {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(charEmbed);
            charEmbed = new MessageEmbed()
                .setColor('#0099ff');
            i = 0;
        }
        charEmbed.addFields(
            {
                name: 'Name | ID | Status                                 🗡🛡🗡🛡🗡🛡',
                value: `[${char.name}](${char.readonlyUrl}) | ${char.id} | `
                    + stringForApprovalsAndUpdates(char)
            },
            { name: 'User', value: `<@${char.guildUser}>`, inline: true },
            { name: 'Race', value: `[${char.race.fullName}](${Config.dndBeyondUrl}${char.race.moreDetailsUrl})`, inline: true },
            {
                name: 'Class', value: char.classes.length > 0 ? stringForClass(char.classes[0]) :
                    // `[${char.classes[0].definition.name}](${Config.dndBeyondUrl}${char.classes[0].definition.moreDetailsUrl})` :
                    '?', inline: true
            },
            {
                name: 'Campaign', value: (char.campaign && char.campaign.name ? `[${char.campaign.name}](${Config.dndBeyondUrl}/campaigns/${char.campaign.id}) (${char.campaign.id})` : `N/A`),
                inline: true
            },
            { name: 'Attributes*', value: stringForStats(char), inline: true },
        );
    })
    charEmbed.addFields(
        { name: '\u200B', value: `Add this BOT to your server. [Click here](${Config.inviteURL})` },
    );
    returnEmbeds.push(charEmbed);
    return returnEmbeds;
}

/**
 * 
 * @param {CharModel} char 
 */
function stringForStats(char) {
    let charStatsString = '';
    char.stats.forEach((stat) => {
        let bonus = RacialBonusLookup[stat.id][char.race.baseRaceName] ? RacialBonusLookup[stat.id][char.race.baseRaceName] : 0;
        bonus += RacialBonusLookup[stat.id][char.race.fullName] ? RacialBonusLookup[stat.id][char.race.fullName] : 0;
        let indivStat = stat.value + bonus;
        let modifier = Math.floor((indivStat - 10) / 2);
        charStatsString = charStatsString + `${StatLookup[stat.id].substring(0, 3)}: ${indivStat}(${modifier}) | `;
    });
    return charStatsString.substring(0, charStatsString.length - 3);
}

/**
 * Return a string describing the current state of the character
 * @param {CharModel} char 
 * @returns {String}
 */
function stringForApprovalsAndUpdates(char) {
    if (char.approvalStatus && char.isUpdate) {
        return '`Invalid Status`';
    } else if (!char.approvalStatus && char.isUpdate) {
        return "`Update Pending Approval`";
    } else if (char.approvalStatus && !char.isUpdate) {
        return `Approved by <@${char.approvedBy}> `;
    } else if (!char.approvalStatus && !char.isUpdate) {
        return "`Register Pending Approval`";
    }

}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRemove(msg, guildConfig) {
    try {
        let typeOfRemoval = 'Character Update';
        const charIdToDelete = msg.content.substring((guildConfig.prefix + 'remove').length + 1);
        // we only want to remove one type of character, not every character (if there is an update pending).  so remove update, if it
        // doesn't exist, then remove the actual registered character
        let deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id, isUpdate: true, approvalStatus: false });
        if (deleteResponse.deletedCount < 1) {
            typeOfRemoval = 'Unapproved Character';
            deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id, isUpdate: false, approvalStatus: false });
            if (deleteResponse.deletedCount < 1) {
                typeOfRemoval = 'Approved Character';
                if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
                    deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id, isUpdate: false, approvalStatus: true });
                } else {
                    msg.reply(`Please ask an approver to remove this character, as it has already been approved`);
                    return;
                }
            }
        }
        await msg.channel.send(msg.member.nickname + ', ' + charIdToDelete + '(' + typeOfRemoval + ') was (' + deleteResponse.deletedCount + ' records) removed from vault.');
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ...${error.message}`);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfig(msg, guildConfig) {
    try {
        const guild = msg.guild.name
        const configEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('BOT Config')
            // .setURL('https://discord.js.org/')
            .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
            .setDescription('BOT Config for the server: ' + msg.guild.name)
            .setThumbnail(msg.guild.iconURL())
        configEmbed.addFields(
            { name: 'ID', value: guildConfig.guildID },
            { name: 'Prefix', value: guildConfig.prefix, inline: true },
            { name: 'Approver Role', value: retrieveRoleForID(msg, guildConfig.arole), inline: true },
            { name: 'Player Role', value: retrieveRoleForID(msg, guildConfig.prole), inline: true },
        );
        await msg.channel.send(configEmbed);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ...${error.message}`);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfigArole(msg, guildConfig) {
    try {
        if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            let configAroleName = msg.content.substring((guildConfig.prefix + 'config arole').length + 1);
            if (configAroleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configAroleId = configAroleName.substring(3, configAroleName.length - 4);
                configAroleName = retrieveRoleForID(msg, configAroleId).name;
            }
            configArole = retrieveRoleForName(msg, configAroleName);
            if (configArole) {
                guildConfig.arole = configArole.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await msg.channel.send(msg.member.nickname + ', ' + configAroleName + ' is now the `approver` role.');
                await msg.delete();
            } else {
                await msg.reply(msg.member.nickname + ', could not locate the role: ' + configAroleName);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ...${error.message}`);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfigProle(msg, guildConfig) {
    try {
        if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            let configProleName = msg.content.substring((guildConfig.prefix + 'config arole').length + 1);
            if (configProleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configProleId = configProleName.substring(3, configProleName.length - 4);
                configProleName = retrieveRoleForID(msg, configProleId).name;
            }
            configProle = retrieveRoleForName(msg, configProleName);
            if (configProle) {
                guildConfig.prole = configProle.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await msg.channel.send(msg.member.nickname + ', ' + configProleName + ' is now the `player` role.');
                await msg.delete();
            } else {
                await msg.reply(msg.member.nickname + ', could not locate the role: ' + configProleName);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ...${error.message}`);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfigPrefix(msg, guildConfig) {
    try {
        if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            let configPrefix = msg.content.substring((guildConfig.prefix + 'config prefix').length + 1);
            guildConfig.prefix = configPrefix;
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(msg.member.nickname + ', `  ' + guildConfig.prefix + '  `' + ` is now my prefix, don't forget!.`);
            await msg.delete();
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleApprove(msg, guildConfig) {
    try {
        if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            const charIdToApprove = msg.content.substr((guildConfig.prefix + 'approve').length + 1);
            // console.log('charid: ' + charIdToApprove);
            let charToApprove = await CharModel.findOne({ id: charIdToApprove, guildID: msg.guild.id, approvalStatus: false });
            if (typeof charToApprove === 'undefined' || !charToApprove) {
                await msg.channel.send(`${msg.member.nickname}, an unapproved "${charIdToApprove}" could not be located.`);
                await msg.delete();
            } else {
                // console.log('char: ' + charToApprove);
                charToApprove.approvalStatus = true;
                charToApprove.approvedBy = msg.member.id;
                // if this is an update, then remove the original - this update will become the registered character
                if (charToApprove.isUpdate = true) {
                    charToApprove.isUpdate = false;
                    await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToApprove, guildID: msg.guild.id, isUpdate: false, approvalStatus: true });
                }
                await charToApprove.save();
                await msg.channel.send(msg.member.nickname + ', ' + charToApprove.id + ' was approved.');
                await msg.delete();
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to approve.');
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * Handler for displaying character changes
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleChanges(msg, guildConfig) {
    try {
        const charId = msg.content.substring((guildConfig.prefix + 'changes').length + 1);
        let updatedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: false });
        let approvedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: true });
        if (typeof updatedChar === 'undefined' || !updatedChar || typeof approvedChar === 'undefined' || !approvedChar) {
            await msg.channel.send(`${msg.member.nickname}, an updated character for id "${charId}" could not be located.`);
            await msg.delete();
        } else {
            const changesEmbed = embedForChanges(msg, approvedChar, updatedChar);
            // console.log(changesEmbed);
            await msg.channel.send(changesEmbed);
            await msg.delete();
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

/**
 * Create a rich embedded message with all the character changes between two characters
 * @param {Message} msg 
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {MessageEmbed}
 */
function embedForChanges(msg, approvedChar, updatedChar) {
    const changesEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Review Changes for Character: ${approvedChar.name}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let changes = [];
    changes.push(appendStringsForEmbedChanges(['CHAR FIELD', 'OLD VALUE', 'NEW VALUE']));
    let change = stringForNameChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    change = stringForRaceChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    changes = changes.concat(arrayForClassChange(approvedChar, updatedChar));
    changesEmbed.addFields({ name: 'Core Changes', value: changes });
    changes = arrayForAbilitiesChange(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Abilities Changes', value: changes });
    }
    changes = arrayForBackgroundModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Background Changes', value: changes });
    }
    changes = arrayForClassModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Class Changes', value: changes });
    }
    changes = arrayForConditionModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Condition Changes', value: changes });
    }
    changes = arrayForFeatModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Feat Changes', value: changes });
    }
    changes = arrayForItemModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Item Changes', value: changes });
    }
    changes = arrayForRaceModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Race Changes', value: changes });
    }
    changes = arrayForTraitsChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Traits Changes', value: changes });
    }
    changes = arrayForInventoryChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Inventory Changes', value: changes });
    }
    changes = arrayForCurrenciesChange(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Currency Changes', value: changes });
    }
    return changesEmbed;
}

/**
 * returns an array of currency changes between characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForCurrenciesChange(approvedChar, updatedChar) {
    let currenciesChanges = [];
    if (approvedChar.currencies.cp != updatedChar.currencies.cp) {
        currenciesChanges.push(appendStringsForEmbedChanges(['CP', '' + approvedChar.currencies.cp, '' + updatedChar.currencies.cp]));
    }
    if (approvedChar.currencies.ep != updatedChar.currencies.ep) {
        currenciesChanges.push(appendStringsForEmbedChanges(['EP', '' + approvedChar.currencies.ep, '' + updatedChar.currencies.ep]));
    }
    if (approvedChar.currencies.gp != updatedChar.currencies.gp) {
        currenciesChanges.push(appendStringsForEmbedChanges(['GP', '' + approvedChar.currencies.gp, '' + updatedChar.currencies.gp]));
    }
    if (approvedChar.currencies.pp != updatedChar.currencies.pp) {
        currenciesChanges.push(appendStringsForEmbedChanges(['PP', '' + approvedChar.currencies.pp, '' + updatedChar.currencies.pp]));
    }
    if (approvedChar.currencies.sp != updatedChar.currencies.sp) {
        currenciesChanges.push(appendStringsForEmbedChanges(['SP', '' + approvedChar.currencies.sp, '' + updatedChar.currencies.sp]));
    }
    return currenciesChanges;
}

/**
 * returns an array of all the race modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForRaceModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.race, updatedChar.modifiers.race);
}

/**
 * returns an array of all the item modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForItemModifiersChanges(approvedChar, updatedChar) {
    // console.log(' app, upd: %j\n\n %j', approvedChar.modifiers.item, updatedChar.modifiers.item);
    return arrayForModifiersChanges(approvedChar.modifiers.item, updatedChar.modifiers.item);
}

/**
 * returns an array of all the feat modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForFeatModifiersChanges(approvedChar, updatedChar) {
    // console.log(' app, upd: %j, %j', approvedChar.modifiers.feat, updatedChar.modifiers.feat);
    return arrayForModifiersChanges(approvedChar.modifiers.feat, updatedChar.modifiers.feat);
}

/**
 * returns an array of all the condition modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForConditionModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.condition, updatedChar.modifiers.condition);
}

/**
 * returns an array of all the class modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForClassModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.class, updatedChar.modifiers.class);
}

/**
 * returns an array of all the background modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForBackgroundModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.background, updatedChar.modifiers.background);
}

/**
 * returns an array of all the modifier changes between two characters
 * @param {Array} approvedMod 
 * @param {Array} updatedMod 
 * @returns {Array}
 */
function arrayForModifiersChanges(approvedMod, updatedMod) {
    approvedMod = concatArrayOfArrays(approvedMod);
    updatedMod = concatArrayOfArrays(updatedMod);
    let modifiersChanges = [];
    // check to see if an array of arrays got passed somehow
    updatedMod.forEach((updTrait) => {
        let foundItem = false;
        approvedMod.forEach((appTrait) => {
            if (updTrait.id == appTrait.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('updated - did not find: ' + updTrait.id + ' | ' + updTrait.friendlySubtypeName + ' | ' + updTrait.friendlyTypeName);
            modifiersChanges.push(appendStringsForEmbedChanges([updTrait.friendlySubtypeName, '', updTrait.friendlyTypeName + (updTrait.value ? '(' + updTrait.value + ')' : '')]));
        }

    });

    approvedMod.forEach((appTrait) => {
        let foundItem = false;
        updatedMod.forEach((updTrait) => {
            if (updTrait.id == appTrait.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('approved - did not find: ' + appTrait.id + ' | ' + appTrait.friendlySubtypeName + ' | ' + appTrait.friendlyTypeName);
            modifiersChanges.push(appendStringsForEmbedChanges([appTrait.friendlySubtypeName, appTrait.friendlyTypeName + (appTrait.value ? '(' + appTrait.value + ')' : ''), '']));
        }
    });
    return modifiersChanges;
}

function concatArrayOfArrays(arrays) {
    let returnConcatArray = [];
    arrays.forEach((value) => {
        if (Array.isArray(value)) {
            returnConcatArray = returnConcatArray.concat(value);
        } else {
            returnConcatArray.push(value);
        }
    })
    return returnConcatArray;
}

/**
 * returns an array of all the racial traits changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForTraitsChanges(approvedChar, updatedChar) {
    let traitsChanges = [];
    updatedChar.race.racialTraits.forEach((updTrait) => {
        let foundItem = false;
        approvedChar.race.racialTraits.forEach((appTrait) => {
            if (updTrait.definition.id == appTrait.definition.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + updTrait.definition.name);
            traitsChanges.push(appendStringsForEmbedChanges([updTrait.definition.snippet ? updTrait.definition.snippet : updTrait.definition.description, '', updTrait.definition.name]));
        }
    });
    approvedChar.race.racialTraits.forEach((appTrait) => {
        let foundItem = false;
        updatedChar.race.racialTraits.forEach((updTrait) => {
            if (updTrait.definition.id == appTrait.definition.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + appTrait.definition.name);
            traitsChanges.push(appendStringsForEmbedChanges([appTrait.definition.snippet ? appTrait.definition.snippet : appTrait.definition.description, appTrait.definition.name, '']));
        }
    });
    return traitsChanges;
}

/**
 * returns an array of all the inventory changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForInventoryChanges(approvedChar, updatedChar) {
    let inventoryChanges = [];
    updatedChar.inventory.forEach((updInv) => {
        let foundItem = false;
        let wrongQty = 0;
        approvedChar.inventory.forEach((appInv) => {
            if (updInv.definition.id == appInv.definition.id && updInv.quantity == appInv.quantity) {
                foundItem = true;
            } else if (updInv.definition.id == appInv.definition.id && updInv.quantity != appInv.quantity) {
                wrongQty = appInv.quantity;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + updInv.definition.name);
            inventoryChanges.push(appendStringsForEmbedChanges([updInv.definition.name, '' + wrongQty, '' + updInv.quantity]));
        }
    });
    approvedChar.inventory.forEach((appInv) => {
        let foundItem = false;
        let wrongQty = 0;
        updatedChar.inventory.forEach((updInv) => {
            if (updInv.definition.id == appInv.definition.id && updInv.quantity == appInv.quantity) {
                foundItem = true;
            } else if (updInv.definition.id == appInv.definition.id && updInv.quantity != appInv.quantity) {
                wrongQty = updInv.quantity;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + appInv.definition.name);
            inventoryChanges.push(appendStringsForEmbedChanges([appInv.definition.name, '' + appInv.quantity, '' + wrongQty]));
        }
    });
    return inventoryChanges;
}

function arrayForAbilitiesChange(approvedChar, updatedChar) {
    let abilitiesChanges = [];
    approvedChar.stats.forEach((approvedStat) => {
        updatedChar.stats.forEach((updatedStat) => {
            if (approvedStat.id == updatedStat.id) {
                if (approvedStat.value != updatedStat.value) {
                    // console.log('stat is different: ' + StatLookup[approvedStat.id] + ':' + approvedStat.value + '/' + updatedStat.value);
                    abilitiesChanges.push(appendStringsForEmbedChanges([StatLookup[approvedStat.id], '' + approvedStat.value, '' + updatedStat.value]));
                }
            }
        })
    })
    return abilitiesChanges;
}

function arrayForClassChange(approvedChar, updatedChar) {
    let classChanges = [];
    let maxClassesLength = approvedChar.classes.length > updatedChar.classes.length ? approvedChar.classes.length : updatedChar.classes.length;
    for (let i = 0; i < maxClassesLength; i++) {
        // console.log('printing class: ' + stringForClass(approvedChar.classes[i]) + ' | ' + stringForClass(updatedChar.classes[i]));
        if (stringForClass(approvedChar.classes[i]) != stringForClass(updatedChar.classes[i])) {
            classChanges.push(appendStringsForEmbedChanges(['Class', stringForClass(approvedChar.classes[i]), stringForClass(updatedChar.classes[i])]));
        }
    }
    return classChanges;
}

function stringForClass(charClass) {
    if (typeof charClass !== 'undefined' && charClass && charClass.definition) {
        return charClass.level + ' ' + charClass.definition.name + (charClass.subclassDefinition ? '(' + charClass.subclassDefinition.name + ') ' : ' ');
    } else {
        return '';
    }
}

function stringForRaceChange(approvedChar, updatedChar) {
    if (approvedChar.race.fullName != updatedChar.race.fullName) {
        return appendStringsForEmbedChanges(['Race', approvedChar.race.fullName, updatedChar.race.fullName]);
    }
}

function stringForNameChange(approvedChar, updatedChar) {
    if (approvedChar.name != updatedChar.name) {
        return appendStringsForEmbedChanges(['Character Name', approvedChar.name, updatedChar.name]);
    }
}

function appendStringsForEmbedChanges(stringArray) {
    let fieldSize = 16;
    let separator = ' | ';
    return appendStringsForEmbed(stringArray, fieldSize, separator);
}

function appendStringsForEmbed(stringArray, fieldSize, separator) {
    let returnValue = '';
    stringArray.forEach((value) => {
        returnValue = returnValue + stringOfSize(value, fieldSize) + separator;
    })
    return returnValue.substring(0, returnValue.length - separator.length);
}

function stringOfSize(value, size) {
    value = value.substring(0, size);
    // console.log(`substr: "${value}"`);
    if (value.length < size) {
        value = value + ' '.repeat(size - value.length);
    }
    // console.log(`repeat: "${value}"`);
    return '`' + value + '`';
}

/**
 * 
 * @param {Message} msg 
 * @returns {GuildModel}
 */
async function confirmGuildConfig(msg) {
    let guildConfig = GuildCache[msg.guild.id];
    if (!guildConfig) {
        try {
            // msg.guild.roles.cache.array().forEach(role => console.log(role.name, role.id))
            guildConfig = await GuildModel.findOne({ guildID: msg.guild.id });
            if (!guildConfig) {
                guildConfig = new GuildModel({ guildID: msg.guild.id });
            }
            // console.log(guildConfig);
            if (typeof guildConfig.arole === 'undefined' || !guildConfig.arole) {
                guildConfig.arole = retrieveRoleForName(msg, Config.defaultARoleName).id;
            }
            if (typeof guildConfig.prole === 'undefined' || !guildConfig.prole) {
                guildConfig.prole = retrieveRoleForName(msg, Config.defaultPRoleName).id;
            }
            if (typeof guildConfig.prefix === 'undefined' || !guildConfig.prefix) {
                guildConfig.prefix = Config.defaultPrefix;
            }
            // this only works because it's a flat document
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
        } catch (error) {
            await msg.reply(error.message);
        }
    }
    return guildConfig;
}

/**
 * 
 * @param {Message} msg 
 * @param {String} roleName 
 * @returns {Role}
 */
function retrieveRoleForName(msg, roleName) {
    let roleForName;
    msg.guild.roles.cache.array().forEach((role) => {
        // console.log("role: " + role.name + ' : ' + roleName);
        if (role.name == roleName || '@' + role.name == roleName) {
            roleForName = role;
        }
    });
    return roleForName;
}

/**
 * 
 * @param {Message} msg 
 * @param {String} roleID 
 * @returns {Role}
 */
function retrieveRoleForID(msg, roleID) {
    let roleForID;
    msg.guild.roles.cache.array().forEach((role) => {
        // console.log("role: " + role.name + ' : ' + role.id);
        if (role.id == roleID) {
            roleForID = role;
        }
    });
    return roleForID;
}

/**
 * Check to see if the user that sent the message is in the role or an admin (so it is automatically authorized)
 * @param {Message} msg 
 * @param {String} roleId 
 */
async function hasRoleOrIsAdmin(msg, roleId) {
    // if (roleId == '792845390834958368') {
    //     return false;
    // }
    let hasRole = false;
    try {
        if (msg.member.hasPermission('ADMINISTRATOR')) {
            // console.log('User is an admin.');
            hasRole = true;
        } else {
            msg.member.roles.cache.array().forEach((role) => {
                // console.log('role check: ' + role.id + " : " + roleId);
                if (role.id == roleId) {
                    hasRole = true;
                }
            })
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
    return hasRole;
}


/**
 * find the approximate size of an embed
 * @param {MessageEmbed} embed 
 * @returns {number}
 */
function lengthOfEmbed(embed) {
    let embedLength = (embed.title ? embed.title.length : 0)
        + (embed.url ? embed.url.length : 0)
        + (embed.description ? embed.description.length : 0)
        + (embed.footer && embed.footer.text ? embed.footer.text.length : 0)
        + (embed.author && embed.author.name ? embed.author.name.length : 0);
    embed.fields.forEach((field) => {
        embedLength += field.name.length + field.value.length;
    });
    console.log('EmbedLengthCheck: %d', embedLength);
    return embedLength;
}