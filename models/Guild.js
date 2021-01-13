const { Schema, model } = require('mongoose');

const Guild = Schema({
    "guildID": {
        "type": "String",
        index: true
    },
    "name": {
        type: "String"
    },
    "prefix": {
        type: "String"
    },
    "arole": {
        type: "String"
    },
    "prole": {
        type: "String"
    },
    "requireCharacterApproval": {
        type: "Boolean",
        default: false
    },
    "requireCharacterForEvent": {
        type: "Boolean",
        default: false
    }
})
module.exports = model('Guild', Guild);