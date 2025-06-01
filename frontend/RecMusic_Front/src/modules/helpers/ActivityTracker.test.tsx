import React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Cookies from "js-cookie";
import useActivityTracker from "./ActivityTracker";
vi.mock("js-cookie", () => ({
    __esModule: true,
    default: { get: vi.fn() },
}));

describe("useActivityTracker hook", () => {
    let logCustomActivity: (type: string, songId?: string) => void;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("queues activities and sends them when cookies present", async () => {
        (Cookies.get as vi.Mock)
            .mockImplementation((key: string) => {
                if (key === "user") return JSON.stringify({ id: 123 });
                if (key === "access_token") return "tok";
            });

        const HookConsumer = () => {
            const { logCustomActivity: logFn } = useActivityTracker();
            logCustomActivity = logFn;
            return null;
        };
        render(<HookConsumer />);

        act(() => {
            logCustomActivity("play", "s1");
            logCustomActivity("like", "s2");
        });

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, opts] = (fetch as vi.Mock).mock.calls[0];
        expect(url).toBe("http://localhost:8000/api/recommender/useractivity/");
        expect(opts.method).toBe("POST");
        const body = JSON.parse(opts.body);
        expect(body.user_id).toBe(123);
        expect(body.activity_logs).toHaveLength(2);
    });

    it("does not send logs if none queued", async () => {
        (Cookies.get as vi.Mock).mockReturnValue("tok");
        render(() => {
            useActivityTracker();
            return null;
        });

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(fetch).not.toHaveBeenCalled();
    });

    it("does not send logs if cookies missing", async () => {
        (Cookies.get as vi.Mock).mockReturnValue(undefined);
        render(() => {
            const { logCustomActivity } = useActivityTracker();
            logCustomActivity("skip", "s3");
            return null;
        });

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(fetch).not.toHaveBeenCalled();
    });

    it("does not send logs when user cookie is malformed", async () => {
        (Cookies.get as vi.Mock)
            .mockImplementation((key: string) => {
                if (key === "user") return "not-json";
                if (key === "access_token") return "tok";
            });
        render(() => {
            useActivityTracker();
            return null;
        });

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("handles non-OK response without clearing logs", async () => {
        (Cookies.get as vi.Mock)
            .mockImplementation((key: string) => {
                if (key === "user") return JSON.stringify({ id: 1 });
                if (key === "access_token") return "tok";
            });

        let logFn: any;
        const Consumer = () => { logFn = useActivityTracker().logCustomActivity; return null; };
        render(<Consumer />);
        act(() => logFn("test", "s1"));

        (fetch as vi.Mock).mockResolvedValue({ ok: false, text: () => Promise.resolve("error") });
        await act(async () => {
            vi.advanceTimersByTime(10000);
        });
        expect(fetch).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("catches fetch errors without throwing", async () => {
        (Cookies.get as vi.Mock)
            .mockImplementation((key: string) => {
                if (key === "user") return JSON.stringify({ id: 1 });
                if (key === "access_token") return "tok";
                return undefined;
            });

        let logFn: (type: string, songId?: string) => void;
        const Consumer = () => {
            const { logCustomActivity } = useActivityTracker();
            logFn = logCustomActivity;
            return null;
        };
        render(<Consumer />);

        act(() => logFn!("test", "s2"));

        (fetch as vi.Mock).mockRejectedValue(new Error("neterror"));

        await act(async () => {
            vi.advanceTimersByTime(10000);
        });

        expect(fetch).toHaveBeenCalled();
    });

});
