const express = require("express")
const uploadSongFile = require("../middlewares/upload.middleware")
const songController = require("../controllers/song.controller")
const authMiddleware = require("../middlewares/auth.middleware")


const router = express.Router()

/**
 * POST /api/songs/
 */
router.post("/", authMiddleware.authUser, uploadSongFile, songController.uploadSong)

router.get("/local/:id/audio", songController.getLocalSongAudio)
router.get("/local/:id/artwork", songController.getLocalSongArtwork)

router.get('/', songController.getSong)

module.exports = router