/**
 * Create an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventCreate(msg, guildConfig) {
    let eventString = msg.content.substring((guildConfig.prefix + 'list campaign').length + 1);
    let eventArray = parseEventString(eventString);
}

function parseEventString(eventString) {
    let eventArray = {};
    // check if all required separators exist
    const separators = [];
    separators.push(eventString.toUpperCase().indexOf('@DM'));
    separators.push(eventString.substring(separators[0]).toUpperCase().indexOf('AT'));
    separators.push(eventString.substring(separators[1]).toUpperCase().indexOf('FOR'));
    separators.push(eventString.substring(separators[2]).toUpperCase().indexOf('ON'));
    separators.push(eventString.substring(separators[3]).toUpperCase().indexOf('WITH'));
    separators.push(eventString.substring(separators[4]).toUpperCase().indexOf('PARTOF'));
    console.log('partof %d', separators[5]);
    separators.push(eventString.substring(separators[5]).toUpperCase().indexOf('DESC'));
    console.log('desc %d', separators[6]);
    eventArray['title'] = eventString.substring(0, separators[0]);
    console.log('title %s', eventArray['title']);
    return eventArray;
}
exports.handleEventCreate = handleEventCreate;
