import React, {use, useState} from "react";
import {useAuth} from "../../../auth/AuthContext.tsx";
import "./Toolbar.css"
import SearchedSongs from "../SongDisplays/SearchedSongs.tsx";
import Cookies from "js-cookie";

export type Song = {
    id: number;
    track_id: string;
    name: string;
    artist: string;
    spotify_id: string;
};

const Toolbar = () => {
    const [search, setSearch] = useState("");
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { logout, user } = useAuth();

    const searchSongs = async () => {
        if (search.trim() === "") {
            setError("Please enter a song or artist name.");
            return;
        }
        setLoading(true);
        setError("");
        const token = Cookies.get("access_token");
        try {
            const response = await fetch(`http://localhost:8000/api/songs/search/?q=${search}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                credentials: "include",
            });

            if (!response.ok) throw new Error("Failed to fetch songs");

            const data = await response.json();
            setSongs(data);

        } catch (err) {
            setError("Error fetching songs. Try again.");
        }

        setLoading(false);
    }


    return (
        <div className="Toolbar">

            <div className="SearchBar">
                <button onClick={searchSongs}>Submit</button>
                <input type="text"
                       placeholder="Search..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}/>
            </div>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            <div className="ToolbarRight">
                <div className="Username">{user?.username}</div>
                <button className="LogoutBtn" onClick={logout}>Logout</button>
            </div>

            <SearchedSongs songs={songs} />
        </div>
    );
}

export default Toolbar