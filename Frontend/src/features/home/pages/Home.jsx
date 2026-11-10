import React from 'react'
import FaceExpression from '../../Expression/components/FaceExpression'
import Player from '../components/Player'
import { useSong } from '../hooks/useSong'
import './home.scss'

const Home = () => {

    const { handleGetSong, error: songError } = useSong()

    return (
        <div className="home-shell">
            <header className="home-header">
                <a className="home-brand" href="/" aria-label="Moodify home">
                    <img className="home-brand__logo" src="/Moodify.png" alt="" />
                    <span className="home-brand__name">Moodify</span>
                </a>
                <span className="home-header__tagline">Music that meets your mood</span>
            </header>

            <main className="home-main">
                <section className="home-intro" aria-labelledby="home-title">
                    <p className="home-intro__eyebrow">YOUR MOMENT, YOUR MUSIC</p>
                    <h1 id="home-title">How are you feeling?</h1>
                    <p className="home-intro__description">
                        Let Moodify read your expression and find a song for right now.
                    </p>
                </section>

                <section className="mood-panel" aria-label="Mood detection">
                    <div className="mood-panel__top">
                        <div>
                            <h2>Check in with yourself</h2>
                            <p>Allow camera access and hold a neutral expression during calibration.</p>
                        </div>
                    </div>
                    <FaceExpression onClick={(mood) => handleGetSong({ mood })} />
                    {songError && <p className="home-song-error" role="alert">{songError}</p>}
                    <div className="mood-panel__moods" aria-label="Available moods">
                        <span>Happy</span>
                        <span>Sad</span>
                        <span>Surprised</span>
                    </div>
                </section>
                <p className="home-note">Your camera is used only to detect your expression.</p>
            </main>
            <Player />
        </div>
    )
}

export default Home