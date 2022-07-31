const characters = require('../handlers/characters.js');
const events = require('../handlers/events.js');
const help = require('../handlers/help.js');
const users = require('../handlers/users.js');
const config = require('../handlers/config.js');
const poll = require('../handlers/poll.js');
const roll = require('../handlers/roll.js');
const insult = require('../handlers/insult.js');
const utils = require('../utils/utils.js');

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
        "slash": true,
        "options": [{
            "name": "reroll_ones",
            "description": "Should ones be re-rolled?",
            "required": false,
            "type": 5 // boolean
        }]
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
        }, {
            "name": "roll_type",
            "description": "Optional text for what type of roll this is",
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
            "description": "The time at which this event will start (ex: 10pm)",
            "required": true,
            "type": 3
        }, {
            "name": "for",
            "description": "The number of hours that this event will run for (ex: 3.5)",
            "required": true,
            "type": 3
        }, {
            "name": "on",
            "description": "The date on which this event will start (ex: 10/28/1990)",
            "required": true,
            "type": 3
        }, {
            "name": "with",
            "description": "The number of attendee slot available to join this event (ex: 5)",
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
            "description": "The time at which this event will start (ex: 10pm)",
            "required": false,
            "type": 3
        }, {
            "name": "for",
            "description": "The number of hours that this event will run for (ex: 3.5)",
            "required": false,
            "type": 3
        }, {
            "name": "on",
            "description": "The date on which this event will start (ex: 10/28/1990)",
            "required": false,
            "type": 3
        }, {
            "name": "with",
            "description": "The number of attendee slot available to join this event (ex: 5)",
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
            "description": "Recur this event every so many days (ex: 7), 0 disables recurrance",
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
            "name": "rollsenabled",
            "description": "Enable the rolls functionality of the bot.",
            "required": false,
            "type": 5 // boolean
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
                }, {
                    "name": "Everyone Speak",
                    "value": "everyone_speak"
                }, {
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
            "name": "eventpostauto",
            "description": "Configure if event posts should be automatically removed after channel days param.",
            "required": false,
            "type": 5 // boolean
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
                for (let option of msgParms) {
                    if (typeof option.value === 'string' || option.value instanceof String) {
                        option.value = option.value.replaceAll('\\n', '\n');
                    }
                }
                switch (COMMANDS[findCommand].name) {
                    case COMMANDS.rollStats.name:
                        roll.handleDiceRollStats(msg, msgParms, guildConfig);
                        break;
                    case COMMANDS.roll.name:
                        roll.handleDiceRoll(msg, msgParms, guildConfig);
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
            console.info(`msg processed:${msg.interaction ? 'INTERACTION:' : ''}${msg.guild ? msg.guild.name : "DIRECT"}:${msg.author.tag}${msg.member ? "(" + msg.member.displayName + ")" : ""}:${messageContentLowercase}:${JSON.stringify(msgParms, (key, value) =>
                typeof value === 'bigint'
                    ? value.toString()
                    : value // return everything else unchanged
            )}`);
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
    console.debug(`xformArrayToMsgParms: `, msgParms);
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
            console.debug('parseMessageParms: option:', option);
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

exports.handleCommandExec = handleCommandExec;
exports.parseMessageParms = parseMessageParms;
exports.COMMANDS = COMMANDS;

exports.testables = {
    COMMANDS: COMMANDS,
    handleCommandExec: handleCommandExec,
    parseMessageParms: parseMessageParms,
};