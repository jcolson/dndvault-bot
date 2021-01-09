require('log-timestamp');
const { characters, events, help, users } = require('./handlers');
const path = require('path');
const { Client, MessageEmbed, Role } = require('discord.js');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
global.client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const GuildCache = {};

const DEFAULT_CONFIGDIR = __dirname;
global.Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));

/**
 * connect to the mongodb
 */
(async () => {
    console.log('mongo user: %s ... connecting', Config.mongoUser);
    await connect('mongodb://' + Config.mongoUser + ':' + Config.mongoPass + '@' + Config.mongoServer + ':' + Config.mongoPort + '/dnd?authSource=dnd', {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
    console.log('Connected to mongo.  Logging into Discord now ...');
    return client.login(Config.token);
})();

client.on('ready', () => {
    console.info(`logged in as ${client.user.tag}`)
});

client.on('messageReactionAdd', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    if (!user.bot) {
        // Now the message has been cached and is fully available
        console.log(`${reaction.message.author}'s message "${reaction.message.id}" gained a reaction!`);
        await events.handleReaction(reaction, user);
    } else {
        console.log('bot reacted');
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    // Now the message has been cached and is fully available
    console.log(`${reaction.message.author}'s message "${reaction.message.id}" lost a reaction!`);
    // await events.processReaction(reaction);
});

client.on('message', async (msg) => {
    if (!msg.guild) {
        console.log(`msg: DIRECT:${msg.author.nickname}:${msg.content}`);
        if (msg.content === 'help') {
            help.handleHelp(msg, null, Config.inviteURL);
        }
        return;
    }
    let guildConfig = await confirmGuildConfig(msg);
    if (!msg.content.startsWith(guildConfig.prefix)) return;
    console.log(`msg: ${msg.guild.name}:${msg.member.displayName}:${msg.content}`);
    if (!await users.hasRoleOrIsAdmin(msg, guildConfig.prole)) {
        await msg.reply(`<@${msg.member.id}>, please have an admin add you to the proper player role to use this bot`);
        return;
    }
    if (msg.content === guildConfig.prefix + 'help') {
        help.handleHelp(msg, guildConfig, Config.inviteURL);
    } else if (msg.content.startsWith(guildConfig.prefix + 'register')) {
        characters.handleRegister(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'update')) {
        characters.handleUpdate(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'changes')) {
        characters.handleChanges(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'campaign')) {
        characters.handleCampaign(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list campaign')) {
        characters.handleListCampaign(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list user')) {
        characters.handleListUser(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list all')) {
        characters.handleListAll(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list queued')) {
        characters.handleListQueued(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'list')) {
        characters.handleList(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'remove')) {
        characters.handleRemove(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'approve')) {
        characters.handleApprove(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'show')) {
        characters.handleShow(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'event create')) {
        events.handleEventCreate(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'event edit')) {
        events.handleEventEdit(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'event remove')) {
        events.handleEventRemove(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'event show')) {
        events.handleEventShow(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'event list')) {
        events.handleEventList(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'timezone set')) {
        users.handleTimezoneSet(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'timezone')) {
        users.handleTimezone(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config prefix')) {
        handleConfigPrefix(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config arole')) {
        handleConfigArole(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config prole')) {
        handleConfigProle(msg, guildConfig);
    } else if (msg.content.startsWith(guildConfig.prefix + 'config')) {
        handleConfig(msg, guildConfig);
    }
});

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
            .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
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
        if (await users.hasRoleOrIsAdmin(msg, guildConfig.arole)) {
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
                await msg.channel.send(`<@${msg.member.id}>, ${configAroleName} is now the \`approver\` role.`);
                await msg.delete();
            } else {
                await msg.reply(`<@${msg.member.id}>, could not locate the role: ${configAroleName}`);
            }
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask someone with an approver-role to configure.`);
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
        if (await users.hasRoleOrIsAdmin(msg, guildConfig.arole)) {
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
                await msg.channel.send(`<@${msg.member.id}>, ${configProleName} is now the \`player\` role.`);
                await msg.delete();
            } else {
                await msg.reply(`<@${msg.member.id}>, could not locate the role: ${configProleName}`);
            }
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask someone with an approver-role to configure.`);
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
        if (await users.hasRoleOrIsAdmin(msg, guildConfig.arole)) {
            let configPrefix = msg.content.substring((guildConfig.prefix + 'config prefix').length + 1);
            guildConfig.prefix = configPrefix;
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(`<@${msg.member.id}>, \`${guildConfig.prefix}\` is now my prefix, don't forget!.`);
            await msg.delete();
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask someone with an approver-role to configure.`);
        }
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
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
            if (typeof guildConfig.name === 'undefined' || !guildConfig.name) {
                guildConfig.name = msg.guild.name;
            }
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