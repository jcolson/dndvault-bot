const { Schema, model } = require('mongoose');

const Event = Schema({
    "eventID": {
        "type": "String",
        index: true
    },
    "guildID": {
        "type": "String",
        index: true
    },
    "title": {
        type: String
    },
    "dm": {
        type: String
    },
    "duration_hours": {
        type: Number
    },
    "date_time": {
        type: Date
    },
    "number_player_slots": {
        type: Number
    },
    "users_signed_up": {
        type: [{
            "userID": String,
            "date_time": Date
        }]
    },
    "campaign": {
        type: String
    },
    "description": {
        type: String
    }
})
module.exports = model('Event', Event);