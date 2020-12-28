const { Client } = require('discord.js');
const Config = require('./config.json');
const CharModel = require('./models/Guild');
const { connect } = require('mongoose');
const client = new Client();

client.on('ready', () => console.info(`logged in as ${client.user.tag}`));

client.on('message', async (msg) => {
    if (!msg.guild || !msg.content.startsWith(Config.prefix)) return;
    var messageText = msg.content.substr(1);
    if (messageText === 'hello') {
        return msg.reply('hello!');
    } else if (messageText === 'create') {
        const doc = CharModel({ id: msg.guild.id });
        await doc.save();
        return msg.reply(`made new document!`);
    } else if (messageText === 'prefix') {
        const req = await CharModel.find({ id: msg.guild.id });
        if (!req) return msg.reply(`Sorry, doc doesn't exist!`);
        return msg.reply (`found a doc! prefix: ${req.prefix}`);
    }
});

(async () => {
    await connect('mongodb://'+Config.mongoUser+':'+Config.mongoPass+'@'+Config.mongoServer+':'+Config.mongoPort+'/dnd', {
    // await connect('mongodb://docker.karma.net/dnd', {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    });
    console.log('user: '+Config.mongoUser);
    return client.login(Config.token);
})();
