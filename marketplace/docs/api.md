    # Filo API Documentation — Day 3

    This document records the API endpoints implemented and tested during
    Day 3 of the Filo marketplace project.

    The main goal of Day 3 was to make the basic:

    **Brand → Campaign → Creator Application**

    flow work through APIs.

    ---

    ## 1. API Conventions

    ### Request Format

    All request bodies use JSON.

    ### Authentication

    Authenticated APIs use the NextAuth session cookie.

    The server gets the logged-in user's:

    - User ID
    - Role
    - Creator profile
    - Brand profile

    from the authenticated session.

    Clients should not send another user's profile ID to pretend to
    be that user.

    ### Common HTTP Status Codes

    | Status | Meaning |
    |---|---|
    | `200` | Request successful |
    | `201` | Resource created successfully |
    | `400` | Invalid request / validation error |
    | `401` | Authentication required |
    | `403` | User is authenticated but not authorized |
    | `404` | Resource not found |
    | `409` | Duplicate/conflicting resource |
    | `500` | Server error |

    ---

    # 2. Campaign APIs

    ## 2.1 Create Campaign

    ### Endpoint

    ```http
    POST /api/campaigns

# Filo API Documentation — Day 4

This document records the API endpoints implemented for the Filo marketplace project.

The API flow covered by Day 3 and Day 4 is:

**Brand → Campaign → Creator Application → Application Acceptance → Deliverable Submission → Deliverable Review**

---

## 1. API Conventions

### Request Format

All request bodies use JSON.

### Authentication

Authenticated APIs use the NextAuth session cookie.

The server gets the logged-in user's:

- User ID
- Role
- Creator profile
- Brand profile

from the authenticated session.

Clients should not send another user's profile ID to pretend to be that user.

### Common HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | Request successful |
| `201` | Resource created successfully |
| `400` | Invalid request / validation error |
| `401` | Authentication required |
| `403` | User is authenticated but not authorized |
| `404` | Resource not found |
| `409` | Duplicate/conflicting resource |
| `500` | Server error |

---

# 2. Campaign APIs

## 2.1 Create Campaign

### Endpoint

```http
POST /api/campaigns
```

### Authorization

Brand only.

### Request Body

```json
{
  "title": "Instagram Promotion Campaign",
  "description": "Promote our new product through Instagram creators",
  "budget": 25000,
  "applicationDeadline": "2026-11-01T23:59:59.000Z"
}
```

### Success

`201 Created`

Returns the newly created campaign.

---

## 2.2 List Campaigns

### Endpoint

```http
GET /api/campaigns
```

### Authorization

Authenticated users.

### Success

`200 OK`

Returns available campaigns.

---

## 2.3 Get Campaign Details

### Endpoint

```http
GET /api/campaigns/{campaignId}
```

### Success

`200 OK`

Returns campaign details.

---

## 2.4 Update Campaign

### Endpoint

```http
PATCH /api/campaigns/{campaignId}
```

### Authorization

The brand that owns the campaign.

### Success

`200 OK`

Returns the updated campaign.

---

# 3. Creator Application APIs

## 3.1 Apply to Campaign

### Endpoint

```http
POST /api/campaigns/{campaignId}/applications
```

### Authorization

Creator only.

### Request Body

```json
{
  "message": "I would love to collaborate on this campaign.",
  "proposedRate": 5000
}
```

### Rules

- Creator must have a creator profile.
- Campaign must exist.
- Creator cannot apply to their own campaign.
- Application deadline must not have expired.
- Creator cannot apply to the same campaign more than once.
- New applications start with `PENDING` status.

### Success

`201 Created`

---

## 3.2 List Campaign Applications

### Endpoint

```http
GET /api/campaigns/{campaignId}/applications
```

### Authorization

Campaign-owning brand.

### Purpose

Allows the brand to view creator applications submitted to its campaign.

### Success

`200 OK`

Returns the applications associated with the campaign.

### Unauthorized

`403 Forbidden`

Returned when another brand attempts to view the applications.

---

## 3.3 Accept or Reject Application

### Endpoint

```http
PATCH /api/campaigns/{campaignId}/applications/{applicationId}
```

### Authorization

Campaign-owning brand.

### Request Body — Accept

```json
{
  "status": "ACCEPTED"
}
```

### Request Body — Reject

```json
{
  "status": "REJECTED"
}
```

### Rules

Only applications currently in `PENDING` status can be accepted or rejected.

Allowed status values:

```text
ACCEPTED
REJECTED
```

### Success

`200 OK`

Example response:

```json
{
  "success": true,
  "message": "Application accepted successfully",
  "application": {}
}
```

### Possible Errors

`401` — Authentication required.

`403` — User is not a brand or does not own the campaign.

`404` — Application does not belong to the specified campaign or does not exist.

`409` — Application has already been processed.

---

# 4. Deliverable APIs

## 4.1 Submit Deliverable

### Endpoint

```http
POST /api/campaigns/{campaignId}/deliverables
```

### Authorization

Creator only.

### Requirement

The creator must have an `ACCEPTED` application for the campaign.

### Request Body

```json
{
  "title": "Instagram Reel #1",
  "description": "30-second product promotion reel",
  "submissionUrl": "https://example.com/my-reel",
  "submissionNotes": "Final edited version submitted for review."
}
```

### Required Fields

- `title`
- `submissionUrl`

### Optional Fields

- `description`
- `submissionNotes`

### Validation

- Title must not be empty.
- Title must be 200 characters or fewer.
- Submission URL must be a valid HTTP or HTTPS URL.
- Description must be 5000 characters or fewer.
- Submission notes must be 5000 characters or fewer.

### Initial Status

New submissions are created with:

```text
SUBMITTED
```

The `submittedAt` timestamp is automatically recorded.

### Success

`201 Created`

---

## 4.2 List Campaign Deliverables

### Endpoint

```http
GET /api/campaigns/{campaignId}/deliverables
```

### Authorization

Two roles are supported:

**Brand**

The brand must own the campaign.

The brand receives all deliverables submitted for the campaign.

**Creator**

The creator must have an accepted application for the campaign.

The creator receives only their own deliverables.

### Success

`200 OK`

Returns the campaign deliverables.

---

## 4.3 Review Deliverable

### Endpoint

```http
PATCH /api/campaigns/{campaignId}/deliverables/{deliverableId}
```

### Authorization

Campaign-owning brand.

### Approve Deliverable

```json
{
  "status": "APPROVED",
  "reviewNotes": "The submitted content meets the campaign requirements."
}
```

### Request Revision

```json
{
  "status": "REVISION_REQUESTED",
  "reviewNotes": "Please update the product description and resubmit."
}
```

### Allowed Review Statuses

```text
APPROVED
REVISION_REQUESTED
```

### Rules

- Only the campaign-owning brand can review the deliverable.
- The deliverable must belong to the specified campaign.
- A `SUBMITTED` deliverable can be reviewed.
- A `REVISION_REQUESTED` deliverable can be reviewed again after resubmission.
- `reviewNotes` are required when requesting revisions.
- When approved, `approvedAt` is automatically recorded.
- Already-approved/completed deliverables cannot be reviewed through this endpoint.

### Success

`200 OK`

Example:

```json
{
  "success": true,
  "message": "Deliverable approved successfully",
  "deliverable": {}
}
```

---

# 5. Application Status Flow

```text
PENDING
   │
   ├── ACCEPTED
   │      │
   │      └── Creator can submit deliverables
   │
   └── REJECTED
```

Only the campaign-owning brand can change an application's status.

---

# 6. Deliverable Status Flow

```text
PENDING
   │
   └── SUBMITTED
          │
          ├── APPROVED
          │
          └── REVISION_REQUESTED
                    │
                    └── Creator resubmits
                              │
                              └── Brand reviews again
```

---

# 7. Day 4 End-to-End Flow

The intended API workflow is:

1. Brand creates a campaign.
2. Creator views the campaign.
3. Creator submits an application.
4. Brand views campaign applications.
5. Brand accepts the creator's application.
6. Creator submits a campaign deliverable.
7. Brand views the submitted deliverable.
8. Brand either:
   - approves the deliverable, or
   - requests a revision.
9. If a revision is requested, the creator can submit the updated deliverable again.
10. Brand reviews the updated submission.

---

# 8. Authorization Summary

| API | Creator | Brand |
|---|---:|---:|
| Create Campaign | ❌ | ✅ |
| List Campaigns | ✅ | ✅ |
| Get Campaign Details | ✅ | ✅ |
| Update Own Campaign | ❌ | ✅ |
| Apply to Campaign | ✅ | ❌ |
| View Campaign Applications | ❌ | ✅ Owner |
| Accept/Reject Application | ❌ | ✅ Owner |
| Submit Deliverable | ✅ Accepted Application | ❌ |
| View Deliverables | ✅ Own | ✅ Campaign Owner |
| Review Deliverable | ❌ | ✅ Campaign Owner |

---

# 9. Security and Validation

The API uses authenticated sessions rather than trusting user-supplied profile IDs.

Authorization checks are performed against the authenticated user's:

- User ID
- Role
- Creator profile
- Brand profile

Campaign