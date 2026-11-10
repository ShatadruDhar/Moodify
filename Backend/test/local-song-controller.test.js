const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { getSong } = require("../src/controllers/song.controller")

test("local song API response selects the requested mood without exposing disk paths", async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "moodify-local-api-"))
    const previousDirectory = process.env.LOCAL_SONGS_DIR
    const previousManifest = process.env.LOCAL_SONGS_MANIFEST
    t.after(() => {
        if (previousDirectory === undefined) delete process.env.LOCAL_SONGS_DIR
        else process.env.LOCAL_SONGS_DIR = previousDirectory
        if (previousManifest === undefined) delete process.env.LOCAL_SONGS_MANIFEST
        else process.env.LOCAL_SONGS_MANIFEST = previousManifest
        fs.rmSync(root, { recursive: true, force: true })
    })

    fs.writeFileSync(path.join(root, "track.mp3"), "local-only")
    const manifestFile = path.join(root, "songs.json")
    fs.writeFileSync(manifestFile, JSON.stringify([
        { filename: "track.mp3", title: "Test track", artist: "Test artist", mood: "happy" },
    ]))
    process.env.LOCAL_SONGS_DIR = root
    process.env.LOCAL_SONGS_MANIFEST = manifestFile

    let response
    const result = await getSong(
        { query: { mood: "happy" } },
        {
            status(code) {
                this.statusCode = code
                return this
            },
            json(body) {
                response = body
            },
        }
    )

    assert.equal(result, undefined)
    assert.equal(response.song.title, "Test track")
    assert.equal(response.song.mood, "happy")
    assert.equal(response.song.artist, "Test artist")
    assert.match(response.song.url, /^\/api\/songs\/local\/[a-f0-9]{24}\/audio$/)
    assert.equal(JSON.stringify(response).includes(root), false)
    assert.equal("filePath" in response.song, false)
})
