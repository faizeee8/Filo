# Database Schema — Day 1

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). If this
document and the schema file ever disagree, the schema file wins — flag it
and we'll fix the doc.

All IDs are `String` (Prisma `cuid()`), not auto-increment integers. All
timestamps are `DateTime` with `createdAt` defaulting to `now()` and
`updatedAt` auto-managed by Prisma (`@updatedAt`) — these two are omitted
from the per-field tables below since every entity has them identically.

Currency fields are **whole INR rupees**, stored as `Int` (no decimals, no
minor units). This is a Day-1 simplification — flag before implementation if
we need paise-level precision.

---

## 1. User

Core identity record for all three roles. A `User` has **at most one** of
`CreatorProfile` / `BrandProfile` (never both, enforced at the application
layer — see [Constraints](#constraints)).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `email` | String | required | unique |
| `passwordHash` | String | required | bcrypt hash, never the raw password |
| `name` | String | required | |
| `role` | enum `Role` | required | `CREATOR` \| `BRAND` \| `ADMIN` |

**Indexes:** `role`

---

## 2. CreatorProfile

One-to-one with `User`. Represents a creator's public profile.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `userId` | String (FK → User.id) | required | unique — enforces the 1:1 |
| `city` | String | required | defaults `"Hyderabad"` |
| `bio` | String | optional | |
| `niche` | enum `Niche` | optional | filled in as profile is completed |
| `followerCount` | Int | optional | aggregate, self-reported |
| `engagementRate` | Float | optional | percentage, e.g. `4.8` |
| `audienceLocation` | String | optional | where the creator's audience is based |
| `collaborationType` | enum `CollaborationType` | optional | `PAID` \| `BARTER` \| `BOTH` |
| `verificationStatus` | enum `VerificationStatus` | required | defaults `UNVERIFIED` |

**Indexes:** `verificationStatus`, `niche`, `city`

---

## 3. BrandProfile

One-to-one with `User`. Represents a brand's account.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `userId` | String (FK → User.id) | required | unique — enforces the 1:1 |
| `companyName` | String | required | |
| `city` | String | required | defaults `"Hyderabad"` |
| `website` | String | optional | |
| `industry` | String | optional | free text for Day 1 |
| `verificationStatus` | enum `VerificationStatus` | required | defaults `UNVERIFIED` |

**Indexes:** `verificationStatus`

---

## 4. SocialAccount

Many-to-one to `CreatorProfile` — a creator can list several social accounts.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `creatorProfileId` | String (FK → CreatorProfile.id) | required | |
| `platform` | enum `Platform` | required | `INSTAGRAM` \| `YOUTUBE` \| `TIKTOK` \| `TWITTER` \| `FACEBOOK` \| `OTHER` |
| `handle` | String | required | e.g. `@brandname` |
| `profileUrl` | String | optional | |
| `followerCount` | Int | optional | platform-specific, can differ from `CreatorProfile.followerCount` |
| `engagementRate` | Float | optional | platform-specific |
| `isVerified` | Boolean | required | defaults `false` — ownership of *this account*, distinct from `CreatorProfile.verificationStatus` |

**Constraints:** unique on (`creatorProfileId`, `platform`) — **assumption:**
one account per platform per creator for Day 1. Flag if creators need
multiple handles on the same platform.
**Indexes:** `platform`

---

## 5. Campaign

Many-to-one to `BrandProfile`. The unit of work a brand creates.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `brandProfileId` | String (FK → BrandProfile.id) | required | |
| `title` | String | required | |
| `description` | String | required | goals/brief |
| `niche` | enum `Niche` | required | single niche per campaign for Day 1 |
| `targetLocation` | String | required | defaults `"Hyderabad"` |
| `deliverablesBrief` | String | required | human-readable summary, e.g. "2 Reels + 1 Story" |
| `platforms` | `Platform[]` | required | target platforms (Postgres native array) |
| `collaborationType` | enum `CollaborationType` | required | |
| `status` | enum `CampaignStatus` | required | defaults `DRAFT` |
| `budgetMin` | Int | optional | null when purely barter |
| `budgetMax` | Int | optional | |
| `applicationDeadline` | DateTime | optional | |
| `startDate` | DateTime | optional | |
| `endDate` | DateTime | optional | |

**Indexes:** `status`, `niche`, `targetLocation`, `brandProfileId`

---

## 6. CampaignApplication

Creator-initiated. Resolves the many-to-many between `CreatorProfile` and
`Campaign` for the "creator applies" direction, as its own entity because it
carries state.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `campaignId` | String (FK → Campaign.id) | required | |
| `creatorProfileId` | String (FK → CreatorProfile.id) | required | |
| `message` | String | optional | creator's pitch note |
| `proposedRate` | Int | optional | creator's asking price (INR), if paid |
| `status` | enum `ApplicationStatus` | required | defaults `PENDING`; `PENDING` \| `ACCEPTED` \| `REJECTED` \| `WITHDRAWN` |

**Constraints:** unique on (`campaignId`, `creatorProfileId`) — a creator can
only apply once per campaign.
**Indexes:** `status`

---

## 7. CampaignInvitation

Brand-initiated. The other direction of the same many-to-many, kept as a
**separate model** rather than an "application with a direction flag"
because the two flows carry different fields today (creator pitch/rate vs.
brand outreach note) and are likely to diverge further (e.g. offer terms).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `campaignId` | String (FK → Campaign.id) | required | |
| `creatorProfileId` | String (FK → CreatorProfile.id) | required | |
| `message` | String | optional | brand's note to the creator |
| `status` | enum `InvitationStatus` | required | defaults `PENDING`; `PENDING` \| `ACCEPTED` \| `DECLINED` \| `EXPIRED` |

**Constraints:** unique on (`campaignId`, `creatorProfileId`) — a brand can
only invite a given creator once per campaign.
**Indexes:** `status`

---

## 8. Deliverable

Scoped to an accepted `(campaignId, creatorProfileId)` pair — see
[Assumptions](#assumptions) for why there's no separate "collaboration"
table.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `campaignId` | String (FK → Campaign.id) | required | |
| `creatorProfileId` | String (FK → CreatorProfile.id) | required | |
| `title` | String | required | e.g. "Instagram Reel #1" |
| `status` | enum `DeliverableStatus` | required | defaults `PENDING`; `PENDING` \| `SUBMITTED` \| `REVISION_REQUESTED` \| `APPROVED` \| `COMPLETED` |
| `description` | String | optional | |
| `dueDate` | DateTime | optional | |
| `submissionUrl` | String | optional | link to submitted content |
| `submissionNotes` | String | optional | creator's note on submission |
| `reviewNotes` | String | optional | brand's feedback on revision/rejection |
| `submittedAt` | DateTime | optional | |
| `approvedAt` | DateTime | optional | |

**Indexes:** `status`, composite (`campaignId`, `creatorProfileId`)

---

## 9. Payment

One payment record per creator per campaign (a single lump-sum payout, not
itemized per deliverable — see [Assumptions](#assumptions)). No live payment
gateway in the MVP; this is a manually-updated ledger.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `campaignId` | String (FK → Campaign.id) | required | |
| `creatorProfileId` | String (FK → CreatorProfile.id) | required | |
| `amount` | Int | required | whole INR rupees owed to the creator |
| `status` | enum `PaymentStatus` | required | defaults `PENDING`; `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` |
| `paymentMethod` | String | optional | free text for MVP, e.g. "UPI" |
| `transactionReference` | String | optional | manual reference entered by admin |
| `paidAt` | DateTime | optional | |
| `updatedByAdminId` | String (FK → User.id) | optional | which admin last changed status |

**Constraints:** unique on (`campaignId`, `creatorProfileId`).
**Indexes:** `status`

---

## 10. Verification

Audit trail of verification **requests and decisions** — distinct from the
cached `verificationStatus` field that lives directly on `CreatorProfile` /
`BrandProfile` for fast reads. This table exists so we can show a history
("submitted → reviewed by admin X → rejected → resubmitted → verified")
instead of only the current state.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | String (PK) | required | cuid |
| `subjectType` | enum `VerificationSubjectType` | required | `CREATOR` \| `BRAND` |
| `creatorProfileId` | String (FK → CreatorProfile.id) | optional | set iff `subjectType = CREATOR` |
| `brandProfileId` | String (FK → BrandProfile.id) | optional | set iff `subjectType = BRAND` |
| `status` | enum `VerificationDecision` | required | defaults `PENDING`; `PENDING` \| `VERIFIED` \| `REJECTED` |
| `documentUrl` | String | optional | link to submitted proof, if any |
| `notes` | String | optional | admin notes on the decision |
| `reviewedByAdminId` | String (FK → User.id) | optional | set once reviewed |
| `reviewedAt` | DateTime | optional | |

**Constraints:** exactly one of `creatorProfileId` / `brandProfileId` must be
set, matching `subjectType`. See [Constraints](#constraints) for why this
isn't a single polymorphic `subjectId`.
**Indexes:** `status`, `subjectType`

---

## Relationships

### One-to-one
- `User` ↔ `CreatorProfile` (optional on the User side — a User may have
  neither, but never more than one)
- `User` ↔ `BrandProfile` (same)

### One-to-many
- `CreatorProfile` → `SocialAccount` (required FK)
- `BrandProfile` → `Campaign` (required FK)
- `Campaign` → `Deliverable` (required FK)
- `Campaign` → `Payment` (required FK)
- `CreatorProfile` → `Deliverable` (required FK)
- `CreatorProfile` → `Payment` (required FK)
- `User` (admin) → `Verification` (optional FK, `reviewedByAdminId`) —
  optional because a verification starts with no reviewer
- `User` (admin) → `Payment` (optional FK, `updatedByAdminId`) — same reason
- `CreatorProfile` → `Verification` (optional FK, only set for creator subjects)
- `BrandProfile` → `Verification` (optional FK, only set for brand subjects)

### Many-to-many (resolved via a join entity with its own state)
- `CreatorProfile` ↔ `Campaign` via `CampaignApplication` (creator → campaign,
  creator-initiated)
- `CreatorProfile` ↔ `Campaign` via `CampaignInvitation` (brand → creator,
  brand-initiated)

These two are **not** the same relationship modeled twice — a creator
applying and a brand inviting are different real-world actions that can both
exist for the same `(campaign, creator)` pair simultaneously (e.g. a creator
applies before the brand gets around to inviting them). Both required FKs on
both sides.

---

## Constraints

- **A `User` has at most one profile.** Not expressible as a single Prisma
  constraint across two optional relations; enforce in the registration
  endpoint (already true in the Day-1 registration flow — role decides which
  profile gets created, never both).
- **`Verification` subject exclusivity.** We chose two nullable FKs
  (`creatorProfileId` / `brandProfileId`) over a single polymorphic
  `subjectId` + `subjectType` because Prisma foreign keys require a
  concrete target table — a polymorphic ID can't be a real FK, which means
  losing referential integrity (orphaned rows possible) and losing type-safe
  `include`s on the Prisma client. The tradeoff is that the "exactly one is
  set" rule is enforced in application code (the API layer), not the
  database. If this needs to be a hard DB constraint later, a Postgres
  `CHECK` constraint can be added via a raw migration.
- **Currency precision.** `Int` rupees, no paise. If a real payment gateway
  integration needs paise-level precision, this becomes a breaking migration
  — flag now if that's likely.

## Assumptions

- **No separate "active collaboration" table.** Once a `CampaignApplication`
  or `CampaignInvitation` reaches `ACCEPTED`, the collaboration is implied —
  `Deliverable` and `Payment` rows reference `(campaignId, creatorProfileId)`
  directly rather than a formal collaboration/workspace record. This avoids
  an extra table for Day 1; if querying "all active collaborations" becomes
  common and expensive, a `CampaignCollaborator` table can be introduced
  later without breaking existing data (it would just be backfilled from
  accepted applications/invitations).
- **One `Payment` per `(campaign, creator)`**, not itemized per deliverable.
  If milestone/partial payments are needed, this is a breaking change to the
  unique constraint — flag before backend work starts if that's likely.
- **Single niche per campaign**, not a list. A campaign brief in practice
  usually targets one niche; multi-niche campaigns would need `Niche[]` like
  `platforms`.
