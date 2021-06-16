const { Schema, model } = require('mongoose');

const Guild = Schema({
    "guildID": {
        "type": "String",
        index: true
    },
    "name": {
        type: "String"
    },
    "iconURL": {
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
    },
    "channelForPolls": {
        type: "String"
    },
    "channelForEvents": {
        type: "String"
    },
    "lastUsed": {
        type: "Date"
    },
    "botID": {
        type: "String"
    },
    "eventPlanCat": {
        type: "String"
    }
})
module.exports = model('Guild', Guild);