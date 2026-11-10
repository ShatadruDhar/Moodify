import { useState } from "react";
import { songsByMood } from "./song.catalog";
import { SongContext } from "./song-context.js";

export const SongContextProvider = ({ children }) => {

    const [ song, setSong ] = useState(songsByMood.happy)

    const [ loading, setLoading ] = useState(false)

    return (
        <SongContext.Provider
            value={{ loading, setLoading, song, setSong }}
        >
            {children}
        </SongContext.Provider>
    )

}