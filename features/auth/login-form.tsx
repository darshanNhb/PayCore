"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();
      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      // Route based on role
      if (body.role === "EMPLOYEE") {
        window.location.href = "/portal";
      } else {
        window.location.href = "/overview";
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <main className="login">
      <div className="login-glow one" />
      <div className="login-glow two" />

      <section className="login-card">
        <div className="login-logo">
          <span>P</span> HR Portal
        </div>

        <div className="login-intro">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your workspace.</p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <label>
            Work Email
            <input
              type="email"
              placeholder="name@company.com"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <span className="text-red-500 text-xs block mt-1">
                {errors.email.message}
              </span>
            )}
          </label>

          <label>
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              Password
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "12px",
                  color: "#6366f1",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Forgot password?
              </Link>
            </span>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#a1a1aa",
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className="text-red-500 text-xs block mt-1">
                {errors.password.message}
              </span>
            )}
          </label>

          <button
            type="submit"
            className="primary wide"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#a1a1aa",
            fontSize: "12px",
            marginTop: "16px",
          }}
        >
          Accounts are created by an administrator.
        </p>

      </section>

      <div className="login-copy">
        <span className="eyebrow">PAYCORE / 2026</span>
        <h2>
          Clear operations.
          <br />
          Confident decisions.
        </h2>
        <p>One connected record from onboarding to payslip.</p>
      </div>
    </main>
  );
}
