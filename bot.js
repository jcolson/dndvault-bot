const cron = require('node-cron');
const path = require('path');
const NodeCache = require("node-cache");
const { Client } = require('discord.js');
const { connect, disconnect } = require('mongoose');

const events = require('./handlers/events.js');
const users = require('./handlers/users.js');
const config = require('./handlers/config.js');
const poll = require('./handlers/poll.js');
const utils = require('./utils/utils.js');
const commands = require('./utils/commands.js');

const client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'] });

/**
 * scheduled cron for calendar reminders
 */
let calendarReminderCron;

Client.prototype.dnd_users = users;
Client.prototype.dnd_events = events;
Client.prototype.dnd_config = config;

require('log-timestamp')(function () { return `[${new Date().toISOString()}] [shrd:${client.shard.ids}] %s` });

global.vaultVersion = require('./package.json').version;
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, './config.json'));
global.GuildCache = new NodeCache({ stdTTL: 86400, checkperiod: 14400 });
// @todo rename global.client --- wtf was i thinking keeping the same variable name?
global.client = client;
global.COMMANDS = commands.COMMANDS;

/**
 * connect to the mongodb
 */
(async () => {
    console.info('connecting as mongo user: %s ...', Config.mongoUser);
    await connect(`mongodb://${Config.mongoUser}:${Config.mongoPass}@${Config.mongoServer}:${Config.mongoPort}/${Config.mongoSchema}?authSource=${Config.mongoSchema}`, {
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
        console.info(`Running in debug mode, returning guild only discord client-app`);
        // uncomment this line to remove all bot-wide commands (while in debugGuild mode)
        // client.api.applications(client.user.id).commands.put({ data: [] });
        app.guilds(Config.debugGuild);
    }
    return app;
}

async function registerCommands() {
    console.info('registerCommands: BEGIN');
    try {
        // console.debug('shard ids:', client.shard.ids);
        // only register commands if I'm shard id '0'
        if (client.shard.ids.includes(0)) {
            console.info(`registerCommands: ShardId:${client.shard.ids}, registering commands ...`);
            let commandsToRegister = utils.transformCommandsToDiscordFormat(COMMANDS);
            const registeredCommands = await getClientApp().commands.get();
            //console.debug('registeredCommands:', registeredCommands);
            let registerCommands = utils.checkIfCommandsChanged(registeredCommands, commandsToRegister);
            if (registerCommands) {
                console.info('registerCommands: command differences between registered and this version - replacing all ...');
                await getClientApp().commands.put({ data: commandsToRegister });
            } else {
                console.info('registerCommands: no command differences found between registered and this version - nothing to register');
            }
        }
    } catch (error) {
        console.error('registerCommands:', error);
    }
    console.info('registerCommands: END');
}

/**
 * listen for emitted events from discordjs
 */
client.once('ready', async () => {
    console.info(`D&D Vault Bot - logged in as ${client.user.tag} & ${client.user.id}`);
    client.user.setPresence({ activities: [{ name: 'with Tiamat, type /help', type: 'PLAYING' }], status: 'online' });
    registerCommands();
    calendarReminderCron = cron.schedule(Config.calendarReminderCron, async () => {
        await events.sendReminders(client);
        await events.recurEvents(client);
        await events.removeOldSessionPlanningChannels(client);
        await events.removeOldSessionVoiceChannels(client);
    });
});

/**
 * guildCreate
 */
client.on("guildCreate", async (guild) => {
    console.log(`guildCreate: ${guild.id} (${guild.name})`);
    try {
        await config.confirmGuildConfig(guild);
        let channel = utils.locateChannelForMessageSend(guild);
        if (channel) {
            await channel.send({ content: 'Thanks for inviting me!  Use the slash command `/help` to find out how to interact with me.  Roll initiative!' });
        }
    } catch (error) {
        console.error("guildCreate:", error);
    }
});

/**
 * guildDelete
 */
client.on("guildDelete", async (guild) => {
    console.log(`guildDelete: ${guild.id} (${guild.name}) because of: ${guild.unavailable ? guild.unavailable : 'KICKED'}`);
    // if bot was kicked from guild, then this 'unavailable' field will not be populated, otherwise it is just temp unavailable
    if (!guild.unavailable) {
        try {
            await utils.removeAllDataForGuild(guild);
        } catch (error) {
            console.error('guildDelete:', error);
        }
    }
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
        console.error(`messageReactionAdd: Something went wrong when fetching the reaction.message for a partial: ${error.message}`);
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
                if (reaction.message.embeds[0]?.author?.name.startsWith(poll.POLLSTER_AUTHOR)) {
                    console.debug(`messageReactionAdd:POLL:${reaction.message.author}'s"${reaction.message.id}" gained a reaction!`);
                    await poll.handleReactionAdd(reaction, user, guildConfig);
                } else {
                    console.debug(`messageReactionAdd:EVENT:${reaction.message.author}'s "${reaction.message.id}" gained a reaction!`);
                    await events.handleReactionAdd(reaction, user, guildConfig);
                }
            } catch (error) {
                console.error(`messageReactionAdd:caught exception handling reaction`, error);
                await utils.sendDirectOrFallbackToChannelError(error, reaction.message, user);
                // we got an exception, let's make sure to remove this user's reaction
                await reaction.users.remove(user.id);
            }
        }
    }
});

/**
 * handle slash command interactions
 */
client.on('interactionCreate', async (interaction) => {
    // client.ws.on('INTERACTION_CREATE', async (interaction) => {
    let msg = {
        interaction: interaction,
        url: utils.getDiscordUrl(interaction.guildId, interaction.channelId, interaction.id),
    };
    // console.debug(`interaction debug: `, interaction);
    // const { name, options } = interaction.data;
    const command = interaction.commandName;
    try {
        // console.debug("interactionCreate:", interaction);
        if (interaction.channelId) {
            console.debug('interactionCreate: populating channel');
            let channel = await client.channels.resolve(interaction.channelId);
            msg.channel = channel;
        }
        if (interaction.member) {
            console.debug('interactionCreate: populating member & guild');
            msg.member = interaction.member;
            msg.guild = interaction.member.guild;
        }
        if (!msg.guild && interaction.guildId) {
            console.debug('interactionCreate: populating guild');
            let guild = await client.guilds.resolve(interaction.guildId);
            msg.guild = guild;
        }
        if (interaction.user) {
            console.debug('interactionCreate: populating author');
            msg.author = interaction.user;
            if (!msg.member && msg.guild) {
                console.debug('interactionCreate: populating member');
                msg.member = await msg.guild.members.fetch(interaction.user);
            }
        }
        let guildConfig = await config.confirmGuildConfig(msg.guild);
        //let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;
        await commands.handleCommandExec(guildConfig, command, msg, interaction.options.data);
    } catch (error) {
        console.error(`clientOninteractionCreate: msg NOT processed:${msg.interaction ? 'INTERACTION:' : ''}${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${command}:${error.message}`);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
});

client.on('messageCreate', async (msg) => {
    try {
        if (msg.partial) {
            // If the message this was removed the fetching might result in an API error, which we need to handle
            try {
                await msg.fetch();
            } catch (error) {
                console.error(`clientOnMessage: Something went wrong when fetching the message for a partial: ${error.message}`);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
        if (msg.author.bot) {
            // don't do anything if this message was authored by a bot
            return;
        }
        let guildConfig = await config.confirmGuildConfig(msg.guild);
        let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;

        let messageContentLowercase = msg.content.toLowerCase();

        /**
         * handle commands that don't require a guild interaction (can be direct messaged)
         */
        if (messageContentLowercase.startsWith(commandPrefix)) {
            // remove the prefix from content
            messageContentLowercase = messageContentLowercase.substring(commandPrefix.length);
        } else if (msg.guild) {
            // don't do anything if the proper commandprefix isn't there and there is a guild
            return;
        }
        await commands.handleCommandExec(guildConfig, messageContentLowercase, msg);
    } catch (error) {
        console.error(`clientOnMessage: msg NOT processed:${msg.interaction ? 'INTERACTION:' : ''}${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${msg.content}:${error.message}`);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
});

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
    // await cleanShutdown(true);
});

/**
 *
 * @param {boolean} callProcessExit
 */
async function cleanShutdown(callProcessExit) {
    try {
        console.log('Closing out shard resources...');
        calendarReminderCron.stop();
        console.log('Scheduled calendar recuring destroyed.');
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
