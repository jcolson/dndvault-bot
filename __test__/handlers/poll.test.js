const { TextChannel, Client, Guild } = require('discord.js');
const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const { testables } = require('../../handlers/poll.js');
const utils = require('../../utils/utils.js');

const TEST_USER_ID = '1234567890';

afterEach(() => {
    jest.clearAllMocks();
});

test('handlePoll default choices no guildconfig channel', async () => {
    const client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'] });
    let guild = new Guild(client, {});
    let msg = {};
    msg.guild = guild;
    msg.author = { id: TEST_USER_ID };
    msg.channel = new TextChannel(guild, {}, client);

    let channelSpy = jest.spyOn(msg.channel, 'send').mockImplementation((embedsObj) => {
        // console.debug(embedsObj);
        let aSentMessage = {};
        aSentMessage.react = ((emojies) => {
            // console.debug(emojies);
        });
        return aSentMessage;
    });
    let msgParms = [{ name: 'poll_question', value: 'The Question - we need to make this longer than 256 chars. - we need to make this longer than 256 chars. - we need to make this longer than 256 chars. - we need to make this longer than 256 chars. - we need to make this longer than 256 chars. - we need to make this longer than 256 chars.' }];
    let guildConfig = {};
    let sendDirectOrFallbackToChannel = jest.spyOn(utils, 'sendDirectOrFallbackToChannel').mockImplementation((fields, msg, user, skipDM) => {
        // console.debug(fields, msg, user, skipDM);
    });
    jest.spyOn(utils, 'deleteMessage').mockImplementation((msg) => {
    });

    await testables.handlePoll(msg, msgParms, guildConfig);
    expect(sendDirectOrFallbackToChannel).toHaveBeenCalledWith(
        expect.objectContaining({
            'name': `${utils.EMOJIS.DAGGER} Poll Create ${utils.EMOJIS.SHIELD}`,
            'value': `<@${TEST_USER_ID}> - created poll successfully.`
        }), msg, undefined, undefined, undefined
    );
});

test('handleReactionAdd', async () => {
    let reaction = {
        message: {
            embeds: [{ fields: [] }],
            guild: {
                members: {
                    resolve: ((userId) => { console.debug(userId) })
                }
            },
            reactions: {
                cache: {
                    values: (() => { return [] })
                }
            }
        },
        emoji: { name: 'test_emoji_name' }
    };
    let user = { id: TEST_USER_ID };
    let guildConfig = {};

    await testables.handleReactionAdd(reaction, user, guildConfig);
});

test('handleReactionAdd trash', async () => {
    let reaction = {
        message: {
            embeds: [
                {
                    fields: [{ name: testables.POLLSTER_AUTHOR_FIELD_NAME, value: '<@' + TEST_USER_ID + '>' }],
                    setTitle: ((titleString) => { return }),
                    addFields: ((fieldObject) => { return })
                }
            ],
            guild: {
                members: {
                    resolve: ((userId) => { console.debug(userId) })
                }
            },
            reactions: {
                cache: {
                    values: (() => { return [] })
                }
            },
            delete: (() => { return })
        },
        emoji: { name: utils.EMOJIS.TRASH },
        users: {
            remove: ((userId) => { return })
        }
    };
    let sendDirectOrFallbackToChannelEmbeds = jest.spyOn(utils, 'sendDirectOrFallbackToChannelEmbeds').mockImplementation((embeds, msg, user) => {
        // console.debug(fields, msg, user, skipDM);
    });
    let user = { id: TEST_USER_ID };
    let guildConfig = {};

    await testables.handleReactionAdd(reaction, user, guildConfig);

    expect(sendDirectOrFallbackToChannelEmbeds).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.objectContaining({
                'fields':
                    expect.arrayContaining([
                        expect.objectContaining({
                            'name': `Author`,
                            'value': expect.stringMatching(/^<@1234567890>/)
                        })
                    ])
            })
        ]), reaction.message, user
    );
});