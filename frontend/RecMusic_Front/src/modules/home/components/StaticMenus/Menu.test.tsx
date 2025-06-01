import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Menu from "./Menu";
import * as SongApis from "../../SongApis.tsx";

vi.mock("../../SongApis.tsx", () => ({
    __esModule: true,
    getPlaylists: vi.fn(),
    getPlaylist: vi.fn(),
    getLikedSongs: vi.fn(),
    createPlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
}));

describe("Menu component", () => {
    const mockSetDisplayName = vi.fn();
    const mockSetDisplayData = vi.fn();
    const mockSetDisplayMode = vi.fn();
    const mockSetPlaylistId = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders 'No Playlists Yet' when API returns empty", async () => {
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue([]);

        render(
            <Menu
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
                setDisplayMode={mockSetDisplayMode}
                setPlaylistId={mockSetPlaylistId}
            />
        );

        await waitFor(() => expect(SongApis.getPlaylists).toHaveBeenCalled());
        expect(screen.getByText("No Playlists Yet")).toBeInTheDocument();
    });

    it("loads and displays playlists from API", async () => {
        const playlists = [
            { id: "p1", name: "Chill" },
            { id: "p2", name: "Party" },
        ];
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue(playlists);

        render(
            <Menu
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
                setDisplayMode={mockSetDisplayMode}
                setPlaylistId={mockSetPlaylistId}
            />
        );

        for (const pl of playlists) {
            const btn = await screen.findByRole("button", { name: pl.name });
            expect(btn).toBeInTheDocument();
        }
    });

    it("clicking a playlist button fetches that playlist and updates display", async () => {
        const playlists = [{ id: "p1", name: "Chill" }];
        const playlistData = { songs: [{ id: 1, track_id: "t1", name: "S", artist: "A", spotify_id: "s", spotify_preview_url: "" }]};
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue(playlists);
        (SongApis.getPlaylist as vi.Mock).mockResolvedValue(playlistData);

        render(
            <Menu
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
                setDisplayMode={mockSetDisplayMode}
                setPlaylistId={mockSetPlaylistId}
            />
        );

        const plBtn = await screen.findByRole("button", { name: "Chill" });
        fireEvent.click(plBtn);

        await waitFor(() =>
            expect(SongApis.getPlaylist).toHaveBeenCalledWith("p1")
        );

        expect(mockSetDisplayName).toHaveBeenCalledWith("Playlist - Chill");
        expect(mockSetDisplayData).toHaveBeenCalledWith(playlistData.songs);
        expect(mockSetDisplayMode).toHaveBeenCalledWith("Playlist");
        expect(mockSetPlaylistId).toHaveBeenCalledWith("p1");
    });

    it("clicking 'Liked' loads liked songs and updates display", async () => {
        const liked = [{ id: 2, track_id: "t2", name: "L", artist: "B", spotify_id: "s2", spotify_preview_url: "" }];
        (SongApis.getLikedSongs as vi.Mock).mockResolvedValue(liked);

        render(
            <Menu
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
                setDisplayMode={mockSetDisplayMode}
                setPlaylistId={mockSetPlaylistId}
            />
        );

        const likedBtn = screen.getByRole("button", { name: /Liked/i });
        fireEvent.click(likedBtn);

        await waitFor(() =>
            expect(SongApis.getLikedSongs).toHaveBeenCalled()
        );

        expect(mockSetDisplayName).toHaveBeenCalledWith("Liked Songs");
        expect(mockSetDisplayData).toHaveBeenCalledWith(liked);
        expect(mockSetDisplayMode).toHaveBeenCalledWith("Liked");
        expect(mockSetPlaylistId).toHaveBeenCalledWith(null);
    });
});
