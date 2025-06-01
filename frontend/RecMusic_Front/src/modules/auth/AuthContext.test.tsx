
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Cookies from 'js-cookie';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('js-cookie', () => ({
    __esModule: true,
    default: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
    },
}));

const DisplayAuth = () => {
    const { isAuthenticated, user, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
            <span data-testid="user">{user ? user.username : 'none'}</span>
            <button onClick={() => login('aToken', 'rToken', { id: 42, username: 'bob' })}>Login</button>
            <button onClick={() => logout()}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws if useAuth used outside provider', () => {
        const Bad = () => {
            useAuth();
            return null;
        };
        expect(() => render(<Bad />)).toThrow('useAuth must be used within an AuthProvider');
    });

    it('initializes from cookies when valid', () => {
        (Cookies.get as vi.Mock)
            .mockImplementation((key: string) => {
                if (key === 'access_token') return 'token';
                if (key === 'user') return JSON.stringify({ id: 5, username: 'alice' });
                return undefined;
            });

        render(
            <AuthProvider>
                <DisplayAuth />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth').textContent).toBe('yes');
        expect(screen.getByTestId('user').textContent).toBe('alice');
    });

    it('login sets cookies and updates state', () => {
        (Cookies.get as vi.Mock).mockReturnValue(undefined);

        render(
            <AuthProvider>
                <DisplayAuth />
            </AuthProvider>
        );

        expect(screen.getByTestId('auth').textContent).toBe('no');
        expect(screen.getByTestId('user').textContent).toBe('none');

        act(() => {
            screen.getByText('Login').click();
        });

        expect(Cookies.set).toHaveBeenCalledWith('access_token', 'aToken', { secure: true, sameSite: 'Strict' });
        expect(Cookies.set).toHaveBeenCalledWith('refresh_token', 'rToken', { secure: true, sameSite: 'Strict' });
        expect(Cookies.set).toHaveBeenCalledWith('user', JSON.stringify({ id: 42, username: 'bob' }), { secure: true, sameSite: 'Strict' });

        expect(screen.getByTestId('auth').textContent).toBe('yes');
        expect(screen.getByTestId('user').textContent).toBe('bob');
    });

    it('logout removes cookies and updates state', () => {
        render(
            <AuthProvider>
                <DisplayAuth />
            </AuthProvider>
        );

        act(() => {
            screen.getByText('Login').click();
        });
        expect(screen.getByTestId('auth').textContent).toBe('yes');

        act(() => {
            screen.getByText('Logout').click();
        });

        expect(Cookies.remove).toHaveBeenCalledWith('access_token');
        expect(Cookies.remove).toHaveBeenCalledWith('refresh_token');
        expect(Cookies.remove).toHaveBeenCalledWith('user');
        expect(screen.getByTestId('auth').textContent).toBe('no');
        expect(screen.getByTestId('user').textContent).toBe('none');
    });
});
