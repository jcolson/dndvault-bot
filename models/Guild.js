const { Schema, model } = require('mongoose');

const Guild = Schema({
    id: String,
    prefix: {
        default: '?',
        type: String
    }
})
module.exports = model('Guild', Guild);