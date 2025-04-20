import { useEffect, useRef } from "react";
import Cookies from "js-cookie";

let activityLog: { type: string; timestamp: string; songId?: string }[] = [];

const useActivityTracker = () => {
    const intervalRef = useRef<number | null>(null);

    const logCustomActivity = (type: string, songId?: string) => {
        const timestamp = new Date().toISOString();
        activityLog.push({ type, timestamp, songId });
        console.log("Logged activity:", type, songId, timestamp);
    };

    const sendActivityToBackend = async () => {
        if (activityLog.length === 0) {
            console.log("No new logs to send.");
            return;
        }

        try {
            const userCookie = Cookies.get("user");
            const token = Cookies.get("access_token");

            if (!userCookie || !token) {
                console.warn("User data missing. Activity logs not sent.");
                return;
            }

            let user;
            try {
                user = JSON.parse(userCookie);
            } catch (e) {
                console.error("Error parsing user cookie", e);
                return;
            }
            const userId = user.id;

            console.log("Sending logs to backend:", activityLog);

            const response = await fetch("http://localhost:8000/api/recommender/useractivity/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ user_id: userId, activity_logs: activityLog }),
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to send activity logs. Response:", errorText);
            } else {
                console.log("Activity logs sent successfully.");
                activityLog = [];
            }
        } catch (error) {
            console.error("Error sending activity logs:", error);
        }
    };

    useEffect(() => {
        console.log("Activity tracking started.");

        intervalRef.current = setInterval(() => {
            sendActivityToBackend();
        }, 10000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                console.log("Activity tracker interval cleared.");
            }
        };
    }, []);

    return { logCustomActivity };
};

export default useActivityTracker;
