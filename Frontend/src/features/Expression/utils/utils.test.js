import test from "node:test"
import assert from "node:assert/strict"
import { averageBlendshapes, classifyBlendshapes } from "./utils.js"

test("averages blendshape scores across frames", () => {
    const average = averageBlendshapes([
        { mouthSmileLeft: 0.2, mouthSmileRight: 0.4 },
        { mouthSmileLeft: 0.6, mouthSmileRight: 0.8 },
    ])
    assert.ok(Math.abs(average.mouthSmileLeft - 0.4) < 1e-10)
    assert.ok(Math.abs(average.mouthSmileRight - 0.6) < 1e-10)
})

test("classifies strong happy, surprised, and sad scores", () => {
    assert.equal(classifyBlendshapes({
        mouthSmileLeft: 0.8,
        mouthSmileRight: 0.75,
    }), "happy")

    assert.equal(classifyBlendshapes({
        jawOpen: 0.8,
        browInnerUp: 0.7,
    }), "surprised")

    assert.equal(classifyBlendshapes({
        mouthFrownLeft: 0.6,
        mouthFrownRight: 0.55,
    }), "sad")
})

test("uses a neutral baseline and ignores scores below thresholds", () => {
    assert.equal(classifyBlendshapes({
        mouthSmileLeft: 0.51,
        mouthSmileRight: 0.48,
    }, {
        mouthSmileLeft: 0.35,
        mouthSmileRight: 0.35,
    }), "neutral")

    assert.equal(classifyBlendshapes(null), null)
})
