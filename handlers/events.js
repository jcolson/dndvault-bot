/**
 * Create an event
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleEventCreate(msg, guildConfig) {
    let eventString = msg.content.substring((guildConfig.prefix + 'event create').length + 1);
    let eventArray = parseEventString(eventString);
}

/**
 * parse a message like
 * !event create [MISSION_TITLE] @DM [@USER_NAME] at [TIME] for [DURATION_HOURS] on [DATE] with [NUMBER_PLAYER_SLOTS] partof [CAMPAIGN] desc [test]
 * in order to create a mission
 * @param {String} eventString 
 */
function parseEventString(eventString) {
    const separatorArray = [' @DM ', ' AT ', ' FOR ', ' ON ', ' WITH ', ' PARTOF ', ' DESC '];
    const eventArray = {};

    // check if all required separators exist
    const sepIndex = [];
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[1], sepIndex[0]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[2], sepIndex[1]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[3], sepIndex[2]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[4], sepIndex[3]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[5], sepIndex[4]));
    sepIndex.push(eventString.toUpperCase().indexOf(separatorArray[6], sepIndex[5]));
    // add last index as the length of the string
    sepIndex.push(eventString.length);
    // console.log('all indexes', sepIndex);

    eventArray['title'] = eventString.substring(0, nextValidIndex(0, sepIndex));
    eventArray['dm'] = sepIndex[0] != -1 ? eventString.substring(sepIndex[0] + separatorArray[0].length, nextValidIndex(1, sepIndex)) : undefined;
    eventArray['time'] = sepIndex[1] != -1 ? eventString.substring(sepIndex[1] + separatorArray[1].length, nextValidIndex(2, sepIndex)) : undefined;
    eventArray['duration'] = sepIndex[2] != -1 ? eventString.substring(sepIndex[2] + separatorArray[2].length, nextValidIndex(3, sepIndex)) : undefined;
    eventArray['date'] = sepIndex[3] != -1 ? eventString.substring(sepIndex[3] + separatorArray[3].length, nextValidIndex(4, sepIndex)) : undefined;
    eventArray['numberslots'] = sepIndex[4] != -1 ? eventString.substring(sepIndex[4] + separatorArray[4].length, nextValidIndex(5, sepIndex)) : undefined;
    eventArray['campaign'] = sepIndex[5] != -1 ? eventString.substring(sepIndex[5] + separatorArray[5].length, nextValidIndex(6, sepIndex)) : undefined;
    eventArray['description'] = sepIndex[6] != -1 ? eventString.substring(sepIndex[6] + separatorArray[6].length, nextValidIndex(7, sepIndex)) : undefined;
    // console.log('array', eventArray);
    return eventArray;
}
function nextValidIndex(startindex, sepIndexArray) {
    for (let i = startindex; i < sepIndexArray.length; i++) {
        if (sepIndexArray[i] != -1) {
            return sepIndexArray[i];
        }
    }
}
exports.handleEventCreate = handleEventCreate;
