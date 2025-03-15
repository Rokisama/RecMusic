import "./SongPlayer.css";
import React, { useRef, useState, useEffect } from "react";
import { Song } from "../StaticMenus/Toolbar.tsx";

import { library } from '@fortawesome/fontawesome-svg-core';
import {faPause, faPlay, faForward, faBackward} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

library.add(faPlay, faPause, faForward, faBackward);


type SongPlayerProps = {
    song: Song | null;
    songsFromDisplay: Song[];
};

const SongPlayer: React.FC<SongPlayerProps> = ({ song, songsFromDisplay }) => {
    if (songsFromDisplay.length === 0) return <div>No songs available</div>;

    const [currentIndex, setCurrentIndex] = useState(() => {
        if (song) {
            const index = songsFromDisplay.findIndex((s) => s.id === song.id);
            return index !== -1 ? index : 0;
        }
        return 0;
    });
    const currentSong = songsFromDisplay[currentIndex];

    const [isPlaying, setIsPlaying] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (song) {
            const index = songsFromDisplay.findIndex((s) => s.id === song.id);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [song, songsFromDisplay]);


    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.src = currentSong.spotify_preview_url;
        }
    }, [currentSong]);

    useEffect(() => {
        if (currentIndex >= songsFromDisplay.length) {
            setCurrentIndex(0);
        }
    }, [songsFromDisplay, currentIndex]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.play();
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setTimeout(() => {
                handleNext();
            }, 3000);
        }

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [currentSong]);

    const handlePlayToggle = () => {
        setIsPlaying((prev) => !prev);
    };

    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        const newTime = Number(event.target.value);
        if (audio) {
            audio.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleNext = () => {
        if (currentIndex < songsFromDisplay.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsPlaying(true);
        }
        else {
            setCurrentIndex(0);
            setIsPlaying(true);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsPlaying(true);
        }
        else {
            setCurrentIndex(songsFromDisplay.length - 1);
            setIsPlaying(true);
        }
    };

    return (
        <div className="SongPlayer">
            <div className="PlayerControls">
                <div className="SongInfo">
                    {`${currentSong.name} - ${currentSong.artist}`}
                </div>

                <audio key={currentSong.id} ref={audioRef} autoPlay={isPlaying} />

                <div>
                    <input
                        className="SongBar"
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        style={{ width: "100%" }}
                    />
                    <div className="SongTimer">
                        {Math.floor(currentTime)} / {Math.floor(duration)} sec
                    </div>
                </div>

                <div className="Buttons">
                    <button className="PlayerBtn player" onClick={handlePrevious}><FontAwesomeIcon icon={faBackward} /></button>
                    <button className="PlayerBtn player" onClick={handlePlayToggle}>
                        {isPlaying ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}
                    </button>
                    <button className="PlayerBtn player" onClick={handleNext}><FontAwesomeIcon icon={faForward} /></button>
                </div>
            </div>
        </div>
    );
};

export default SongPlayer;
