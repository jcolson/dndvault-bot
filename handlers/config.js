const GuildModel = require('../models/Guild');
const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const events = require('../handlers/events.js');
const { MessageEmbed } = require('discord.js');

const DEFAULT_CHANNEL_REMOVE_DAYS = 7;

/**
 * Show the configuration for your server
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfig(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            console.debug(`handleConfig:`, msgParms);
            for (param of msgParms) {
                // check to see if param passed is part of config options before dynamically calling function
                for (option of COMMANDS.config.options) {
                    if (option.name == param.name) {
                        // console.debug(`handleConfig: COMMAND: ${param.name}`);
                        if (utils.isString(param.value) && param.value?.trim() == '') {
                            param.value = undefined;
                        }
                        guildConfig = await this[`config${param.name}`](param, msg.guild, guildConfig);
                    }
                }
            }
            await guildConfig.save();
            GuildCache.set(msg.guild.id, guildConfig);
            utils.sendDirectOrFallbackToChannelEmbeds(await embedForConfig(msg.guild, guildConfig), msg);
            utils.deleteMessage(msg);
        } else {
            throw new Error(`Please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        console.error("handleConfig:", error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

async function configreset(param, guild, guildConfig) {
    console.debug(`configreset:`, param);
    guildConfig = await configprole({ name: 'prole', value: guild.roles.everyone.id }, guild, guildConfig);
    guildConfig = await configarole({ name: 'arole', value: guild.roles.everyone.id }, guild, guildConfig);
    guildConfig = await configpollchannel({ name: 'pollchannel', value: undefined }, guild, guildConfig);
    guildConfig = await configeventchannel({ name: 'eventchannel', value: undefined }, guild, guildConfig);
    guildConfig = await configeventstandby({ name: 'eventstandby', value: false }, guild, guildConfig);
    guildConfig = await configchannelcategory({ name: 'channelcategory', value: undefined }, guild, guildConfig);
    guildConfig = await configvoicecategory({ name: 'voicecategory', value: undefined }, guild, guildConfig);
    guildConfig = await configchanneldays({ name: 'channeldays', value: DEFAULT_CHANNEL_REMOVE_DAYS }, guild, guildConfig);
    guildConfig = await configcharacterapproval({ name: 'characterapproval', value: false }, guild, guildConfig);
    guildConfig = await configcampaign({ name: 'campaign', value: false }, guild, guildConfig);
    guildConfig = await configprefix({ name: 'prefix', value: Config.defaultPrefix }, guild, guildConfig);
    return guildConfig;
}

async function configprole(param, guild, guildConfig) {
    console.debug(`configprole:`, param);
    let configProle = await getRoleForIdTagOrName(guild, param.value);
    if (configProle) {
        guildConfig.prole = configProle.id;
    } else {
        throw new Error(`could not locate the role for: ${param.value}`);
    }
    return guildConfig;
}

async function configarole(param, guild, guildConfig) {
    console.debug(`configarole:`, param);
    let configProle = await getRoleForIdTagOrName(guild, param.value);
    if (configProle) {
        guildConfig.arole = configProle.id;
    } else {
        throw new Error(`could not locate the role for: ${param.value}`);
    }
    return guildConfig;
}

async function configpollchannel(param, guild, guildConfig) {
    console.debug(`configpollchannel:`, param);
    if (param.value) {
        let stringParam = utils.trimTagsFromId(param.value);
        let channelTest = await guild.channels.resolve(stringParam);
        if (!channelTest) {
            throw new Error(`Could not locate channel: ${stringParam}`);
        }
        guildConfig.channelForPolls = stringParam;
    } else {
        guildConfig.channelForPolls = undefined;
    }
    return guildConfig;
}

async function configeventchannel(param, guild, guildConfig) {
    console.debug(`configeventchannel:`, param);
    if (param.value) {
        let stringParam = utils.trimTagsFromId(param.value);
        let channelTest = await guild.channels.resolve(stringParam);
        if (!channelTest) {
            throw new Error(`Could not locate channel: ${stringParam}`);
        }
        guildConfig.channelForEvents = stringParam;
    } else {
        guildConfig.channelForEvents = undefined;
    }
    return guildConfig;

}

async function configeventrequireapprover(param, guild, guildConfig) {
    console.debug(`configeventrequireapprover:`, param);
    guildConfig.eventRequireApprover = utils.isTrue(param.value);
    return guildConfig;
}

async function configeventstandby(param, guild, guildConfig) {
    console.debug(`configeventstandby:`, param);
    guildConfig.enableStandbyQueuing = utils.isTrue(param.value);
    return guildConfig;
}

async function configchannelcategory(param, guild, guildConfig) {
    console.debug(`configchannelcategory:`, param);
    if (param.value) {
        let catTest = guild.channels.cache.find(c => c.name.toLowerCase() == param.value.toLowerCase() && c.type == "category");
        if (!catTest) {
            throw new Error(`Could not locate the channel category: ${param.value}`);
        }
        // await utils.checkChannelPermissions({ channel: catTest, guild: msg.guild }, events.SESSION_PLANNING_PERMS);
        if (!await guild.me.permissions.has(events.SESSION_PLANNING_PERMS)) {
            throw new Error(`In order to use Event Planning Category Channels, an administrator must grant the bot these server wide permissions: ${events.SESSION_PLANNING_PERMS}`);
        }
        guildConfig.eventPlanCat = catTest.id;
        if (!guildConfig.eventPlanDays) {
            guildConfig.eventPlanDays = DEFAULT_CHANNEL_REMOVE_DAYS;
        }
    } else {
        guildConfig.eventPlanCat = undefined;
    }
    return guildConfig;
}

async function configvoicecategory(param, guild, guildConfig) {
    console.debug(`configvoicecategory:`, param);
    if (param.value) {
        let catTest = guild.channels.cache.find(c => c.name.toLowerCase() == param.value.toLowerCase() && c.type == "category");
        if (!catTest) {
            throw new Error(`Could not locate the channel category: ${param.value}`);
        }
        // await utils.checkChannelPermissions({ channel: catTest, guild: msg.guild }, events.SESSION_PLANNING_PERMS);
        if (!await guild.me.permissions.has(events.SESSION_PLANNING_PERMS)) {
            throw new Error(`In order to use Event Planning Category Channels, an administrator must grant the bot these server wide permissions: ${events.SESSION_PLANNING_PERMS}`);
        }
        guildConfig.eventVoiceCat = catTest.id;
        if (!guildConfig.eventPlanDays) {
            guildConfig.eventPlanDays = DEFAULT_CHANNEL_REMOVE_DAYS;
        }
    } else {
        guildConfig.eventVoiceCat = undefined;
    }
    return guildConfig;
}

async function configchanneldays(param, guild, guildConfig) {
    console.debug(`configchanneldays:`, param);
    let days = parseInt(param.value);
    if (isNaN(days)) {
        throw new Error(`Parameter should be the number of days, not ${param.value}`);
    } else {
        guildConfig.eventPlanDays = days;
    }
    return guildConfig;
}

async function configcharacterapproval(param, guild, guildConfig) {
    console.debug(`configcharacterapproval:`, param);
    guildConfig.requireCharacterApproval = utils.isTrue(param.value);
    return guildConfig;
}

async function configcampaign(param, guild, guildConfig) {
    console.debug(`configcampaign:`, param);
    guildConfig.requireCharacterForEvent = utils.isTrue(param.value);
    return guildConfig;
}

async function configprefix(param, guild, guildConfig) {
    console.debug(`configprefix:`, param);
    guildConfig.prefix = param.value;
    return guildConfig;
}
/**
 * create embed to display current configuration
 * @param {Guild} guild
 * @param {GuildModel} guildConfig
 * @returns {MessageEmbed}
 */
async function embedForConfig(guild, guildConfig) {
    let channelForEvents = { name: 'Not Set' };
    let channelForPolls = { name: 'Not Set' };
    let approverRoleName;
    let playerRoleName;
    let eventPlanCat = { name: 'Not Set' };
    let eventVoiceCat = { name: 'Not Set' };
    try {
        if (guildConfig.channelForEvents) {
            channelForEvents = await guild.channels.resolve(guildConfig.channelForEvents);
            // channelForEvents = await (new Channel(msg.client, { id: guildConfig.channelForEvents })).fetch();
        }
    } catch (error) {
        console.error(`handleConfig: could not resolve channel for events: ${guildConfig.channelForEvents}`, error);
    }
    try {
        if (guildConfig.channelForPolls) {
            // channelForPolls = await (new Channel(msg.client, { id: guildConfig.channelForPolls })).fetch();
            channelForPolls = await guild.channels.resolve(guildConfig.channelForPolls);
        }
    } catch (error) {
        console.error(`handleConfig: could not resolve channel for polls: ${guildConfig.channelForEvents}`, error);
    }
    try {
        approverRoleName = (await utils.retrieveRoleForID(guild, guildConfig.arole)).name;
    } catch (error) {
        console.error(`handleConfig: could not retrieve role for id: ${guildConfig.arole}`, error);
    }
    try {
        playerRoleName = (await utils.retrieveRoleForID(guild, guildConfig.prole)).name;
    } catch (error) {
        console.error(`handleConfig: could not retrieve role for id: ${guildConfig.prole}`, error);
    }
    try {
        if (guildConfig.eventPlanCat) {
            eventPlanCat = await guild.channels.resolve(guildConfig.eventPlanCat);
        }
    } catch (error) {
        console.error(`handleConfig: could not retrieve role for id: ${guildConfig.eventPlanCat}`, error);
    }
    try {
        if (guildConfig.eventVoiceCat) {
            eventVoiceCat = await guild.channels.resolve(guildConfig.eventVoiceCat);
        }
    } catch (error) {
        console.error(`handleConfig: could not retrieve role for id: ${guildConfig.eventVoiceCat}`, error);
    }
    let configEmbed = new MessageEmbed().addFields(
        { name: 'Config for Guild', value: `${guildConfig.name} (${guildConfig.guildID})` },
        { name: 'Prefix', value: guildConfig.prefix, inline: true },
        { name: 'Approver Role', value: approverRoleName, inline: true },
        { name: 'Player Role', value: playerRoleName, inline: true },
        { name: 'Approval Required', value: guildConfig.requireCharacterApproval.toString(), inline: true },
        { name: 'Char Campaign For Event Required', value: guildConfig.requireCharacterForEvent.toString(), inline: true },
        { name: 'Event Channel', value: channelForEvents.name, inline: true },
        { name: 'Poll Channel', value: channelForPolls.name, inline: true },
        { name: 'Event Planning Channel Category', value: eventPlanCat.name, inline: true },
        { name: 'Event Voice Channel Category', value: eventVoiceCat.name, inline: true },
        { name: 'Event Planning Channel Delete Days', value: guildConfig.eventPlanDays.toString(), inline: true },
        { name: 'Event Require Approver', value: guildConfig.eventRequireApprover.toString(), inline: true },
        { name: 'Standby Queuing for Events', value: guildConfig.enableStandbyQueuing.toString(), inline: true }
    );
    return configEmbed;
}

async function getRoleForIdTagOrName(guild, roleIdOrNameCheck) {
    let role = undefined;
    let roleIdCheck = utils.trimTagsFromId(roleIdOrNameCheck);
    if (roleIdCheck && roleIdCheck != '') {
        role = await utils.retrieveRoleForID(guild, roleIdCheck);
    }
    if (!role) {
        role = await utils.retrieveRoleForName(guild, roleIdOrNameCheck);
    }
    // console.log('getRoleForIdTagOrName:', role);
    return role;
}

async function getGuildConfig(guildID) {
    let guildConfig = GuildCache.get(guildID);
    if (!guildConfig) {
        guildConfig = await GuildModel.findOne({ guildID: guildID });
        if (guildConfig) {
            GuildCache.set(guildID, guildConfig);
        }
    }
    return guildConfig;
}

/**
 *
 * @param {Message} msg
 * @returns {GuildModel}
 */
async function confirmGuildConfig(guild) {
    if (!guild) {
        return undefined;
    }
    let guildConfig = GuildCache.get(guild.id);
    try {
        // don't really need this, mongoose is smart enough to not update the doc if it's not changed ... may remove someday
        let needsSave = false;
        if (!guildConfig) {
            console.log(`confirmGuildConfig: finding guild: ${guild.name}`);
            guildConfig = await GuildModel.findOne({ guildID: guild.id });
            if (!guildConfig) {
                console.log(`confirmGuildConfig: new guild: ${guild.name}`);
                guildConfig = new GuildModel({ guildID: guild.id });
                needsSave = true;
            }
        }
        // else {
        //     console.debug(`confirmGuildConfig: guild cached: ${guild.name}`);
        // }
        // console.debug("confirmGuildConfig:", guildConfig);
        if (typeof guildConfig.arole === 'undefined' || !guildConfig.arole) {
            let theRole = await utils.retrieveRoleForName(guild, Config.defaultARoleName);
            if (theRole) {
                guildConfig.arole = theRole.id;
                needsSave = true;
            }
        }
        if (typeof guildConfig.prole === 'undefined' || !guildConfig.prole) {
            let theRole = await utils.retrieveRoleForName(guild, Config.defaultPRoleName);
            if (theRole) {
                guildConfig.prole = theRole.id;
                needsSave = true;
            }
        }
        if (typeof guildConfig.prefix === 'undefined' || !guildConfig.prefix) {
            guildConfig.prefix = Config.defaultPrefix;
            needsSave = true;
        }
        if (typeof guildConfig.name === 'undefined' || !guildConfig.name || guildConfig.name != guild.name) {
            guildConfig.name = guild.name;
            needsSave = true;
        }
        if (typeof guildConfig.iconURL === 'undefined' || !guildConfig.iconURL || guildConfig.iconURL != guild.iconURL()) {
            guildConfig.iconURL = guild.iconURL();
            needsSave = true;
        }
        // console.debug(`confirmGuildConfig:botID: ${guild.client.user.id}`);
        if (typeof guildConfig.botID === 'undefined' || !guildConfig.botID || guildConfig.botID != guild.client.user.id) {
            guildConfig.botID = guild.client.user.id;
            needsSave = true;
        }
        // update last used if the last used is before a day ago.
        let yesterdayDate = new Date(new Date().setDate(new Date().getDate() - 1));
        // console.debug(`confirmGuildConfig:yesterday: ${yesterdayDate}`);
        if (typeof guildConfig.lastUsed === 'undefined' || !guildConfig.lastUsed || guildConfig.lastUsed < yesterdayDate) {
            // console.debug(`confirmGuildConfig:guildConfig.lastUsed: ${guildConfig.lastUsed}`);
            guildConfig.lastUsed = new Date();
            needsSave = true;
        }
        if (needsSave) {
            await guildConfig.save();
        }
        GuildCache.set(guild.id, guildConfig);
    } catch (error) {
        throw new Error('confirmGuildConfig: ' + error.message);
    }
    return guildConfig;
}

/**
 *
 * @param {Message} msg
 */
async function handleStats(msg) {
    try {
        if (msg.author.id == Config.adminUser) {
            let totalGuildArray = await msg.client.shard.fetchClientValues('guilds.cache.size');
            // console.debug(`handleStats: guild counts per shard: `, totalGuildArray);
            let totalGuilds = totalGuildArray.reduce((accumulator, guildCount) => {
                return accumulator + guildCount;
            });
            // console.debug(`handleStats: guild counts total: `, totalGuilds);
            let totalMembers = (await msg.client.shard.broadcastEval((client) => {
                let totalMemberCount = 0;
                client.guilds.cache.reduce((guildName, guild) => {
                    // console.debug(`handleStats: ${acc}`, guild);
                    totalMemberCount += guild.memberCount;
                });
                return totalMemberCount;
            }));
            await utils.sendDirectOrFallbackToChannel([
                { name: 'Server count', value: totalGuilds.toString(), inline: true },
                { name: 'Member count', value: totalMembers.toString(), inline: true },
                { name: 'Shard count', value: msg.client.shard.count.toString(), inline: true },
                { name: 'Uptime', value: getUptime(), inline: true },
                { name: 'BOT Version', value: vaultVersion, inline: true }
            ], msg);
            utils.deleteMessage(msg);
        }
    } catch (error) {
        console.error(`handleStats:`, error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * calls the broadcast aware method via client.shard
 * @param {*} msg
 * @param {*} msgParms
 */
async function handleKick(msg, msgParms) {
    try {
        if (msg.author.id == Config.adminUser) {
            let statusArray = await client.shard.broadcastEval(
                `this.dnd_config.bc_handleKick
        ('${msgParms[0].value}');`
            );
            console.debug('handleKick:', statusArray);
            const result = statusArray.find(o => {
                return (typeof (o) !== 'undefined' && o !== null);
            });
            if (result) {
                console.debug(`handleKick: shard responded ${result}`);
                await utils.sendDirectOrFallbackToChannel([
                    { name: 'Kick from Server', value: `${msgParms[0].value}:${result}` }
                ], msg);
            } else {
                console.debug('handleKick: nothing in response for this one');
                await utils.sendDirectOrFallbackToChannel([
                    { name: 'Kick from Server', value: `Could not kick server ${msgParms[0].value}` }
                ], msg);
            }
            utils.deleteMessage(msg);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}
/**
 * remove bot from server (guild)
 * @param {String} guildIdToKick
 * @returns {String} guild.name that was kicked
 */
async function bc_handleKick(guildIdToKick) {
    let kickResult;
    try {
        let theGuildToKick = await client.guilds.resolve(guildIdToKick);
        // let theGuildToKick = client.guilds.cache.get(guildIdToKick);
        if (theGuildToKick) {
            kickResult = (await theGuildToKick.leave())?.name;
        } else {
            console.info(`bc_handleKick: unknown guild (${guildIdToKick}) on this shard, ignoring`);
        }
    } catch (error) {
        console.error('config.bc_handleKick:', error.message);
        throw error;
    }
    return kickResult;
}

function getUptime() {
    // let sec_num = 1296000;
    var sec_num = parseInt(process.uptime(), 10);
    let days = Math.floor(sec_num / 3600 / 24);
    let hours = Math.floor((sec_num - (days * 3600 * 24)) / 3600);
    let minutes = Math.floor((sec_num - (days * 3600 * 24) - (hours * 3600)) / 60);
    let seconds = sec_num - (days * 3600 * 24) - (hours * 3600) - (minutes * 60);
    if (days < 10) { days = "0" + days; }
    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    let time = days + "d:" + hours + 'h:' + minutes + 'm:' + seconds + 's';
    return time;
}

exports.handleConfig = handleConfig;
exports.confirmGuildConfig = confirmGuildConfig;
exports.getGuildConfig = getGuildConfig;
exports.handleStats = handleStats;
exports.handleKick = handleKick;
exports.bc_handleKick = bc_handleKick;
exports.configreset = configreset;
exports.configprole = configprole;
exports.configarole = configarole;
exports.configpollchannel = configpollchannel;
exports.configeventchannel = configeventchannel;
exports.configeventstandby = configeventstandby;
exports.configchannelcategory = configchannelcategory;
exports.configvoicecategory = configvoicecategory;
exports.configchanneldays = configchanneldays;
exports.configcharacterapproval = configcharacterapproval;
exports.configcampaign = configcampaign;
exports.configprefix = configprefix;
exports.configeventrequireapprover = configeventrequireapprover;