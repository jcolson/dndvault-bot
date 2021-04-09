const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const utils = require('../utils/utils.js');

/**
 * set user's timezone
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleDefault(msg, msgParms, guildConfig) {
    try {
        let defaultChar = msgParms.length > 0 ? msgParms[0].value : undefined;
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!defaultChar && currUser && currUser.defaultCharacter) {
            await utils.sendDirectOrFallbackToChannel([{ name: 'Default Character', value: `<@${msg.member.id}>, your default character is currently set to: ${currUser.defaultCharacter}` }], msg);
        } else if (!defaultChar) {
            await utils.sendDirectOrFallbackToChannel([{ name: 'Default Character', value: `No default character set yet.` }], msg);
        } else {
            let character = await CharModel.findOne({ guildID: msg.guild.id, guildUser: msg.member.id, id: defaultChar, approvalStatus: true });
            if (!character) {
                throw new Error(`No approved character (${defaultChar}) found.`);
            }
            if (!currUser) {
                currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, defaultCharacter: defaultChar });
            } else {
                currUser.defaultCharacter = defaultChar;
            }
            await currUser.save();
            await utils.sendDirectOrFallbackToChannel([{ name: 'Default Character', value: `<@${msg.member.id}>, your default character was successfully set to: \`${character.name}\`` }], msg);
        }
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * handle updating timezone in a broadcast safe manner
 * @param {String} userID
 * @param {String} channelID
 * @param {String} timezone
 * @param {String} guildID
 * @returns boolean
 */
async function bc_setUsersTimezone(userID, channelID, timezone, guildID) {
    console.log(`users.bc_setUsersTimezone: ${userID} ${channelID} ${timezone} ${guildID}`);
    try {
        if (client.guilds.cache.get(guildID)) {
            let currUser = await UserModel.findOne({ userID: userID, guildID: guildID });
            timezone = isValidTimeZone(timezone);
            if (!currUser) {
                currUser = new UserModel({ guildID: guildID, userID: userID, timezone: timezone });
            } else {
                console.log('users.bc_setUsersTimezone: setting timezone to "%s"', timezone);
                currUser.timezone = timezone;
            }
            await currUser.save();
            return true;
        }
    } catch (error) {
        console.error(`users.bc_setUsersTimezone ${error.message}`);
    }
    return false;
}

/**
 * set user's timezone
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleTimezone(msg, msgParms, guildConfig) {
    try {
        let timeZoneString = msgParms.length > 0 ? msgParms[0].value : undefined;
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!timeZoneString && currUser && currUser.timezone) {
            await utils.sendDirectOrFallbackToChannel([
                { name: 'Your Timezone', value: `<@${msg.member.id}>, your timezone is currently set to: ${currUser.timezone}` },
                { name: 'Timezone Lookup', value: `<${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id}>` }
            ], msg);
        } else if (!timeZoneString) {
            await utils.sendDirectOrFallbackToChannel([
                { name: 'Your Timezone', value: `<@${msg.member.id}>, you have no Timezone set yet, use \`${guildConfig.prefix}timezone Europe/Berlin\`, for example.` },
                { name: 'Timezone Lookup', value: `<${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id}>` }
            ], msg);
        } else {
            let timezoneResult = await bc_setUsersTimezone(msg.member.id, msg.channel.id, timeZoneString, msg.guild.id);
            if (timezoneResult) {
                await utils.sendDirectOrFallbackToChannel([{ name: 'Timezone', value: `<@${msg.member.id}>, your timezone was successfully set to: ${timeZoneString}` }], msg);
            } else {
                throw new Error(`Could not set timezone: ${timeZoneString}`);
            }
        }
        if (msg.deletable) {
            await msg.delete();
        }
    } catch (error) {
        console.log('users.handleTimezone:', error);
        error.message += `\nexample timezones: \`Europe/Berlin\` or \`America/New_York\`\nTimezone Lookup: <${Config.httpServerURL}/timezones?guildID=${msg.guild.id}&channel=${msg.channel.id}>`;
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function isValidTimeZone(tz) {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
        throw 'Time zones are not available in this environment';
    }
    let validTZ = Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: 'long' });
    let validTZstring = validTZ.format(new Date());
    // console.log('valid tz %s', validTZstring);
    validTZstring = validTZstring.substring(validTZstring.indexOf(', ') + 2);
    // console.log('valid tz %s', validTZstring);
    return tz;
}

/**
 * Check to see if the user that sent the message is in the role or an admin (so it is automatically authorized)
 * @param {GuildMember} member
 * @param {String} roleId
 */
async function hasRoleOrIsAdmin(member, roleId) {
    // if (roleId == '792845390834958368') {
    //     return false;
    // }
    let hasRole = false;
    try {
        if (member.hasPermission('ADMINISTRATOR') || member.id == Config.adminUser) {
            hasRole = true;
            console.log(`hasRoleOrIsAdmin ${member.id}: admin`);
        } else {
            member.roles.cache.array().forEach((role) => {
                // console.log('role check: ' + role.id + " : " + roleId);
                if (role.id == roleId) {
                    hasRole = true;
                }
            });
            console.log(`hasRoleOrIsAdmin ${member.id}: ${hasRole}`);
        }
    } catch (error) {
        // console.error(`Could not determine user (${member?member.id:member}) role`, error);
        throw new Error(`Could not determine user (${member ? member.id : member}) role`);
    }
    return hasRole;
}

exports.handleTimezone = handleTimezone;
exports.hasRoleOrIsAdmin = hasRoleOrIsAdmin;
exports.handleDefault = handleDefault;
exports.bc_setUsersTimezone = bc_setUsersTimezone;
