const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { createLocalSongLibrary } = require("../src/services/local-song-library")

function createFixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "moodify-local-songs-"))
    const musicDirectory = path.join(root, "music")
    fs.mkdirSync(musicDirectory)
    fs.writeFileSync(path.join(musicDirectory, "upbeat.mp3"), "fake mp3")
    fs.writeFileSync(path.join(musicDirectory, "calm.mp3"), "fake mp3")

    const manifestFile = path.join(root, "songs.json")
    fs.writeFileSync(manifestFile, JSON.stringify([
        { filename: "upbeat.mp3", title: "Upbeat", mood: "happy" },
        { filename: "calm.mp3", title: "Calm", mood: "sad" },
    ]))

    return { root, musicDirectory, manifestFile }
}

test("local library returns a random song only from the requested mood", (t) => {
    const fixture = createFixture()
    t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))
    const library = createLocalSongLibrary({
        directory: fixture.musicDirectory,
        manifestFile: fixture.manifestFile,
    })

    const song = library.getRandomSong("happy")
    assert.equal(song.title, "Upbeat")
    assert.equal(song.mood, "happy")
    assert.match(song.url, /^\/api\/songs\/local\/[a-f0-9]{24}\/audio$/)
    assert.equal(library.getRandomSong("surprised"), null)
    assert.equal(library.getSong("../upbeat.mp3"), null)
})

test("local library rejects paths that escape the songs folder", (t) => {
    const fixture = createFixture()
    t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))
    fs.writeFileSync(fixture.manifestFile, JSON.stringify([
        { filename: "..\\outside.mp3", title: "Outside", mood: "happy" },
    ]))

    const library = createLocalSongLibrary({
        directory: fixture.musicDirectory,
        manifestFile: fixture.manifestFile,
    })
    assert.throws(() => library.getRandomSong("happy"), /Invalid local MP3 filename/)
})
