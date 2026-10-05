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