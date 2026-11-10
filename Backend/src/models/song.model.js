const mongoose = require('mongoose');
const { SONG_MOODS } = require("../constants/moods")

const songSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    posterUrl: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    mood: {
        type: String,
        enum: SONG_MOODS,
        required: true
    }
})

const songModel = mongoose.model("songs", songSchema)

module.exports = songModel