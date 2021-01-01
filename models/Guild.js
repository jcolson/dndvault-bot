const { Schema, model } = require('mongoose');

const Guild = Schema({
    "guildID": {
        "type": "String",
        index: true
    },
    "prefix": {
        type: String
    },
    "arole": {
        type: String
    },
    "prole": {
        type: String
    }
})
module.exports = model('Guild', Guild);