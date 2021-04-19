const GuildModel = require('../models/Guild');
const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const { Channel } = require('discord.js');
const GuildCache = {};

/**
 * Show the configuration for your server
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfig(msg, msgParms, guildConfig) {
    try {
        let channelForEvents = {};
        let channelForPolls = {};
        let approverRoleName;
        let playerRoleName;
        try {
            if (guildConfig.channelForEvents) {
                channelForEvents = await msg.guild.channels.resolve(guildConfig.channelForEvents);
                // channelForEvents = await (new Channel(msg.client, { id: guildConfig.channelForEvents })).fetch();
            }
        } catch (error) {
            console.error(`handleConfig: could not resolve channel for events: ${guildConfig.channelForEvents}`, error);
        }
        try {
            if (guildConfig.channelForPolls) {
                // channelForPolls = await (new Channel(msg.client, { id: guildConfig.channelForPolls })).fetch();
                channelForPolls = await msg.guild.channels.resolve(guildConfig.channelForPolls);
            }
        } catch (error) {
            console.error(`handleConfig: could not resolve channel for polls: ${guildConfig.channelForEvents}`, error);
        }
        try {
            approverRoleName = (await utils.retrieveRoleForID(msg.guild, guildConfig.arole)).name;
        } catch (error) {
            console.error(`handleConfig: could not retrieve role for id: ${guildConfig.arole}`, error);
        }
        try {
            playerRoleName = (await utils.retrieveRoleForID(msg.guild, guildConfig.prole)).name;
        } catch (error) {
            console.error(`handleConfig: could not retrieve role for id: ${guildConfig.prole}`, error);
        }
        await utils.sendDirectOrFallbackToChannel(
            [{ name: 'Config for Guild', value: `${guildConfig.name} (${guildConfig.guildID})` },
            { name: 'Prefix', value: guildConfig.prefix, inline: true },
            { name: 'Approver Role', value: approverRoleName, inline: true },
            { name: 'Player Role', value: playerRoleName, inline: true },
            { name: 'Approval Required', value: guildConfig.requireCharacterApproval, inline: true },
            { name: 'Char Campaign For Event Required', value: guildConfig.requireCharacterForEvent, inline: true },
            { name: 'Event Channel', value: channelForEvents.name, inline: true },
            { name: 'Poll Channel', value: channelForPolls.name, inline: true }
            ],
            msg);
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        console.error("handleConfig:", error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * require that a user have matching character for event's campaigns
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigCampaign(msg, msgParms, guildConfig) {
    try {
        if (msgParms.length == 0 || msgParms[0].value === '') {
            throw new Error(`Not enough parameters, must pass at least one.`);
        }
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let boolParam = msgParms[0].value;
            guildConfig.requireCharacterForEvent = utils.isTrue(boolParam);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Campaign', value: `Require Character for Events now set to: \`${guildConfig.requireCharacterForEvent}\`.` }, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`Please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * modify approver role (allows user to approve characters)
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigArole(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configAroleIdCheck;
            if (msgParms.length == 0 || msgParms[0].value === '') {
                configAroleIdCheck = msg.guild.roles.everyone.id;
            } else {
                configAroleIdCheck = msgParms[0].value;
            }
            let configArole = await getRoleForIdTagOrName(msg.guild, configAroleIdCheck);
            if (configArole) {
                guildConfig.arole = configArole.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await utils.sendDirectOrFallbackToChannel({ name: 'Config Approver Role', value: `${configArole.name} is now the \`approver role\`.` }, msg);
                if (msg.deletable) {
                    await msg.delete();
                }
            } else {
                throw new Error(`could not locate the role for: ${configAroleIdCheck}`);
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * modify player role (allows user to use bot)
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigProle(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configProleIdCheck;
            if (msgParms.length == 0 || msgParms[0].value === '') {
                configProleIdCheck = msg.guild.roles.everyone.id;
            } else {
                configProleIdCheck = msgParms[0].value;
            }
            let configProle = await getRoleForIdTagOrName(msg.guild, configProleIdCheck);
            if (configProle) {
                guildConfig.prole = configProle.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await utils.sendDirectOrFallbackToChannel({ name: 'Config Player Role', value: `${configProle.name} is now the \`player role\`.` }, msg);
                if (msg.deletable) {
                    await msg.delete();
                }
            } else {
                throw new Error(`could not locate the role for: ${configProleIdCheck}`);
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
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

/**
 * modify the command prefix
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigPrefix(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configPrefix = msgParms.length > 0 ? msgParms[0].value : '';
            if (configPrefix.trim() == '') {
                guildConfig.prefix = Config.defaultPrefix;
            } else {
                guildConfig.prefix = configPrefix;
            }
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Prefix', value: `\`${guildConfig.prefix}\` is now my prefix, don't forget!` }, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * does character registration and updates require arole approval?
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigApproval(msg, msgParms, guildConfig) {
    try {
        if (msgParms.length == 0 || msgParms[0].value === '') {
            throw new Error(`Not enough parameters, must pass at least one.`);
        }
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let boolParam = msgParms[0].value;
            guildConfig.requireCharacterApproval = utils.isTrue(boolParam);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Approval', value: `Require Approval now set to: \`${guildConfig.requireCharacterApproval}\`.` }, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

async function getGuildConfig(guildID) {
    let guildConfig = GuildCache[guildID];
    if (!guildConfig) {
        guildConfig = await GuildModel.findOne({ guildID: guildID });
        if (guildConfig) {
            GuildCache[guildID] = guildConfig;
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
    let guildConfig = GuildCache[guild.id];
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
                guildConfig.arole = theRole.id;
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
        // update last used if the last used is before a day ago.
        if (typeof guildConfig.lastUsed === 'undefined' || !guildConfig.lastUsed || guildConfig.lastUsed < (new Date() - 1)) {
            guildConfig.lastUsed = new Date();
            needsSave = true;
        }
        if (needsSave) {
            await guildConfig.save();
        }
        GuildCache[guild.id] = guildConfig;
    } catch (error) {
        throw new Error('confirmGuildConfig: ' + error.message);
    }
    return guildConfig;
}

/**
 * send all events to this channel
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigEventChannel(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let channelTest;
            let stringParam = msgParms.length > 0 ? msgParms[0].value : '';
            if (stringParam.trim() == '') {
                guildConfig.channelForEvents = undefined;
            } else {
                stringParam = utils.trimTagsFromId(stringParam);
                channelTest = await msg.guild.channels.resolve(stringParam);
                if (!channelTest) {
                    throw new Error(`Could not locate channel: ${stringParam}`);
                }
                guildConfig.channelForEvents = stringParam;
            }
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Event Channel', value: `Event Channel now set to: \`${guildConfig.channelForEvents ? channelTest.name : guildConfig.channelForEvents}\`.` }, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * Configure what channel to send all polls to
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleConfigPollChannel(msg, msgParms, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let channelTest;
            let stringParam = msgParms.length > 0 ? msgParms[0].value : '';
            if (stringParam.trim() == '') {
                guildConfig.channelForPolls = undefined;
            } else {
                stringParam = utils.trimTagsFromId(stringParam);
                channelTest = await msg.guild.channels.resolve(stringParam);
                if (!channelTest) {
                    throw new Error(`Could not locate channel: ${stringParam}`);
                }
                guildConfig.channelForPolls = stringParam;
            }
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Poll Channel', value: `Poll Channel now set to: \`${guildConfig.channelForPolls ? channelTest.name : guildConfig.channelForPolls}\`.` }, msg);
            if (msg.deletable) {
                await msg.delete();
            }
        } else {
            throw new Error(`please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 *
 * @param {Message} msg
 */
async function handleStats(msg) {
    try {
        if (msg.author.id == Config.adminUser) {
            let totalGuilds = (await msg.client.shard.fetchClientValues('guilds.cache.size'))
                .reduce((acc, guildCount) => acc + guildCount, 0);;
            let totalMembers = (await msg.client.shard.broadcastEval('this.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)'))
                .reduce((acc, memberCount) => acc + memberCount, 0);
            await utils.sendDirectOrFallbackToChannel([
                { name: 'Server count', value: totalGuilds, inline: true },
                { name: 'Member count', value: totalMembers, inline: true },
                { name: 'Shard count', value: msg.client.shard.count, inline: true },
                { name: 'Uptime', value: getUptime(), inline: true },
                { name: 'BOT Version', value: vaultVersion, inline: true }
            ], msg);
            if (msg.guild) {
                try {
                    await msg.delete();
                } catch (error) {
                    console.error(`handleStats: ${error.message}`);
                }
            }
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
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

exports.handleConfigCampaign = handleConfigCampaign;
exports.handleConfigApproval = handleConfigApproval;
exports.handleConfigPrefix = handleConfigPrefix;
exports.handleConfigProle = handleConfigProle;
exports.handleConfigArole = handleConfigArole;
exports.handleConfig = handleConfig;
exports.confirmGuildConfig = confirmGuildConfig;
exports.getGuildConfig = getGuildConfig;
exports.handleConfigEventChannel = handleConfigEventChannel;
exports.handleConfigPollChannel = handleConfigPollChannel;
exports.handleStats = handleStats;
