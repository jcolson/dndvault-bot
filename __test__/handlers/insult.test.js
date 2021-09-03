const insult = require('../../handlers/insult.js');
const { testables } = insult;

test('generateRandomInsult', () => {
    expect(testables.generateRandomInsult()).toMatch(/^Thou [\w-]+ [\w-]+ [\w-]+\!$/);
});
