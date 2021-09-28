const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const UserModel = require('../../models/User.js');
const users = require('../../handlers/users.js');
const { testables } = users;

const DEFAULT_ROLE = 'roleId123';
const DEFAULT_MEMBER_ID = '123456789';
const CONFIG_DEFAULT_MEMBER_ID = '227562842591723521';
const AMERICA_NY_TIMEZONE = 'America/New_York';

test('isValidTimezone valid', () => {
    expect(testables.isValidTimeZone(AMERICA_NY_TIMEZONE)).toMatch(AMERICA_NY_TIMEZONE);
});

test('isValidTimezone invalid', () => {
    expect(async () => { testables.isValidTimeZone('America/Yonkers') }).rejects.toThrow(RangeError);
});

test('isValidTimezone invalid', () => {
    Intl = undefined;
    expect(async () => { testables.isValidTimeZone(AMERICA_NY_TIMEZONE) }).rejects.toThrow('Time zones are not available in this environment');
});

test('hasRoleOrIsAdmin when we provide an incorrect Objects throws an error exception', async () => {
    //We should be using the class GuildMember but seems to be incorrect
    //const member = new GuildMember();
    const member = {
        id: DEFAULT_MEMBER_ID,
    }

    await expect(async () => {
        await users.hasRoleOrIsAdmin(member, DEFAULT_ROLE)
    }).rejects.toThrow(`Could not determine user (${DEFAULT_MEMBER_ID}) role`);
});

test('hasRoleOrIsAdmin has administrator permission ADMINISTRATOR', async () => {
    const member = {
        id: DEFAULT_MEMBER_ID,
        permissions: {
            has(param) {
                return true;
            }
        },
    }
    const result = await users.hasRoleOrIsAdmin(member, DEFAULT_ROLE);

    expect(result).toBe(true);
});

test('hasRoleOrIsAdmin when roleId is Config.adminUser', async () => {
    const member = {
        id: CONFIG_DEFAULT_MEMBER_ID,
        permissions: {
            has(param) {
                return false;
            }
        },
    }
    const result = await users.hasRoleOrIsAdmin(member, DEFAULT_ROLE);

    expect(result).toBe(true);
});

test('hasRoleOrIsAdmin when roleId does not match with role cache', async () => {
    const member = {
        id: DEFAULT_MEMBER_ID,
        roles: {
            cache: new Map([['keya', { id: 'role1' }], ['keyb', { id: 'role2' }], ['keyc', { id: 'role' }]]),
        },
        permissions: {
            has(param) {
                return false;
            }
        },
    }
    const result = await users.hasRoleOrIsAdmin(member, DEFAULT_ROLE);

    expect(result).toBe(false);
});

test('hasRoleOrIsAdmin when roleId matches with role cache', async () => {
    const member = {
        id: DEFAULT_MEMBER_ID,
        roles: {
            cache: new Map([['keya', { id: 'role1' }], ['keyb', { id: 'role2' }], ['keyc', { id: DEFAULT_ROLE }]]),
        },
        permissions: {
            has(param) {
                return false;
            }
        },
    }
    const result = await users.hasRoleOrIsAdmin(member, DEFAULT_ROLE);

    expect(result).toBe(true);
});

test('bc_setUsersTimezone when guildID is not found in cache returns false', async () => {
    const userID = 'userID';
    const channelID = 'channelID';
    const guildID = 'guildID';

    global.client = {
        guilds: {
            cache: {
                get(guildID) {
                    return undefined;
                },
            },
        },
    };
    const result = await users.bc_setUsersTimezone(userID, channelID, AMERICA_NY_TIMEZONE, guildID);

    expect(result).toBe(false);
});

test('bc_setUsersTimezone when an unexpected exception occur Then returns false', async () => {
    const userID = 'userID';
    const channelID = 'channelID';
    const guildID = 'guildID';
    let findOneUserModel = jest.spyOn(UserModel, 'findOne').mockImplementation((config) => {
        throw new Error("bc_setUsersTimezone: findOneUserModel: this error is to be expected - for testing purposes");
    });

    global.client = {
        guilds: {
            cache: {
                get(guildID) {
                    return guildID;
                },
            },
        },
    };
    const result = await users.bc_setUsersTimezone(userID, channelID, AMERICA_NY_TIMEZONE, guildID);
    expect(findOneUserModel).toHaveBeenCalled();
    expect(result).toBe(false);
});

test('bc_setUsersTimezone when User is not in UserModel Then save user and returns true', async () => {
    const userID = 'userID';
    const channelID = 'channelID';
    const guildID = 'guildID';

    //We provide an incorrect object configuration
    global.client = {
    };

    //TODO : Capture that the exception has been thrown inside the method
    const result = await users.bc_setUsersTimezone(userID, channelID, AMERICA_NY_TIMEZONE, guildID);

    expect(result).toBe(false);
});

