"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle2 } from "lucide-react";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your work email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        return;
      }
      // OTP is valid — move to step 3
      setStep("password");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        if (data.error?.includes("expired") || data.error?.includes("Invalid")) {
          setStep("otp"); // Go back to OTP step
        }
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login-glow one" />
      <div className="login-glow two" />

      <section className="login-card" style={{ maxWidth: "440px" }}>
        <div className="login-logo">
          <span>P</span> HR Portal
        </div>

        {/* Step indicators */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            margin: "16px 0 24px",
          }}
        >
          {["email", "otp", "password"].map((s, i) => (
            <div
              key={s}
              style={{
                width: "40px",
                height: "4px",
                borderRadius: "2px",
                background:
                  step === "done" || i <= ["email", "otp", "password"].indexOf(step)
                    ? "#6366f1"
                    : "#e2e8f0",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Step 1: Enter Email */}
        {step === "email" && (
          <>
            <div className="login-intro">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Mail size={22} style={{ color: "#6366f1" }} />
              </div>
              <h1>Reset Password</h1>
              <p>Enter your work email and we'll send you a verification code.</p>
            </div>

            {error && (
              <div style={errorStyle}>{error}</div>
            )}

            <form onSubmit={handleSendOtp}>
              <label>
                Work Email
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>

              <button
                type="submit"
                className="primary wide"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> Sending code…</>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>

            <Link href="/login" style={backLinkStyle}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === "otp" && (
          <>
            <div className="login-intro">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <KeyRound size={22} style={{ color: "#6366f1" }} />
              </div>
              <h1>Verify Code</h1>
              <p>
                We sent a 6-digit code to{" "}
                <strong style={{ color: "#1e293b" }}>{email}</strong>
              </p>
            </div>

            {error && (
              <div style={errorStyle}>{error}</div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <label>
                Verification Code
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(v);
                  }}
                  maxLength={6}
                  autoFocus
                  style={{
                    textAlign: "center",
                    letterSpacing: "8px",
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                />
              </label>

              <button
                type="submit"
                className="primary wide"
                disabled={otp.length !== 6 || loading}
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> Verifying…</>
                ) : (
                  "Verify Code"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
              style={{ ...backLinkStyle, background: "none", border: "none", cursor: "pointer" }}
            >
              <ArrowLeft size={14} /> Use a different email
            </button>
          </>
        )}

        {/* Step 3: New Password */}
        {step === "password" && (
          <>
            <div className="login-intro">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <KeyRound size={22} style={{ color: "#6366f1" }} />
              </div>
              <h1>New Password</h1>
              <p>Choose a strong password for your account.</p>
            </div>

            {error && (
              <div style={errorStyle}>{error}</div>
            )}

            <form onSubmit={handleResetPassword}>
              <label>
                New Password
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="primary wide"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> Resetting…</>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          </>
        )}

        {/* Step 4: Success */}
        {step === "done" && (
          <>
            <div className="login-intro" style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={28} style={{ color: "#059669" }} />
              </div>
              <h1>Password Updated!</h1>
              <p>Your password has been reset successfully. You can now sign in with your new password.</p>
            </div>

            <Link
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                background: "#4f46e5",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                marginTop: "8px",
              }}
            >
              Sign In
            </Link>
          </>
        )}
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

const errorStyle: React.CSSProperties = {
  background: "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  color: "#dc2626",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "13px",
  marginBottom: "8px",
  fontWeight: 500,
};

const backLinkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  color: "#6366f1",
  fontSize: "13px",
  fontWeight: 500,
  textDecoration: "none",
  marginTop: "16px",
};
