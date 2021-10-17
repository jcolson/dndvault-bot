const { testables }  = require('../../utils/commands.js');

afterEach(() => {
    jest.clearAllMocks();
});

test('COMMANDS is not undefined or empty', () => {
    expect(testables.COMMANDS).not.toBe(undefined);
    expect(testables.COMMANDS).not.toBe(null);
});

test('parseMessageParms when messageContent is undefined returns an empty list', () => {
    // Setup
    let messageContent = undefined;
    let command = undefined;
    let prefix = undefined;

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([]);
});

test('parseMessageParms when messageContent is null returns an empty list', () => {
    // Setup
    let messageContent = null;
    let command = undefined;
    let prefix = undefined;

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([]);
});

test('parseMessageParms when command is not parseable then throws error', () => {
    // Setup
    let messageContent = 'messageContent';
    let command = 'Unparseable_Command';
    let prefix = '';

    // Method under test and validations
    expect(() => {
        testables.parseMessageParms(messageContent, command, prefix);
    }).toThrow('Command (Unparseable Command) parameters could not be parsed: messageContent');

});

test('parseMessageParms when command starts with _ then the parameters could not be parsed', () => {
    // Setup
    let messageContent = 'command1 a b c';
    let command = '_command1';
    let prefix = '';

    // Method under test and validations
    expect(() => {
        testables.parseMessageParms(messageContent, command, prefix);
    }).toThrow('Command ( command1) parameters could not be parsed: command1 a b c');

});

test('parseMessageParms when messageContent contains command Then we extract the params as a list', () => {
    // Setup
    let messageContent = 'command1 a b c';
    let command = 'command1';
    let prefix = '_';

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([
        {"value": "a"},
        {"value": "b"},
        {"value": "c"},
    ]);
});

test('parseMessageParms when messageContent contains non matching prefix +  command and a non empty prefix Then we extract the params as a list', () => {
    // Setup
    let messageContent = 'command1 a b c';
    let command = 'command1';
    let prefix = 'prefix';

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([
        {"value": "a"},
        {"value": "b"},
        {"value": "c"},
    ]);
});

test('parseMessageParms when messageContent contains matching prefix + command and a non empty prefix Then we extract the params as a list', () => {
    // Setup
    let messageContent = 'prefixcommand1 a b c';
    let command = 'command1';
    let prefix = 'prefix';

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([
        {"value": "a"},
        {"value": "b"},
        {"value": "c"},
    ]);
});

test('parseMessageParms when messageContent contains poll values Then we extract the params as a list', () => {
    // Setup
    let messageContent = 'prefixcommand1 ["a"] ["b"] ["c"]';
    let command = 'command1';
    let prefix = 'prefix';

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([
        {"value": "["},
        {"value": "a"},
        {"value": "]"},
        {"value": "["},
        {"value": "b"},
        {"value": "]"},
        {"value": "["},
        {"value": "c"},
        {"value": "]"},
    ]);
});

test('parseMessageParms when messageContent contains command !. Then we extract the params as a list', () => {
    // Setup
    let messageContent = '!prefixcommand1 "a" "b" "c"';
    let command = 'command1';
    let prefix = 'prefix';

    // Method under test and validations
    expect(testables.parseMessageParms(messageContent, command, prefix)).toStrictEqual([
        {"value": "a"},
        {"value": "b"},
        {"value": "c"},
    ]);
});