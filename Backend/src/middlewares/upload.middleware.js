const multer = require("multer")

const storage = multer.memoryStorage()


const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MiB
    },
    fileFilter: (req, file, callback) => {
        callback(null, [ "audio/mpeg", "audio/mp3" ].includes(file.mimetype))
    }
})

function uploadSongFile(req, res, next) {
    upload.single("song")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400
            return res.status(status).json({ message: "The MP3 upload is invalid or too large." })
        }
        if (error) return next(error)
        return next()
    })
}

module.exports = uploadSongFile