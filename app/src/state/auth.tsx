import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "./toast";
import type { User } from "../types";

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = "tcg-auth-session";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

interface StoredSession {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isReady: boolean;
  isSigningIn: boolean;
  isGoogleConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { showToast } = useToast();

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const isGoogleConfigured = !!(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        try {
          setSession(JSON.parse(stored));
        } catch {
          // ignore corrupt storage
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (!response) return;
    if (response.type === "success" && response.params.id_token) {
      exchangeToken(response.params.id_token);
    } else {
      setIsSigningIn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function exchangeToken(idToken: string) {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error(`Sign-in failed with ${res.status}`);
      const data: StoredSession = await res.json();
      setSession(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      showToast(`Signed in as ${data.user.name}`, "success");
    } catch (err) {
      console.error("[auth] Google sign-in failed:", err);
      showToast("Sign-in failed — try again", "error");
    } finally {
      setIsSigningIn(false);
    }
  }

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    try {
      await promptAsync();
    } catch (err) {
      console.error("[auth] Failed to open Google sign-in:", err);
      showToast("Couldn't open Google sign-in — try again", "error");
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    setSession(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    showToast("Signed out", "info");
  };

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isReady,
      isSigningIn,
      isGoogleConfigured,
      signInWithGoogle,
      signOut,
      setUser: (user) =>
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, user };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [session, isReady, isSigningIn, isGoogleConfigured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
