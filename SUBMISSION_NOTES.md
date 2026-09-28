# Submission Notes

## What I'd test next if I had more time

- **Concurrency / race conditions:** The in-memory store uses a mutable array. In a production scenario with concurrent requests, two simultaneous updates to the same task could cause data loss (last-write-wins). I'd add tests simulating parallel requests.
- **Input sanitization and security:** Test for XSS payloads in `title`, `description`, and `assignee` fields. Even though this is an API, the data might be rendered in a frontend.
- **Boundary & stress tests:** Very long strings for title/description, unicode characters, extremely large page/limit values, negative page numbers, and what happens when the in-memory store has thousands of tasks.
- **Error handler coverage:** The global error handler in `app.js` (the `500` catch-all) isn't currently triggered by any test. I'd add a test that forces an internal error to verify it works.
- **`update` endpoint field protection:** The `PUT /tasks/:id` route allows overwriting internal fields like `id`, `createdAt`, and `completedAt` via the request body because `{ ...tasks[index], ...fields }` blindly spreads all incoming fields. I'd test for this and add field whitelisting.

## What surprised me in the codebase

- **The `completeTask` bug** was the most surprising. Hardcoding `priority: 'medium'` when completing a task is a subtle data-corruption issue that would be very hard to catch without tests — it silently destroys information. It looked like a leftover from early development.
- **The `getByStatus` using `.includes()`** was a classic "it works for the exact status strings but breaks for substrings" bug. It's the kind of thing that passes manual testing (because you'd test with `"todo"`, not `"do"`) but fails in production.
- **No input validation on `update`** for protected fields was notable. The `update` function happily lets you overwrite `id` and `createdAt`, which could cause serious issues.

## Questions I'd ask before shipping to production

1. **Persistence:** The in-memory store loses all data on restart. What's the plan for a real data store? PostgreSQL? MongoDB? This changes the architecture significantly.
2. **Authentication & authorization:** There's no auth. Who can create/delete/assign tasks? Should assignees only be valid users in the system?
3. **Rate limiting:** No rate limiting means the API is vulnerable to abuse. Should we add it?
4. **Pagination metadata:** The paginated endpoint returns just the array of tasks. Should it also return `totalCount`, `totalPages`, `currentPage`, and `hasNext` for frontend pagination controls?
5. **Task validation on complete:** Should we prevent completing an already-completed task? Currently it just updates `completedAt` again.
6. **Soft delete vs. hard delete:** The `DELETE` endpoint permanently removes tasks. Should we use soft deletes (a `deletedAt` flag) for audit trails?
7. **Logging & monitoring:** `console.error` in the error handler isn't production-grade. What logging/monitoring infrastructure should we integrate?

---

## Design decisions for `PATCH /tasks/:id/assign`

- **Validation:** `assignee` must be a non-empty string. Whitespace-only strings are trimmed and rejected. This prevents storing meaningless assignee values.
- **Re-assignment is allowed:** Calling the endpoint on an already-assigned task simply overwrites the assignee. This is intentional — in practice, tasks get reassigned, and forcing an "unassign" step first adds unnecessary friction.
- **Trimming:** The assignee value is trimmed before storage to normalize input (e.g., `" Alice "` becomes `"Alice"`).
- **No unassign endpoint:** The assignment only asked for assign functionality. If needed, unassignment could be handled via `PUT /tasks/:id` by setting `assignee` to `null`, or a dedicated `DELETE /tasks/:id/assign` endpoint could be added later.
