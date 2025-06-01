import React from "react";
import {render, screen, fireEvent, waitFor, within} from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import SongDisplay from "./SongDisplay";
import { Song } from "../../../helpers/models/Song";
import * as SongApis from "../../SongApis.tsx";
import useActivityTracker from "../../../helpers/ActivityTracker.tsx";

vi.mock("../../SongApis.tsx", () => ({
    getLikedSongs: vi.fn(),
    likeSong: vi.fn(),
    unlikeSong: vi.fn(),
    removeSongFromPlaylist: vi.fn(),
}));

vi.mock("../../../helpers/ActivityTracker.tsx", () => ({
    __esModule: true,
    default: vi.fn(),
}));

vi.mock("../StaticMenus/AddToPlaylistContext.tsx", () => ({
    __esModule: true,
    default: () => <div data-testid="add-context">Add Context</div>,
}));

describe("SongDisplay component", () => {
    const mockSongs: Song[] = [
        {
            id: 1,
            track_id: "t1",
            name: "Song One",
            artist: "Artist A",
            spotify_id: "s1",
            spotify_preview_url: "",
            tags: [],
        },
        {
            id: 2,
            track_id: "t2",
            name: "Song Two",
            artist: "Artist B",
            spotify_id: "s2",
            spotify_preview_url: "",
            tags: [],
        },
    ];

    const mockLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (useActivityTracker as unknown as vi.Mock).mockReturnValue({
            logCustomActivity: mockLog,
        });

        (SongApis.getLikedSongs as vi.Mock).mockResolvedValue([mockSongs[0]]);
    });

    it("fetches liked songs on display", async () => {
        render(<SongDisplay songs={mockSongs} onSelectSong={vi.fn()} />);
        await waitFor(() => expect(SongApis.getLikedSongs).toHaveBeenCalled());
    });

    it("calls onSelectSong and logs activity when play is clicked", async () => {
        const onSelect = vi.fn();
        render(<SongDisplay songs={mockSongs} onSelectSong={onSelect} />);
        await waitFor(() => expect(SongApis.getLikedSongs).toHaveBeenCalled());

        const playButtons = screen.getAllByRole("button", { name: /play song/i });
        fireEvent.click(playButtons[1]);

        expect(onSelect).toHaveBeenCalledWith(mockSongs[1]);
        expect(mockLog).toHaveBeenCalledWith("play", "t2");
    });

    it("toggles like/unlike and logs correctly", async () => {
        render(<SongDisplay songs={mockSongs} onSelectSong={vi.fn()} />);
        await waitFor(() => expect(SongApis.getLikedSongs).toHaveBeenCalled());

        const likeButtons = screen.getAllByRole("button", { name: /like song/i });

        fireEvent.click(likeButtons[0]);
        await waitFor(() =>
            expect(SongApis.unlikeSong).toHaveBeenCalledWith("t1")
        );
        expect(mockLog).toHaveBeenCalledWith("unlike", "t1");

        fireEvent.click(likeButtons[1]);
        await waitFor(() =>
            expect(SongApis.likeSong).toHaveBeenCalledWith("t2")
        );
        expect(mockLog).toHaveBeenCalledWith("like", "t2");
    });

    it("handles removal when playlistId is provided", async () => {
        const setDisplayData = vi.fn();
        (SongApis.removeSongFromPlaylist as vi.Mock).mockResolvedValue({});

        render(
            <SongDisplay
                songs={mockSongs}
                onSelectSong={vi.fn()}
                playlistId="pl1"
                setDisplayData={setDisplayData}
            />
        );
        await waitFor(() => expect(SongApis.getLikedSongs).toHaveBeenCalled());

        const removeBtns = screen.getAllByRole("button", { name: /remove from playlist/i });
        fireEvent.click(removeBtns[0]);
        await waitFor(() =>
            expect(SongApis.removeSongFromPlaylist).toHaveBeenCalledWith(
                "pl1",
                "t1"
            )
        );
        expect(mockLog).toHaveBeenCalledWith("removePlaylist", "t1");
        expect(setDisplayData).toHaveBeenCalled();
    });

    it("opens AddToPlaylistContext when the add to playlist button is clicked", async () => {
        render(<SongDisplay songs={mockSongs} onSelectSong={vi.fn()} />);
        await waitFor(() => expect(SongApis.getLikedSongs).toHaveBeenCalled());

        const items = screen.getAllByRole("listitem");
        const firstItem = items[0];

        const buttons = within(firstItem).getAllByRole("button");

        fireEvent.click(buttons[2]);

        expect(screen.getByTestId("add-context")).toBeInTheDocument();
    });
});
