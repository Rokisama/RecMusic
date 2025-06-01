import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Toolbar from "./Toolbar";
import { searchSongs } from "../../SongApis.tsx";

const mockLogout = vi.fn();
const mockUser = { username: "testuser" };
vi.mock("../../../auth/AuthContext.tsx", () => ({
    __esModule: true,
    useAuth: () => ({ logout: mockLogout, user: mockUser }),
}));
vi.mock("../../SongApis.tsx", () => ({
    __esModule: true,
    searchSongs: vi.fn(),
}));

describe("Toolbar component", () => {
    const mockSetDisplayName = vi.fn();
    const mockSetDisplayData = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders search input, username, and logout button", () => {
        const { container } = render(
            <Toolbar
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
            />
        );

        expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
        expect(screen.getByText("testuser")).toBeInTheDocument();
        expect(screen.getByText("Logout")).toBeInTheDocument();
        expect(container.querySelector(".SearchBtn")).toBeInTheDocument();
    });

    it("calls logout when logout button clicked", () => {
        render(
            <Toolbar
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
            />
        );

        fireEvent.click(screen.getByText("Logout"));
        expect(mockLogout).toHaveBeenCalled();
    });

    it("performs search and returns results on success", async () => {
        const fakeResults = [
            { id: 1, track_id: "t1", name: "Song1", artist: "A", spotify_id: "s1", spotify_preview_url: "" },
        ];
        (searchSongs as vi.Mock).mockResolvedValue(fakeResults);

        const { container } = render(
            <Toolbar
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "foo" } });

        const searchBtn = container.querySelector(".SearchBtn")!;
        fireEvent.click(searchBtn);

        expect(screen.getByText("Loading...")).toBeInTheDocument();

        await waitFor(() => {
            expect(searchSongs).toHaveBeenCalledWith("foo");
        });

        expect(mockSetDisplayName).toHaveBeenCalledWith("Search results");
        expect(mockSetDisplayData).toHaveBeenCalledWith(fakeResults);

        await waitFor(() => {
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });
    });

    it("shows error message on search failure", async () => {
        (searchSongs as vi.Mock).mockRejectedValue(new Error("fail search"));

        const { container } = render(
            <Toolbar
                setDisplayName={mockSetDisplayName}
                setDisplayData={mockSetDisplayData}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "bar" } });
        const searchBtn = container.querySelector(".SearchBtn")!;
        fireEvent.click(searchBtn);

        await waitFor(() => {
            expect(screen.getByText("fail search")).toBeInTheDocument();
        });
    });
});
