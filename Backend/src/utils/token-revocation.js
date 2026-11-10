const { createHash } = require("node:crypto")

function getRevocationKey(token, decoded) {
    const tokenId = decoded.jti || createHash("sha256").update(token).digest("hex")
    return `auth:revoked:${tokenId}`
}

module.exports = { getRevocationKey }
