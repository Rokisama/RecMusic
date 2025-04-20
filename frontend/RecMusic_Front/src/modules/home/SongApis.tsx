import Cookies from "js-cookie";
const API_URL = "http://localhost:8000/api/songs"



export const likeSong = async (songTrackId: string) => {
    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    const response = await fetch(`${API_URL}/like/${songTrackId}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to like song");
    return await response.json();
}

export const unlikeSong = async (songTrackId: string) => {
    const token = Cookies.get("access_token");

    if (!token) throw new Error("User is not authenticated");

    const response = await fetch(`${API_URL}/unlike/${songTrackId}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to unlike song");
    return await response.json();
};

export const searchSongs = async (query: string) => {
    if (query.trim() === "") throw new Error("Please enter a song or artist name.");

    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    try {
        const response = await fetch(`${API_URL}/search/?q=${query}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch songs");

        return await response.json();
    } catch (err) {
        throw new Error("Error fetching songs. Try again.");
    }
};

export const getLikedSongs = async () => {

    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    try {
        const response = await fetch(`${API_URL}/liked/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch liked songs");

        return await response.json();
    } catch (err) {
        throw new Error("Error fetching liked songs. Try again.");
    }
};

export const getPlaylists = async () => {

    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    try {
        const response = await fetch(`${API_URL}/playlists/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch playlists");

        return await response.json();
    } catch (err) {
        throw new Error("Error fetching playlists. Try again.");
    }
};

export const createPlaylist = async (name: string) => {
    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    const response = await fetch(`${API_URL}/playlists/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
        credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to create playlist");
    return await response.json();
}

export const deletePlaylist = async (playlistId: string) => {
    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    const response = await fetch(`${API_URL}/playlists/${playlistId}/delete/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
        credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to delete playlist");
    return await response.json();
}

export const addSongToPlaylist = async (playlistId, songId) => {
    const token = Cookies.get("access_token");

    console.log(songId);
    const response = await fetch(`${API_URL}/playlists/${playlistId}/add/${songId}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) throw new Error("Failed to add song to playlist");

    return await response.json();
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
    const token = Cookies.get("access_token");

    const response = await fetch(`${API_URL}/playlists/${playlistId}/remove/${songId}/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });


    if (!response.ok) throw new Error("Failed to remove song from playlist");

    return await response.json();
};

export const getPlaylist = async (playlistId: string) => {
    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    const response = await fetch(`${API_URL}/playlists/${playlistId}/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch updated playlist");

    return await response.json();
};

export const getRecommendedSongs = async () => {

    const token = Cookies.get("access_token");
    if (!token) throw new Error("User is not authenticated");

    try {
        const response = await fetch(`http://localhost:8000/api/recommender/recommend/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch recommended songs");

        return await response.json();
    } catch (err) {
        throw new Error("Error fetching recommended songs. Try again.");
    }
};
