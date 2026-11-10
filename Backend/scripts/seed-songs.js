require("dotenv").config()

const fs = require("node:fs")
const path = require("node:path")
const mongoose = require("mongoose")
const songModel = require("../src/models/song.model")
const { SONG_MOODS } = require("../src/constants/moods")

async function main() {
    const seedFile = process.argv[2]
    if (!seedFile) {
        throw new Error("Usage: npm run seed:songs -- <path-to-song-data.json>")
    }

    const songs = JSON.parse(fs.readFileSync(path.resolve(seedFile), "utf8"))
    if (!Array.isArray(songs)) {
        throw new Error("The seed file must contain a JSON array of songs.")
    }

    const counts = Object.fromEntries(SONG_MOODS.map((mood) => [ mood, 0 ]))
    const urls = new Set()
    for (const [ index, song ] of songs.entries()) {
        if (!SONG_MOODS.includes(song.mood)) {
            throw new Error(`Song ${index + 1} has an unsupported mood.`)
        }
        if (![ song.url, song.posterUrl ].every((value) => {
            if (typeof value !== "string") return false
            try {
                return new URL(value).protocol === "https:"
            } catch {
                return false
            }
        })) {
            throw new Error(`Song ${index + 1} must have HTTPS audio and poster URLs.`)
        }
        if (typeof song.title !== "string" || !song.title.trim() || song.title.length > 200) {
            throw new Error(`Song ${index + 1} must have a title up to 200 characters.`)
        }
        if (urls.has(song.url)) {
            throw new Error(`Duplicate audio URL in seed file: ${song.url}`)
        }
        urls.add(song.url)
        counts[song.mood] += 1
    }

    for (const mood of SONG_MOODS) {
        if (counts[mood] < 5 || counts[mood] > 10) {
            throw new Error(`Expected 5 to 10 songs for '${mood}', found ${counts[mood]}.`)
        }
    }

    await mongoose.connect(process.env.MONGO_URI)
    await songModel.bulkWrite(songs.map((song) => ({
        updateOne: {
            filter: { url: song.url },
            update: {
                $set: {
                    title: song.title.trim(),
                    posterUrl: song.posterUrl,
                    mood: song.mood
                },
                $setOnInsert: { url: song.url }
            },
            upsert: true
        }
    })))
    console.info(`Seeded ${songs.length} songs.`)
}

main()
    .catch((error) => {
        console.error("Song seeding failed:", error.message)
        process.exitCode = 1
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect()
        }
    })
