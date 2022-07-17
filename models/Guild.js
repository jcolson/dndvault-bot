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
    "enableStandbyQueuing": {
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
    },
    "eventVoiceCat": {
        type: "String"
    },
    "eventVoicePerms": {
        type: "String",
        default: "attendees"
    },
    "eventPlanDays": {
        type: Number,
        default: 7
    },
    "eventPostAuto": {
        type: "Boolean",
        default: false
    },
    "eventRequireApprover": {
        type: "Boolean",
        default: false
    }
});
Guild.index({guildID: 1});
Guild.index({eventPostAuto: 1});
Guild.index({eventPlanDays: 1});
module.exports = model('Guild', Guild);
