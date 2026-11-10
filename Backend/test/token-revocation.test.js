const test = require("node:test")
const assert = require("node:assert/strict")
const { getRevocationKey } = require("../src/utils/token-revocation")

test("revocation key uses the verified JWT ID", () => {
    assert.equal(
        getRevocationKey("token", { jti: "session-id" }),
        "auth:revoked:session-id"
    )
})

test("revocation key hashes tokens without a JWT ID", () => {
    const key = getRevocationKey("legacy-token", {})
    assert.match(key, /^auth:revoked:[a-f0-9]{64}$/)
    assert.equal(key.includes("legacy-token"), false)
})
