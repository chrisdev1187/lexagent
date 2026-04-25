"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { setAuthToken } from "./api";
import { log } from "./logger";

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "rate_limited"
  | "network_unreachable"
  | "supabase_misconfigured"
  | "unknown";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: "member" | "admin" | "owner";
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function classifyError(err: unknown): AuthError {
  if (!err) return { code: "unknown", message: "Unknown error" };

  const msg = (err as { message?: string }).message ?? String(err);
  const status = (err as { status?: number }).status;

  if (
    err instanceof TypeError ||
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("network request failed")
  ) {
    return { code: "network_unreachable", message: msg };
  }

  if (status === 429 || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many")) {
    return { code: "rate_limited", message: msg };
  }

  if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("email_not_confirmed")) {
    return { code: "email_not_confirmed", message: msg };
  }

  if (
    msg.toLowerCase().includes("invalid login credentials") ||
    msg.toLowerCase().includes("invalid email or password") ||
    msg.toLowerCase().includes("user not found") ||
    msg.toLowerCase().includes("wrong password")
  ) {
    return { code: "invalid_credentials", message: msg };
  }

  if (msg.toLowerCase().includes("url") && msg.toLowerCase().includes("required")) {
    return { code: "supabase_misconfigured", message: msg };
  }

  return { code: "unknown", message: msg };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<"member" | "admin" | "owner">("member");

  const fetchRole = async (uid: string | undefined) => {
    if (!uid) { setIsAdmin(false); setUserRole("member"); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).single();
    const role = (data?.role ?? "member") as "member" | "admin" | "owner";
    setIsAdmin(role === "admin");
    setUserRole(role);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      log.info("auth", "getSession", { hasSession: !!data.session, userId: data.session?.user?.id, error: error?.message });
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthToken(data.session?.access_token ?? null);
      fetchRole(data.session?.user?.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        log.info("auth", `onAuthStateChange: ${event}`, { hasSession: !!newSession, userId: newSession?.user?.id, expiresAt: newSession?.expires_at });
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setAuthToken(newSession?.access_token ?? null);
        fetchRole(newSession?.user?.id);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    log.info("auth", "signInWithEmail attempt", { email });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        log.error("auth", "signInWithEmail failed", { message: error.message, code: (error as {code?: string}).code, status: (error as {status?: number}).status });
      } else {
        log.info("auth", "signInWithEmail OK", { hasSession: !!data.session, userId: data.session?.user?.id, expiresAt: data.session?.expires_at });
      }
      return { error: error ? classifyError(error) : null };
    } catch (err) {
      log.error("auth", "signInWithEmail threw", { err: String(err) });
      return { error: classifyError(err) };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    log.info("auth", "signUpWithEmail attempt", { email });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) log.error("auth", "signUpWithEmail failed", { message: error.message });
      else log.info("auth", "signUpWithEmail OK", { userId: data.user?.id, confirmed: data.user?.confirmed_at });
      return { error: error ? classifyError(error) : null };
    } catch (err) {
      log.error("auth", "signUpWithEmail threw", { err: String(err) });
      return { error: classifyError(err) };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" },
      });
      return { error: error ? classifyError(error) : null };
    } catch (err) {
      return { error: classifyError(err) };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      return { error: error ? classifyError(error) : null };
    } catch (err) {
      return { error: classifyError(err) };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "",
      });
      return { error: error ? classifyError(error) : null };
    } catch (err) {
      return { error: classifyError(err) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        userRole,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resendConfirmation,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
