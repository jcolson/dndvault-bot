const fetch = require('node-fetch');
const { Client, DiscordAPIError, MessageEmbed, Role, Guild } = require('discord.js');
const Config = require('./config.json');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
const { exists } = require('./models/Guild');
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
    guildConfig = await confirmGuildConfig(msg);
    if (!msg.content.startsWith(guildConfig.prefix)) return;
    if (msg.content === guildConfig.prefix + 'help') {
        msg.reply('help!');
    } else if (msg.content.startsWith(guildConfig.prefix + 'register')) {
        handleRegister(msg);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list')) {
        handleList(msg);
    } else if (msg.content.startsWith(guildConfig.prefix + 'remove')) {
        handleRemove(msg);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config')) {
        handleConfig(msg, guildConfig);
    }
});

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg
 */
function handleRegister(msg) {
    const charURL = msg.content.substr((Config.prefix + 'register').length + 1);
    console.log('char url: ' + charURL);
    const charID = charURL.split('/').pop();
    console.log('char id: "' + charID + '"');
    if (isNaN(charID) || isNaN(parseInt(charID))) {
        msg.reply("Invalid URL passed for your registration, it needs to be a dndbeyond character URL.");
    } else {
        const settings = { method: "Get" };
        fetch('https://character-service.dndbeyond.com/character/v3/character/' + charID, settings)
            .then(res => res.json())
            .then(async (charJSON) => {
                if (charJSON.success == false) {
                    throw new Error('Sorry, that URL contains no character data');
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
            })
            .catch(error => {
                msg.reply('Problem registering your character: ' + error.message);
            });
    }
}

/**
 * 
 * @param {Message} msg 
 */
async function handleList(msg) {
    try {
        const req = await CharModel.find({ guildUser: msg.member.id });
        if (req.length > 0) {
            const charEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Character List from the Vault')
                // .setURL('https://discord.js.org/')
                .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
                .setDescription('Character List for ' + msg.member.nickname)
                .setThumbnail(msg.guild.iconURL())
            req.forEach((char) => {
                charEmbed.addFields(
                    { name: 'Name', value: char.name },
                    { name: 'Approved?', value: char.approvalStatus ? char.approvalStatus : '`' + char.approvalStatus + '`', inline: true },
                    { name: 'ID', value: char.id, inline: true },
                    { name: 'Race', value: char.race.fullName, inline: true },
                    { name: 'Class', value: char.classes[0].definition.name, inline: true },
                );
            })
            charEmbed.addFields(
                { name: '\u200B', value: 'Add this BOT to your server. [Click here](' + Config.inviteURL + ')' },
            );
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
 */
async function handleRemove(msg) {
    try {
        const charIdToDelete = msg.content.substr((Config.prefix + 'remove').length + 1);
        const deleteResponse = await CharModel.deleteMany({ guildUser: msg.member.id, id: charIdToDelete });
        await msg.channel.send(msg.member.nickname + ', ' + charIdToDelete + ' was (' + deleteResponse.deletedCount + ' character) removed from vault.');
        await msg.delete();
    } catch (error) {
        console.error(error.message);
    }
}

async function handleConfig(msg, guildConfig) {
    try {
        if (guildConfig !== 'undefined' && guildConfig) {
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
        } else {
            msg.reply(msg.member.nickname + `, this is an issue, I don't see a server config for ` + msg.guild.name);
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
    // msg.guild.roles.cache.array().forEach(role => console.log(role.name, role.id))
    let guildConfig = await GuildModel.findOne({ guildID: msg.guild.id });
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
    if (typeof guildConfig.prefix === 'undefined' || !guildConfig.refix) {
        guildConfig.prefix = Config.defaultPrefix;
    }
    await GuildModel.updateOne({ guildID: msg.guild.id }, guildConfig, { upsert: true, setDefaultsOnInsert: true });
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
    msg.member.roles.cache.array().forEach((role) => {
        // console.log("role: " + role.name);
        if (role.name == roleName) {
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
    msg.member.roles.cache.array().forEach((role) => {
        // console.log("role: " + role.name);
        if (role.id == roleID) {
            roleForID = role;
        }
    });
    return roleForID;
}