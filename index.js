const fetch = require('node-fetch');
const { Client, DiscordAPIError, MessageEmbed, Role, Guild } = require('discord.js');
const Config = require('./config.json');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
const client = new Client();

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
    if (!hasRoleOrIsAdmin(msg, guildConfig.prole)) {
        msg.reply(msg.member.nickname + ', ' + 'please have an admin add you to the proper player role to use this bot');
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
            {name: '[x] help', value: 'This help embed page'},
            {name: '[x] register [DNDBEYOND_URL]', value: 'register a character in the vault from dndbeyond'},
            {name: '[ ] list', value: '\u200B'},
            {name: '- [x] {no args}', value: 'list YOUR registered characters within vault'},
            {name: '- [ ] all', value: 'list all'},
            {name: '- [ ] approved', value: 'list all approved'},
            {name: '- [x] queued', value: 'list all characters queued for approval'},
            {name: '- [ ] user [@USER_NAME]', value: 'list all characters by discord user'},
            {name: '[ ] show [CHAR_ID]', value: 'show a user\'s character from the vault'},
            {name: '[x] update [DNDBEYOND_URL]', value: 'request an update a character from dndbeyond to the vault'},
            {name: '[x] remove [DNDBEYOND_URL]', value: 'remove a character from the vault'},
            {name: '[x] approve [CHAR_ID]', value: 'approve a new/updated character within vault'},
            {name: '[ ] changes [CHAR_ID]', value: 'display changes for an unapproved character update'},
            {name: '[x] config', value: 'show BOT config'},
            {name: '- [x] {no args}', value: 'show config'},
            {name: '- [x] arole [NEW_ROLE]', value: 'modify approver role (allows user to approve characters)'},
            {name: '- [x] prole [NEW_ROLE]', value: 'modify player role (allows user to use bot)'},
            {name: '- [x] prefix [NEW_PREFIX]', value: 'modify the command prefix'},
        );
        charEmbed.addFields(
            { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + Config.inviteURL + ')' },
        );
        msg.member.send(charEmbed);
    } catch (error) {
        msg.reply(error.message);
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
        const req = await CharModel.findOne({ id: charData.id });
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
        msg.reply(error.message);
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
        const checkRegisterStatus = await CharModel.findOne({ id: charData.id });
        if (!checkRegisterStatus) {
            throw new Error('Sorry, this character has not been registered and approved yet.  `register ' + charData.id + '` it first.');
        } else if (checkRegisterStatus.approvalStatus == false) {
            throw new Error('Sorry, this character is currently pending register approval.  `remove ' + charData.id + '` and then re-register if you would like to replace the `register` request');
        }
        charData.id = charData.id + '_update';
        const req = await CharModel.findOne({ id: charData.id });
        if (req) {
            throw new Error('Sorry, this character has already has an update pending.  `remove ' + charData.id + '` if you would like to replace the update request');
        }
        let char = new CharModel(charData);
        char.guildUser = msg.member.id;
        char.guildID = msg.guild.id;
        char.approvalStatus = false;
        await char.save();
        await msg.channel.send(msg.member.nickname + ', ' + char.name + '/' + char.race.fullName + '/' + char.classes[0].definition.name + ' now has an update pending.');
        await msg.delete();
    } catch (error) {
        msg.reply(error.message);
    }
}

async function handleChanges(msg, guildConfig) {
    try {
        console.log('changes');
    } catch (error) {
        msg.reply(error.message);
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
        const charArray = await CharModel.find({ guildUser: msg.member.id, guildID: msg.guild.id });
        if (charArray.length > 0) {
            const charEmbed = createCharacterEmbed(msg, charArray);
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters for you`);
        }
    } catch (error) {
        console.error(error.message);
    }
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
                const charEmbed = createCharacterEmbed(msg, charArray);
                await msg.channel.send(charEmbed);
                await msg.delete();
            } else {
                msg.reply(msg.member.nickname + `, I don't see any queued changes to characters awaiting approval right now ... go play some D&D!`);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * 
 * @param {CharModel[]} charArray
 * @returns {MessageEmbed}
 */
function createCharacterEmbed(msg, charArray) {
    const charEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Character List from the Vault')
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
        .setDescription('Character List for ' + msg.member.nickname)
        .setThumbnail(msg.guild.iconURL())
    charArray.forEach((char) => {
        charEmbed.addFields(
            { name: 'Name', value: char.name },
            { name: 'Approved?', value: char.approvalStatus ? char.approvalStatus : '`' + char.approvalStatus + '`', inline: true },
            { name: 'ID', value: '[' + char.id + '](' + char.readonlyUrl + ')', inline: true },
            { name: 'Race', value: '[' + char.race.fullName + '](' + Config.dndBeyondUrl + char.race.moreDetailsUrl + ')', inline: true },
            { name: 'Class', value: char.classes.length > 0 ? '[' + char.classes[0].definition.name + '](' + Config.dndBeyondUrl + char.classes[0].definition.moreDetailsUrl + ')' : '?', inline: true },
        );
    })
    charEmbed.addFields(
        { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + Config.inviteURL + ')' },
    );
    return charEmbed;
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRemove(msg, guildConfig) {
    try {
        const charIdToDelete = msg.content.substr((guildConfig.prefix + 'remove').length + 1);
        const deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete, guildID: msg.guild.id });
        await msg.channel.send(msg.member.nickname + ', ' + charIdToDelete + ' was (' + deleteResponse.deletedCount + ' character) removed from vault.');
        await msg.delete();
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfig(msg, guildConfig) {
    try {
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
        console.error(error.message);
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
                await msg.channel.send(msg.member.nickname + ', ' + configAroleName + ' is now the `approver` role.');
                await msg.delete();
            } else {
                await msg.reply(msg.member.nickname + ', could not locate the role: ' + configAroleName);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        console.error(error.message);
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
                await msg.channel.send(msg.member.nickname + ', ' + configProleName + ' is now the `player` role.');
                await msg.delete();
            } else {
                await msg.reply(msg.member.nickname + ', could not locate the role: ' + configProleName);
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        console.error(error.message);
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
            await msg.channel.send(msg.member.nickname + ', `  ' + guildConfig.prefix + '  `' + ` is now my prefix, don't forget!.`);
            await msg.delete();
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to configure.');
        }
    } catch (error) {
        console.error(error.message);
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
            console.log('charid: ' + charIdToApprove);
            let charToApprove = await CharModel.findOne({ id: charIdToApprove, guildID: msg.guild.id });
            if (typeof charToApprove === 'undefined' || !charToApprove) {
                await msg.channel.send(msg.member.nickname + ', ' + charIdToApprove + ' could not be located.');
                await msg.delete();
            } else {
                // console.log('char: ' + charToApprove);
                charToApprove.approvalStatus = true;
                await charToApprove.save();
                await msg.channel.send(msg.member.nickname + ', ' + charToApprove.id + ' was approved.');
                await msg.delete();
            }
        } else {
            await msg.reply(msg.member.nickname + ', please ask someone with an approver-role to approve.');
        }
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * 
 * @param {Message} msg 
 * @returns {GuildModel}
 */
async function confirmGuildConfig(msg) {
    let guildConfig;
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
    } catch (error) {
        console.error(error.message);
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
function hasRoleOrIsAdmin(msg, roleId) {
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
        console.error(error.message);
    }
    return hasRole;
}