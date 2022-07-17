const { Schema, model } = require('mongoose');

const User = Schema({
    "userID": {
        "type": "String",
        index: true
    },
    "guildID": {
        "type": "String",
        index: true
    },
    "name": {
        type: String
    },
    "timezone": {
        type: String
    },
    "defaultCharacter": {
        type: String
    }
});
User.index({guildID: 1});
User.index({userID: 1});
module.exports = model('User', User);