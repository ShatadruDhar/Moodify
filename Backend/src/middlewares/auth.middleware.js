const redis = require("../config/cache")
const jwt = require("jsonwebtoken");
const { getRevocationKey } = require("../utils/token-revocation")


async function authUser(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Token not provided"
        })
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
        return res.status(401).json({
            message: "Invalid token"
        })
    }

    const isTokenRevoked = await redis.get(getRevocationKey(token, decoded))
    if (isTokenRevoked) {
        return res.status(401).json({ message: "Invalid token" })
    }

    req.user = decoded
    return next()
}

module.exports = { authUser }