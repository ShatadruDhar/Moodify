import { useState } from "react";
import { SongContext } from "./song-context.js";

export const SongContextProvider = ({ children }) => {

    const [ song, setSong ] = useState(null)

    const [ loading, setLoading ] = useState(false)

    return (
        <SongContext.Provider
            value={{ loading, setLoading, song, setSong }}
        >
            {children}
        </SongContext.Provider>
    )

}