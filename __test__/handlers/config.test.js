const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const { TextChannel, Client, Guild } = require('discord.js');
const NodeCache = require("node-cache");
const { testables } = require('../../handlers/config.js');
const commands = require('../../utils/commands.js');
const utils = require('../../utils/utils.js');


const TEST_USER_ID = '1234567890';
const TEST_GUILD_ID = '2345678901';
global.COMMANDS = commands.COMMANDS;
global.GuildCache = new NodeCache({ stdTTL: 86400, checkperiod: 14400 });

afterEach(() => {
    jest.clearAllMocks();
});

test('handleConfig', async () => {
    const client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'] });
    let guild = new Guild(client, { id: TEST_GUILD_ID });
    let msg = {};
    msg.guild = guild;
    msg.author = { id: TEST_USER_ID };
    msg.member = { id: TEST_USER_ID, permissions: { has: (() => { return true; }) } };
    msg.channel = new TextChannel(guild, {}, client);

    let channelSpy = jest.spyOn(msg.channel, 'send').mockImplementation((embedsObj) => {
        // console.debug(embedsObj);
        let aSentMessage = {};
        aSentMessage.react = ((emojies) => {
            // console.debug(emojies);
        });
        return aSentMessage;
    });
    let msgParms = [{}];
    let guildConfig = {
        requireCharacterApproval: false,
        requireCharacterForEvent: false,
        eventRequireApprover: false,
        enableStandbyQueuing: false,
        prefix: '!',
        save: (() => { })
    };
    let spyretrieveRoleForID = jest.spyOn(utils, 'retrieveRoleForID').mockImplementation((guild, guildConfigArole) => {
        return { name: '@everyone' };
    });
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((fields, msg, user, skipDM) => {
        // console.debug(fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
    });
    testables.handleConfig(msg, msgParms, guildConfig);
    expect(channelSpy).toHaveBeenCalled;
    expect(spyretrieveRoleForID).toHaveBeenCalled;
    //@todo toHaveBeenCalledWith
    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalled;
});
