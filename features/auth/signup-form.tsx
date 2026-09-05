"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type SignupInput = z.infer<typeof signupSchema>;
type VerifyInput = z.infer<typeof verifySchema>;

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<"SIGNUP" | "VERIFY">("SIGNUP");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const verifyForm = useForm<VerifyInput>({
    resolver: zodResolver(verifySchema),
  });

  const onSignupSubmit = async (data: SignupInput) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to create account");
        return;
      }

      setEmail(data.email);
      setStep("VERIFY");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const onVerifySubmit = async (data: VerifyInput) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: data.otp }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to verify OTP");
        return;
      }

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
          <span>P</span> paycore
        </div>
        <div className="login-intro">
          <h1>{step === "SIGNUP" ? "Create an account" : "Verify your email"}</h1>
          <p>
            {step === "SIGNUP"
              ? "Join PayCore and experience payroll, in sync."
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {step === "SIGNUP" && (
          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)}>
            <div className="flex gap-4">
              <label className="flex-1">
                First name
                <input
                  type="text"
                  {...signupForm.register("firstName")}
                  className={signupForm.formState.errors.firstName ? "border-red-500" : ""}
                />
                {signupForm.formState.errors.firstName && (
                  <span className="text-red-500 text-xs block mt-1">{signupForm.formState.errors.firstName.message}</span>
                )}
              </label>
              <label className="flex-1">
                Last name
                <input
                  type="text"
                  {...signupForm.register("lastName")}
                  className={signupForm.formState.errors.lastName ? "border-red-500" : ""}
                />
                {signupForm.formState.errors.lastName && (
                  <span className="text-red-500 text-xs block mt-1">{signupForm.formState.errors.lastName.message}</span>
                )}
              </label>
            </div>

            <label>
              Work email
              <input
                type="email"
                {...signupForm.register("email")}
                className={signupForm.formState.errors.email ? "border-red-500" : ""}
              />
              {signupForm.formState.errors.email && (
                <span className="text-red-500 text-xs block mt-1">{signupForm.formState.errors.email.message}</span>
              )}
            </label>

            <label>
              Password
              <input
                type="password"
                {...signupForm.register("password")}
                className={signupForm.formState.errors.password ? "border-red-500" : ""}
              />
              {signupForm.formState.errors.password && (
                <span className="text-red-500 text-xs block mt-1">{signupForm.formState.errors.password.message}</span>
              )}
            </label>

            {error && (
              <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary wide mt-2"
              disabled={signupForm.formState.isSubmitting}
            >
              {signupForm.formState.isSubmitting ? "Sending OTP..." : "Send Verification Code"}{" "}
              {!signupForm.formState.isSubmitting && <ArrowUpRight size={17} />}
            </button>
          </form>
        )}

        {step === "VERIFY" && (
          <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)}>
            <label>
              6-Digit Verification Code
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                {...verifyForm.register("otp")}
                className={verifyForm.formState.errors.otp ? "border-red-500 tracking-widest text-center" : "tracking-widest text-center"}
              />
              {verifyForm.formState.errors.otp && (
                <span className="text-red-500 text-xs block mt-1 text-center">{verifyForm.formState.errors.otp.message}</span>
              )}
            </label>

            {error && (
              <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary wide mt-2"
              disabled={verifyForm.formState.isSubmitting}
            >
              {verifyForm.formState.isSubmitting ? "Verifying..." : "Verify & Join"}{" "}
              {!verifyForm.formState.isSubmitting && <ArrowUpRight size={17} />}
            </button>

            <button
              type="button"
              className="portal-link mt-4"
              onClick={() => {
                setStep("SIGNUP");
                setError(null);
              }}
            >
              Go back
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-stone-200 text-center">
          <p className="text-sm text-stone-600">
            Already have an account? <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in here</Link>
          </p>
        </div>
      </section>

      <div className="login-copy">
        <span className="eyebrow">PAYCORE / 2026</span>
        <h2>
          Clear operations.<br />
          Confident decisions.
        </h2>
        <p>One connected record from onboarding to payslip.</p>
      </div>
    </main>
  );
}
