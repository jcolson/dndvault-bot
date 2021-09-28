const commands = require('../../utils/commands.js');
const { testables } = commands;

test('COMMANDS is not undefined or empty', () => {
    expect(testables.COMMANDS).not.toBe(undefined);
    expect(testables.COMMANDS).not.toBe(null);
});
