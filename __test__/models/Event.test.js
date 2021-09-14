const Event = require('../../models/Event.js');

test('Verify default Event constructor', () => {
    const event = new Event();

    //console.log('event-->' + event);
    //console.log('event.attendees-->' + event.attendees);

    expect(event.guildID).toBe(undefined);
    expect(event.title).toBe(undefined);
    expect(event.dm).toBe(undefined);
    expect(event.duration_hours).toBe(undefined);
    expect(event.date_time).toBe(undefined);
    expect(event.number_player_slots).toBe(undefined);

    //Check attendees initial definition
    expect(typeof event.attendees).not.toBe(undefined);
    expect(Object.entries(event.attendees).length).toBe(0); //Subobject have not been initialized

    expect(event.campaign).toBe(undefined);
    expect(event.description).toBe(undefined);
    expect(event.userID).toBe(undefined);
    expect(event.deployedByID).toBe(undefined);
    expect(event.channelID).toBe(undefined);
    expect(event.messageID).toBe(undefined);
    expect(event.reminderSent).toBe(undefined);
    expect(event.recurEvery).toBe(undefined);
    expect(event.recurComplete).toBe(undefined);
    expect(event.planningChannel).toBe(undefined);
    expect(event.voiceChannel).toBe(undefined);
});