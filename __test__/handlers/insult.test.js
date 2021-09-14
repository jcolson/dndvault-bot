const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const insult = require('../../handlers/insult.js');
jest.mock('../../utils/utils.js');
const utils = require('../../utils/utils.js');
const { testables } = insult;

test('handleInsult', () => {
    let msg = {};
    let sendDirectOrFallbackToChannel = jest.spyOn(utils, 'sendDirectOrFallbackToChannel').mockImplementation((embed, msg) => {
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
    });
    testables.handleInsult(msg);
    expect(sendDirectOrFallbackToChannel).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
        "name": "Vicious Mockery Suggestion",
        "value": expect.stringMatching(/^Thou [\w-]+ [\w-]+ [\w-]+!$/)
    })]), expect.anything());
    // console.debug(`sendDirectOrFallbackToChannel`, sendDirectOrFallbackToChannel);
});

test('handleInsultWithError', () => {
    let msg = {};
    let msgParms = {};
    let guildConfig = {};
    let sendDirectOrFallbackToChannel = jest.spyOn(utils, 'sendDirectOrFallbackToChannel').mockImplementation((embed, msg) => {
        throw new Error("test error");
    });
    let sendDirectOrFallbackToChannelError = jest.spyOn(utils, 'sendDirectOrFallbackToChannelError').mockImplementation((embed, msg) => {
    });
    testables.handleInsult(msg, msgParms, guildConfig);
    expect(sendDirectOrFallbackToChannel).toHaveBeenCalled();
    expect(sendDirectOrFallbackToChannelError).toHaveBeenCalled();
});