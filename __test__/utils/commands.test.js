const {handleCommandExec, parseMessageParms, COMMANDS} = require('../../utils/commands.js');

test('COMMANDS is not undefined or empty', () => {
    expect(COMMANDS).not.toBe(undefined);
    expect(COMMANDS).not.toBe(null);
});
