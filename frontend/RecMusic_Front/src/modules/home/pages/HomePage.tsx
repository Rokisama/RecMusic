import Toolbar, {Song} from "../components/StaticMenus/Toolbar.tsx";
import Menu from "../components/StaticMenus/Menu.tsx";
import SongDisplay from "../components/SongDisplay/SongDisplay.tsx";
import {useState} from "react";

export default function HomePage() {

    const [displayName, setDisplayName] = useState("Recommended");
    const [displayData, setDisplayData] = useState<Song[]>([]);
    const [displayMode, setDisplayMode] = useState("");
    const [playlistId, setPlaylistId] = useState("");
    return (
        <div>
            <Menu setDisplayName={setDisplayName} setDisplayMode={setDisplayMode} setDisplayData={setDisplayData} setPlaylistId={setPlaylistId}/>
            <Toolbar setDisplayName={setDisplayName} setDisplayData={setDisplayData}/>
            <SongDisplay displayName={displayName} displayMode={displayMode} songs={displayData} playlistId={playlistId}/>
        </div>
    );

}