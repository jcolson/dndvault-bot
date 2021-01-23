const GuildModel = require('../models/Guild');
const utils = require('../utils/utils.js');
const users = require('../handlers/users.js');
const GuildCache = {};

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleConfig(msg, guildConfig) {
    try {
        await utils.sendDirectOrFallbackToChannel(
            [{ name: 'Config for Guild ID', value: guildConfig.guildID },
            { name: 'Prefix', value: guildConfig.prefix, inline: true },
            { name: 'Approver Role', value: (await utils.retrieveRoleForID(msg.guild, guildConfig.arole)).name, inline: true },
            { name: 'Player Role', value: (await utils.retrieveRoleForID(msg.guild, guildConfig.prole)).name, inline: true },
            { name: 'Approval Required', value: guildConfig.requireCharacterApproval, inline: true },
            { name: 'Char Req 4 Events', value: guildConfig.requireCharacterForEvent, inline: true },
            { name: 'BOT Version', value: vaultVersion, inline: true }],
            msg);
        await msg.delete();
    } catch (error) {
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
    let guildConfig = GuildCache[msg.guild.id];
    if (!guildConfig) {
        try {
            guildConfig = await GuildModel.findOne({ guildID: msg.guild.id });
            if (!guildConfig) {
                guildConfig = new GuildModel({ guildID: msg.guild.id });
            }
            // console.log(guildConfig);
            if (typeof guildConfig.arole === 'undefined' || !guildConfig.arole) {
                guildConfig.arole = await utils.retrieveRoleIdForName(msg.guild, Config.defaultARoleName);
            }
            if (typeof guildConfig.prole === 'undefined' || !guildConfig.prole) {
                guildConfig.prole = await utils.retrieveRoleIdForName(msg.guild, Config.defaultPRoleName);
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
            throw new Error('confirmGuildConfig: ' + error.message);
        }
    }
    return guildConfig;
}

exports.handleConfigCampaign = handleConfigCampaign;
exports.handleConfigApproval = handleConfigApproval;
exports.handleConfigPrefix = handleConfigPrefix;
exports.handleConfigProle = handleConfigProle;
exports.handleConfigArole = handleConfigArole;
exports.handleConfig = handleConfig;
exports.confirmGuildConfig = confirmGuildConfig;
exports.getGuildConfig = getGuildConfig;
