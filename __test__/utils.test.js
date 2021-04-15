const { MessageEmbed } = require('discord.js');
const utils = require('../utils/utils');

test('trimTagsFromId with a user tag', () => {
    expect(utils.trimTagsFromId('<@!227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with a channel tag', () => {
    expect(utils.trimTagsFromId('<#227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with a role tag', () => {
    expect(utils.trimTagsFromId('<@&227562842591723521>')).toBe('227562842591723521');
});

test('trimTagsFromId with OUT a tag', () => {
    expect(utils.trimTagsFromId('227562842591723521')).toBe('227562842591723521');
});

test(`appendStringsForEmbed don't quote`, () => {
    //stringArray, fieldSize, separator, dontQuote, padChar
    expect(utils.appendStringsForEmbed(['one', 'tw', 'three', 'four'], 3, '|', true, ' ')).toBe('one|tw |thr|fou');
});

test(`appendStringsForEmbed quoted`, () => {
    //stringArray, fieldSize, separator, dontQuote, padChar
    expect(utils.appendStringsForEmbed(['one', 'tw', 'three', 'four'], 3, '|', false, ' ')).toBe('`one`|`tw `|`thr`|`fou`');
});

test(`appendStringsForEmbedChanges`, () => {
    expect(utils.appendStringsForEmbedChanges(['12345678901234567890', '12345678901234567890', '12345678901234567890', '1234567890'])).toBe('`1234567890123456` | `1234567890123456` | `1234567890123456` | `1234567890      `');
});

test(`isTrue`, () => {
    expect(utils.isTrue(1)).toBe(true);
    expect(utils.isTrue('1')).toBe(true);
    expect(utils.isTrue(true)).toBe(true);
    expect(utils.isTrue('true')).toBe(true);
    expect(utils.isTrue('on')).toBe(true);
    expect(utils.isTrue('yes')).toBe(true);
    expect(utils.isTrue(false)).toBe(false);
    expect(utils.isTrue(0)).toBe(false);
    expect(utils.isTrue("no")).toBe(false);
    expect(utils.isTrue(undefined)).toBe(false);
});

test('lengthOfEmbed', () => {
    let embed = new MessageEmbed()
        .setColor(utils.COLORS.BLUE)
        .setTitle(`Review Changes for Character:`)
        .setURL('https://discord.js.org/')
        .setAuthor('DND Vault')
        .setDescription('Some Description');
    expect(utils.lengthOfEmbed(embed)).toBe(77);
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
    let testCommandsA = utils.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = utils.transformCommandsToDiscordFormat(testCommandsB1);
    expect(utils.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(false);
});

test(`checkIfCommandsChanged A true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsA1.boogers = {
        "name": "stats",
        "description": "Get statistics about bot",
        "slash": true
    };
    let testCommandsA = utils.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = utils.transformCommandsToDiscordFormat(testCommandsB1);
    expect(utils.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`checkIfCommandsChanged A option true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsA1.show.options[0].required = false;
    let testCommandsA = utils.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = utils.transformCommandsToDiscordFormat(testCommandsB1);
    expect(utils.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});

test(`checkIfCommandsChanged B true`, () => {
    let testCommandsA1 = JSON.parse(JSON.stringify(testCommands));
    let testCommandsB1 = JSON.parse(JSON.stringify(testCommands));
    testCommandsB1.boogers = {
        "name": "stats",
        "description": "Get statistics about bot",
        "slash": true
    }
    let testCommandsA = utils.transformCommandsToDiscordFormat(testCommandsA1);
    let testCommandsB = utils.transformCommandsToDiscordFormat(testCommandsB1);
    expect(utils.checkIfCommandsChanged(testCommandsA, testCommandsB)).toBe(true);
});
