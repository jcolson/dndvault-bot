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