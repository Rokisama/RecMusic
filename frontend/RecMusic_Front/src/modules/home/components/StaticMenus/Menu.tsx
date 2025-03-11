import React, {useEffect, useState} from "react";
import "./Menu.css"
import {getLikedSongs, createPlaylist, getPlaylists, deletePlaylist, getPlaylist} from "../../SongApis.tsx";
const Menu = ({setDisplayName, setDisplayMode, setDisplayData, setPlaylistId}) => {
    const [playlistName, setPlaylistName] = useState("");
    const [playlists, setPlaylists] = useState<string[]>([]);

    useEffect(() => {
        fetchPlaylists();
    }, [])

    const fetchPlaylists = async () => {
        try {
            const data = await getPlaylists();
            setPlaylists(data);
        } catch (err) {
            console.error("Error fetching playlists:", err);
        }
    };

    const handleCreatePlaylist = async () => {
        if (!playlistName.trim()) return;
        try {
            await createPlaylist(playlistName);
            setPlaylistName("");
            fetchPlaylists();
        } catch (err) {
            console.error("Error creating playlist:", err);
        }
    }
    const handleDeletePlaylist = async (playlistId) => {
        try {
            await deletePlaylist(playlistId);
            setPlaylistName("");
            fetchPlaylists();
        } catch (err) {
            console.error("Error creating playlist:", err);
        }
    }

    const handlePlaylistDisplay = async (playlist) => {
        const updatedPlaylist = await getPlaylist(playlist.id);
        setDisplayName(`Playlist - ${playlist.name}`);
        setDisplayData(updatedPlaylist.songs || []);
        setDisplayMode("Playlist");
        setPlaylistId(playlist.id);
    };

    const handleLikedDisplay = async () => {
        const data = await getLikedSongs();
        setDisplayName("Liked Songs");
        setDisplayData(data);
        setDisplayMode("Liked");
        setPlaylistId(null);
    }






    return (
        <div className="Menu">

            <div className="Title">RecMusic</div>

            <div className="MenuContent">
                <div className="MenuHeader">MENU</div>

                <button className="Btn">Genres</button>

                <div className="MenuHeader">LIBRARY</div>

                <button className="Btn">Recent</button>

                <button className="Btn" onClick={handleLikedDisplay}>Liked</button>

                <div className="MenuHeader">PLAYLIST</div>

                <button onClick={handleCreatePlaylist}>Submit</button>
                <input type="text"
                       placeholder="Create New"
                       value={playlistName}
                       onChange={(e) => setPlaylistName(e.target.value)}/>

                {playlists.length > 0 ? (
                    playlists.map((playlist) => (
                        <div key={playlist.id} className="PlaylistItem">
                            <button className="Btn" onClick={() => handlePlaylistDisplay(playlist)}>{playlist.name}</button>
                            <button onClick={() => handleDeletePlaylist(playlist.id)}>Delete</button>
                        </div>
                    ))
                ) : (
                    <p>No Playlists Yet</p>
                )}

            </div>
        </div>
    );
};

export default Menu;