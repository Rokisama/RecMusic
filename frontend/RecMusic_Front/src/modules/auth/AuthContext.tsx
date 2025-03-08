import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";

interface User {
    id: number;
    username: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (accessToken: string, refreshToken: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const token = Cookies.get("access_token");
        const userCookie = Cookies.get("user");

        try {
            const storedUser = userCookie ? JSON.parse(userCookie) : null;

            if (token && storedUser) {
                setIsAuthenticated(true);
                setUser(storedUser);
            }
        } catch (error) {
            console.error("Error parsing user cookie:", error);
            Cookies.remove("user"); // Remove invalid cookie to prevent future issues
        }
    }, []);

    const login = (accessToken: string, refreshToken: string, user: User) => {
        Cookies.set("access_token", accessToken, { secure: true, sameSite: "Strict" });
        Cookies.set("refresh_token", refreshToken, { secure: true, sameSite: "Strict" });
        Cookies.set("user", JSON.stringify(user), { secure: true, sameSite: "Strict" });

        setIsAuthenticated(true);
        setUser(user);
    };

    const logout = () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("user");

        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
