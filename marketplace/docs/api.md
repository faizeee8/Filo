# API Structure — Day 1 (Documentation Only)

**Nothing in this document is implemented yet.** This is the agreed contract
for backend and frontend to build against once Day 1 architecture is
reviewed. Field names below match `prisma/schema.prisma` and
`docs/database-schema.md` exactly — if you need a field that isn't in the
schema, add it to the schema first so both docs stay in sync.

## Conventions

- All request/response bodies are JSON.
- All authenticated endpoints require a valid session (cookie-based via
  NextAuth). "Auth" column values:
  - **Public** — no session required
  - **Any authenticated** — any logged-in user, any role
  - **CREATOR** / **BRAND** / **ADMIN** — must be logged in with that role
  - **Owner (CREATOR)** / **Owner (BRAND)** — must be logged in as the
    specific creator/brand that owns the resource, not just any creator/brand
- The server derives `role` and the caller's own `creatorProfileId` /
  `brandProfileId` from the session — **never from the request body.** Any
  endpoint below that looks like it takes an ID for "which creator/brand am
  I" (e.g. `PATCH /api/creators/me`) uses `me` precisely to make this
  impossible to spoof; there is no equivalent
  `PATCH /api/creators/:id` for a caller to edit someone else's profile.
- Standard error shape: `{ "error": string, "issues"?: Record<string, string[]> }`.
  `issues` is present on `400` validation failures (Zod field errors).
- Pagination on list endpoints: `?page=1&pageSize=20` (defaults shown),
  response wrapped as `{ "data": [...], "page": 1, "pageSize": 20, "total": number }`.

---

## Authentication & User Management

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Create a new account (creator or brand) | Public | `{ name, email, password, role: "CREATOR"\|"BRAND", companyName? }` — `companyName` required if `role = "BRAND"` | `201 { id, email, role }` | User (+ CreatorProfile or BrandProfile) |
| POST | `/api/auth/login` | Authenticate and start a session | Public | `{ email, password }` | `200` sets session cookie, `{ id, email, role }` | User |
| POST | `/api/auth/logout` | End the current session | Any authenticated | — | `204` | — |
| GET | `/api/users/me` | Get the current user + their role-specific profile | Any authenticated | — | `200 { id, email, name, role, creatorProfile? , brandProfile? }` | User |

**Note:** `role` can only ever be `CREATOR` or `BRAND` at registration.
Admin accounts are provisioned directly (seed script or by another admin),
never self-registered — there is intentionally no public role value for it.

---

## Creator Profiles

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| GET | `/api/creators` | Discover/search creators (filters: niche, city, platform, minFollowers, minEngagement, audienceLocation, collaborationType, verificationStatus) | BRAND | query params, e.g. `?niche=FOOD&city=Hyderabad&minFollowers=5000` | `200 { data: CreatorProfile[], page, pageSize, total }` | CreatorProfile |
| GET | `/api/creators/:id` | View a single creator's public profile | Any authenticated | — | `200 CreatorProfile` (incl. `socialAccounts`) | CreatorProfile |
| PATCH | `/api/creators/me` | Update the caller's own creator profile | Owner (CREATOR) | any subset of `{ city, bio, niche, followerCount, engagementRate, audienceLocation, collaborationType }` | `200 CreatorProfile` | CreatorProfile |

---

## Brand Profiles

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| GET | `/api/brands/:id` | View a brand's profile | Any authenticated | — | `200 BrandProfile` | BrandProfile |
| PATCH | `/api/brands/me` | Update the caller's own brand profile | Owner (BRAND) | any subset of `{ companyName, city, website, industry }` | `200 BrandProfile` | BrandProfile |

---

## Social Accounts

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| GET | `/api/creators/me/social-accounts` | List the caller's own social accounts | Owner (CREATOR) | — | `200 SocialAccount[]` | SocialAccount |
| POST | `/api/creators/me/social-accounts` | Add a social account | Owner (CREATOR) | `{ platform, handle, profileUrl?, followerCount?, engagementRate? }` | `201 SocialAccount` | SocialAccount |
| PATCH | `/api/social-accounts/:id` | Update a social account | Owner (CREATOR, must own the account) | any subset of `{ handle, profileUrl, followerCount, engagementRate }` | `200 SocialAccount` | SocialAccount |
| DELETE | `/api/social-accounts/:id` | Remove a social account | Owner (CREATOR, must own the account) | — | `204` | SocialAccount |

---

## Campaigns

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/campaigns` | Create a campaign (starts in `DRAFT`) | BRAND | `{ title, description, niche, targetLocation?, deliverablesBrief, platforms[], collaborationType, budgetMin?, budgetMax?, applicationDeadline?, startDate?, endDate? }` | `201 Campaign` | Campaign |
| GET | `/api/campaigns` | Discover campaigns (filters: niche, city, platform, collaborationType, status) | CREATOR (sees `ACTIVE` only) / BRAND (sees own, any status) | query params | `200 { data: Campaign[], page, pageSize, total }` | Campaign |
| GET | `/api/campaigns/:id` | View a single campaign | Any authenticated (creators only see it if `ACTIVE` or if they have an application/invitation on it) | — | `200 Campaign` | Campaign |
| PATCH | `/api/campaigns/:id` | Update a campaign (including status transitions, e.g. `DRAFT` → `PENDING_REVIEW`) | Owner (BRAND) | any subset of campaign fields, or `{ status }` | `200 Campaign` | Campaign |

---

## Campaign Applications (creator → campaign)

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/campaigns/:id/applications` | Apply to a campaign | CREATOR | `{ message?, proposedRate? }` | `201 CampaignApplication` | CampaignApplication |
| GET | `/api/campaigns/:id/applications` | List applications received for a campaign | Owner (BRAND) | — | `200 { data: CampaignApplication[], ... }` (incl. `creatorProfile`) | CampaignApplication |
| GET | `/api/creators/me/applications` | List the caller's own applications | Owner (CREATOR) | — | `200 { data: CampaignApplication[], ... }` (incl. `campaign`) | CampaignApplication |
| PATCH | `/api/applications/:id` | Accept/reject (brand) or withdraw (creator) | Owner (BRAND, campaign owner) sets `ACCEPTED`/`REJECTED`; Owner (CREATOR, applicant) sets `WITHDRAWN` | `{ status }` | `200 CampaignApplication` | CampaignApplication |

---

## Campaign Invitations (brand → creator)

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/campaigns/:id/invitations` | Invite a creator to a campaign | Owner (BRAND) | `{ creatorProfileId, message? }` | `201 CampaignInvitation` | CampaignInvitation |
| GET | `/api/campaigns/:id/invitations` | List invitations sent for a campaign | Owner (BRAND) | — | `200 { data: CampaignInvitation[], ... }` (incl. `creatorProfile`) | CampaignInvitation |
| GET | `/api/creators/me/invitations` | List the caller's own invitations | Owner (CREATOR) | — | `200 { data: CampaignInvitation[], ... }` (incl. `campaign`) | CampaignInvitation |
| PATCH | `/api/invitations/:id` | Accept/decline an invitation | Owner (CREATOR, invitee) | `{ status: "ACCEPTED" \| "DECLINED" }` | `200 CampaignInvitation` | CampaignInvitation |

---

## Deliverables

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/campaigns/:id/deliverables` | Define a deliverable for an accepted creator on this campaign | Owner (BRAND) | `{ creatorProfileId, title, description?, dueDate? }` | `201 Deliverable` | Deliverable |
| GET | `/api/campaigns/:id/deliverables` | List deliverables for a campaign | Owner (BRAND) or Owner (CREATOR, if assigned) | — | `200 Deliverable[]` | Deliverable |
| GET | `/api/creators/me/deliverables` | List the caller's own deliverables across all campaigns | Owner (CREATOR) | — | `200 { data: Deliverable[], ... }` (incl. `campaign`) | Deliverable |
| PATCH | `/api/deliverables/:id` | Submit content (creator) or review it (brand) | Owner (CREATOR, assigned) sets `submissionUrl`/`submissionNotes` and moves to `SUBMITTED`; Owner (BRAND, campaign owner) sets `APPROVED`/`REVISION_REQUESTED`/`COMPLETED` and `reviewNotes` | `{ submissionUrl?, submissionNotes?, status?, reviewNotes? }` | `200 Deliverable` | Deliverable |

---

## Payments

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/campaigns/:id/payments` | Create the payment record for a creator on this campaign | Owner (BRAND) | `{ creatorProfileId, amount }` | `201 Payment` | Payment |
| GET | `/api/campaigns/:id/payments` | List payments for a campaign | Owner (BRAND) or Owner (CREATOR, if it's theirs) | — | `200 Payment[]` | Payment |
| GET | `/api/creators/me/payments` | List the caller's own earnings/payment status | Owner (CREATOR) | — | `200 Payment[]` (incl. `campaign`) | Payment |
| PATCH | `/api/payments/:id` | Update payment status (manual ledger for MVP — see architecture.md) | ADMIN | `{ status, paymentMethod?, transactionReference?, paidAt? }` | `200 Payment` | Payment |

---

## Verification

| Method | Endpoint | Purpose | Auth | Request | Response | Entity |
|---|---|---|---|---|---|---|
| POST | `/api/verifications` | Submit self (creator or brand) for verification | Owner (CREATOR) or Owner (BRAND) | `{ documentUrl? }` — `subjectType` and the profile ID are derived from the caller's session, never from the body | `201 Verification` | Verification |
| GET | `/api/verifications` | List verification requests (filter by `status`, `subjectType`) | ADMIN | query params | `200 { data: Verification[], ... }` | Verification |
| PATCH | `/api/verifications/:id` | Approve/reject a verification request | ADMIN | `{ status: "VERIFIED" \| "REJECTED", notes? }` | `200 Verification` — also updates the cached `verificationStatus` on the related profile | Verification, CreatorProfile/BrandProfile |

---

## Deliberately out of scope for Day 1

Not documented above because they aren't part of today's 10-entity scope —
raise separately if the team needs them sooner than planned:
admin user management/moderation endpoints, campaign analytics endpoints,
notifications, disputes, the Creator Match Score endpoint (needs Campaign +
CreatorProfile finalized first).
