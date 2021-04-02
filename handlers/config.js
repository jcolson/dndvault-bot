const GuildModel = require('../models/Guild');
const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const { Channel } = require('discord.js');
const GuildCache = {};

/**
 *
 * @param {Message} msg
 * @param {GuildModel} guildConfig
 */
async function handleConfig(msg, guildConfig) {
    try {
        let channelForEvents = {};
        let channelForPolls = {};
        try {
            if (guildConfig.channelForEvents) {
                channelForEvents = await (new Channel(msg.client, { id: guildConfig.channelForEvents })).fetch();
            }
        } catch (error) {
            console.error(`handleConfig: could not resolve channel for events: ${guildConfig.channelForEvents}`, error);
        }
        try {
            if (guildConfig.channelForPolls) {
                channelForPolls = await (new Channel(msg.client, { id: guildConfig.channelForPolls })).fetch();
            }
        } catch (error) {
            console.error(`handleConfig: could not resolve channel for polls: ${guildConfig.channelForEvents}`, error);
        }
        await utils.sendDirectOrFallbackToChannel(
            [{ name: 'Config for Guild', value: `${guildConfig.name} (${guildConfig.guildID})` },
            { name: 'Prefix', value: guildConfig.prefix, inline: true },
            { name: 'Approver Role', value: (await utils.retrieveRoleForID(msg.guild, guildConfig.arole)).name, inline: true },
            { name: 'Player Role', value: (await utils.retrieveRoleForID(msg.guild, guildConfig.prole)).name, inline: true },
            { name: 'Approval Required', value: guildConfig.requireCharacterApproval, inline: true },
            { name: 'Char Req 4 Events', value: guildConfig.requireCharacterForEvent, inline: true },
            { name: 'Event Channel', value: channelForEvents.name, inline: true },
            { name: 'Poll Channel', value: channelForPolls.name, inline: true }
            ],
            msg);
        await msg.delete();
    } catch (error) {
        console.error("handleConfig:", error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 *
 * @param {Message} msg
 * @param {GuildModel} guildConfig
 */
async function handleConfigCampaign(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let boolParam = msg.content.substring((guildConfig.prefix + 'config campaign').length + 1);
            guildConfig.requireCharacterForEvent = utils.isTrue(boolParam);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Campaign', value: `Require Character for Events now set to: \`${guildConfig.requireCharacterForEvent}\`.` }, msg);
            await msg.delete();
        } else {
            throw new Error(`Please ask an \`approver role\` to configure.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
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
            let configAroleIdCheck = msg.content.substring((guildConfig.prefix + 'config arole').length + 1);
            let configArole = await getRoleForIdTagOrName(msg.guild, configAroleIdCheck);
            if (configArole) {
                guildConfig.arole = configArole.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await utils.sendDirectOrFallbackToChannel({ name: 'Config Approver Role', value: `${configArole.name} is now the \`approver role\`.` }, msg);
                await msg.delete();
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
 *
 * @param {Message} msg
 * @param {GuildModel} guildConfig
 */
async function handleConfigProle(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let configProleIdCheck = msg.content.substring((guildConfig.prefix + 'config prole').length + 1);
            let configProle = await getRoleForIdTagOrName(msg.guild, configProleIdCheck);
            if (configProle) {
                guildConfig.prole = configProle.id;
                await guildConfig.save();
                GuildCache[msg.guild.id] = guildConfig;
                await utils.sendDirectOrFallbackToChannel({ name: 'Config Player Role', value: `${configProle.name} is now the \`player role\`.` }, msg);
                await msg.delete();
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

async function getRoleForIdTagOrName(guild, roleIdCheck) {
    if (roleIdCheck.startsWith('<@&')) {
        // need to strip the tailing '>' off as well ...
        roleIdCheck = roleIdCheck.substring(3, roleIdCheck.length - 1);
    } else {
        roleIdCheck = await utils.retrieveRoleIdForName(guild, roleIdCheck);
    }
    // console.log(roleIdCheck);
    let configProle = await utils.retrieveRoleForID(guild, roleIdCheck);
    return configProle;
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
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Prefix', value: `\`${guildConfig.prefix}\` is now my prefix, don't forget!` }, msg);
            await msg.delete();
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
 * @param {GuildModel} guildConfig
 */
async function handleConfigApproval(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let boolParam = msg.content.substring((guildConfig.prefix + 'config approval').length + 1);
            guildConfig.requireCharacterApproval = utils.isTrue(boolParam);
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Approval', value: `Require Approval now set to: \`${guildConfig.requireCharacterApproval}\`.` }, msg);
            await msg.delete();
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
async function confirmGuildConfig(msg) {
    if (!msg.guild) {
        return undefined;
    }
    let guildConfig = GuildCache[msg.guild.id];
    try {
        let needsSave = false;
        if (!guildConfig) {
            console.log(`confirmGuildConfig: finding guild: ${msg.guild.name}`);
            guildConfig = await GuildModel.findOne({ guildID: msg.guild.id });
            if (!guildConfig) {
                console.log(`confirmGuildConfig: new guild: ${msg.guild.name}`);
                guildConfig = new GuildModel({ guildID: msg.guild.id });
                needsSave = true;
            }
        } else {
            console.log(`confirmGuildConfig: guild cached: ${msg.guild.name}`);
        }
        // console.log("confirmGuildConfig:", guildConfig);
        if (typeof guildConfig.arole === 'undefined' || !guildConfig.arole) {
            guildConfig.arole = await utils.retrieveRoleIdForName(msg.guild, Config.defaultARoleName);
            needsSave = true;
        }
        if (typeof guildConfig.prole === 'undefined' || !guildConfig.prole) {
            guildConfig.prole = await utils.retrieveRoleIdForName(msg.guild, Config.defaultPRoleName);
            needsSave = true;
        }
        if (typeof guildConfig.prefix === 'undefined' || !guildConfig.prefix) {
            guildConfig.prefix = Config.defaultPrefix;
            needsSave = true;
        }
        if (typeof guildConfig.name === 'undefined' || !guildConfig.name || guildConfig.name != msg.guild.name) {
            guildConfig.name = msg.guild.name;
            needsSave = true;
        }
        if (typeof guildConfig.iconURL === 'undefined' || !guildConfig.iconURL || guildConfig.iconURL != msg.guild.iconURL()) {
            guildConfig.iconURL = msg.guild.iconURL();
            needsSave = true;
        }
        if (needsSave) {
            await guildConfig.save();
        }
        GuildCache[msg.guild.id] = guildConfig;
    } catch (error) {
        throw new Error('confirmGuildConfig: ' + error.message);
    }
    return guildConfig;
}

/**
 *
 * @param {Message} msg
 * @param {GuildModel} guildConfig
 */
async function handleConfigEventChannel(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let stringParam = msg.content.substring((guildConfig.prefix + 'config eventchannel').length + 1);
            if (stringParam.trim() == '') {
                guildConfig.channelForEvents = undefined;
            } else {
                stringParam = stringParam.substring(2, stringParam.length - 1);
                let channelTest = await msg.guild.channels.resolve(stringParam);
                if (!channelTest) {
                    throw new Error(`Could not locate channel: ${stringParam}`);
                }
                guildConfig.channelForEvents = stringParam;
            }
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Event Channel', value: `Event Channel now set to: \`${guildConfig.channelForEvents}\`.` }, msg);
            await msg.delete();
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
 * @param {GuildModel} guildConfig
 */
async function handleConfigPollChannel(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            let stringParam = msg.content.substring((guildConfig.prefix + 'config pollchannel').length + 1);
            if (stringParam.trim() == '') {
                guildConfig.channelForPolls = undefined;
            } else {
                stringParam = stringParam.substring(2, stringParam.length - 1);
                let channelTest = await msg.guild.channels.resolve(stringParam);
                if (!channelTest) {
                    throw new Error(`Could not locate channel: ${stringParam}`);
                }
                guildConfig.channelForPolls = stringParam;
            }
            await guildConfig.save();
            GuildCache[msg.guild.id] = guildConfig;
            await utils.sendDirectOrFallbackToChannel({ name: 'Config Poll Channel', value: `Poll Channel now set to: \`${guildConfig.channelForPolls}\`.` }, msg);
            await msg.delete();
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
