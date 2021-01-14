const UserModel = require('../models/User');
const CharModel = require('../models/Character');
const utils = require('../utils/utils.js');

/**
 * set user's timezone
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleDefault(msg, guildConfig) {
    try {
        let defaultChar = msg.content.substring((guildConfig.prefix + 'default').length + 1);
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (defaultChar == '' && currUser) {
            await utils.sendDirectOrFallbackToChannel([{ name: 'Default Character', value: `<@${msg.member.id}>, your default character is currently set to: ${currUser.defaultCharacter}` }], msg);
        } else if (defaultChar == '') {
            throw new Error('No default character set yet.');
        } else {
            let character = CharModel.findOne({ guildID: msg.guild.id, guildUser: msg.member.id, id: defaultChar, approvalStatus: true });
            if (!character) {
                throw new Error(`No approved character (${defaultChar}) found.`);
            }
            if (!currUser) {
                currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, defaultCharacter: defaultChar });
            } else {
                currUser.defaultCharacter = defaultChar;
            }
            await currUser.save();
            await utils.sendDirectOrFallbackToChannel([{ name: 'Default Character', value: `<@${msg.member.id}>, your default character was successfully set to: ${currUser.defaultCharacter}` }], msg);
        }
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * set user's timezone
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleTimezone(msg, guildConfig) {
    try {
        let timeZoneString = msg.content.substring((guildConfig.prefix + 'timezone').length + 1);
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (timeZoneString == '' && currUser) {
            await utils.sendDirectOrFallbackToChannel([{ name: 'Timezone', value: `<@${msg.member.id}>, your timezone is currently set to: ${currUser.timezone}` }], msg);
        } else if (timeZoneString == '') {
            throw new Error('No timezone set yet.');
        } else {
            timeZoneString = isValidTimeZone(timeZoneString);    
            if (!currUser) {
                currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, timezone: timeZoneString });
            } else {
                // console.log('setting timezone to "%s"', timeZoneString);
                currUser.timezone = timeZoneString;
            }
            await currUser.save();
            await utils.sendDirectOrFallbackToChannel([{ name: 'Timezone', value: `<@${msg.member.id}>, your timezone was successfully set to: ${currUser.timezone}` }], msg);
        }
        await msg.delete();
    } catch (error) {
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
async function hasRoleOrIsAdmin(member, roleId) { // @todo change this from message to member
    // if (roleId == '792845390834958368') {
    //     return false;
    // }
    let hasRole = false;
    try {
        if (member.hasPermission('ADMINISTRATOR')) {
            console.log('User is an admin.');
            hasRole = true;
        } else {
            member.roles.cache.array().forEach((role) => {
                console.log('role check: ' + role.id + " : " + roleId);
                if (role.id == roleId) {
                    hasRole = true;
                }
            })
        }
    } catch (error) {
        console.error('Could not determine user role', error);
        throw new Error('Could not determine user role');
    }
    console.log('permission check: ' + hasRole);
    return hasRole;
}

exports.handleTimezone = handleTimezone;
exports.hasRoleOrIsAdmin = hasRoleOrIsAdmin;
exports.handleDefault = handleDefault;
