const users = require('../../handlers/users.js');
const { testables } = users;

test('isValidTimezone valid', () => {
    expect(testables.isValidTimeZone(`America/New_York`)).toMatch(`America/New_York`);
});

test('isValidTimezone invalid', () => {
    try {
        testables.isValidTimeZone(`America/Yonkers`);
    } catch (error) {
        expect(error).toBeInstanceOf(RangeError);
    }
});
