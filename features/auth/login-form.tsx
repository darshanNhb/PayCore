"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [isEmployee, setIsEmployee] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: isEmployee ? "aarav.mehta@paycore.in" : "darshan@paycore.in",
      password: "password",
    },
  });

  const handleToggle = () => {
    const next = !isEmployee;
    setIsEmployee(next);
    setValue("email", next ? "aarav.mehta@paycore.in" : "darshan@paycore.in");
    setValue("password", "password");
  };

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
        setError(body.error || "Failed to login");
        return;
      }

      // Hard redirect based on user role from server
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
          <h1>{isEmployee ? "Welcome back" : "Payroll, in sync."}</h1>
          <p>
            {isEmployee
              ? "Sign in to your personal workspace."
              : "The calm operating system for people and pay."}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <label>
            Work email
            <input
              type="email"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <span className="text-red-500 text-xs block mt-1">{errors.email.message}</span>
            )}
          </label>

          <label>
            Password <a>Forgot password?</a>
            <input
              type="password"
              {...register("password")}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <span className="text-red-500 text-xs block mt-1">{errors.password.message}</span>
            )}
          </label>

          {error && (
            <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary wide"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}{" "}
            {!isSubmitting && <ArrowUpRight size={17} />}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-stone-200">
          <p className="text-xs text-stone-500 mb-2 font-medium">Quick Demo Accounts:</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Admin", email: "darshan@paycore.in", emp: false },
              { label: "HR Payroll Mgr", email: "priya.payroll@paycore.in", emp: false },
              { label: "HR Payroll User", email: "rohit.payroll@paycore.in", emp: false },
              { label: "HR Manager", email: "sneha.hr@paycore.in", emp: false },
              { label: "Employee", email: "aarav.mehta@paycore.in", emp: true },
            ].map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setIsEmployee(d.emp);
                  setValue("email", d.email);
                  setValue("password", "password");
                }}
                className="text-[11px] px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="portal-link"
          onClick={handleToggle}
        >
          {isEmployee
            ? "Back to organisation sign in"
            : "Employee? Access your portal here"}
        </button>

        <div className="mt-6 pt-4 border-t border-stone-200 text-center">
          <p className="text-sm text-stone-600">
            Don't have an account? <Link href="/signup" className="text-indigo-600 font-medium hover:underline">Sign up here</Link>
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
