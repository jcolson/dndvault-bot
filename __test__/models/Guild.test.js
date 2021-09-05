const Guild = require('../../models/Guild.js');

test('Verify default Guild constructor', () => {
    const guild = new Guild();

    //console.log('guild-->' + guild);

    expect(guild.guildID).toBe(undefined);
    expect(guild.iconURL).toBe(undefined);
    expect(guild.prefix).toBe(undefined);
    expect(guild.arole).toBe(undefined);
    expect(guild.prole).toBe(undefined);
    expect(guild.requireCharacterApproval).toBe(false);
    expect(guild.requireCharacterForEvent).toBe(false);
    expect(guild.enableStandbyQueuing).toBe(false);
    expect(guild.channelForPolls).toBe(undefined);
    expect(guild.channelForEvents).toBe(undefined);
    expect(guild.lastUsed).toBe(undefined);
    expect(guild.botID).toBe(undefined);
    expect(guild.eventPlanCat).toBe(undefined);
    expect(guild.eventVoiceCat).toBe(undefined);
    expect(guild.eventVoicePerms).toBe('attendees');
    expect(guild.eventPlanDays).toBe(7);
    expect(guild.eventRequireApprover).toBe(false);
});