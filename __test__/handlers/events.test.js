const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
jest.mock('../../models/Event.js');
const events = require('../../handlers/events.js');
const EventModel = require('../../models/Event.js');
const discordjs = require('discord.js');
const { testables } = events;

test('embedForEvent with too long title fields, does not throw exception', async () => {
    const longField = `super long test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title
    test title test title test title test title test title test title test title test title test title test title test title test title test title test title test title`; //len 1167
    const client = new discordjs.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'] });
    let rawGuildData = {};
    let guild = new discordjs.Guild(client, rawGuildData);
    let event = new EventModel();
    event._id = discordjs.SnowflakeUtil.generate();
    event.attendees = new Map();
    event.description = longField;
    let eventArray = [event];
    let title = longField;
    let isShow = true;
    let embeds = await testables.embedForEvent(guild, eventArray, title, isShow);
    // console.debug(embeds[0].title.length);
    expect(embeds[0].title.length).toBeLessThanOrEqual(1024);
    for (field of embeds[0].fields) {
        // console.debug(`field`,field);
        // console.debug(field.value.length);
        expect(field.value.length).toBeLessThanOrEqual(1024);
    }
});
