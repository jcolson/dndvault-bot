const insult = require('../../handlers/insult');
const { testables } = insult;

test('generateRandomInsult', () => {
    expect(testables.generateRandomInsult()).toMatch(/^Thou [\w-]+ [\w-]+ [\w-]+\!$/);
});
