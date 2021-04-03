const cron = require('node-cron');
const path = require('path');
const { Client, GuildMember, User } = require('discord.js');
const { connect, disconnect } = require('mongoose');

const characters = require('./handlers/characters.js');
const events = require('./handlers/events.js');
const help = require('./handlers/help.js');
const users = require('./handlers/users.js');
const config = require('./handlers/config.js');
const utils = require('./utils/utils.js');
const poll = require('./handlers/poll.js');
const roll = require('./handlers/roll.js');

const DEFAULT_CONFIGDIR = __dirname;
const client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

Client.prototype.dnd_users = users;

require('log-timestamp')(function () { return `[${new Date().toISOString()}] [shrd:${client.shard.ids}] %s` });

global.vaultVersion = require('./package.json').version;
global.Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));
global.client = client;

const COMMANDS = {
    "help": {
        "name": "help",
        "description": "Get help about D&D Vault Bot",
        "slash": true
    },
    "stats": {
        "name": "stats",
        "description": "Get statistics about bot",
        "slash": false
    },
    "roll": {
        "name": "roll",
        "description": "Roll dice",
        "slash": true,
        "options": [{
            "name": "Notation",
            "description": "Dice notation, such as `2d8 + 1d4`",
            "required": true,
            "type": 3
        }]
    },
    "registerManual": "register manual",
    "register": "register",
    "updateManual": "update manual",
    "update": "update",
    "changes": "changes",
    "campaign": "campaign",
    "listCampaign": "list campaign",
    "listUser": "list user",
    "listAll": "list all",
    "listQueued": "list queued",
    "list": "list",
    "remove": "remove",
    "approve": "approve",
    "show": "show",
    "eventCreate": "event create",
    "eventEdit": "event edit",
    "eventRemove": "event remove",
    "eventShow": "event show",
    "eventListProposed": "event list proposed",
    "eventListDeployed": "event list deployed",
    "eventList": "event list",
    "poll": "poll",
    "default": "default",
    "timezone": "timezone",
    "configApproval": "config approval",
    "configEventchannel": "config eventchannel",
    "configPollchannel": "config pollchannel",
    "configPrefix": "config prefix",
    "configArole": "config arole",
    "configProle": "config prole",
    "configCampaign": "config campaign",
    "config": "config"
};

/**
 * connect to the mongodb
 */
(async () => {
    console.info('connecting as mongo user: %s ...', Config.mongoUser);
    await connect('mongodb://' + Config.mongoUser + ':' + Config.mongoPass + '@' + Config.mongoServer + ':' + Config.mongoPort + '/' + Config.mongoSchema + '?authSource=' + Config.mongoSchema, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
    console.info('Connected to mongo DB.  Logging into Discord now ...');
    return client.login(Config.token);
})();

function getClientApp() {
    const app = client.api.applications(client.user.id)
    if (Config.debugGuild) {
        app.guilds(Config.debugGuild);
    }
    return app;
}

async function registerCommands() {
    let commandsToKeep = [];
    for (let [commandKey, commandValue] of Object.entries(COMMANDS)) {
        if (commandValue.slash) {
            console.info("registerCommands: command key and value to register", commandKey, commandValue);
            commandsToKeep.push(commandValue.name);
            await getClientApp().commands.post({
                data: commandValue,
            });
        }
    }
    // console.debug("registerCommands: commandsToKeep", commandsToKeep);
    const registeredCommands = await getClientApp().commands.get();
    for (const command of registeredCommands) {
        // console.debug("registerCommands: command", command.name);
        if (!commandsToKeep.includes(command.name)) {
            console.info("registerCommands: removing command ", command);
            await getClientApp().commands(command.id).delete();
        }
    }
}

/**
 * listen for emitted events from discordjs
 */
client.on('ready', async () => {
    console.info(`D&D Vault Bot - logged in as ${client.user.tag}`);
    client.user.setPresence({ activity: { name: 'with Tiamat, type !help', type: 'PLAYING' }, status: 'online' });
    await registerCommands();
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
    if (reaction.message.author.id === reaction.message.guild.me.id) {
        console.info(`messageReactionAdd:${reaction.message.guild.name}:${user.username}(bot?${user.bot}):${reaction.emoji.name}:${reaction.message.content}`);
        if (!user.bot) {
            try {
                // Now the message has been cached and is fully available
                await utils.checkChannelPermissions(reaction.message);
                let guildConfig = await config.confirmGuildConfig(reaction.message.guild);
                if (reaction.message.embeds && reaction.message.embeds[0].author && reaction.message.embeds[0].author.name == 'Pollster') {
                    console.debug(`messageReactionAdd:POLL:${reaction.message.author}'s"${reaction.message.id}" gained a reaction!`);
                    await poll.handleReactionAdd(reaction, user, guildConfig);
                } else {
                    console.debug(`messageReactionAdd:EVENT:${reaction.message.author}'s "${reaction.message.id}" gained a reaction!`);
                    await events.handleReactionAdd(reaction, user, guildConfig);
                }
            } catch (error) {
                console.error(`messageReactionAdd:caught exception handling reaction`, error);
                await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
            }
        }
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

/**
 * handle slash command interactions
 */
client.ws.on('INTERACTION_CREATE', async (interaction) => {
    let msg = {
        interaction: interaction,
        url: utils.getDiscordUrl(interaction.guild_id, interaction.channel_id, interaction.id),
    };
    try {
        // console.debug("INTERACTION_CREATE:", interaction);
        if (interaction.guild_id) {
            let guild = await client.guilds.resolve(interaction.guild_id);
            msg.guild = guild;
        }
        if (interaction.channel_id) {
            let channel = await client.channels.resolve(interaction.channel_id);
            msg.channel = channel;
        }
        if (interaction.member) {
            let member = new GuildMember(client, interaction.member, msg.guild);
            msg.member = member;
            msg.author = member.user;
        }
        if (interaction.user) {
            let user = new User(client, interaction.user);
            msg.author = user;
        }
        let guildConfig = await config.confirmGuildConfig(msg.guild);
        let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;

        const { name, options } = interaction.data;
        const command = name.toLowerCase();

        console.debug('INTERACTIVE_CREATE:', command);

        if (command === COMMANDS.help.name) {
            // throw new Error('test');
            help.handleHelp(msg, commandPrefix);
        } else if (command === COMMANDS.roll.name) {
            roll.handleDiceRoll(msg, options[0].value);
        } else {
            utils.clientWsReply(interaction, 'Unkown interaction.');
        }
    } catch (error) {
        console.error('INTERACTION_CREATE:', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
});

client.on('message', async (msg) => {
    try {
        if (msg.partial) {
            // If the message this was removed the fetching might result in an API error, which we need to handle
            try {
                await msg.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message: ', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
        if (msg.author.bot) {
            // it's a message from a bot, ignore
            // if (!msg.guild) {
            //     console.info(`msg: DIRECT:${msg.author.tag}:${msg.content}:bot message, ignoring`);
            // } else {
            //     console.debug(`msg: ${msg.guild.name}:${msg.author.tag}(${msg.member?msg.member.displayName:'unknown'}):${msg.content}:bot message, ignoring`);
            // }
            return;
        }
        let guildConfig = await config.confirmGuildConfig(msg.guild);
        let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;

        let messageContentLowercase = msg.content.toLowerCase();

        /**
         * handle commands that don't require a guild interaction (can be direct messaged)
         */
        let handled = false;
        if (messageContentLowercase.startsWith(commandPrefix)) {
            // remove the prefix from content
            messageContentLowercase = messageContentLowercase.substring(commandPrefix.length);
        } else if (msg.guild) {
            // don't do anything if the proper commandprefix isn't there and there is a guild
            return;
        }

        if (messageContentLowercase.includes(COMMANDS.help.name)) {
            help.handleHelp(msg, commandPrefix);
            handled = true;
        } else if (messageContentLowercase.includes(COMMANDS.stats.name)) {
            config.handleStats(msg);
            handled = true;
        } else if (messageContentLowercase.includes(COMMANDS.roll.name)) {
            let msgParms = parseMessageParms(msg.content, COMMANDS.roll.name, commandPrefix);
            roll.handleDiceRoll(msg, msgParms);
            handled = true;
        } else if (!msg.guild) {
            await utils.sendDirectOrFallbackToChannel({ name: 'Direct Interaction Error', value: 'Please send commands to me on the server that you wish me to act with.' }, msg);
            return;
        }

        if (handled) {
            console.log(`msg processed: ${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${msg.content}`);
            return;
        }

        // console.log(`messageContentLowercase: ${messageContentLowercase}`);
        await utils.checkChannelPermissions(msg);
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.prole)) {
            await msg.reply(`<@${msg.member.id}>, please have an admin add you to the proper player role to use this bot`);
            return;
        }

        let dontLog = false;
        if (messageContentLowercase.startsWith(COMMANDS.registerManual)) {
            let msgParms = parseMessageParms(msg.content, COMMANDS.registerManual, commandPrefix);
            characters.handleRegisterManual(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.register)) {
            let msgParms = parseMessageParms(msg.content, COMMANDS.register, commandPrefix);
            characters.handleRegister(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.updateManual)) {
            let msgParms = parseMessageParms(msg.content, COMMANDS.updateManual, commandPrefix);
            characters.handleUpdateManual(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.update)) {
            let msgParms = parseMessageParms(msg.content, COMMANDS.update, commandPrefix);
            characters.handleUpdate(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.changes)) {
            characters.handleChanges(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.campaign)) {
            characters.handleCampaign(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listCampaign)) {
            characters.handleListCampaign(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listUser)) {
            characters.handleListUser(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listAll)) {
            characters.handleListAll(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listQueued)) {
            characters.handleListQueued(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.list)) {
            characters.handleList(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.remove)) {
            characters.handleRemove(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.approve)) {
            characters.handleApprove(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.show)) {
            characters.handleShow(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventCreate)) {
            events.handleEventCreate(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventEdit)) {
            events.handleEventEdit(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventRemove)) {
            events.handleEventRemove(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventShow)) {
            events.handleEventShow(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventListProposed)) {
            events.handleEventListProposed(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventListDeployed)) {
            events.handleEventListDeployed(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventList)) {
            events.handleEventList(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.poll)) {
            poll.handlePoll(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.default)) {
            users.handleDefault(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.timezone)) {
            users.handleTimezone(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configApproval)) {
            config.handleConfigApproval(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configEventchannel)) {
            config.handleConfigEventChannel(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configPollchannel)) {
            config.handleConfigPollChannel(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configPrefix)) {
            config.handleConfigPrefix(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configArole)) {
            config.handleConfigArole(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configProle)) {
            config.handleConfigProle(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.configCampaign)) {
            config.handleConfigCampaign(msg, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.config)) {
            config.handleConfig(msg, guildConfig);
        } else {
            dontLog = true;
        }
        if (!dontLog) {
            console.log(`msg processed: ${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${msg.content}`);
        }
    } catch (error) {
        console.error('on_message: ', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
});

/**
 * Pass in the actual message content (not the toLowerCased content, this will take care of that)
 * @param {String} messageContent
 * @param {String} command
 * @param {String} prefix
 * @returns
 */
function parseMessageParms(messageContent, command, prefix) {
    let messageContentLowercase = messageContent.toLowerCase();
    let commandIndex = messageContent.indexOf(prefix + command);
    if (commandIndex == -1) {
        commandIndex = messageContentLowercase.indexOf(command);
        if (commandIndex == -1) {
            throw new Error("Command parameters could not be parsed");
        } else {
            commandIndex += command.length;
        }
    } else {
        commandIndex += (prefix + command).length;
    }
    let msgParms = messageContent.substring(commandIndex).trim();
    // console.debug(`parseMessageParms: "${prefix}" "${command}" "${commandIndex}" - ${msgParms}`);
    return msgParms;
}

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

process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received.');
    await cleanShutdown(true);
});

process.on('SIGINT', async () => {
    console.info('SIGINT signal received.');
    await cleanShutdown(true);
});

process.on('SIGUSR1', async () => {
    console.info('SIGUSR1 signal received.');
    await cleanShutdown(true);
});

process.on('SIGUSR2', async () => {
    console.info('SIGUSR2 signal received.');
    await cleanShutdown(true);
});

process.on('uncaughtException', async (error) => {
    console.info('uncaughtException signal received.', error);
    await cleanShutdown(true);
});

/**
 * scheduled cron for calendar reminders
 */
const calendarReminderCron = cron.schedule(Config.calendarReminderCron, () => {
    events.sendReminders(client);
});

/**
 *
 * @param {boolean} callProcessExit
 */
async function cleanShutdown(callProcessExit) {
    try {
        console.log('Closing out shard resources...');
        calendarReminderCron.destroy();
        console.log('Scheduled calendar reminders destroyed.');
        client.destroy();
        console.log('Discord client destroyed.');
        // boolean means [force], see in mongoose doc
        await disconnect();
        console.log('MongoDb connection closed.');
    } catch (error) {
        console.error("could not cleanly shutdown shard", error);
    }
    if (callProcessExit) {
        console.log('Exiting.');
        process.exit(0);
    }
}
