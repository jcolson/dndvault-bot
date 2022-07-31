const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const roll = require('../../handlers/roll.js');
const utils = require('../../utils/utils.js');
const { testables } = roll;

afterEach(() => {
    jest.clearAllMocks();
});

test('handleDiceRoll static 20', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'value': '20' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[0].value}${utils.EMOJIS.DICE}`,
                            'value': '`20`'//expect.stringMatching(/^20$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll error', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelError = jest.spyOn(utils, 'sendDirectOrFallbackToChannelError').mockImplementation((error, msg) => {
        console.debug(error, msg);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'value': 'x4d' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Expected "(", "-", "abs", "ceil", "cos", "d", "d%", "dF", "exp", "floor", "log", "max", "min", "pow", "round", "sign", "sin", "sqrt", "tan", "{", [0-9], or [1-9] but "x" found.' })
        , msg
    );
});

test('handleDiceRoll 1d20 default', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}1d20${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[\d*\]`$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll 2d100', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'value': '2d100' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[0].value}${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[\d*, \d*\]`$/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll soooo many dice', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'value': '999d9999999999' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[0].value}${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[(\d*(, )?)*(\])?`$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'value': expect.stringMatching(/^`... sooooo many dice! ...`$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)
                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll 1d20 with roll_type', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'value': '1d20' }, { 'value': 'Dex Check' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[1].value} - ${diceParam[0].value}${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[\d*\]`$/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)

                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll default(1d20) with roll_type', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'name': 'roll_type', 'value': 'Dex Check' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[0].value} - 1d20${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[\d*\]`$/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)

                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRoll 1d20 with roll_type using slash', async () => {
    let msg = {};
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ 'name': 'notation', 'value': '1d20' }, { 'name': 'roll_type', 'value': 'Dex Check' }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRoll(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `${utils.EMOJIS.DICE}${diceParam[1].value} - ${diceParam[0].value}${utils.EMOJIS.DICE}`,
                            'value': expect.stringMatching(/^`\[\d*\]`$/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)

                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRollStats', async () => {
    let msg = { guild: {} };
    msg.guild.iconURL = () => {
        return "https://www.example.com/example.png";
    }
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRollStats(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `Stats Roll`,
                            'value': expect.stringMatching(/^Stat 1: `\[\d*[d]*, \d*[d]*, \d*[d]*, \d*[d]*] = \d*`/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)

                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRollStats reroll ones', async () => {
    let msg = { guild: {} };
    msg.guild.iconURL = () => {
        return "https://www.example.com/example.png";
    }
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embedsArray, msg, user, skipDM) => {
        console.debug(embedsArray[0].fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [{ name: 'reroll_ones', value: true }];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRollStats(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `Stats Roll`,
                            'value': expect.stringMatching(/^Stat 1: `\[\d*[rd]*, \d*[rd]*, \d*[rd]*, \d*[rd]*] = \d*`/)
                        }),
                        expect.objectContaining({
                            'name': `Total`,
                            'value': expect.stringMatching(/^`\d*`$/)

                        })
                    ])
            })
        ]), msg, undefined, true
    );
});

test('handleDiceRollStats error', async () => {
    let msg = { guild: 'error' };
    let sendDirectOrFallbackToChannelError = jest.spyOn(utils, 'sendDirectOrFallbackToChannelError').mockImplementation((error, msg) => {
        console.debug(error, msg);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
        console.debug(msg);
    });
    let diceParam = [];
    let guildConfig = { rollsEnabled: true };
    await testables.handleDiceRollStats(msg, diceParam, guildConfig);
    expect(sendDirectOrFallbackToChannelError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'msg.guild?.iconURL is not a function' })
        , msg
    );
});