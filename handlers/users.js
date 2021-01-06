const UserModel = require('../models/User');

/**
 * Create an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleTimezoneSet(msg, guildConfig) {
    try {
        let eventString = msg.content.substring((guildConfig.prefix + 'timezone set').length + 1);

        let currUser = await UserModel.findOne({ userID: msg.member.id, guildID: msg.guild.id });
        console.log(currUser);
        if (!currUser || !currUser.timezone) {
            currUser = new UserModel({ guildID: msg.guild.id, userID: msg.member.id, timezone: 'GMT' });
        }
        await currUser.save();
        await msg.channel.send(`${msg.member.displayName}, your timezone was successfully set to: ${currUser.timezone}`);
        await msg.delete();
    } catch (error) {
        await msg.channel.send(`unrecoverable ... ${error.message}`);
    }
}
exports.handleTimezoneSet = handleTimezoneSet;
