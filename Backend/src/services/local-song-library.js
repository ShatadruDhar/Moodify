const crypto = require("node:crypto")
const fs = require("node:fs")
const path = require("node:path")

function createLocalSongLibrary({ directory, manifestFile }) {
    const root = path.resolve(directory)
    const manifestPath = path.resolve(manifestFile)
    let songsById

    function loadSongs() {
        if (songsById) return songsById

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
        if (!Array.isArray(manifest)) {
            throw new Error(`Local song manifest must be a JSON array: ${manifestPath}`)
        }

        songsById = new Map()
        for (const [ index, item ] of manifest.entries()) {
            if (
                typeof item.filename !== "string" ||
                path.basename(item.filename) !== item.filename ||
                path.extname(item.filename).toLowerCase() !== ".mp3"
            ) {
                throw new Error(`Invalid local MP3 filename at manifest entry ${index + 1}.`)
            }
            if (typeof item.title !== "string" || !item.title.trim()) {
                throw new Error(`Missing title at manifest entry ${index + 1}.`)
            }
            if (typeof item.mood !== "string" || ![ "happy", "sad", "surprised" ].includes(item.mood)) {
                throw new Error(`Invalid mood at manifest entry ${index + 1}.`)
            }

            const filePath = path.resolve(root, item.filename)
            if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath)) {
                throw new Error(`Local MP3 is missing or outside the library: ${item.filename}`)
            }
            const realFilePath = fs.realpathSync(filePath)
            if (!realFilePath.startsWith(`${fs.realpathSync(root)}${path.sep}`)) {
                throw new Error(`Local MP3 resolves outside the library: ${item.filename}`)
            }

            const id = crypto.createHash("sha256").update(item.filename).digest("hex").slice(0, 24)
            if (songsById.has(id)) {
                throw new Error(`Duplicate local MP3 in manifest: ${item.filename}`)
            }

            songsById.set(id, {
                id,
                title: item.title.trim(),
                artist: typeof item.artist === "string" ? item.artist.trim() : "",
                mood: item.mood,
                filename: item.filename,
                filePath: realFilePath,
                url: `/api/songs/local/${id}/audio`,
                posterUrl: `/api/songs/local/${id}/artwork`,
            })
        }

        return songsById
    }

    function getRandomSong(mood) {
        const matches = [ ...loadSongs().values() ].filter((song) => song.mood === mood)
        if (matches.length === 0) return null
        return matches[crypto.randomInt(matches.length)]
    }

    function getSong(id) {
        return loadSongs().get(id) || null
    }

    return { getRandomSong, getSong }
}

let configuredLibrary
let configuredDirectory
let configuredManifest

function getConfiguredLocalSongLibrary() {
    const directory = process.env.LOCAL_SONGS_DIR
    if (!directory) return null

    const manifestFile = process.env.LOCAL_SONGS_MANIFEST ||
        path.resolve(__dirname, "../../local-songs.json")

    if (directory !== configuredDirectory || manifestFile !== configuredManifest) {
        configuredLibrary = createLocalSongLibrary({ directory, manifestFile })
        configuredDirectory = directory
        configuredManifest = manifestFile
    }

    return configuredLibrary
}

module.exports = { createLocalSongLibrary, getConfiguredLocalSongLibrary }
