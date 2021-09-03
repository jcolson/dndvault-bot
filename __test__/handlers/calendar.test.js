jest.mock('../../models/Event.js');

const calendar = require('../../handlers/calendar.js');
const EventModel = require('../../models/Event.js');

const EXCEPTION_ERROR_MESSAGE = 'No userID passed!';

const SIMPLE_STRING = 'this is a simple string line';
const SIMPLE_ESCAPABLE_STRING = 'this\nis a multi\r\n<line>\rstring\r\n';
const SIMPLE_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';
const SIMPLE_ENCODED_AND_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';

const ESCAPABLE_STRING = '\"this\nis \'a\' &multi?\r\n<line>\rstring\r\n\"';
const ESCAPED_AND_NON_ENCODED_STRING = '\"this\\nis \'a\' &multi?\\n<line>\\nstring\\n\"';
const ESCAPED_AND_ENCODED_STRING = '&#x22;this\\nis &#x27;a&#x27; &#x26;multi?\\n&#x3C;line&#x3E;\\nstring\\n&#x22;';

const EOL = calendar.EOL;

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

test('handleCalendarRequest with valid userId returns string', async () => {
    let userID = "123";
    let excludeGuild = [];

    // We mock the class method
    jest.spyOn(EventModel, 'find').mockImplementation(() => []);

    //EventModel.mockImplementation(find => []);

    const result = await calendar.handleCalendarRequest(userID, excludeGuild);
    //console.log(result);

    const expected = `BEGIN:VCALENDAR${EOL}VERSION:2.0${EOL}PRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN${EOL}URL:undefined/calendar?userID=123${EOL}NAME:DND Vault${EOL}X-WR-CALNAME:DND Vault${EOL}DESCRIPTION:DND Vault events from Discord${EOL}X-WR-CALDESC:DND Vault events from Discord${EOL}REFRESH-INTERVAL;VALUE=DURATION:PT12H${EOL}X-PUBLISHED-TTL:PT12H${EOL}COLOR:34:50:105${EOL}CALSCALE:GREGORIAN${EOL}END:VCALENDAR${EOL}`;
    expect(result).toMatch(expected);
});