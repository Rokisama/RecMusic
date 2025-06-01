import React from "react";
import { render, screen, fireEvent, waitFor} from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import AddToPlaylistContext from "./AddToPlaylistContext";
import * as SongApis from "../../SongApis.tsx";

vi.mock("../../SongApis.tsx", () => ({
    __esModule: true,
    getPlaylists: vi.fn(),
    addSongToPlaylist: vi.fn(),
}));

const mockLog = vi.fn();
vi.mock("../../../helpers/ActivityTracker.tsx", () => ({
    __esModule: true,
    default: () => ({ logCustomActivity: mockLog }),
}));

describe("AddToPlaylistContext", () => {
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows 'No playlists available' when API returns empty array", async () => {
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue([]);
        render(
            <AddToPlaylistContext
                songId="song123"
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() =>
            expect(SongApis.getPlaylists).toHaveBeenCalled()
        );
        expect(screen.getByText("No playlists available")).toBeInTheDocument();
    });

    it("renders a button for each playlist returned by API", async () => {
        const playlists = [
            { id: "p1", name: "Chill Vibes" },
            { id: "p2", name: "Workout" },
        ];
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue(playlists);

        render(
            <AddToPlaylistContext
                songId="song123"
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() =>
            expect(SongApis.getPlaylists).toHaveBeenCalled()
        );

        expect(screen.getByRole("button", { name: "Chill Vibes" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Workout" })).toBeInTheDocument();
    });

    it("clicking outside the menu calls onClose", async () => {
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue([]);
        const { container } = render(
            <div>
                <AddToPlaylistContext
                    songId="song123"
                    onClose={mockOnClose}
                    onUpdate={mockOnUpdate}
                />
                <div data-testid="outside">outside</div>
            </div>
        );

        await waitFor(() =>
            expect(SongApis.getPlaylists).toHaveBeenCalled()
        );

        fireEvent.mouseDown(screen.getByTestId("outside"));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("adds song to playlist, logs activity, then closes and updates", async () => {
        const playlists = [{ id: "p1", name: "My Playlist" }];
        (SongApis.getPlaylists as vi.Mock).mockResolvedValue(playlists);
        (SongApis.addSongToPlaylist as vi.Mock).mockResolvedValue({});

        render(
            <AddToPlaylistContext
                songId="song123"
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        await waitFor(() =>
            expect(SongApis.getPlaylists).toHaveBeenCalled()
        );

        fireEvent.click(screen.getByRole("button", { name: "My Playlist" }));

        await waitFor(() =>
            expect(SongApis.addSongToPlaylist).toHaveBeenCalledWith(
                "p1",
                "song123"
            )
        );

        expect(mockLog).toHaveBeenCalledWith("addPlaylist", "song123");
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnUpdate).toHaveBeenCalled();
    });
});
