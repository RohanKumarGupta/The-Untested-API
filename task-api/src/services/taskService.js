const { v4: uuidv4 } = require('uuid');

let tasks = [];

const getAll = () => [...tasks];

const findById = (id) => tasks.find((t) => t.id === id);

// FIX: Changed .includes() to === for exact status matching.
// Previously, .includes() did a substring match, so status='do' would incorrectly match 'done'.
const getByStatus = (status) => tasks.filter((t) => t.status === status);

const getPaginated = (page, limit) => {
  // FIX: Changed offset from (page * limit) to ((page - 1) * limit).
  // Pages are 1-based, so page 1 should start at offset 0, not offset=limit.
  const offset = (page - 1) * limit;
  return tasks.slice(offset, offset + limit);
};

const getStats = () => {
  const now = new Date();
  const counts = { todo: 0, in_progress: 0, done: 0 };
  let overdue = 0;

  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
    if (t.dueDate && t.status !== 'done' && new Date(t.dueDate) < now) {
      overdue++;
    }
  });

  return { ...counts, overdue };
};

const create = ({ title, description = '', status = 'todo', priority = 'medium', dueDate = null }) => {
  const task = {
    id: uuidv4(),
    title,
    description,
    status,
    priority,
    dueDate,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
};

const update = (id, fields) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], ...fields };
  tasks[index] = updated;
  return updated;
};

const remove = (id) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
};

const completeTask = (id) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    // FIX: Removed the hardcoded `priority: 'medium'` line.
    // Previously, completing a task would silently reset its priority to 'medium',
    // which is unexpected — a high-priority completed task should stay high-priority.
    status: 'done',
    completedAt: new Date().toISOString(),
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

/**
 * NEW FEATURE: Assign a task to a user.
 *
 * Design decisions:
 * - Accepts any non-empty string as the assignee name.
 * - Allows re-assignment: if a task is already assigned, calling this again
 *   simply overwrites the previous assignee. This is intentional — in a real
 *   system you'd likely want to re-assign tasks without having to "unassign" first.
 * - Returns the full updated task object for consistency with other mutating endpoints.
 * - Returns null if task not found, letting the route layer send a 404.
 */
const assignTask = (id, assignee) => {
  const task = findById(id);
  if (!task) return null;

  const updated = {
    ...task,
    assignee,
  };

  const index = tasks.findIndex((t) => t.id === id);
  tasks[index] = updated;
  return updated;
};

const _reset = () => {
  tasks = [];
};

module.exports = {
  getAll,
  findById,
  getByStatus,
  getPaginated,
  getStats,
  create,
  update,
  remove,
  completeTask,
  assignTask,
  _reset,
};
