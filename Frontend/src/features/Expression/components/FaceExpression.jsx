import { useEffect, useRef, useState } from "react"
import {
    averageBlendshapes,
    captureBlendshapes,
    classifyBlendshapes,
    DETECTION_WINDOW_MS,
    init,
} from "../utils/utils"

const SAMPLE_INTERVAL_MS = 100

export default function FaceExpression({ onClick = () => { } }) {
    const videoRef = useRef(null);
    const landmarkerRef = useRef(null);
    const streamRef = useRef(null);
    const baselineRef = useRef(null)
    const mountedRef = useRef(false)
    const samplingTimerRef = useRef(null)
    const resolveSamplingRef = useRef(null)
    const rejectSamplingRef = useRef(null)

    const [ status, setStatus ] = useState("Starting camera…")
    const [ isBusy, setIsBusy ] = useState(true)

    useEffect(() => {
        mountedRef.current = true
        let cancelled = false
        let landmarker
        let stream

        const setupCamera = async () => {
            try {
                const resources = await init(videoRef.current)
                landmarker = resources.landmarker
                stream = resources.stream
                if (cancelled) {
                    landmarker.close()
                    stream.getTracks().forEach((track) => track.stop())
                    return
                }

                landmarkerRef.current = landmarker
                streamRef.current = stream
                setStatus("Hold a neutral expression while your baseline is calibrated…")
                const samples = await collectSamples(DETECTION_WINDOW_MS)
                if (cancelled) return

                if (samples.length > 0) {
                    baselineRef.current = averageBlendshapes(samples)
                    setStatus("Ready to detect your mood.")
                } else {
                    setStatus("No face detected. Move into the camera view and try again.")
                }
            } catch {
                if (!cancelled) {
                    setStatus("Camera unavailable. Allow camera access, then try again.")
                }
            } finally {
                if (!cancelled) setIsBusy(false)
            }
        }

        setupCamera()

        return () => {
            cancelled = true
            mountedRef.current = false
            clearInterval(samplingTimerRef.current)
            resolveSamplingRef.current?.([])
            landmarker?.close()
            stream?.getTracks().forEach((track) => track.stop())
            landmarkerRef.current = null
            streamRef.current = null
        }
    }, [])

    function collectSamples(durationMs) {
        return new Promise((resolve, reject) => {
            const samples = []
            const startedAt = performance.now()
            let lastVideoTime = -1

            const finish = () => {
                clearInterval(samplingTimerRef.current)
                samplingTimerRef.current = null
                resolveSamplingRef.current = null
                rejectSamplingRef.current = null
                resolve(samples)
            }

            resolveSamplingRef.current = (result) => {
                clearInterval(samplingTimerRef.current)
                samplingTimerRef.current = null
                resolveSamplingRef.current = null
                rejectSamplingRef.current = null
                resolve(result)
            }
            rejectSamplingRef.current = (error) => {
                clearInterval(samplingTimerRef.current)
                samplingTimerRef.current = null
                resolveSamplingRef.current = null
                rejectSamplingRef.current = null
                reject(error)
            }
            samplingTimerRef.current = setInterval(() => {
                if (!mountedRef.current || !landmarkerRef.current) {
                    resolveSamplingRef.current?.([])
                    return
                }

                try {
                    const video = videoRef.current
                    if (video && video.currentTime !== lastVideoTime) {
                        const sample = captureBlendshapes({
                            landmarker: landmarkerRef.current,
                            video,
                        })
                        if (sample) samples.push(sample)
                        lastVideoTime = video.currentTime
                    }

                    if (performance.now() - startedAt >= durationMs) finish()
                } catch (error) {
                    rejectSamplingRef.current?.(error)
                }
            }, SAMPLE_INTERVAL_MS)
        })
    }

    async function handleClick() {
        if (isBusy || !landmarkerRef.current) return
        setIsBusy(true)

        try {
            if (!baselineRef.current) {
                setStatus("Hold a neutral expression while your baseline is calibrated…")
                const baselineSamples = await collectSamples(DETECTION_WINDOW_MS)
                if (!mountedRef.current) return
                if (baselineSamples.length === 0) {
                    setStatus("No face detected. Move into the camera view and try again.")
                    return
                }
                baselineRef.current = averageBlendshapes(baselineSamples)
            }

            setStatus("Reading your expression…")
            const samples = await collectSamples(DETECTION_WINDOW_MS)
            if (!mountedRef.current) return
            if (samples.length === 0) {
                setStatus("No face detected. Move into the camera view and try again.")
                return
            }

            const mood = classifyBlendshapes(
                averageBlendshapes(samples),
                baselineRef.current
            )
            if (mood === "neutral") {
                setStatus("Neutral baseline — no strong expression detected.")
                return
            }

            setStatus(`Mood detected: ${mood}. Finding a song…`)
            await onClick(mood)
            if (mountedRef.current) setStatus(`Mood detected: ${mood}.`)
        } catch {
            if (mountedRef.current) {
                setStatus("Mood detection failed. Please try again.")
            }
        } finally {
            if (mountedRef.current) setIsBusy(false)
        }
    }

    return (
        <div className="expression-check">
            <video
                ref={videoRef}
                className="expression-check__video"
                aria-label="Camera preview for mood detection"
                playsInline
            />
            <p className="expression-check__status expression-check__status--neutral" aria-live="polite">
                <span className="expression-check__status-dot" aria-hidden="true" />
                {status}
            </p>
            <button
                className="expression-check__button"
                onClick={handleClick}
                disabled={isBusy || !landmarkerRef.current}
            >
                {isBusy ? "Please wait…" : "Detect my mood"}
            </button>
        </div>
    );
}