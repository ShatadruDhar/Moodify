import { useContext, useState } from "react";
import { SongContext } from "../song-context.js";
import { getSong } from "../service/song.api";


export const useSong = () => {
    const context = useContext(SongContext)

    const { loading, setLoading, song, setSong } = context
    const [ error, setError ] = useState("")

    async function handleGetSong({ mood }) {
        setLoading(true)
        setError("")
        try {
            const matchingSong = await getSong({ mood: mood?.toLowerCase() })
            if (!matchingSong) {
                setError("No song is available for that mood yet.")
                return
            }
            setSong(matchingSong)
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to load a song. Please try again."
            )
        } finally {
            setLoading(false)
        }
    }

    return ({ loading, song, error, handleGetSong })

}
