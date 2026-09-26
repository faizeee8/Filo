"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SIGNUP_ROLES, type SignupRole } from "@/lib/validations/auth";

const DASHBOARD_BY_ROLE: Record<SignupRole, string> = {
  CREATOR: "/creator",
  BRAND: "/brand",
};

function RoleToggle({
  role,
  onChange,
}: {
  role: SignupRole;
  onChange: (role: SignupRole) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md bg-secondary p-1">
      {SIGNUP_ROLES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            role === r
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r === "CREATOR" ? "I'm a creator" : "I'm a brand"}
        </button>
      ))}
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role");

  const [role, setRole] = useState<SignupRole>(
    initialRole === "BRAND" ? "BRAND" : "CREATOR"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        companyName: role === "BRAND" ? companyName : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsSubmitting(false);
      if (data.issues) {
        setFieldErrors(data.issues);
      } else {
        setFormError(data.error ?? "Something went wrong. Please try again.");
      }
      return;
    }

    // Account created — sign them in immediately so they land in their
    // dashboard without a second manual login step.
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!signInResult || signInResult.error) {
      // Extremely unlikely (account was just created with this password),
      // but fail gracefully into the login page rather than a dead end.
      router.push("/login");
      return;
    }

    router.push(DASHBOARD_BY_ROLE[role]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Join Filo as a creator or a brand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <RoleToggle role={role} onChange={setRole} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {role === "BRAND" ? "Your name" : "Full name"}
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          {role === "BRAND" && (
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              {fieldErrors.companyName && (
                <p className="text-sm text-destructive">
                  {fieldErrors.companyName[0]}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase letter, a lowercase
                letter and a number.
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
