import { useEffect } from "react";
import Cookies from "js-cookie";

let activityLog: { type: string; timestamp: string; songId?: string }[] = [];
let intervalRunning = false;

const useActivityTracker = () => {
    const logCustomActivity = (type: string, songId?: string) => {
        activityLog.push({ type, timestamp: new Date().toISOString(), songId });
        console.log("Logged activity:", type, songId);
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

            const user = JSON.parse(userCookie);
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
        if (!intervalRunning) {
            console.log("Activity tracking started.");
            intervalRunning = true;

            setInterval(() => {
                sendActivityToBackend();
            }, 10000);
        }

        return () => {
            console.log("Activity tracker is still running in the background.");
        };
    }, []);

    return { logCustomActivity };
};

export default useActivityTracker;
