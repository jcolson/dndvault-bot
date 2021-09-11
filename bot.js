const cron = require('node-cron');
const path = require('path');
const NodeCache = require("node-cache");
const { Client } = require('discord.js');
const { connect, disconnect } = require('mongoose');

const characters = require('./handlers/characters.js');
const events = require('./handlers/events.js');
const help = require('./handlers/help.js');
const users = require('./handlers/users.js');
const config = require('./handlers/config.js');
const utils = require('./utils/utils.js');
const poll = require('./handlers/poll.js');
const roll = require('./handlers/roll.js');
const insult = require('./handlers/insult.js');

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
global.client = client;

global.COMMANDS = {
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
    "kick": {
        "name": "kick",
        "description": "D&D Bot should leave this server",
        "slash": false,
        "options": [{
            "name": "server_id",
            "description": "The server (guild) id to have the bot leave",
            "required": true,
            "type": 3
        }]
    },
    "rollStats": {
        "name": "roll_stats",
        "description": "Rolls for D&D 5E stats.",
        "slash": true
    },
    "roll": {
        "name": "roll",
        "description": "Rolls dice, using notation reference",
        "slash": true,
        "options": [{
            "name": "notation",
            "description": "Dice notation, such as `2d8 + 1d4` or `8d20dl2` (8 d20, drop lowest 2)",
            "required": false,
            "type": 3
        }]
    },
    "registerManual": {
        "name": "register_manual",
        "description": "Create a stub character if you don't have a character on dndbeyond",
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
            "required": false,
            "type": 3
        }, {
            "name": "char_class",
            "description": "Your Character's Class",
            "required": false,
            "type": 3,
            "choices": characters.ClassLookup
        }, {
            "name": "char_level",
            "description": "Your Character's Level",
            "required": false,
            "type": 4 //integer
        }, {
            "name": "char_race",
            "description": "Your Character's Race",
            "required": false,
            "type": 3,
            "choices": characters.RaceLookup
        }, {
            "name": "campaign_name",
            "description": "The Campaign to associate your character with",
            "required": false,
            "type": 3
        }, {
            "name": "gp",
            "description": "Gold Pieces (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "sp",
            "description": "Silver Pieces (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "cp",
            "description": "Copper Pieces (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "pp",
            "description": "Platinum Pieces (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "ep",
            "description": "Electrum Pieces (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "xp",
            "description": "Experience Points (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "inspiration",
            "description": "Character Inspiration",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "hp",
            "description": "Base Hit Points (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "lp",
            "description": "Luck Points (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "tp",
            "description": "Treasure Points (ex: `+10` to add, or `-10` to subtract, or `10` to overwrite current value)",
            "required": false,
            "type": 3,
        }, {
            "name": "inv_add",
            "description": "Add an inventory item",
            "required": false,
            "type": 3,
        }, {
            "name": "inv_remove",
            "description": "Remove an inventory item",
            "required": false,
            "type": 3,
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
            "description": "The Campaign which you'd like to associate this character, if ommitted the override is unset",
            "required": false,
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
            "description": "The number of hours that this event will run for (ex: 3.5)",
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
        }, {
            "name": "recur_every",
            "description": "Recur this event every so many days (ex: 7)",
            "required": false,
            "type": 4 //integer
        }]
    },
    "eventEdit": {
        "name": "event_edit",
        "description": "Edits a pre-existing event using the event's ID",
        "slash": true,
        "options": [{
            "name": "event_id",
            "description": "The event that you wish to edit's ID",
            "required": true,
            "type": 3
        }, {
            "name": "title",
            "description": "The title of this event",
            "required": false,
            "type": 3
        }, {
            "name": "at",
            "description": "The time at which this event will start",
            "required": false,
            "type": 3
        }, {
            "name": "for",
            "description": "The number of hours that this event will run for",
            "required": false,
            "type": 3
        }, {
            "name": "on",
            "description": "The date on which this event will start",
            "required": false,
            "type": 3
        }, {
            "name": "with",
            "description": "The number of attendee slot available to join this event",
            "required": false,
            "type": 4 //integer
        }, {
            "name": "desc",
            "description": "Event description, including playstyle, pings, etc",
            "required": false,
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
        }, {
            "name": "recur_every",
            "description": "Recur this event every so many days (ex: 7)",
            "required": false,
            "type": 4 //integer
        }]
    },
    "eventRemove": {
        "name": "event_remove",
        "description": "Removes a pre-existing event using the event's ID",
        "slash": true,
        "options": [{
            "name": "event_id",
            "description": "The event that you wish to remove's ID",
            "required": true,
            "type": 3
        }]
    },
    "eventShow": {
        "name": "event_show",
        "description": "replace the posting for an event (for instance if it got deleted by accident)",
        "slash": true,
        "options": [{
            "name": "event_id",
            "description": "The event that you wish to show's ID",
            "required": true,
            "type": 3
        }]
    },
    "eventListProposed": {
        "name": "event_list_proposed",
        "description": "List all future PROPOSED events",
        "slash": true,
    },
    "eventListDeployed": {
        "name": "event_list_deployed",
        "description": "List all future DEPLOYED events",
        "slash": true,
    },
    "eventList": {
        "name": "event_list",
        "description": "list all future events (and events from the past few days) (PROPOSed and DEPLOYed)",
        "slash": true,
    },
    "eventSignup": {
        "name": "event_signup",
        "description": "Sign up a player to an event.",
        "slash": true,
        "options": [{
            "name": "event_id",
            "description": "The event that you wish to show's ID",
            "required": true,
            "type": 3
        }, {
            "name": "user_id",
            "description": "The user for which you'd like to see characters",
            "required": true,
            "type": 6 // discord user
        }]
    },
    "eventWithdrawal": {
        "name": "event_withdrawal",
        "description": "Withdrawal a player from an event.",
        "slash": true,
        "options": [{
            "name": "event_id",
            "description": "The event that you wish to show's ID",
            "required": true,
            "type": 3
        }, {
            "name": "user_id",
            "description": "The user for which you'd like to see characters",
            "required": true,
            "type": 6 // discord user
        }]
    },
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
            "name": "allow_multiple",
            "description": "Allow multiple votes in poll (default: false)",
            "required": false,
            "type": 5 // boolean
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
        }, {
            "name": "option_10",
            "description": "Option to choose",
            "required": false,
            "type": 3
        }]
    },
    "default": {
        "name": "default",
        "description": "Set your default character id to be used for events/missions with no campaign",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The chacter id (from `list`) to set as your default.",
            "required": true,
            "type": 3
        }]
    },
    "timezone": {
        "name": "timezone",
        "description": "Set your timezone (required for interacting with events)",
        "slash": true,
        "options": [{
            "name": "timezone",
            "description": "The timezone which to set as your default",
            "required": false,
            "type": 3
        }]
    },
    "config": {
        "name": "config",
        "description": "Show the configuration for your server",
        "slash": true,
        "options": [{
            "name": "reset",
            "description": "Reset config to defaults. (prefix/arole/prole/default channels/etc)",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "prole",
            "description": "Role to set as player role.",
            "required": false,
            "type": 9 // 8 role, 9 mentionable
        }, {
            "name": "arole",
            "description": "Role to set as approver role.",
            "required": false,
            "type": 9 // 8 role, 9 mentionable
        }, {
            "name": "pollchannel",
            "description": "Channel to send all polls to.",
            "required": false,
            "type": 7 // channel
        }, {
            "name": "eventrequireapprover",
            "description": "Require approver to create & edit events.",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "eventchannel",
            "description": "Channel to send all events to.",
            "required": false,
            "type": 7 // channel
        }, {
            "name": "eventstandby",
            "description": "Does your server support standby queuing on events?",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "channelcategory",
            "description": "Channel Category to autocreate event planning channels in.",
            "required": false,
            "type": 3
        }, {
            "name": "voicecategory",
            "description": "Channel Category to autocreate event voice channels in.",
            "required": false,
            "type": 3
        }, {
            "name": "voiceperms",
            "description": "Autocreate event voice channels with these permissions.",
            "required": false,
            "type": 3,
            "choices": [
                {
                    "name": "Attendees Only",
                    "value": "attendees"
                },{
                    "name": "Everyone Speak",
                    "value": "everyone_speak"
                },{
                    "name": "Everyone Listen",
                    "value": "everyone_listen"
                }
            ]
        }, {
            "name": "channeldays",
            "description": "The number of days after an event that the planning channel should be removed",
            "required": false,
            "type": 4 // Integer
        }, {
            "name": "characterapproval",
            "description": "Configure if character registration and updates require arole approval?",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "campaign",
            "description": "Configure if required that a user have matching character for event's campaigns when signing up",
            "required": false,
            "type": 5 // boolean
        }, {
            "name": "prefix",
            "description": "New prefix to use for all commands, don't forget what you use!",
            "required": false,
            "type": 3
        }]
    },
    "insult": {
        "name": "insult",
        "description": "Generate an Insult for Vicious Mockery!",
        "slash": true
    },
    "eventAttendance": {
        "name": "event_attendance",
        "description": "Report event attendance.",
        "slash": true,
        "options": [{
            "name": "from_date",
            "description": "The date FROM which to generate report.",
            "required": false,
            "type": 3
        }, {
            "name": "end_date",
            "description": "The END date which to generate report.",
            "required": false,
            "type": 3
        }]
    }
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
    client.user.setPresence({ activity: { name: 'with Tiamat, type /help', type: 'PLAYING' }, status: 'online' });
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
        await handleCommandExec(guildConfig, command, msg, interaction.options.data);
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
        await handleCommandExec(guildConfig, messageContentLowercase, msg);
    } catch (error) {
        console.error(`clientOnMessage: msg NOT processed:${msg.interaction ? 'INTERACTION:' : ''}${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${msg.content}:${error.message}`);
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
    messageContentLowercase = messageContentLowercase.replace(/ /g, '_');
    console.debug('handleCommandExec: ', messageContentLowercase);
    let commandPrefix = guildConfig ? guildConfig.prefix : Config.defaultPrefix;
    let handled = true;
    try {
        if (messageContentLowercase.startsWith(COMMANDS.help.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.help.name, commandPrefix);
            help.handleHelp(msg, msgParms, commandPrefix);
        } else if (messageContentLowercase.startsWith(COMMANDS.stats.name)) {
            config.handleStats(msg);
        } else if (messageContentLowercase.startsWith(COMMANDS.kick.name)) {
            msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS.kick.name, commandPrefix);
            config.handleKick(msg, msgParms);
        } else if (!msg.guild) {
            await utils.sendDirectOrFallbackToChannel({ name: 'Direct Interaction Error', value: 'Please send commands to me on the server that you wish me to act with.' }, msg);
        } else {
            handled = false;
        }
        if (!handled) {
            handled = true;
            await utils.checkChannelPermissions(msg);
            let userHasSufficientRole = await users.hasRoleOrIsAdmin(msg.member, guildConfig.prole);
            let findCommand = Object.keys(COMMANDS).find((theCommand) => {
                // console.debug('findcommand', theCommand);
                return messageContentLowercase.startsWith(COMMANDS[theCommand].name);
            }, messageContentLowercase);
            // console.debug('findcommand RESULT', findCommand);
            if (findCommand && userHasSufficientRole) {
                msgParms = msgParms ? msgParms : parseMessageParms(msg.content, COMMANDS[findCommand].name, commandPrefix);
                switch (COMMANDS[findCommand].name) {
                    case COMMANDS.rollStats.name:
                        roll.handleDiceRollStats(msg, msgParms);
                        break;
                    case COMMANDS.roll.name:
                        roll.handleDiceRoll(msg, msgParms);
                        break;
                    case COMMANDS.registerManual.name:
                        characters.handleRegisterManual(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.register.name:
                        characters.handleRegister(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.updateManual.name:
                        xformArrayToMsgParms(COMMANDS.updateManual, msgParms);
                        characters.handleUpdateManual(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.update.name:
                        characters.handleUpdate(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.poll.name:
                        poll.handlePoll(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.changes.name:
                        characters.handleChanges(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.campaign.name:
                        characters.handleCampaign(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.listCampaign.name:
                        characters.handleListCampaign(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.listUser.name:
                        characters.handleListUser(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.listAll.name:
                        characters.handleListAll(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.listQueued.name:
                        characters.handleListQueued(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.list.name:
                        characters.handleList(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.remove.name:
                        characters.handleRemove(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.approve.name:
                        characters.handleApprove(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.show.name:
                        characters.handleShow(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventCreate.name:
                        events.handleEventCreate(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventEdit.name:
                        events.handleEventEdit(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventRemove.name:
                        events.handleEventRemove(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventShow.name:
                        events.handleEventShow(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventListProposed.name:
                        events.handleEventListProposed(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventListDeployed.name:
                        events.handleEventListDeployed(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventList.name:
                        events.handleEventList(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventAttendance.name:
                        events.handleEventAttendance(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventSignup.name:
                        events.handleEventSignup(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.eventWithdrawal.name:
                        events.handleEventWithdrawal(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.default.name:
                        users.handleDefault(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.timezone.name:
                        users.handleTimezone(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.config.name:
                        config.handleConfig(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.insult.name:
                        insult.handleInsult(msg, msgParms, guildConfig);
                        break;
                    default:
                        handled = false;
                }
            } else if (findCommand && !userHasSufficientRole) {
                console.info(`handleCommandExec: <@${msg.member.id}>, please have an admin add you to the proper player role to use this bot`);
                await utils.sendDirectOrFallbackToChannel({ name: 'Insufficient Privileges', value: `Please have an admin add you to the proper role to use this bot` }, msg);
            } else {
                handled = false;
            }
        }
        // console.debug('handled', handled);
        if (handled) {
            console.log(`msg processed:${msg.interaction ? 'INTERACTION:' : ''}${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${messageContentLowercase}:${JSON.stringify(msgParms)}`);
        }
    } catch (error) {
        console.error('handleCommandExec: ', error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
    return handled;
}

/**
 * if paramArray didn't come from a slash command, it won't have the 'name's of each of the params
 * this function names the parameters so that they can be used by name in the update function
 * @param {Object} globalCommand (ex: COMMANDS.updateManual)
 * @param {Array} msgParms
 */
function xformArrayToMsgParms(globalCommand, msgParms) {
    for (let i = 0; i < msgParms.length; i++) {
        if (!msgParms[i].name) {
            msgParms[i].name = globalCommand.options[i].name;
        }
    }
    console.debug(`xformArrayToMsgParms:`, msgParms);
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
    command = command.replace(/_/g, ' ');
    let messageContentLowercase = messageContent.toLowerCase();
    let commandIndex = messageContentLowercase.indexOf(prefix + command);
    if (commandIndex == -1) {
        commandIndex = messageContentLowercase.indexOf(command);
        if (commandIndex == -1) {
            throw new Error(`Command (${command}) parameters could not be parsed: ${messageContent}`);
        } else {
            commandIndex += command.length;
        }
    } else {
        commandIndex += (prefix + command).length;
    }
    let msgParms = messageContent.substring(commandIndex).trim();
    //parse event format - ignore ! unless beginning of line or preceded by space
    const regex = /(^!| !)(?:(?! !).)*/g;
    let found = msgParms.match(regex);
    if (found) {
        console.debug('parseMessageParms:', msgParms);
        //check to see if this is a non-slash 'event edit' and the first param is the event id (maintaining backwards compat)
        if (!msgParms.startsWith('!') && command.replace(' ', '_').indexOf(COMMANDS.eventEdit.name) != -1) {
            let option = {
                name: 'event_id',
                value: msgParms.trim().split(' ')[0]
            }
            options.push(option);
        }
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
