const { Schema, model } = require('mongoose');

const Event = Schema({
    "guildID": {
        "type": "String",
        index: true
    },
    "title": {
        type: String
    },
    "dm": {
        type: String,
        index: true
    },
    "duration_hours": {
        type: Number
    },
    "date_time": {
        type: Date,
        index: true
    },
    "number_player_slots": {
        type: Number
    },
    "attendees": {
        type: [{
            "userID": {
                type: String,
                index: true
            },
            "characterID": {
                type: String
            },
            "date_time": {
                type: Date
            },
            "standby": {
                type: "Boolean",
                default: false
            }
        }]
    },
    "campaign": {
        type: String,
        index: true
    },
    "description": {
        type: String
    },
    "userID": {
        type: String
    },
    "deployedByID": {
        type: String
    },
    "channelID": {
        type: String,
        index: true
    },
    "messageID": {
        type: String,
        index: true
    },
    "reminderSent": {
        type: Date,
        index: true
    },
    "recurEvery": {
        type: Number,
        index: true
    },
    "recurComplete": {
        type: Date,
        index: true
    },
    "planningChannel": {
        type: String,
        index: true
    },
    "voiceChannel": {
        type: String,
        index: true
    }
}, { optimisticConcurrency: true });
Event.index({'attendees.userID': 1});
Event.index({campaign: 1});
Event.index({channelID: 1});
Event.index({date_time: 1});
Event.index({dm: 1});
Event.index({guildID: 1});
Event.index({messageID: 1});
Event.index({planningChannel: 1});
Event.index({recurComplete: 1});
Event.index({recurEvery: 1});
Event.index({reminderSent: 1});
Event.index({voiceChannel: 1});
module.exports = model('Event', Event);