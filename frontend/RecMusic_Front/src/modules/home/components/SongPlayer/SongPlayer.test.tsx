import React from "react";
import { render, screen, fireEvent, waitFor, within} from "@testing-library/react";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import SongPlayer from "./SongPlayer";
import { Song } from "../../../../helpers/models/Song";

const mockLog = vi.fn();
vi.mock("../../../../helpers/ActivityTracker.tsx", () => ({
    __esModule: true,
    default: () => ({ logCustomActivity: mockLog }),
}));
beforeAll(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

describe("SongPlayer", () => {
    const songs: Song[] = [
        {
            id: 1,
            track_id: "t1",
            name: "First Song",
            artist: "Artist1",
            spotify_id: "s1",
            spotify_preview_url: "https://example.com/1.mp3",
            tags: [],
        },
        {
            id: 2,
            track_id: "t2",
            name: "Second Song",
            artist: "Artist2",
            spotify_id: "s2",
            spotify_preview_url: "https://example.com/2.mp3",
            tags: [],
        },
    ];

    beforeEach(() => {
        mockLog.mockClear();
        vi.restoreAllMocks();

        vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
        vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    });

    it("renders exception when no songs available", () => {
        render(<SongPlayer song={null} songsFromDisplay={[]} />);
        expect(screen.getByText("No songs available")).toBeInTheDocument();
    });

    it("shows the current song info and starting timer", () => {
        render(<SongPlayer song={songs[0]} songsFromDisplay={songs} />);
        expect(screen.getByText("First Song - Artist1")).toBeInTheDocument();
        expect(screen.getByText("0 / 0 sec")).toBeInTheDocument();
    });

    it("toggles play/pause icon when clicking play button", async () => {
        render(<SongPlayer song={songs[0]} songsFromDisplay={songs} />);
        const controls = screen.getByRole("region", { name: /PlayerControls/i });
        const buttons = within(controls).getAllByRole("button");
        const playPauseBtn = buttons[1];

        expect(playPauseBtn.querySelector("svg")).toHaveAttribute("data-icon", "play");

        fireEvent.click(playPauseBtn);
        await waitFor(() =>
            expect(playPauseBtn.querySelector("svg")).toHaveAttribute("data-icon", "pause")
        );

        fireEvent.click(playPauseBtn);
        await waitFor(() =>
            expect(playPauseBtn.querySelector("svg")).toHaveAttribute("data-icon", "play")
        );
    });

    it("advances to next song and wraps list", async () => {
        render(<SongPlayer song={songs[0]} songsFromDisplay={songs} />);
        await screen.findByRole("audio");

        const controls = screen.getByRole("region", { name: /PlayerControls/i });
        const buttons = within(controls).getAllByRole("button");
        const nextBtn = buttons[2];

        fireEvent.click(nextBtn);
        await waitFor(() =>
            expect(screen.getByText("Second Song - Artist2")).toBeInTheDocument()
        );

        fireEvent.click(nextBtn);
        await waitFor(() =>
            expect(screen.getByText("First Song - Artist1")).toBeInTheDocument()
        );
    });



    it("goes to previous song and wraps backwards", async () => {
        render(<SongPlayer song={songs[0]} songsFromDisplay={songs} />);
        const controls = screen.getByRole("region", { name: /PlayerControls/i });
        const buttons = within(controls).getAllByRole("button");
        const prevBtn = buttons[0];

        fireEvent.click(prevBtn);
        await waitFor(() =>
            expect(screen.getByText("Second Song - Artist2")).toBeInTheDocument()
        );

        fireEvent.click(prevBtn);
        await waitFor(() =>
            expect(screen.getByText("First Song - Artist1")).toBeInTheDocument()
        );
    });

    it("updates the timer when changing audio bar manually", async () => {
        render(<SongPlayer song={songs[0]} songsFromDisplay={songs} />);
        const audioEl = screen.getByRole("audio") as HTMLAudioElement;
        const slider = screen.getByRole("slider") as HTMLInputElement;

        vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(10);

        fireEvent.loadedMetadata(audioEl);
        fireEvent.change(slider, { target: { value: "7" } });

        expect(screen.getByText(/7\s*\/\s*10\s*sec/)).toBeInTheDocument();
    });
});
