# Bug Report — Task Manager API

Discovered through systematic test-driven analysis of the codebase.

---

## Bug #1: `getByStatus` uses substring matching instead of exact matching

**Severity:** High  
**File:** [`src/services/taskService.js`](./task-api/src/services/taskService.js), line 9  

### Expected behavior
Filtering tasks by `?status=todo` should return only tasks whose status is exactly `"todo"`.

### Actual behavior
The filter uses `t.status.includes(status)`, which performs a **substring match**. This means:
- `?status=do` matches both `"todo"` and `"done"`
- `?status=in` matches `"in_progress"`
- `?status=progress` matches `"in_progress"`

Any partial string that appears inside a valid status value will produce incorrect results.

### How I discovered it
I wrote a unit test that created tasks with status `"done"` and then queried with `getByStatus('do')`. The test expected zero results but received all the `"done"` tasks — confirming the substring match bug.

### Root cause
```js
// BEFORE (buggy)
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```
`String.prototype.includes()` checks for substring containment, not equality.

### Fix applied
```js
// AFTER (fixed)
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```
Changed to strict equality (`===`) so only exact status matches are returned.

---

## Bug #2: `getPaginated` has off-by-one error in offset calculation

**Severity:** High  
**File:** [`src/services/taskService.js`](./task-api/src/services/taskService.js), line 12  

### Expected behavior
`getPaginated(1, 10)` (page 1, limit 10) should return the first 10 tasks (items at indices 0–9).

### Actual behavior
Page 1 returns **nothing** (or items 10–19 if they exist), because the offset formula `page * limit` produces `1 * 10 = 10` for the first page. The entire first page of results is skipped.

### How I discovered it
I created 5 tasks and called `getPaginated(1, 2)`, expecting the first 2 tasks. The function returned items at indices 2–3 instead of 0–1. A test for `getPaginated(1, 10)` with 5 total tasks returned an empty array — the first page was completely missing.

### Root cause
```js
// BEFORE (buggy)
const offset = page * limit;
```
The API uses **1-based** page numbers (page 1 = first page), but the offset calculation assumes 0-based pages.

### Fix applied
```js
// AFTER (fixed)
const offset = (page - 1) * limit;
```
Subtracting 1 from the page number before multiplying by limit gives the correct 0-based offset.

---

## Bug #3: `completeTask` silently resets task priority to `'medium'`

**Severity:** Medium  
**File:** [`src/services/taskService.js`](./task-api/src/services/taskService.js), line 69  

### Expected behavior
Marking a task as complete should change its `status` to `"done"` and set `completedAt`, while preserving all other fields — including `priority`.

### Actual behavior
When a `"high"` priority task is completed, its priority is silently overwritten to `"medium"`. This is data corruption: the task's original priority information is lost.

### How I discovered it
I created a task with `priority: 'high'`, then called `completeTask(id)`. The returned task had `priority: 'medium'` instead of `'high'`. A simple assertion — `expect(result.priority).toBe('high')` — failed immediately.

### Root cause
```js
// BEFORE (buggy)
const updated = {
  ...task,
  priority: 'medium',  // <— This line is the problem
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
The hardcoded `priority: 'medium'` line overwrites whatever priority the task originally had. This appears to be a leftover from development/debugging — there's no business reason to reset priority on completion.

### Fix applied
Removed the `priority: 'medium'` line entirely, so the spread (`...task`) preserves the original priority:
```js
// AFTER (fixed)
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

---

## Summary

| # | Bug | Severity | Fixed? |
|---|-----|----------|--------|
| 1 | `getByStatus` substring matching | High | ✅ Yes |
| 2 | `getPaginated` off-by-one offset | High | ✅ Yes |
| 3 | `completeTask` resets priority | Medium | ✅ Yes |
