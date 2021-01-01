const fetch = require('node-fetch');
const { Client, DiscordAPIError, MessageEmbed } = require('discord.js');
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
    } else if (msg.content.startsWith(Config.prefix + 'list')) {
        handleList(msg);
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
                const req = await CharModel.findOne({ id: charData.id });
                if (req) {
                    // console.log(req);
                    throw new Error('Sorry, this character has already been registered, use `update` command instead.');
                }
                let char = new CharModel(charData);
                char.guildUser = msg.member.id;
                char.guildID = msg.guild.id;
                await char.save();
                await msg.channel.send(msg.member.nickname + ', ' + char.name + '/' + char.race.fullName + '/' + char.classes[0].definition.name + ' is now registered');
                await msg.delete();
            })
            .catch(error => {
                msg.reply('Problem registering your character: ' + error.message);
            });
    }
}

/**
 * 
 * @param {Message} msg 
 */
async function handleList(msg) {
    try {
        const req = await CharModel.find({ guildUser: msg.member.id });
        if (req.length > 0) {
            const charEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Character List from the Vault')
                // .setURL('https://discord.js.org/')
                .setAuthor('DND Vault', 'https://lh3.googleusercontent.com/pw/ACtC-3f7drdu5bCoMLFPEL6nvUBZBVMGPLhY8DVHemDd2_UEkom99ybobk--1nm6cHZa6NyOlGP7MIso2flJ_yUUCRTBnm8cGZemblRCaq_8c5ndYZGWhXq9zbzEYtfIUzScQKQ3SICD-mlDN_wZZfd4dE6PJA=w981-h1079-no', 'https://github.com/jcolson/dndvault-bot')
                .setDescription('Character List for ' + msg.member.nickname)
                .setThumbnail(msg.guild.iconURL())
            req.forEach((char) => {
                console.log('char' + char.id);
                charEmbed.addFields(
                    { name: 'Name', value: char.name },
                    { name: 'ID', value: char.id, inline: true },
                    { name: 'Race', value: char.race.fullName, inline: true },
                    { name: 'Class', value: char.classes[0].definition.name, inline: true },
                );
            })
            charEmbed.addFields(
                { name: '\u200B', value: 'Add this BOT to your server. [Click here](https://discord.com/api/oauth2/authorize?client_id=792843392664993833&permissions=92224&scope=bot)' },
            );
            await msg.channel.send(charEmbed);
            await msg.delete();
        } else {
            msg.reply(msg.member.nickname + `, I don't see any registered characters for you`);
        }
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * 
 * @param {Message} msg 
 */
function handleRemove(msg) {

}