const fetch = require('node-fetch');
const { Client } = require('discord.js');
const Config = require('./config.json');
const GuildModel = require('./models/Guild');
const CharModel = require('./models/Character');
const { connect } = require('mongoose');
const client = new Client();

/**
 * connect to the mongodb
 */
(async () => {
    await connect('mongodb://' + Config.mongoUser + ':' + Config.mongoPass + '@' + Config.mongoServer + ':' + Config.mongoPort + '/dnd', {
        // await connect('mongodb://docker.karma.net/dnd', {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
    console.log('user: ' + Config.mongoUser);
    return client.login(Config.token);
})();

client.on('ready', () => console.info(`logged in as ${client.user.tag}`));

client.on('message', async (msg) => {
    if (!msg.guild || !msg.content.startsWith(Config.prefix)) return;
    if (msg.content === Config.prefix + 'hello') {
        msg.reply('hello!');
    } else if (msg.content === Config.prefix + 'create') {
        const doc = GuildModel({ id: msg.guild.id });
        await doc.save();
        msg.reply(`made new document!`);
    } else if (msg.content === Config.prefix + 'prefix') {
        const req = await GuildModel.find({ id: msg.guild.id });
        if (!req) return msg.reply(`Sorry, doc doesn't exist!`);
        msg.reply(`found a doc! prefix: ${req.prefix}`);
    } else if (msg.content.startsWith(Config.prefix + 'register')) {
        handleRegister(msg);
    }
});

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg
 */
function handleRegister(msg) {
    const charURL = msg.content.substr((Config.prefix + 'register').length + 1);
    console.log('char url: ' + charURL);
    const charID = charURL.split('/').pop();
    console.log('char id: "' + charID + '"');
    if (isNaN(charID) || isNaN(parseInt(charID))) {
        msg.reply("Invalid URL passed for your registration, it needs to be a dndbeyond character URL.");
    } else {
        const settings = { method: "Get" };
        fetch('https://character-service.dndbeyond.com/character/v3/character/' + charID, settings)
            .then(res => res.json())
            .then(async (charJSON) => {
                if (charJSON.success == false) {
                    throw new Error('Sorry, that URL contains no character data');
                };
                let charData = Object.assign({}, charJSON.data);
                charData.id = msg.guild.id + '_' + charData.id;
                console.log('charData id: ' + charData.id);
                const req = await CharModel.findOne({ id: charData.id });
                if (req) {
                    // console.log(req);
                    throw new Error('Sorry, this character has already been registered, use `update` command instead.');
                }
                let char = new CharModel(charData);
                await char.save();
                await msg.delete();
                await msg.channel.send(msg.member.nickname + ', Character Registered');
            })
            .catch(error => {
                msg.reply('Problem registering your character: ' + error.message);
            });

    }
}