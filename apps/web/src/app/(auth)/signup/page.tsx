"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const { signUp, error, loading } = useAuth();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const ok = await signUp(email, password);
    if (ok) setSuccess(true);
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Check your email
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          We sent a confirmation link to <strong>{email}</strong>. Click the
          link to activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <AuthForm
      title="Qurl"
      subtitle="Create your account"
      error={error}
      loading={loading}
      submitLabel="Create account"
      loadingLabel="Creating account..."
      onSubmit={handleSignup}
      footer={
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Min. 6 characters"
        />
      </div>
    </AuthForm>
  );
}
