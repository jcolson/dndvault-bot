const UserModel = require('../models/User');

/**
 * set user's timezone
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleTimezoneSet(msg, guildConfig) {
    try {
        let timeZoneString = msg.content.substring((guildConfig.prefix + 'timezone set').length + 1);
        timeZoneString = isValidTimeZone(timeZoneString);
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser) {
            currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, timezone: timeZoneString });
        } else {
            console.log('setting timezone to "%s"', timeZoneString);
            currUser.timezone = timeZoneString;
        }
        await currUser.save();
        await msg.channel.send(`<@${msg.member.id}>, your timezone was successfully set to: ${currUser.timezone}`);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`<@${msg.member.id}> ... ${error.message}`);
    }
}
/**
 * show user's timezone
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleTimezone(msg, guildConfig) {
    try {
        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        if (!currUser || !currUser.timezone) {
            await msg.channel.send(`<@${msg.member.id}>, your timezone is currently not set.  Use \`timezone set\` to set it.`);
        } else {
            await msg.channel.send(`<@${msg.member.id}>, your timezone is currently set to: ${currUser.timezone}`);
        }
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}

function isValidTimeZone(tz) {
    if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
        throw 'Time zones are not available in this environment';
    }
    let validTZ = Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: 'long' });
    let validTZstring = validTZ.format(new Date());
    // console.log('valid tz %s', validTZstring);
    validTZstring = validTZstring.substring(validTZstring.indexOf(', ')+2);
    // console.log('valid tz %s', validTZstring);
    return tz;
}

exports.handleTimezoneSet = handleTimezoneSet;
exports.handleTimezone = handleTimezone;