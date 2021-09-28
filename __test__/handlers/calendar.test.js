const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const calendar = require('../../handlers/calendar.js');
const utils = require('../../utils/utils.js');

jest.mock('../../handlers/config.js');
const config = require('../../handlers/config.js');

jest.mock('../../models/Event.js');
const EventModel = require('../../models/Event.js');

const { testables } = calendar;

const EXCEPTION_ERROR_MESSAGE = 'No userID passed!';

const SIMPLE_STRING = 'this is a simple string line';
const SIMPLE_ESCAPABLE_STRING = 'this\nis a multi\r\n<line>\rstring\r\n';
const SIMPLE_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';
const SIMPLE_ENCODED_AND_ESCAPED_STRING = 'this\\nis a multi\\n<line>\\nstring\\n';

const ESCAPABLE_STRING = '"this\nis \'a\' &multi?\r\n<line>\rstring\r\n"';
const ESCAPED_AND_NON_ENCODED_STRING = '"this\\nis \'a\' &multi?\\n<line>\\nstring\\n"';
const ESCAPED_AND_ENCODED_STRING = '&#x22;this\\nis &#x27;a&#x27; &#x26;multi?\\n&#x3C;line&#x3E;\\nstring\\n&#x22;';

const EOL = testables.EOL;

afterEach(() => {
    jest.clearAllMocks();
});

test('encodeStringICS with no encode and non escapable string returns original string', () => {
    expect(testables.encodeStringICS(SIMPLE_STRING, false)).toMatch(SIMPLE_STRING);
});

test('encodeStringICS with encode and non escapable string returns original string', () => {
    expect(testables.encodeStringICS(SIMPLE_STRING, true)).toMatch(SIMPLE_STRING);
});

test('encodeStringICS with no encode and escapable string returns escaped string', () => {
    expect(testables.encodeStringICS(SIMPLE_ESCAPABLE_STRING, false)).toMatch(SIMPLE_ESCAPED_STRING);
});

test('encodeStringICS with encode and escapable string returns escaped and encoded string', () => {
    expect(testables.encodeStringICS(SIMPLE_ESCAPABLE_STRING, false)).toMatch(SIMPLE_ENCODED_AND_ESCAPED_STRING);
});

test('encodeStringICS with no encode and escapable string returns escaped string', () => {
    expect(testables.encodeStringICS(ESCAPABLE_STRING, false)).toMatch(ESCAPED_AND_NON_ENCODED_STRING);
});

test('encodeStringICS with encode and plain string returns escaped string', () => {
    expect(testables.encodeStringICS(ESCAPABLE_STRING, true)).toMatch(ESCAPED_AND_ENCODED_STRING);
});

test('encodeStringICS with encode and plain string returns escaped string', () => {
    let date = new Date('1975-01-15T19:30:21');
    expect(testables.getICSdateFormat(date)).toMatch('19750115T193000Z');
});

test('handleCalendarRequest with undefined userId throws Error', async () => {
    let userID;
    let excludeGuild;

    expect(testables.handleCalendarRequest(userID, excludeGuild)).rejects.toThrowError(EXCEPTION_ERROR_MESSAGE);
});

test('handleCalendarRequest with null userId throws Error', async () => {
    let userID = null;
    let excludeGuild;
    expect(testables.handleCalendarRequest(userID, excludeGuild)).rejects.toThrowError(EXCEPTION_ERROR_MESSAGE);
});

test('handleCalendarRequest with valid userId and no events returns string', async () => {
    let userID = '123';
    let excludeGuild = [];

    // We mock the class method
    jest.spyOn(EventModel, 'find').mockImplementation(() => []);

    const result = await testables.handleCalendarRequest(userID, excludeGuild);

    const expected = `BEGIN:VCALENDAR${EOL}VERSION:2.0${EOL}PRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN${EOL}URL:${Config.httpServerURL}/calendar?userID=123${EOL}NAME:DND Vault${EOL}X-WR-CALNAME:DND Vault${EOL}DESCRIPTION:DND Vault events from Discord${EOL}X-WR-CALDESC:DND Vault events from Discord${EOL}REFRESH-INTERVAL;VALUE=DURATION:PT12H${EOL}X-PUBLISHED-TTL:PT12H${EOL}COLOR:34:50:105${EOL}CALSCALE:GREGORIAN${EOL}END:VCALENDAR${EOL}`;
    expect(result).toMatch(expected);
});

const currentEvent = {
    _id: 'id01',
    channelID: 'channel1',
    messageID: 'messageId1',

    title: 'title1',

    deployedByID: 'id02',

    guildID: 'guildId1',
    attendees: [{ userID: '122', standby: true }, { userID: '123', standby: true }],
    description: 'Original description',
    date_time: new Date('2021-09-15T19:00:00'),
    duration_hours: 4
};

test('handleCalendarRequest with valid userId and event excluding guild returns string', async () => {
    let userID = '123';
    let excludeGuild = [currentEvent.guildID];

    // We mock the class method
    jest.spyOn(EventModel, 'find').mockImplementation(() => [currentEvent]);

    config.calendarICSRefreshHours = 10;
    config.httpServerURL = 'http://localhost1';

    const result = await testables.handleCalendarRequest(userID, excludeGuild);

    const expected = `BEGIN:VCALENDAR${EOL}VERSION:2.0${EOL}PRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN${EOL}URL:${Config.httpServerURL}/calendar?userID=${userID}${EOL}NAME:DND Vault${EOL}X-WR-CALNAME:DND Vault${EOL}DESCRIPTION:DND Vault events from Discord${EOL}X-WR-CALDESC:DND Vault events from Discord${EOL}REFRESH-INTERVAL;VALUE=DURATION:PT${Config.calendarICSRefreshHours}H${EOL}X-PUBLISHED-TTL:PT${Config.calendarICSRefreshHours}H${EOL}COLOR:34:50:105${EOL}CALSCALE:GREGORIAN${EOL}END:VCALENDAR${EOL}`;
    expect(result).toMatch(expected);
});

test('handleCalendarRequest with valid userId and event returns string', async () => {
    let userID = '123';
    let excludeGuild = [];

    // We mock the class method
    jest.spyOn(EventModel, 'find').mockImplementation(() => [currentEvent]);

    jest.spyOn(config, 'getGuildConfig').mockImplementation((guildID) => {
        return { name: 'guildIDCachedValue' }
    });

    let result = await testables.handleCalendarRequest(userID, excludeGuild);

    //We need to replace the timestamp parts from the result as can not be compared because is generated at runtime.
    result = result.replace(/DTSTAMP:.*Z/g, 'DTSTAMP:Z');
    result = result.replace(/DTSTART:.*Z/g, 'DTSTART:Z');

    const expected = `BEGIN:VCALENDAR${EOL}VERSION:2.0${EOL}PRODID:-//BLACKNTAN LLC//NONSGML dndvault//EN${EOL}URL:${Config.httpServerURL}/calendar?userID=${userID}${EOL}NAME:DND Vault${EOL}X-WR-CALNAME:DND Vault${EOL}DESCRIPTION:DND Vault events from Discord${EOL}X-WR-CALDESC:DND Vault events from Discord${EOL}REFRESH-INTERVAL;VALUE=DURATION:PT${Config.calendarICSRefreshHours}H${EOL}X-PUBLISHED-TTL:PT${Config.calendarICSRefreshHours}H${EOL}COLOR:34:50:105${EOL}CALSCALE:GREGORIAN${EOL}BEGIN:VEVENT${EOL}DTEND:20210915T230000Z${EOL}UID:id01${EOL}DTSTAMP:Z${EOL}LOCATION:https://discordapp.com/channels/guildId1/channel1/messageId1${EOL}DESCRIPTION:Original description${EOL}URL;VALUE=URI:https://discordapp.com/channels/guildId1/channel1/messageId1${EOL}SUMMARY:${utils.EMOJIS.DAGGER}title1 [${utils.EMOJIS.HOURGLASS}STANDBY][${utils.EMOJIS.CHECK}DEPLOYED] (guildIDCachedValue)${EOL}DTSTART:Z${EOL}END:VEVENT${EOL}END:VCALENDAR${EOL}`;

    expect(result).toMatch(expected);
});
