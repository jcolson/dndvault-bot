
function stringOfSize(value, size, padChar, padBefore) {
    if (!padChar) {
        padChar = ' ';
    }
    value = value.substring(0, size);
    // console.log(`substr: "${value}"`);
    if (value.length < size) {
        if (padBefore) {
            value = padChar.repeat(size - value.length) + value;
        } else {
            value = value + padChar.repeat(size - value.length);
        }
    }
    // console.log(`repeat: "${value}"`);
    return value;
}

/**
 * 
 * @param {Message} msg 
 */
function getLinkForEvent(msg) {
    return `https://discordapp.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id}`;
}

exports.stringOfSize = stringOfSize;
exports.getLinkForEvent = getLinkForEvent;
