import React, {use, useState} from "react";
import {useAuth} from "../../../auth/AuthContext.tsx";
import "./Toolbar.css"
import {searchSongs} from "../../SongApis.tsx";
import {faMagnifyingGlass} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const Toolbar = ({setDisplayName, setDisplayData}) => {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { logout, user } = useAuth();

    const handleSearch = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await searchSongs(search);
            setDisplayName("Search results");
            setDisplayData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);

        }
    }

    return (
        <div className="Toolbar">

            <div className="SearchBar">
                <button className="SearchBtn" onClick={handleSearch}><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
                <input className="SearchInput" spellCheck="false" type="text"
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

        </div>
    );
}

export default Toolbar