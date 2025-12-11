"use client";
import React, { useState } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Container from "@/components/Container";
import AddEventForm from "@/components/AddEventForm";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

export default function AdminPanel() {
    const { isAdmin, checking } = useIsAdmin();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            console.error(err);
            setLoginError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            alert("Logged out successfully.");
        } catch (err: any) {
            console.error(err);
            alert("Logout failed: " + err.message);
        }
    };

    if (checking) return <Container>Checking admin status…</Container>;

    if (!isAdmin)
        return (
            <section className="py-10">
                <Container>
                    <h2 className="text-xl font-semibold mb-4">Admin Login</h2>

                    <form
                        onSubmit={handleLogin}
                        className="bg-gray-800 p-6 rounded border border-gray-700 space-y-4 max-w-sm"
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Admin Email"
                            className="p-3 w-full rounded bg-gray-700 border border-gray-600 text-gray-200"
                            required
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="p-3 w-full rounded bg-gray-700 border border-gray-600 text-gray-200"
                            required
                        />

                        {loginError && (
                            <p className="text-red-400 text-sm">{loginError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded w-full"
                        >
                            {loading ? "Logging in…" : "Login"}
                        </button>
                    </form>
                </Container>
            </section>
        );

    // If logged in but not admin → show restricted message
    if (!isAdmin)
        return (
            <Container className="text-sm text-gray-400 py-10">
                Admin access required.
                <button
                    onClick={handleLogout}
                    className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                >
                    Logout
                </button>
            </Container>
        );

    // Admin view
    return (
        <section className="py-10">
            <Container>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold py-4">Admin Panel</h2>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                        Logout
                    </button>
                </div>

                <div className="flex flex-col gap-5">
                    <AddEventForm />
                </div>
            </Container>
        </section>
    );
}
