import { SignupForm } from "@/features/auth/signup-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up | PayCore",
};

export default function SignupPage() {
  return <SignupForm />;
}
