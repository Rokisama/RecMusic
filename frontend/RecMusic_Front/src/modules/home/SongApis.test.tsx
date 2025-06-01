import { vi } from "vitest";


vi.mock("js-cookie", () => ({
    __esModule: true,
    default: { get: vi.fn() },
}));

import {
    likeSong,
    unlikeSong,
    searchSongs,
    getLikedSongs,
    getPlaylists,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getPlaylist,
    getRecommendedSongs,
} from "./SongApis";
import Cookies from "js-cookie";

describe("SongApis", () => {
    const fakeJson = { foo: "bar" };
    const fakeArray = [1, 2, 3];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe("all protected endpoints must require an authentication token", () => {
        beforeEach(() => {
            (Cookies.get as vi.Mock).mockReturnValue(undefined);
        });

        it.each([
            ["likeSong", () => likeSong("x")],
            ["unlikeSong", () => unlikeSong("x")],
            ["searchSongs", () => searchSongs("q")],
            ["getLikedSongs", () => getLikedSongs()],
            ["getPlaylists", () => getPlaylists()],
            ["createPlaylist", () => createPlaylist("n")],
            ["deletePlaylist", () => deletePlaylist("id")],
            ["getPlaylist", () => getPlaylist("id")],
            ["getRecommendedSongs", () => getRecommendedSongs()],
        ])("%s throws if no token", async (_name, fn) => {
            await expect(fn()).rejects.toThrow("User is not authenticated");
        });
    });

    describe("when token is present", () => {
        beforeEach(() => {
            (Cookies.get as vi.Mock).mockReturnValue("token123");
        });

        it("likeSong posts and parses JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeJson) });
            await expect(likeSong("track1")).resolves.toEqual(fakeJson);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/like/track1/",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({ Authorization: "Bearer token123" }),
                })
            );
        });

        it("unlikeSong deletes and parses JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeJson) });
            await expect(unlikeSong("track2")).resolves.toEqual(fakeJson);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/unlike/track2/",
                expect.objectContaining({ method: "DELETE" })
            );
        });

        describe("searchSongs", () => {
            it("throws on empty query", async () => {
                await expect(searchSongs("   ")).rejects.toThrow("Please enter a song or artist name.");
            });

            it("fetches and returns JSON on success", async () => {
                (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeArray) });
                await expect(searchSongs("beatles")).resolves.toEqual(fakeArray);
            });

            it("throws on bad response", async () => {
                (fetch as vi.Mock).mockResolvedValue({ ok: false });
                await expect(searchSongs("x")).rejects.toThrow("Error fetching songs. Try again.");
            });

            it("catches network errors", async () => {
                (fetch as vi.Mock).mockRejectedValue(new Error("network"));
                await expect(searchSongs("y")).rejects.toThrow("Error fetching songs. Try again.");
            });
        });

        it("getLikedSongs returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeArray) });
            await expect(getLikedSongs()).resolves.toEqual(fakeArray);
        });

        it("getPlaylists returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeArray) });
            await expect(getPlaylists()).resolves.toEqual(fakeArray);
        });

        it("createPlaylist posts name and returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "p1" }) });
            await expect(createPlaylist("New")).resolves.toEqual({ id: "p1" });
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/playlists/",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ name: "New" }),
                })
            );
        });

        it("deletePlaylist sends delete and returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
            await expect(deletePlaylist("p1")).resolves.toEqual({ success: true });
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/playlists/p1/delete/",
                expect.objectContaining({ method: "DELETE" })
            );
        });

        it("addSongToPlaylist posts and returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeJson) });
            await expect(addSongToPlaylist("p1", "t1")).resolves.toEqual(fakeJson);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/playlists/p1/add/t1/",
                expect.objectContaining({ method: "POST" })
            );
        });

        it("removeSongFromPlaylist deletes and returns JSON", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeJson) });
            await expect(removeSongFromPlaylist("p2", "t2")).resolves.toEqual(fakeJson);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/playlists/p2/remove/t2/",
                expect.objectContaining({ method: "DELETE" })
            );
        });

        it("getPlaylist fetches single playlist", async () => {
            const playlist = { songs: ["a", "b"] };
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(playlist) });
            await expect(getPlaylist("p3")).resolves.toEqual(playlist);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/songs/playlists/p3/",
                expect.objectContaining({ method: "GET" })
            );
        });

        it("getRecommendedSongs fetches recommendations", async () => {
            (fetch as vi.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeArray) });
            await expect(getRecommendedSongs()).resolves.toEqual(fakeArray);
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/recommender/recommend/",
                expect.objectContaining({ method: "GET" })
            );
        });
    });
});
