import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import AuthForm from "./AuthForm";


const mockLogin = vi.fn();
vi.mock("../AuthContext.tsx", () => ({
    __esModule: true,
    useAuth: () => ({ login: mockLogin }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = (await vi.importActual<any>("react-router-dom"));
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    };
});

describe("AuthForm component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("renders login fields and toggles to register link", () => {
        render(<AuthForm mode="login" />);

        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();

        expect(screen.queryByPlaceholderText("Confirm Password")).toBeNull();

        expect(screen.getByText(/Don't have an account\? Sign up!/)).toBeInTheDocument();
    });

    it("shows validation errors on empty submit (login)", async () => {
        render(<AuthForm mode="login" />);
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

        expect(await screen.findByText("Username is required")).toBeInTheDocument();
        expect(await screen.findByText("Password must be at least 6 characters")).toBeInTheDocument();
    });

    it("submits login and calls context.login and navigate", async () => {
        const fakeResponse = {
            access: "atoken",
            refresh: "rtoken",
            user: { id: 1, username: "u" },
        };
        (fetch as vi.Mock).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(fakeResponse),
        });

        render(<AuthForm mode="login" />);
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "u" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
        fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:8000/api/users/login",
                expect.objectContaining({ method: "POST" })
            );
        });
        expect(mockLogin).toHaveBeenCalledWith("atoken", "rtoken", fakeResponse.user);
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("renders register fields (including confirmPassword)", () => {
        render(<AuthForm mode="register" />);
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Confirm Password")).toBeInTheDocument();

        expect(screen.queryByText(/Don't have an account\?/)).toBeNull();
    });

    it("shows validation errors on mismatched passwords (register)", async () => {
        render(<AuthForm mode="register" />);
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "u" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "secret1" } });
        fireEvent.click(screen.getByRole("button", { name: /Sign Up/i }));

        await waitFor(() => {
            expect(screen.getByText(/Passwords must match/i)).toBeInTheDocument();
        });
    });

    it("submits registration and calls context.login and navigate", async () => {
        const fakeResp = { access: "a", refresh: "r", user: { id: 2, username: "new" } };
        (fetch as vi.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fakeResp) });

        render(<AuthForm mode="register" />);
        fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "new" } });
        fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
        fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "secret" } });
        fireEvent.click(screen.getByRole("button", { name: /Sign Up/i }));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith(
            "http://localhost:8000/api/users/register",
            expect.objectContaining({ method: "POST" })
        ));
        expect(mockLogin).toHaveBeenCalledWith("a", "r", fakeResp.user);
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });
});
