import React, {useEffect, useState} from "react";
import {Song} from "../StaticMenus/Toolbar.tsx";
import {likeSong, unlikeSong, getLikedSongs, addSongToPlaylist, removeSongFromPlaylist} from "../../SongApis.tsx";
import "./SongDisplay.css"
import AddToPlaylistContext from "../StaticMenus/AddToPlaylistContext.tsx";

type SongsProps = {
    songs?: Song[];
    displayName?: string;
    playlistId?: string;
    setDisplayData?: (data: Song[]) => void;
};


const SongDisplay: React.FC<SongsProps> = ({
    songs = [],
    displayName = "",
    playlistId = "",
    setDisplayData

}) => {
    const [likedSongs, setLikedSongs] = useState<string[]>([]);
    const [selectedSongId, setSelectedSongId] = useState(null);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

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
            } else {
                await likeSong(songTrackId);
                setLikedSongs([...likedSongs, songTrackId]);
            }
        } catch (err) {
            console.error("Error toggling like:", err);
        }
    };

    const handleRemoveFromPlaylist = async (songTrackId: string) => {
        if (!playlistId) return;
        try {
            await removeSongFromPlaylist(playlistId, songTrackId);
            setDisplayData?.((prevSongs) => prevSongs.filter(song => song.track_id !== songTrackId));
        } catch (err) {
            console.error("Error removing song from playlist:", err);
        }
    };


    return (
        <div className="SongList">
            <div className="DisplayName">{displayName}</div>
            <ul>
                {songs.map((song) => (
                    <li className="Song" key={song.track_id}>
                        {song.name} - {song.artist}

                        <div className="Buttons">
                            <button onClick={() => handleLikeToggle(song.track_id)}>
                                {likedSongs.includes(song.track_id) ? "Unlike" : "Like"}
                            </button>

                            {playlistId ? (
                                <button onClick={() => handleRemoveFromPlaylist(song.track_id)}>
                                    Remove
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => {
                                        setSelectedSongId(song.track_id);
                                        setShowPlaylistMenu(true);
                                    }}>Add to Playlist</button>

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