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

/**
 * scheduled cron for calendar reminders
 */
let calendarReminderCron;

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
        "description": "Rolls dice, using notation reference",
        "slash": true,
        "options": [{
            "name": "Notation",
            "description": "Dice notation, such as `2d8 + 1d4`",
            "required": true,
            "type": 3
        }]
    },
    "registerManual": {
        "name": "register_manual",
        "description": "Create a stub character, do not use spaces in any of the parameters except the campaign",
        "slash": true,
        "options": [{
            "name": "char_name",
            "description": "Your Character's Name",
            "required": true,
            "type": 3
        }, {
            "name": "char_class",
            "description": "Your Character's Class",
            "required": true,
            "type": 3,
            "choices": characters.ClassLookup
        }, {
            "name": "char_level",
            "description": "Your Character's Level",
            "required": true,
            "type": 4 // integer
        }, {
            "name": "char_race",
            "description": "Your Character's Race",
            "required": true,
            "type": 3,
            "choices": characters.RaceLookup
        }, {
            "name": "campaign_name",
            "description": "The Campaign to associate your character with",
            "required": false,
            "type": 3
        }]
    },
    "register": {
        "name": "register",
        "description": "Register a character in the vault from dndbeyond",
        "slash": true,
        "options": [{
            "name": "url",
            "description": "D&D Beyond Character URL (such as: https://ddb.ac/characters/40573657/IqpZia)",
            "required": true,
            "type": 3
        }]
    },
    "updateManual": {
        "name": "update_manual",
        "description": "Update a stub character, do not use spaces in any of the parameters except the campaign",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "Your Character ID from the `list` command",
            "required": true,
            "type": 3
        }, {
            "name": "char_name",
            "description": "Your Character's Name",
            "required": true,
            "type": 3
        }, {
            "name": "char_class",
            "description": "Your Character's Class",
            "required": true,
            "type": 3,
            "choices": characters.ClassLookup
        }, {
            "name": "char_level",
            "description": "Your Character's Level",
            "required": true,
            "type": 4 //integer
        }, {
            "name": "char_race",
            "description": "Your Character's Race",
            "required": true,
            "type": 3,
            "choices": characters.RaceLookup
        }, {
            "name": "campaign_name",
            "description": "The Campaign to associate your character with",
            "required": false,
            "type": 3
        }]
    },
    "update": {
        "name": "update",
        "description": "Request an update a character from dndbeyond to the vault",
        "slash": true,
        "options": [{
            "name": "url",
            "description": "D&D Beyond Character URL (such as: https://ddb.ac/characters/40573657/IqpZia)",
            "required": true,
            "type": 3
        }]
    },
    "changes": {
        "name": "changes",
        "description": "Display changes for an unapproved character update",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "Your Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    },
    "campaign": {
        "name": "campaign",
        "description": "Update character to override dndbeyond's campaign name, this does NOT update dndbeyond's campaign",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "Your Character ID from the `list` command",
            "required": true,
            "type": 3
        }, {
            "name": "campaign_id",
            "description": "The Campaign ID which you'd like to associate this character",
            "required": true,
            "type": 3
        }]
    },
    "listCampaign": {
        "name": "list_campaign",
        "description": "List all characters registered for a campaign",
        "slash": true,
        "options": [{
            "name": "campaign_id",
            "description": "The Campaign ID which you'd like to see characters for",
            "required": true,
            "type": 3
        }]
    },
    "listUser": {
        "name": "list_user",
        "description": "List all characters by discord user",
        "slash": true,
        "options": [{
            "name": "user_id",
            "description": "The user for which you'd like to see characters",
            "required": true,
            "type": 6 // discord user
        }]
    },
    "listAll": {
        "name": "list_all",
        "description": "List all characters",
        "slash": true,
    },
    "listQueued": {
        "name": "list_queued",
        "description": "List all characters queued for approval",
        "slash": true,
    },
    "list": {
        "name": "list",
        "description": "List YOUR registered characters within vault",
        "slash": true,
    },
    "remove": {
        "name": "remove",
        "description": "Remove a character (or pending update) from the vault, if username is passed, remove for that user",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "Your Character ID from the `list` command",
            "required": true,
            "type": 3
        }, {
            "name": "user_id",
            "description": "The user for which you'd like to see characters",
            "required": false,
            "type": 6 // discord user
        }]
    },
    "approve": {
        "name": "approve",
        "description": "Approve a new/updated character within vault",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    },
    "show": {
        "name": "show",
        "description": "Show a user's character from the vault",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    },
    "eventCreate": {
        "name": "event_create",
        "description": "Creates an event PROPOSAL that users can sign up for",
        "slash": true,
        "options": [{
            "name": "title",
            "description": "The title of this event",
            "required": true,
            "type": 3
        }, {
            "name": "at",
            "description": "The time at which this event will start",
            "required": true,
            "type": 3
        }, {
            "name": "for",
            "description": "The number of hours that this event will run for",
            "required": true,
            "type": 3
        }, {
            "name": "on",
            "description": "The date on which this event will start",
            "required": true,
            "type": 3
        }, {
            "name": "with",
            "description": "The number of attendee slot available to join this event",
            "required": true,
            "type": 4 //integer
        }, {
            "name": "desc",
            "description": "Event description, including playstyle, pings, etc",
            "required": true,
            "type": 3
        }, {
            "name": "dmgm",
            "description": "The DM/GM for this event",
            "required": false,
            "type": 6 // discord user
        }, {
            "name": "campaign",
            "description": "Campaign associated to event",
            "required": false,
            "type": 3
        }]
    },
    "eventEdit": "event edit",
    "eventRemove": "event remove",
    "eventShow": "event show",
    "eventListProposed": "event list proposed",
    "eventListDeployed": "event list deployed",
    "eventList": "event list",
    "poll": {
        "name": "poll",
        "description": "Create a Poll to get input from the server users",
        "slash": true,
        "options": [{
            "name": "poll_question",
            "description": "Your question for the poll",
            "required": true,
            "type": 3
        }, {
            "name": "option_0",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_1",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_2",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_3",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_4",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_5",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_6",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_7",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_8",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }, {
            "name": "option_9",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }]
    },
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
    console.info('registerCommands: BEGIN');
    let commandsToKeep = [];
    let commandsToRegister = [];
    for (let [commandKey, commandValue] of Object.entries(COMMANDS)) {
        if (commandValue.slash) {
            // console.info("registerCommands: command key and value to register", commandKey, commandValue);
            commandsToKeep.push(commandValue.name);
            // await getClientApp().commands.post({
            //     data: commandValue,
            // });
            commandsToRegister.push(
                commandValue
            );
        }
    }
    // console.debug(JSON.stringify({data: commandsToRegister}));
    await getClientApp().commands.put({data: commandsToRegister});
    /**
     * this is not necessary, as the `commands.put` replaces all commands, so left overs should be auto-removed?
     * if the single `post` method is used, then this is required
     */
    // const registeredCommands = await getClientApp().commands.get();
    // console.debug("registerCommands: commandsToKeep & registeredCommands", commandsToKeep, registeredCommands);
    // for (const command of registeredCommands) {
    //     // console.debug("registerCommands: command", command.name);
    //     if (!commandsToKeep.includes(command.name)) {
    //         console.info("registerCommands: removing command ", command);
    //         await getClientApp().commands(command.id).delete();
    //     }
    // }
    console.info('registerCommands: END');
}

/**
 * listen for emitted events from discordjs
 */
client.on('ready', async () => {
    console.info(`D&D Vault Bot - logged in as ${client.user.tag}`);
    client.user.setPresence({ activity: { name: 'with Tiamat, type /help', type: 'PLAYING' }, status: 'online' });
    registerCommands();
    calendarReminderCron = cron.schedule(Config.calendarReminderCron, () => {
        events.sendReminders(client);
    });
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

        await handleCommandExec(guildConfig, command, msg, options);
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
        let handled = await handleCommandExec(guildConfig, messageContentLowercase, msg);

        if (handled) {
            return;
        }

        let dontLog = false;

        if (messageContentLowercase.startsWith(COMMANDS.eventEdit)) {
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
 * Handle all commands, whether from ! or from /slash commands
 * @param {GuildModel} guildConfig
 * @param {String} messageContentLowercase
 * @param {Message} msg
 * @param {Array} msgParms
 * @returns {Boolean}
 */
async function handleCommandExec(guildConfig, messageContentLowercase, msg, msgParms) {
    /**
     * COMMANDS.command.name can not have spaces in it ... so I used underscores in the command name
     * spaces need to be replaced with _ so that we can match the command name
     * (commands used to have spaces in them with old-school prefix method)
     */
    messageContentLowercase = messageContentLowercase.replace(' ', '_');
    let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;

    let handled = true;

    if (messageContentLowercase.startsWith(COMMANDS.help.name)) {
        msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.help.name, commandPrefix);
        help.handleHelp(msg, msgParms, commandPrefix);
    } else if (messageContentLowercase.startsWith(COMMANDS.stats.name)) {
        config.handleStats(msg);
    } else if (messageContentLowercase.startsWith(COMMANDS.roll.name)) {
        msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.roll.name, commandPrefix);
        roll.handleDiceRoll(msg, msgParms);
    } else if (!msg.guild) {
        await utils.sendDirectOrFallbackToChannel({ name: 'Direct Interaction Error', value: 'Please send commands to me on the server that you wish me to act with.' }, msg);
    } else {
        handled = false;
    }
    if (!handled) {
        handled = true;
        await utils.checkChannelPermissions(msg);
        if (!await users.hasRoleOrIsAdmin(msg.member, guildConfig.prole)) {
            await msg.reply(`<@${msg.member.id}>, please have an admin add you to the proper player role to use this bot`);
        } else if (messageContentLowercase.startsWith(COMMANDS.registerManual.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.registerManual.name, commandPrefix);
            characters.handleRegisterManual(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.register.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.register.name, commandPrefix);
            characters.handleRegister(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.updateManual.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.updateManual.name, commandPrefix);
            characters.handleUpdateManual(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.update.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.update.name, commandPrefix);
            characters.handleUpdate(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.poll.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.poll.name, commandPrefix);
            poll.handlePoll(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.changes.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.changes.name, commandPrefix);
            characters.handleChanges(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.campaign.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.campaign.name, commandPrefix);
            characters.handleCampaign(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listCampaign.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.listCampaign.name, commandPrefix);
            characters.handleListCampaign(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listUser.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.listUser.name, commandPrefix);
            characters.handleListUser(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listAll.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.listAll.name, commandPrefix);
            characters.handleListAll(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.listQueued.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.listQueued.name, commandPrefix);
            characters.handleListQueued(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.list.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.list.name, commandPrefix);
            characters.handleList(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.remove.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.remove.name, commandPrefix);
            characters.handleRemove(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.approve.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.approve.name, commandPrefix);
            characters.handleApprove(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.show.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.show.name, commandPrefix);
            characters.handleShow(msg, msgParms, guildConfig);
        } else if (messageContentLowercase.startsWith(COMMANDS.eventCreate.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.eventCreate.name, commandPrefix);
            events.handleEventCreate(msg, msgParms, guildConfig);
        } else {
            handled = false;
        }
    }
    if (handled) {
        console.log(`msg processed: ${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${messageContentLowercase}:${JSON.stringify(msgParms)}`);
    }
    return handled;
}

/**
 * Pass in the actual message content (not the toLowerCased content, this will take care of that)
 * @param {String} messageContent
 * @param {String} command
 * @param {String} prefix
 * @returns
 */
function parseMessageParms(messageContent, command, prefix) {
    let options = [];
    if (!messageContent) {
        return options;
    }
    /**
     * COMMANDS.command.name can not have spaces in it ... so I used underscores in the command name
     * _ need to be replaced with spaces so that we can match the command name
     * (commands used to have spaces in them with old-school prefix method)
     */
    command = command.replace('_', ' ');
    let messageContentLowercase = messageContent.toLowerCase();
    let commandIndex = messageContentLowercase.indexOf(prefix + command);
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
    //parse event format - ignore ! unless beginning of line or preceded by space
    // const regex = /\!(?:(?! \!).)*/g;
    const regex = /(^\!| \!)(?:(?! \!).)*/g;
    let found = msgParms.match(regex);
    if (found) {
        for (let each of found) {
            // console.debug('each', each);
            let eachSplit = each.trim().split(' ');
            let option = {
                name: eachSplit[0].substring(eachSplit[0].indexOf('!') + 1),
                value: eachSplit.slice(1).join(' '),
            };
            options.push(option);
        }
    } else {
        //parse poll format
        const pollRegex = /[^\s"]+|"([^"]*)"/g;
        found = msgParms.match(pollRegex);
        if (found) {
            for (let each of found) {
                each = each.replace(/^"(.*)"$/, '$1');
                let option = { value: each };
                options.push(option);
            }
        } else {
            //parse spaces
            found = msgParms.split(' ');
            if (found) {
                for (let each of found) {
                    let option = { value: each };
                    options.push(option);
                }
            }
        }
    }
    console.debug(`parseMessageParms: "${prefix}" "${command}" "${commandIndex}" - ${msgParms}`, options);
    return options;
    // return msgParms;
}

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
