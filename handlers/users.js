const UserModel = require('../models/User');

/**
 * set user's timezone
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleTimezoneSet(msg, guildConfig) {
    try {
        let timeZoneString = msg.content.substring((guildConfig.prefix + 'timezone set').length + 1);

        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        console.log(currUser);
        if (!currUser || !currUser.timezone) {
            currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, timezone: 'GMT' });
        }
        await currUser.save();
        await msg.channel.send(`<@${msg.member.id}>, your timezone was successfully set to: ${currUser.timezone}`);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
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
        console.log(currUser);
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

exports.handleTimezoneSet = handleTimezoneSet;
exports.handleTimezone = handleTimezone;