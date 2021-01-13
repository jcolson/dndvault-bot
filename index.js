require('log-timestamp');
const characters = require('./handlers/characters.js');
const events = require('./handlers/events.js');
const help = require('./handlers/help.js');
const users = require('./handlers/users.js');
const path = require('path');
const { Client, MessageEmbed, Role } = require('discord.js');
const GuildModel = require('./models/Guild');
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
    try {
        if (reaction.partial) {
            // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
            await reaction.fetch();
        }
        if (reaction.message.partial) {
            await reaction.message.fetch();
        }
    } catch (error) {
        console.error('Something went wrong when fetching the message: ', error);
        // Return as `reaction.message.author` may be undefined/null
        return;
    }
    console.log(`msg: ${reaction.message.guild.name}:${user.username}:${reaction.message.content}`);
    if (!user.bot) {
        try {
            // Now the message has been cached and is fully available
            console.log(`${reaction.message.author}'s message "${reaction.message.id}" gained a reaction!`);
            let guildConfig = await confirmGuildConfig(reaction.message);
            await events.handleReactionAdd(reaction, user, guildConfig);
        } catch (error) {
            console.error(`caught exception handling reaction`, error);
        }
    } else {
        console.log('bot reacted');
    }
});

// client.on('messageReactionRemove', async (reaction, user) => {
//     console.log('messageReactionRemove');
//     // When we receive a reaction we check if the reaction is partial or not
//     try {
//         if (reaction.partial) {
//             // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
//             await reaction.fetch();
//         }
//         if (reaction.message.partial) {
//             await reaction.message.fetch();
//         }
//     } catch (error) {
//         console.error('Something went wrong when fetching the message: ', error);
//         // Return as `reaction.message.author` may be undefined/null
//         return;
//     }
//     if (!user.bot) {
//         // Now the message has been cached and is fully available
//         console.log(`${reaction.message.author}'s message "${reaction.message.id}" gained a reaction!`);
//         await events.handleReactionRemove(reaction, user);
//     } else {
//         console.log('bot reacted');
//     }
// });

// client.on('raw', packet => {
//     // We don't want this to run on unrelated packets
//     if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
//     console.log('received raw event for reaction');
//     // Grab the channel to check the message from
//     const channel = client.channels.get(packet.d.channel_id);
//     // There's no need to emit if the message is cached, because the event will fire anyway for that
//     if (channel.messages.has(packet.d.message_id)) return;
//     // Since we have confirmed the message is not cached, let's fetch it
//     console.log('fetching message for reaction');
//     channel.fetchMessage(packet.d.message_id).then(message => {
//         // Emojis can have identifiers of name:id format, so we have to account for that case as well
//         const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
//         // This gives us the reaction we need to emit the event properly, in top of the message object
//         const reaction = message.reactions.get(emoji);
//         // Adds the currently reacting user to the reaction's users collection.
//         if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
//         // Check which type of event it is before emitting
//         if (packet.t === 'MESSAGE_REACTION_ADD') {
//             client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
//         }
//         if (packet.t === 'MESSAGE_REACTION_REMOVE') {
//             client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
//         }
//     });
// });

client.on('message', async (msg) => {
    try {
        if (msg.partial) {
            // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
            try {
                await msg.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message: ', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
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
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.prole)) {
            await msg.reply(`<@${msg.member.id}>, please have an admin add you to the proper player role to use this bot`);
            return;
        }
        if (msg.content === guildConfig.prefix + 'help') {
            help.handleHelp(msg, guildConfig, Config.inviteURL);
        } else if (msg.content.startsWith(guildConfig.prefix + 'register manual')) {
            characters.handleRegisterManual(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'register')) {
            characters.handleRegister(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'update manual')) {
            characters.handleUpdateManual(msg, guildConfig);
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
        } else if (msg.content.startsWith(guildConfig.prefix + 'default')) {
            users.handleDefault(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event create')) {
            events.handleEventCreate(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event edit')) {
            events.handleEventEdit(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event remove')) {
            events.handleEventRemove(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event show')) {
            events.handleEventShow(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event list proposed')) {
            events.handleEventListProposed(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event list deployed')) {
            events.handleEventListDeployed(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'event list')) {
            events.handleEventList(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'timezone set')) {
            users.handleTimezoneSet(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'timezone')) {
            users.handleTimezone(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config approval')) {
            handleConfigApproval(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config prefix')) {
            handleConfigPrefix(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config arole')) {
            handleConfigArole(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config prole')) {
            handleConfigProle(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config require')) {
            handleConfigRequire(msg, guildConfig);
        } else if (msg.content.startsWith(guildConfig.prefix + 'config')) {
            handleConfig(msg, guildConfig);
        }
    } catch (error) {
        await msg.reply(`unrecoverable ... ${error.message}`);
    }
});

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
            .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
            .setDescription('BOT Config for the server: ' + msg.guild.name)
            .setThumbnail(msg.guild.iconURL())
        configEmbed.addFields(
            { name: 'ID', value: guildConfig.guildID },
            { name: 'Prefix', value: guildConfig.prefix, inline: true },
            { name: 'Approver Role', value: retrieveRoleForID(msg, guildConfig.arole), inline: true },
            { name: 'Player Role', value: retrieveRoleForID(msg, guildConfig.prole), inline: true },
            { name: 'Approval Required', value: guildConfig.requireCharacterApproval, inline: true },
            { name: 'Char Req 4 Events', value: guildConfig.requireCharacterForEvent, inline: true },
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
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configAroleName = msg.content.substring((guildConfig.prefix + 'config arole').length + 1);
            if (configAroleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configAroleId = configAroleName.substring(3, configAroleName.length - 1);
                configAroleName = retrieveRoleForID(msg, configAroleId).name;
            }
            configArole = await retrieveRoleIdForName(msg, configAroleName);
            if (configArole) {
                guildConfig.arole = configArole;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await msg.channel.send(`<@${msg.member.id}>, ${configAroleName} is now the \`approver\` role.`);
                await msg.delete();
            } else {
                await msg.reply(`<@${msg.member.id}>, could not locate the role: ${configAroleName}`);
            }
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask a <@&${guildConfig.arole}> to configure.`);
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
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configProleName = msg.content.substring((guildConfig.prefix + 'config arole').length + 1);
            if (configProleName.startsWith('<@&')) {
                // need to strip the tailing '>' off as well ...
                const configProleId = configProleName.substring(3, configProleName.length - 1);
                configProleName = retrieveRoleForID(msg, configProleId).name;
            }
            configProle = await retrieveRoleIdForName(msg, configProleName);
            if (configProle) {
                guildConfig.prole = configProle;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await msg.channel.send(`<@${msg.member.id}>, ${configProleName} is now the \`player\` role.`);
                await msg.delete();
            } else {
                await msg.reply(`<@${msg.member.id}>, could not locate the role: ${configProleName}`);
            }
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask a <@&${guildConfig.arole}> to configure.`);
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
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configPrefix = msg.content.substring((guildConfig.prefix + 'config prefix').length + 1);
            guildConfig.prefix = configPrefix;
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(`<@${msg.member.id}>, \`${guildConfig.prefix}\` is now my prefix, don't forget!.`);
            await msg.delete();
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask a <@&${guildConfig.arole}> to configure.`);
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
async function handleConfigApproval(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            guildConfig.requireCharacterApproval = msg.content.substring((guildConfig.prefix + 'config approval').length + 1);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(`<@${msg.member.id}>, Require Approval now set to: \`${guildConfig.requireCharacterApproval}\`.`);
            await msg.delete();
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask a <@&${guildConfig.arole}> to configure.`);
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
async function handleConfigRequire(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            guildConfig.requireCharacterForEvent = msg.content.substring((guildConfig.prefix + 'config require').length + 1);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await msg.channel.send(`<@${msg.member.id}>, Require Approval now set to: \`${guildConfig.requireCharacterApproval}\`.`);
            await msg.delete();
        } else {
            await msg.reply(`<@${msg.member.id}>, please ask a <@&${guildConfig.arole}> to configure.`);
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
            guildConfig = await GuildModel.findOne({ guildID: msg.guild.id });
            if (!guildConfig) {
                guildConfig = new GuildModel({ guildID: msg.guild.id });
            }
            // console.log(guildConfig);
            if (typeof guildConfig.arole === 'undefined' || !guildConfig.arole) {
                guildConfig.arole = await retrieveRoleIdForName(msg, Config.defaultARoleName);
            }
            if (typeof guildConfig.prole === 'undefined' || !guildConfig.prole) {
                guildConfig.prole = await retrieveRoleIdForName(msg, Config.defaultPRoleName);
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
async function retrieveRoleIdForName(msg, roleName) {
    let roleForName;
    let roles = await msg.guild.roles.fetch();
    // console.log('roles', roles);
    for (let role of roles.array()) {
        // roles.array().forEach((role) => {
        // console.log("role: " + role.name + ' : ' + roleName);
        if (role.name == roleName || '@' + role.name == roleName) {
            roleForName = role;
        }
    }
    console.log("found rolename: " + roleForName.id);
    return roleForName.id;
}

/**
 * 
 * @param {Message} msg 
 * @param {String} roleID 
 * @returns {Role}
 */
function retrieveRoleForID(msg, roleID) {
    console.log('retrieveRoleID: ' + roleID);
    let roleForID = msg.guild.roles.resolve(roleID);
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
    for (let field of embed.fields) {
        // embed.fields.forEach((field) => {
        embedLength += field.name.length + field.value.length;
    }
    console.log('EmbedLengthCheck: %d', embedLength);
    return embedLength;
}