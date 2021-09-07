const { MessageEmbed } = require('discord.js');
const utils = require('../../utils/utils.js');
const {testables} = utils;

const BASEURL ='https://discord.com/channels';
const CHANNELID ='channelID';
const MESSAGEID ='messageId';
const DEFAULT_GUILDID ='@me';

test('trimTagsFromId with a user tag', () => {
    expect(testables.trimTagsFromId('<@!227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with a channel tag', () => {
    expect(testables.trimTagsFromId('<#227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with a role tag', () => {
    expect(testables.trimTagsFromId('<@&227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with OUT a tag', () => {
    expect(testables.trimTagsFromId('227562842591723521')).toBe('227562842591723521');
});

test('parseAllTagsFromString with multiple tags', () => {
    expect(testables.parseAllTagsFromString(`I think we should add <@16890631690977280> to the <@&234362454976102401> role.
    I think we should add <@!36890631690977280> to the <@&434362454976102401> role.
    I think we should add <@&56890631690977280> to the <@&634362454976102401> role.`)).toStrictEqual([
        '<@16890631690977280>',
        '<@&234362454976102401>',
        '<@!36890631690977280>',
        '<@&434362454976102401>',
        '<@&56890631690977280>',
        '<@&634362454976102401>'
    ]);
});

test('parseAllTagsFromString with no tags', () => {
    expect(testables.parseAllTagsFromString(`I think we should add 16890631690977280> to the <@&234362454976102401 role.
    I think we should add <@!36890631690977280 to the 434362454976102401> role.
    I think we should add &56890631690977280> to the &634362454976102401> role.`)).toBe(null);
});

test(`appendStringsForEmbed don't quote`, () => {
    //stringArray, fieldSize, separator, dontQuote, padChar
    expect(testables.appendStringsForEmbed(['one', 'tw', 'three', 'four'], 3, '|', true, ' ')).toBe('one|tw |thr|fou');
});

test(`appendStringsForEmbed quoted`, () => {
    //stringArray, fieldSize, separator, dontQuote, padChar
    expect(testables.appendStringsForEmbed(['one', 'tw', 'three', 'four'], 3, '|', false, ' ')).toBe('`one`|`tw `|`thr`|`fou`');
});

test(`appendStringsForEmbedChanges`, () => {
    expect(testables.appendStringsForEmbedChanges(['12345678901234567890', '12345678901234567890', '12345678901234567890', '1234567890'])).toBe('`1234567890123456` | `1234567890123456` | `1234567890123456` | `1234567890      `');
});

test(`isTrue`, () => {
    expect(testables.isTrue(1)).toBe(true);
    expect(testables.isTrue('1')).toBe(true);
    expect(testables.isTrue(true)).toBe(true);
    expect(testables.isTrue('true')).toBe(true);
    expect(testables.isTrue('on')).toBe(true);
    expect(testables.isTrue('yes')).toBe(true);
    expect(testables.isTrue(false)).toBe(false);
    expect(testables.isTrue(0)).toBe(false);
    expect(testables.isTrue("no")).toBe(false);
    expect(testables.isTrue(undefined)).toBe(false);
});

test('lengthOfEmbed', () => {
    let fields = [{name: 'field1', value: 'value1'},{name: 'field2', value: 'value2'}];

    let embed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setTitle(`Review Changes for Character:`)
        .setURL('https://discord.js.org/')
        .setAuthor('D&D Vault')
        .setDescription('Some Description')
        .setFields(fields);

    expect(testables.lengthOfEmbed(embed)).toBe(101);
});

const testCommands = {
    "help": {
        "name": "help",
        "description": "Get help about D&D Vault Bot",
        "slash": true
    },
    "show": {
        "name": "show",
        "description": "Show a user's character from the vault",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    }
}

test(`checkIfCommandsChanged false`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsA = testables.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = testables.transformCommandsToDiscordFormat(testCommandsB1);
    expect(testables.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(false);
});

const testCommandsWithOptions = {
    "help": {
        "name": "help",
        "description": "Get help about D&D Vault Bot",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    },
    "show": {
        "name": "show",
        "description": "Show a user's character from the vault",
        "slash": true,
        "options": [{
            "name": "character_id",
            "description": "The Character ID from the `list` command",
            "required": true,
            "type": 3
        }]
    }
}

test(`checkIfCommandsChanged if command and not actions or actions but not command`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommandsWithOptions));
    let testCommandsA = testables.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = testables.transformCommandsToDiscordFormat(testCommandsB1);

    //console.debug('testCommandsA-->', testCommandsA);
    //console.debug('testCommandsB-->', testCommandsB);

    expect(testables.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`checkIfCommandsChanged A true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsA1.boogers = {
        "name": "stats",
        "description": "Get statistics about bot",
        "slash": true
    };
    let testCommandsA = testables.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = testables.transformCommandsToDiscordFormat(testCommandsB1);
    expect(testables.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`checkIfCommandsChanged A option true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsA1.show.options[0].required = false;
    let testCommandsA = testables.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = testables.transformCommandsToDiscordFormat(testCommandsB1);
    expect(testables.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`checkIfCommandsChanged B true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsB1.boogers = {
        "name": "stats",
        "description": "Get statistics about bot",
        "slash": true
    }
    let testCommandsA = testables.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = testables.transformCommandsToDiscordFormat(testCommandsB1);
    expect(testables.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`strikeThrough test result`, () => {
    let result = testables.strikeThrough("text to be splited");
    expect(result).toMatch('t̶e̶x̶t̶ ̶t̶o̶ ̶b̶e̶ ̶s̶p̶l̶i̶t̶e̶d̶');
});

test(`parseIntOrMakeZero with undefined returns 0`, () => {
    let result = testables.parseIntOrMakeZero(undefined);
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with null returns 0`, () => {
    let result = testables.parseIntOrMakeZero(null);
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with unparseable String returns 0`, () => {
    let result = testables.parseIntOrMakeZero('a');
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with parseable String returns parsed value`, () => {
    let result = testables.parseIntOrMakeZero('123a');
    expect(result).toBe(123);
});

test(`parseIntOrMakeZero with NaN returns 0`, () => {
    let result = testables.parseIntOrMakeZero(NaN);
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with POSITIVE_INFINITY returns 0`, () => {
    let result = testables.parseIntOrMakeZero(Number.POSITIVE_INFINITY);
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with NEGATIVE_INFINITY returns 0`, () => {
    let result = testables.parseIntOrMakeZero(Number.NEGATIVE_INFINITY);
    expect(result).toBe(0);
});

test(`parseIntOrMakeZero with 0 returns 0`, () => {
    let result = testables.parseIntOrMakeZero(0);
    expect(result).toBe(0);
});

test('getDiscordUrlWithUndefinedguildIdToMatchString', () => {
    let url = testables.getDiscordUrl(undefined, CHANNELID, MESSAGEID);
    expect(url).toMatch(`${BASEURL}/${DEFAULT_GUILDID}/${CHANNELID}/${MESSAGEID}`);
});

test('getDiscordUrlWithNullguildIdToMatchString', () => {
    let url = testables.getDiscordUrl(null, CHANNELID, MESSAGEID);
    expect(url).toMatch(`${BASEURL}/${DEFAULT_GUILDID}/${CHANNELID}/${MESSAGEID}`);
});

test('getDiscordUrlWithNotNullguildIdToMatchString', () => {
    const GUILDID = 'guildId';
    let url = testables.getDiscordUrl(GUILDID, CHANNELID ,MESSAGEID);
    expect(url).toMatch(`${BASEURL}/${GUILDID}/${CHANNELID}/${MESSAGEID}`);
});
