var SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler();
// SegfaultHandler.causeSegfault();

const commands = require('../../utils/commands.js');
const { testables } = commands;

afterEach(() => {
    jest.clearAllMocks();
});

test('COMMANDS is not undefined or empty', () => {
    // expect(testables.COMMANDS).not.toBe(undefined);
    // expect(testables.COMMANDS).not.toBe(null);
});
