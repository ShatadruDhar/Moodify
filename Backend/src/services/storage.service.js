async function uploadFile({ buffer, filename, folder = "" }) {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey) {
        throw new Error("IMAGEKIT_PRIVATE_KEY is required for remote song uploads.")
    }
    const ImageKit = require("@imagekit/nodejs").default
    const client = new ImageKit({ privateKey })

    const file = await client.files.upload({
        file: await ImageKit.toFile(Buffer.from(buffer)),
        fileName: filename,
        folder
    })

    return file

}

module.exports = { uploadFile }