import { useEffect, useRef, useState } from "react";
import { detect, init } from "../utils/utils";


export default function FaceExpression({ onClick = () => { } }) {
    const videoRef = useRef(null);
    const landmarkerRef = useRef(null);
    const streamRef = useRef(null);

    const [ expression, setExpression ] = useState("Detecting...");

    useEffect(() => {
        init({ landmarkerRef, videoRef, streamRef });

        return () => {
            if (landmarkerRef.current) {
                landmarkerRef.current.close();
            }

            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
    }, []);

    async function handleClick() {
        const expression = detect({ landmarkerRef, videoRef, setExpression })
        console.log(expression)
        onClick(expression)
    }

    const expressionClass = ["happy", "sad", "surprised", "neutral"].includes(expression.toLowerCase())
        ? expression.toLowerCase()
        : "detecting"

    return (
        <div className="expression-check">
            <video
                ref={videoRef}
                className="expression-check__video"
                aria-label="Camera preview for mood detection"
                playsInline
            />
            <p className={`expression-check__status expression-check__status--${expressionClass}`} aria-live="polite">
                <span className="expression-check__status-dot" aria-hidden="true" />
                {expression === "Detecting..." ? "Starting camera…" : `Current read: ${expression}`}
            </p>
            <button className="expression-check__button" onClick={handleClick}>
                Detect my mood
            </button>
        </div>
    );
}