import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_BY_ROLE: Record<string, string> = {
  CREATOR: "/creator",
  BRAND: "/brand",
  ADMIN: "/admin",
};

const WORKFLOW_STEPS = [
  "Brand creates a campaign",
  "Platform surfaces matching creators",
  "Brand shortlists & invites",
  "Creator accepts",
  "Deliverables tracked in a shared workspace",
  "Brand reviews & approves content",
  "Payment status updates",
  "Campaign performance is analyzed",
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect(DASHBOARD_BY_ROLE[session.user.role] ?? "/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <MarketingNavbar />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-medium text-muted-foreground">
            Now onboarding in Hyderabad
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Smarter infrastructure connecting brands with the right creators.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Filo replaces scattered DMs, spreadsheets and guesswork
            with one structured workflow — discovery, explainable matching,
            campaign management, approvals and payment tracking, in one
            place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup?role=BRAND">I&apos;m a brand</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup?role=CREATOR">I&apos;m a creator</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why brands / why creators */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Why brands use Filo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Search and filter creators by niche, location, followers, engagement and budget together — not one at a time.</p>
              <p>See an explainable Creator Match Score for every campaign, not just a follower count.</p>
              <p>Manage approvals, deliverables and payment status without leaving the platform.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Why creators use Filo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>One professional profile — social metrics, portfolio, niche and preferences — instead of scattered inquiries.</p>
              <p>Discover and apply to campaigns that actually fit your audience and niche.</p>
              <p>Track deliverables, approvals and earnings in a single dashboard.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How matching works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            How matching works
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every creator gets a campaign-specific Match Score built from
            transparent, weighted factors — audience fit, niche relevance,
            location, engagement and budget fit. Brands can see exactly why a
            creator scored the way they did, not just a single opaque number.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            The campaign workflow
          </h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {WORKFLOW_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Verification &amp; trust
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Creators and brands are verified before they can transact.
            Campaigns are moderated, and payment status is tracked end to end
            — so both sides know where things stand.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup?role=BRAND">Get started as a brand</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup?role=CREATOR">Get started as a creator</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
