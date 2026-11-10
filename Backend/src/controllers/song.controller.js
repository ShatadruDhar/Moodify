const songModel = require("../models/song.model")
const storageService = require("../services/storage.service")
const id3 = require("node-id3")
const { SONG_MOODS } = require("../constants/moods")
const { getConfiguredLocalSongLibrary } = require("../services/local-song-library")

function isValidArtwork(image) {
    if (!image?.imageBuffer || !Buffer.isBuffer(image.imageBuffer)) return false

    if (image.mime === "image/jpeg") {
        return image.imageBuffer.subarray(0, 3).equals(Buffer.from([ 0xff, 0xd8, 0xff ]))
    }

    if (image.mime === "image/png") {
        return image.imageBuffer.subarray(0, 8).equals(
            Buffer.from([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ])
        )
    }

    return false
}


async function uploadSong(req, res) {

    if (!req.file) {
        return res.status(400).json({ message: "Upload an MP3 file." })
    }

    if (req.file.buffer.subarray(0, 3).toString("ascii") !== "ID3") {
        return res.status(400).json({ message: "The MP3 file must contain valid ID3 tags." })
    }

    const songBuffer = req.file.buffer
    const { mood } = req.body

    if (!SONG_MOODS.includes(mood)) {
        return res.status(400).json({ message: "Mood must be happy, sad, or surprised." })
    }

    let tags
    try {
        tags = id3.read(songBuffer)
    } catch {
        return res.status(400).json({ message: "The MP3 ID3 tags could not be read." })
    }

    const title = typeof tags?.title === "string" ? tags.title.trim() : ""
    const artwork = tags?.image
    if (!title || title.length > 200 || !isValidArtwork(artwork)) {
        return res.status(400).json({
            message: "ID3 tags must include a title (up to 200 characters) and JPEG or PNG cover art."
        })
    }

    const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")

    const [ songFile, posterFile ] = await Promise.all([
        storageService.uploadFile({
            buffer: songBuffer,
            filename: safeTitle + ".mp3",
            folder: "/cohort-2/moodify/songs"
        }),
        storageService.uploadFile({
            buffer: artwork.imageBuffer,
            filename: safeTitle + (artwork.mime === "image/png" ? ".png" : ".jpg"),
            folder: "/cohort-2/moodify/posters"
        })
    ])

    const song = await songModel.create({
        title,
        url: songFile.url,
        posterUrl: posterFile.url,
        mood
    })

    res.status(201).json({
        message: "song created successfully",
        song
    })

}

async function getSong(req, res) {

    const { mood } = req.query

    if (!SONG_MOODS.includes(mood)) {
        return res.status(400).json({ message: "Mood must be happy, sad, or surprised." })
    }

    const localLibrary = getConfiguredLocalSongLibrary()
    const localSong = localLibrary?.getRandomSong(mood)
    const song = localLibrary
        ? localSong && {
            title: localSong.title,
            artist: localSong.artist,
            mood: localSong.mood,
            url: localSong.url,
            posterUrl: localSong.posterUrl,
        }
        : (await songModel.aggregate([
            { $match: { mood } },
            { $sample: { size: 1 } }
        ]))[0]

    if (!song) {
        return res.status(404).json({ message: `No songs are available for mood '${mood}'.` })
    }

    res.status(200).json({
        message: "song fetched successfully.",
        song,
    })

}

const localArtworkById = new Map()

function getLocalSongAsset(asset) {
    return function serveLocalSongAsset(req, res, next) {
        const localLibrary = getConfiguredLocalSongLibrary()
        if (!localLibrary) {
            return res.status(404).json({ message: "Local song playback is not configured." })
        }

        const song = localLibrary.getSong(req.params.id)
        if (!song) {
            return res.status(404).json({ message: "Local song not found." })
        }

        if (asset === "audio") {
            return res.sendFile(song.filePath, { acceptRanges: true }, (error) => {
                if (error) next(error)
            })
        }

        try {
            let image = localArtworkById.get(song.id)
            if (!image) {
                image = id3.read(song.filePath)?.image
                if (image?.imageBuffer && Buffer.isBuffer(image.imageBuffer)) {
                    localArtworkById.set(song.id, image)
                }
            }
            if (!image?.imageBuffer || !Buffer.isBuffer(image.imageBuffer)) {
                return res.status(404).json({ message: "This MP3 has no embedded cover art." })
            }

            const mimeType = image.mime === "image/png" ? "image/png" : "image/jpeg"
            res.set("Cache-Control", "private, max-age=3600")
            return res.type(mimeType).send(image.imageBuffer)
        } catch (error) {
            return next(error)
        }
    }
}

module.exports = {
    uploadSong,
    getSong,
    getLocalSongAudio: getLocalSongAsset("audio"),
    getLocalSongArtwork: getLocalSongAsset("artwork"),
}