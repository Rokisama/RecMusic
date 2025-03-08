import React from "react";
import "./SearchedSongs.css"
import {Song} from "../StaticMenus/Toolbar.tsx";

type SearchedSongsProps = {
    songs?: Song[]; // ✅ Ensure songs is an array of Song
};
const SearchedSongs: React.FC<SearchedSongsProps> = ({ songs = [] }) => {
    if (!songs || songs.length === 0) return <p>No songs found.</p>;

    return (
        <div className="SongList">
            <ul>
                {songs.map((song) => (
                    <li key={song.id}>
                        {song.name} - {song.artist}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SearchedSongs