# Security Specification for LocaleWeave Collaboration

## Data Invariants
1. A Message must belong to a valid Campaign.
2. A user can only edit their own profile.
3. System messages (role: assistant) can only be created if the content is not empty.
4. Campaign state can be updated by any authenticated user (collaborative).

## The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)
1. **Unauthenticated Write**: Attempting to write to `/campaigns/main` without a valid token.
2. **Identity Spoofing**: User A trying to update `/users/userB`.
3. **Empty Messages**: Creating a message with `content: ""`.
4. **Invalid Role**: Creating a message with `role: "hacker"`.
5. **Huge Payload**: Injecting a 1MB string into `activePrompt`.
6. **Orphaned Message**: Creating a message in `/campaigns/non-existent/messages/msg1` (Relational Sync check should catch this).
7. **Future Timestamps**: Setting `createdAt` to a time in the future.
8. **Shadow Fields**: Adding `isAdmin: true` to a User document.
9. **Malicious ID**: Creating document with ID `../../hacked`.
10. **Immutable Field Change**: Trying to change `authorId` on an existing message.
11. **Type Mismatch**: Sending `activeTab: 123` (should be string).
12. **Blanket Read**: Attempting to list all users without being authenticated.

## Test Runner (Conceptual logic for firestore.rules.test.ts)
- `it('rejects unauth campaign edit')`
- `it('rejects identity spoofing on users')`
- `it('rejects invalid message roles')`
- `it('enforces string size limits on prompts')`
