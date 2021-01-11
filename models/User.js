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
})
module.exports = model('User', User);