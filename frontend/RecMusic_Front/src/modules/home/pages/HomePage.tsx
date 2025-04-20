import Toolbar from "../components/StaticMenus/Toolbar.tsx";
import Menu from "../components/StaticMenus/Menu.tsx";
import SongDisplay from "../components/SongDisplay/SongDisplay.tsx";
import {use, useEffect, useState} from "react";
import SongPlayer from "../components/SongPlayer/SongPlayer.tsx";
import "./HomePage.css";
import {getRecommendedSongs} from "../SongApis.tsx";
import {Song} from "../../helpers/models/Song.tsx";

export default function HomePage() {

    const [displayName, setDisplayName] = useState("Recommended");
    const [displayData, setDisplayData] = useState<Song[]>([]);
    const [displayMode, setDisplayMode] = useState("");
    const [playlistId, setPlaylistId] = useState("");
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [songsFromDisplay, setSongsFromDisplay] = useState<Song[]>([]);

    useEffect(() => {
        getRecommendedSongs()
            .then((data) => {
                console.log("Returned data:", data);

                const songsArray = Array.isArray(data.recommendations) ? data.recommendations : [];
                setDisplayData(songsArray);
            })
            .catch((error) => {
                console.error("Error fetching recommended songs:", error);
            });
    }, []);



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