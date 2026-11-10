import { useContext } from "react";
import { SongContext } from "../song-context.js";
import { songsByMood } from "../song.catalog";


export const useSong = () => {
    const context = useContext(SongContext)

    const { loading, setLoading, song, setSong } = context

    async function handleGetSong({ mood }) {
        const matchingSong = songsByMood[mood?.toLowerCase()]
        if (!matchingSong) return

        setLoading(true)
        try {
            setSong(matchingSong)
        } finally {
            setLoading(false)
        }
    }

    return ({ loading, song, handleGetSong })

}
