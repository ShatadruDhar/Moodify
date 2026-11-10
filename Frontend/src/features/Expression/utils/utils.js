import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export const MEDIAPIPE_VERSION = "0.10.32"
export const DETECTION_WINDOW_MS = 1500

export const init = async (video) => {
    let landmarker
    let stream

    try {
        const assetsPath = `/mediapipe/${MEDIAPIPE_VERSION}`
        const vision = await FilesetResolver.forVisionTasks(`${assetsPath}/wasm`)
        landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `${assetsPath}/face_landmarker.task`,
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
        })

        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        video.srcObject = stream
        await video.play()

        return { landmarker, stream }
    } catch (error) {
        landmarker?.close()
        stream?.getTracks().forEach((track) => track.stop())
        throw error
    }
}

export const captureBlendshapes = ({ landmarker, video }) => {
    if (!landmarker || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return null
    }

    const results = landmarker.detectForVideo(video, performance.now())
    const categories = results.faceBlendshapes?.[0]?.categories
    if (!categories?.length) return null

    return Object.fromEntries(
        categories.map(({ categoryName, score }) => [ categoryName, score ])
    )
}

export const averageBlendshapes = (samples) => {
    if (samples.length === 0) return null

    const sums = new Map()
    for (const sample of samples) {
        for (const [ name, score ] of Object.entries(sample)) {
            sums.set(name, (sums.get(name) || 0) + score)
        }
    }

    return Object.fromEntries(
        [ ...sums ].map(([ name, total ]) => [ name, total / samples.length ])
    )
}

export const classifyBlendshapes = (scores, baseline = {}) => {
    if (!scores) return null
    const score = (name) => scores[name] || 0
    const base = (name) => baseline[name] || 0
    const aboveThreshold = (name, floor, baselineDelta) =>
        score(name) >= Math.max(floor, base(name) + baselineDelta)

    if (
        aboveThreshold("jawOpen", 0.4, 0.2) &&
        aboveThreshold("browInnerUp", 0.3, 0.15)
    ) {
        return "surprised"
    }

    if (
        aboveThreshold("mouthSmileLeft", 0.4, 0.18) &&
        aboveThreshold("mouthSmileRight", 0.4, 0.18)
    ) {
        return "happy"
    }

    const frownScore = (score("mouthFrownLeft") + score("mouthFrownRight")) / 2
    const baselineFrown = (base("mouthFrownLeft") + base("mouthFrownRight")) / 2
    if (frownScore >= Math.max(0.25, baselineFrown + 0.15)) {
        return "sad"
    }

    return "neutral"
}
