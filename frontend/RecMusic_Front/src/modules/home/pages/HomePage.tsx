import Toolbar, {Song} from "../components/StaticMenus/Toolbar.tsx";
import Menu from "../components/StaticMenus/Menu.tsx";
import SongDisplay from "../components/SongDisplay/SongDisplay.tsx";
import {use, useState} from "react";
import SongPlayer from "../components/SongPlayer/SongPlayer.tsx";
import "./HomePage.css";

export default function HomePage() {

    const [displayName, setDisplayName] = useState("Recommended");
    const [displayData, setDisplayData] = useState<Song[]>([]);
    const [displayMode, setDisplayMode] = useState("");
    const [playlistId, setPlaylistId] = useState("");
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [songsFromDisplay, setSongsFromDisplay] = useState<Song[]>([]);

    return (
        <>
            <div className="AppContainer">
                <Menu className="Menu"
                      setDisplayName={setDisplayName}
                      setDisplayMode={setDisplayMode}
                      setDisplayData={setDisplayData}
                      setPlaylistId={setPlaylistId}/>

                <div className="MainContent">
                    <Toolbar className="Toolbar"
                             setDisplayName={setDisplayName}
                             setDisplayData={setDisplayData}/>

                    <div className="ContentContainer">
                        <SongDisplay className="SongDisplay"
                                     onSelectSong={setCurrentSong}
                                     setSongsFromDisplay={setSongsFromDisplay}
                                     displayName={displayName}
                                     displayMode={displayMode}
                                     songs={displayData}
                                     playlistId={playlistId}/>
                        <SongPlayer className="SongPlayer"
                                    song={currentSong}
                                    songsFromDisplay={displayData}/>
                    </div>
                </div>
            </div>
        </>

    );

}