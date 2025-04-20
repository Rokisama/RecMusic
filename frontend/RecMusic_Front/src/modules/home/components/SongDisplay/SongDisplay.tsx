import React, {useEffect, useState} from "react";
import {Song} from "../../../helpers/models/Song.tsx";
import {likeSong, unlikeSong, getLikedSongs, addSongToPlaylist, removeSongFromPlaylist} from "../../SongApis.tsx";
import "./SongDisplay.css"
import AddToPlaylistContext from "../StaticMenus/AddToPlaylistContext.tsx";
import useActivityTracker from "../../../helpers/ActivityTracker.tsx";


import { library } from '@fortawesome/fontawesome-svg-core';
import {faHeart as fasHeart, faPlay, faSquareMinus, faSquarePlus} from '@fortawesome/free-solid-svg-icons';
import { faHeart as farHeart } from '@fortawesome/free-regular-svg-icons';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

library.add(faPlay, fasHeart, farHeart);

type SongsProps = {
    songs?: Song[];
    displayName?: string;
    playlistId?: string;
    setDisplayData?: (data: Song[]) => void;
    onSelectSong: (song: Song) => void;
    songsFromDisplay?: (data: Song[]) => void;
};


const SongDisplay: React.FC<SongsProps> = ({
    songs = [],
    displayName = "",
    playlistId = "",
    setDisplayData,
    onSelectSong,
    songsFromDisplay,
}) => {
    const [likedSongs, setLikedSongs] = useState<string[]>([]);
    const [selectedSongId, setSelectedSongId] = useState(null);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
    const { logCustomActivity } = useActivityTracker();

    useEffect(() => {
        const fetchLikedSongs = async () => {
            try {
                const data = await getLikedSongs();
                const likedIds = data.map((song: Song) => song.track_id);
                setLikedSongs(likedIds);
            } catch (err) {
                console.error("Error fetching liked songs:", err);
            }
        };

        fetchLikedSongs();
    }, []);



    const handleLikeToggle = async (songTrackId: string) => {
        try {
            if (likedSongs.includes(songTrackId)) {
                await unlikeSong(songTrackId);
                setLikedSongs(likedSongs.filter(id => id !== songTrackId));
                logCustomActivity("unlike", songTrackId);
            } else {
                await likeSong(songTrackId);
                setLikedSongs([...likedSongs, songTrackId]);
                logCustomActivity("like", songTrackId);
            }
        } catch (err) {
            console.error("Error toggling like:", err);
        }
    };

    const handleRemoveFromPlaylist = async (songTrackId: string) => {
        if (!playlistId) return;
        try {
            await removeSongFromPlaylist(playlistId, songTrackId);
            logCustomActivity("removePlaylist", songTrackId);
            setDisplayData?.((prevSongs) => prevSongs.filter(song => song.track_id !== songTrackId));
        } catch (err) {
            console.error("Error removing song from playlist:", err);
        }
    };

    const handlePlaySong = (song: Song) => {
        onSelectSong(song);
        logCustomActivity("play", song.track_id);
    }

    return (
        <div className="SongList">
            <div className="DisplayName">{displayName}</div>
            <ul>
                {songs.map((song) => (
                    <li className="Song" key={song.track_id}>
                        <button className="ActionBtn" onClick={() => handlePlaySong(song)}><FontAwesomeIcon icon={faPlay} /> </button>
                        {song.name} - {song.artist}

                        <div>
                            <button className="ActionBtn" onClick={() => handleLikeToggle(song.track_id)}>
                                {likedSongs.includes(song.track_id) ? <FontAwesomeIcon icon={fasHeart} /> : <FontAwesomeIcon icon={farHeart} />}
                            </button>

                            {playlistId ? (
                                <button className="ActionBtn" onClick={() => handleRemoveFromPlaylist(song.track_id)}>
                                    <FontAwesomeIcon icon={faSquareMinus} />
                                </button>
                            ) : (
                                <>
                                    <button className="ActionBtn" onClick={() => {
                                        setSelectedSongId(song.track_id);
                                        setShowPlaylistMenu(true);
                                    }}><FontAwesomeIcon icon={faSquarePlus} /></button>

                                    {selectedSongId === song.track_id && showPlaylistMenu && (
                                        <AddToPlaylistContext
                                            songId={song.track_id}
                                            onClose={() => setShowPlaylistMenu(false)}
                                            onUpdate={() => setDisplayData?.([...songs, { track_id: song.track_id, name: "Loading...", artist: "Unknown" }])}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SongDisplay