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
    }
})
module.exports = model('Event', Event);