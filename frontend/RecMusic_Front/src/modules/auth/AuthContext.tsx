import {createContext, useContext, useEffect, useState} from "react";
import Cookies from "js-cookie";

interface AuthContextType {
    isAuthenticated: boolean;
    login: (accessToken: string, refreshToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null >(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const token = Cookies.get("access_token");
        setIsAuthenticated(!!token);
    }, []);

    const login = (accessToken: string, refreshToken: string) => {
        Cookies.set("access_token", accessToken, { secure: true, sameSite: "Strict" });
        Cookies.set("refresh_token", refreshToken, { secure: true, sameSite: "Strict" });
        setIsAuthenticated(true);
    };

    const logout = () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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