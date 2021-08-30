const calendar = require('../../handlers/calendar.js');
const config = require('../../handlers/config.js');

const EXCEPTION_ERROR_MESSAGE = 'No userID passed!';

const SIMPLE_STRING = 'this is a simple string line';
const SIMPLE_ESCAPABLE_STRING = 'this\nis a multi\r\n<line>\rstring\r\n';
const SIMPLE_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';
const SIMPLE_ENCODED_AND_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';

const ESCAPABLE_STRING = '\"this\nis \'a\' &multi?\r\n<line>\rstring\r\n\"';
const ESCAPED_AND_NON_ENCODED_STRING = '\"this\\nis \'a\' &multi?\\n<line>\\nstring\\n\"';
const ESCAPED_AND_ENCODED_STRING = '&#x22;this\\nis &#x27;a&#x27; &#x26;multi?\\n&#x3C;line&#x3E;\\nstring\\n&#x22;';

test('encodeStringICS with no encode and non escapable string returns original string', () => {
    expect(calendar.encodeStringICS(SIMPLE_STRING, false)).toMatch(SIMPLE_STRING);
});

test('encodeStringICS with encode and non escapable string returns original string', () => {
    expect(calendar.encodeStringICS(SIMPLE_STRING, true)).toMatch(SIMPLE_STRING);
});

test('encodeStringICS with no encode and escapable string returns escaped string', () => {
    expect(calendar.encodeStringICS(SIMPLE_ESCAPABLE_STRING, false)).toMatch(SIMPLE_ESCAPED_STRING);
});

test('encodeStringICS with encode and escapable string returns escaped and encoded string', () => {
    expect(calendar.encodeStringICS(SIMPLE_ESCAPABLE_STRING, false)).toMatch(SIMPLE_ENCODED_AND_ESCAPED_STRING);
});

test('encodeStringICS with no encode and escapable string returns escaped string', () => {
    expect(calendar.encodeStringICS(ESCAPABLE_STRING, false)).toMatch(ESCAPED_AND_NON_ENCODED_STRING);
});

test('encodeStringICS with encode and plain string returns escaped string', () => {
    expect(calendar.encodeStringICS(ESCAPABLE_STRING, true)).toMatch(ESCAPED_AND_ENCODED_STRING);
});

test('encodeStringICS with encode and plain string returns escaped string', () => {
    let date = new Date('1975-01-15T19:30:21');
    expect(calendar.getICSdateFormat(date)).toMatch('19750115T193000Z');
});

test('handleCalendarRequest with undefined userId throws Error', async () => {
    let userID;
    let excludeGuild;

    expect(calendar.handleCalendarRequest(userID, excludeGuild)).rejects.toThrowError(EXCEPTION_ERROR_MESSAGE);
});

test('handleCalendarRequest with null userId throws Error', async () => {
    let userID = null;
    let excludeGuild;
    expect(calendar.handleCalendarRequest(userID, excludeGuild)).rejects.toThrowError(EXCEPTION_ERROR_MESSAGE);
});
