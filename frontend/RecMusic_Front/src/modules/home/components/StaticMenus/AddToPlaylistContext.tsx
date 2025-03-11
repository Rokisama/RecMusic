import { useEffect, useRef, useState } from "react";
import { addSongToPlaylist, getPlaylists } from "../../SongApis.tsx";
import "./AddToPlaylistContext.css";

const AddToPlaylistContext = ({ songId, onClose, onUpdate }) => {
    const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                const data = await getPlaylists();
                setPlaylists(data);
            } catch (err) {
                console.error("Error fetching playlists:", err);
            }
        };
        fetchPlaylists();

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddToPlaylist = async (playlistId) => {
        try {
            await addSongToPlaylist(playlistId, songId);
            onClose();
            onUpdate();
        } catch (err) {
            console.error("Error adding song to playlist:", err);
        }
    };

    return (
        <div className="ContextMenu" ref={menuRef}>
            <h4>Select Playlist</h4>
            {playlists.length > 0 ? (
                playlists.map((playlist) => (
                    <button key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)}>
                        {playlist.name}
                    </button>
                ))
            ) : (
                <p>No playlists available</p>
            )}
        </div>
    );
};

export default AddToPlaylistContext;
