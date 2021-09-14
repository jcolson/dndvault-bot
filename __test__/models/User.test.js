const User = require('../../models/User.js');

test('Verify default User constructor', () => {
    const user = new User();

    //console.log('user-->' + user);

    expect(user.userID).toBe(undefined);
    expect(user.guildID).toBe(undefined);
    expect(user.name).toBe(undefined);
    expect(user.timezone).toBe(undefined);
    expect(user.defaultCharacter).toBe(undefined);
});
