const fetch = require('node-fetch');
const { Client } = require('discord.js');
const Config = require('./config.json');
const CharModel = require('./models/Guild');
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
        useUnifiedTopology: true
    });
    console.log('user: ' + Config.mongoUser);
    return client.login(Config.token);
})();

client.on('ready', () => console.info(`logged in as ${client.user.tag}`));

client.on('message', async (msg) => {
    if (!msg.guild || !msg.content.startsWith(Config.prefix)) return;
    var messageText = msg.content.substr(1);
    if (messageText === 'hello') {
        msg.reply('hello!');
    } else if (messageText === 'create') {
        const doc = CharModel({ id: msg.guild.id });
        await doc.save();
        msg.reply(`made new document!`);
    } else if (messageText === 'prefix') {
        const req = await CharModel.find({ id: msg.guild.id });
        if (!req) return msg.reply(`Sorry, doc doesn't exist!`);
        msg.reply(`found a doc! prefix: ${req.prefix}`);
    } else if (messageText.startsWith('register')) {
        let registerResponse, msgResponse;
        try {
            registerResponse = handleRegister(messageText.substr('register'.length + 1));
            if (!registerResponse) msgResponse = 'Sorry, somthing went wrong registering your character'
            else msgResponse = 'Your character has been registered: ' + registerResponse;
        } catch (error) {
            msgResponse = error.message;
        }
        msg.delete().catch(error => {
            console.error('On message delete, ' + error.message);
        });
        msg.channel.send(msg.member.nickname + ', ' + msgResponse);
    }
});

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {*} charURL 
 */
function handleRegister(charURL) {
    console.log('char url: ' + charURL);
    var charID = charURL.split('/').pop();
    console.log('char id: "' + charID + '"');
    if (isNaN(charID) || isNaN(parseInt(charID))) {
        throw new Error("Invalid URL passed for your registration, needs to be a dndbeyond character URL");
    }
    let settings = { method: "Get" };
    fetch('https://character-service.dndbeyond.com/character/v3/character/' + charID, settings)
        .then(res => res.json())
        .then((charJSON) => {
            // do something with JSON
            //console.log(charJSON);
        })
        .catch(error => {
            console.log(error.message)
            throw new Error('Problem retrieving character from that URL for your registration');
        });
    return charID;
}