import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {createBrowserRouter, RouterProvider, Navigate} from 'react-router-dom'
import HomePage from "./modules/home/pages/HomePage.tsx";
import LoginPage from "./modules/auth/pages/LoginPage.tsx";
import RegisterPage from "./modules/auth/pages/RegisterPage.tsx";
import NotFoundPage from "./modules/helpers/pages/NotFoundPage.tsx";
import {AuthProvider, useAuth} from "./modules/auth/AuthContext.tsx";
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/" replace /> : children;
};


const router = createBrowserRouter([{
        path: '/',
        element: <ProtectedRoute><HomePage/></ProtectedRoute>,
        errorElement: <NotFoundPage/>,
    },
    {
        path: '/login',
        element: <PublicRoute><LoginPage/></PublicRoute>,
        errorElement: <NotFoundPage/>,
    },
    {
        path: '/register',
        element: <PublicRoute><RegisterPage/></PublicRoute>,
    }
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    </StrictMode>
);