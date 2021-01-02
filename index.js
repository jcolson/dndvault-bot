const fetch = require('node-fetch');
const { Client, DiscordAPIError, MessageEmbed, Role, Guild } = require('discord.js');
const Config = require('./config.json');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
const { update } = require('./models/Guild');
const client = new Client();
const GuildCache = {};

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
    if (!msg.guild) return;
    let guildConfig = await confirmGuildConfig(msg);
    if (!msg.content.startsWith(guildConfig.prefix)) return;
    console.log(`msg: ${msg.guild.name}:${msg.member.nickname}:${msg.content}`);
    if (!hasRoleOrIsAdmin(msg, guildConfig.prole)) {
        await msg.reply(msg.member.nickname + ', ' + 'please have an admin add you to the proper player role to use this bot');
        return;
    } if (msg.content === guildConfig.prefix + 'help') {
        handleHelp(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'register')) {
        handleRegister(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'update')) {
        handleUpdate(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'changes')) {
        handleChanges(msg, guildConfig);
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
    }
});

async function handleHelp(msg, guildConfig) {
    try {
        const charEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Help for D&D Vault BOT')
            .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
            .setThumbnail(msg.guild.iconURL())
        charEmbed.addFields(
            { name: '[x] help', value: 'This help embed page' },
            { name: '[x] register [DNDBEYOND_URL]', value: 'register a character in the vault from dndbeyond' },
            { name: '[ ] list', value: '\u200B' },
            { name: '- [x] {no args}', value: 'list YOUR registered characters within vault' },
            { name: '- [ ] all', value: 'list all' },
            { name: '- [ ] approved', value: 'list all approved' },
            { name: '- [x] queued', value: 'list all characters queued for approval' },
            { name: '- [ ] user [@USER_NAME]', value: 'list all characters by discord user' },
            { name: '[ ] show [CHAR_ID]', value: 'show a user\'s character from the vault' },
            { name: '[x] update [DNDBEYOND_URL]', value: 'request an update a character from dndbeyond to the vault' },
            { name: '[x] remove [DNDBEYOND_URL]', value: 'remove a character from the vault' },
            { name: '[x] approve [CHAR_ID]', value: 'approve a new/updated character within vault' },
            { name: '[ ] changes [CHAR_ID]', value: 'display changes for an unapproved character update' },
            { name: '[x] config', value: 'show BOT config' },
            { name: '- [x] {no args}', value: 'show config' },
            { name: '- [x] arole [NEW_ROLE]', value: 'modify approver role (allows user to approve characters)' },
            { name: '- [x] prole [NEW_ROLE]', value: 'modify player role (allows user to use bot)' },
            { name: '- [x] prefix [NEW_PREFIX]', value: 'modify the command prefix' },
        );
        charEmbed.addFields(
            { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + Config.inviteURL + ')' },
        );
        await msg.member.send(charEmbed);
        await msg.delete();
    } catch (error) {
        await msg.reply(error.message);
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
        await msg.reply(error.message);
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
        await msg.reply(error.message);
    }
}

async function handleChanges(msg, guildConfig) {
    try {
        console.log('changes');
    } catch (error) {
        await msg.reply(error.message);
    }
}

function parseCharIdFromURL(commandStringWithURL, command, prefix) {
    const charURL = commandStringWithURL.substr((prefix + command).length + 1);
    console.log('char url: ' + charURL);
    const charID = charURL.split('/').pop();
    console.log('char id: "' + charID + '"');
    if (isNaN(charID) || isNaN(parseInt(charID))) {
        throw new Error("Invalid URL passed for your registration, it needs to be a dndbeyond character URL.");
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
            const charEmbed = embedForCharacter(msg, charArray, msg.member.nickname + '\'s Characters in the Vault');
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters for you`);
        }
    } catch (error) {
        await msg.reply(error.message);
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
        if (hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            const charArray = await CharModel.find({ guildID: msg.guild.id, approvalStatus: false });
            if (charArray.length > 0) {
                const charEmbed = embedForCharacter(msg, charArray, 'Characters pending approval');
                await msg.channel.send(charEmbed);
                await msg.delete();
            } else {
                msg.reply(msg.member.nickname + `, I don't see any queued changes to characters awaiting approval right now ... go play some D&D!`);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        await msg.reply(error.message);
    }
}

/**
 * 
 * @param {CharModel[]} charArray
 * @returns {MessageEmbed}
 */
function embedForCharacter(msg, charArray, title) {
    const charEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(title)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL())
    charArray.forEach((char) => {
        charEmbed.addFields(
            {
                name: 'Name / ID / Status      ()==[:::::::::::::>',
                value: `${char.name} / [${char.id}](${char.readonlyUrl}) / `
                    + stringForApprovalsAndUpdates(char)
            },
            { name: 'User', value: `<@${char.guildUser}>`, inline: true },
            { name: 'Race', value: `[${char.race.fullName}](${Config.dndBeyondUrl}${char.race.moreDetailsUrl})`, inline: true },
            {
                name: 'Class', value: char.classes.length > 0 ? stringForClass(char.classes[0]) :
                    // `[${char.classes[0].definition.name}](${Config.dndBeyondUrl}${char.classes[0].definition.moreDetailsUrl})` :
                    '?', inline: true
            },
        );
    })
    charEmbed.addFields(
        { name: '\u200B', value: `Add this BOT to your server. [Click here](${Config.inviteURL} )` },
    );
    return charEmbed;
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
        return "`Unapproved update pending`";
    } else if (char.approvalStatus && !char.isUpdate) {
        return `Approved by <@${char.approvedBy}>`;
    } else if (!char.approvalStatus && !char.isUpdate) {
        return "`Initial Character Pending`";
    }

}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRemove(msg, guildConfig) {
    try {
        const charIdToDelete = msg.content.substr((guildConfig.prefix + 'remove').length + 1);
        // we only want to remove one type of character, not every character (if there is an update pending).  so remove update, if it
        // doesn't exist, then remove the actual registered character
        let deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id, isUpdate: true });
        if (deleteResponse.deletedCount < 1) {
            deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id, isUpdate: false });
        }
        await msg.channel.send(msg.member.nickname + ', ' + charIdToDelete + ' was (' + deleteResponse.deletedCount + ' character) removed from vault.');
        await msg.delete();
    } catch (error) {
        await msg.reply(error.message);
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
        await msg.reply(error.message);
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
            let configAroleName = msg.content.substr((guildConfig.prefix + 'config arole').length + 1);
            if (configAroleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configAroleId = configAroleName.substr(3, configAroleName.length - 4);
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
        await msg.reply(error.message);
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
            let configProleName = msg.content.substr((guildConfig.prefix + 'config arole').length + 1);
            if (configProleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configProleId = configProleName.substr(3, configProleName.length - 4);
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
        await msg.reply(error.message);
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
            let configPrefix = msg.content.substr((guildConfig.prefix + 'config prefix').length + 1);
            guildConfig.prefix = configPrefix;
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(msg.member.nickname + ', `  ' + guildConfig.prefix + '  `' + ` is now my prefix, don't forget!.`);
            await msg.delete();
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        await msg.reply(error.message);
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
        await msg.reply(error.message);
    }
}

async function handleChanges(msg, guildConfig) {
    try {
        const charId = msg.content.substr((guildConfig.prefix + 'changes').length + 1);
        let updatedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: false });
        let approvedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: true });
        if (typeof updatedChar === 'undefined' || !updatedChar || typeof approvedChar === 'undefined' || !approvedChar) {
            await msg.channel.send(`${msg.member.nickname}, an updated character "${updatedChar}" could not be located.`);
            await msg.delete();
        } else {
            await msg.channel.send(embedForChanges(msg, approvedChar, updatedChar));
            await msg.delete();
        }
    } catch (error) {
        await msg.reply(error.message);
    }
}

function embedForChanges(msg, approvedChar, updatedChar) {
    const changesEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Review Changes for ${approvedChar.name}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let changes = [];
    changes.push(appendStringsForEmbedChanges(['FIELD', 'OLD VALUE', 'NEW VALUE']));
    let change = stringForNameChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    change = stringForRaceChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    changes = changes.concat(stringForClassChange(approvedChar, updatedChar));
    changesEmbed.addFields({ name: 'Changes', value: changes });
    return changesEmbed;
}

function stringForClassChange(approvedChar, updatedChar) {
    let classChanges = [];
    let maxClassesLength = approvedChar.classes.length > updatedChar.classes.length ? approvedChar.classes.length : updatedChar.classes.length;
    for (let i = 0; i < maxClassesLength; i++) {
        console.log('printing class: ' + stringForClass(approvedChar.classes[i]) + ' | ' + stringForClass(updatedChar.classes[i]));
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
    let size = 15;
    let separator = ' | ';
    let returnValue = '';
    stringArray.forEach((value) => {
        returnValue = returnValue + stringOfSize(value, size) + separator;
    })
    return returnValue.substr(0, returnValue.length - separator.length);
}

function stringOfSize(value, size) {
    value = value.substr(0, size);
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
        await msg.reply(error.message);
    }
    return hasRole;
}