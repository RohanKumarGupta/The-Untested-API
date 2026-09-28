const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    // Reset tasks before each test to ensure a clean state
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a new task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });
      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with provided values', () => {
      const taskData = {
        title: 'Custom Task',
        description: 'Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2023-12-31T00:00:00.000Z'
      };
      const task = taskService.create(taskData);
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.dueDate).toBe(taskData.dueDate);
    });
  });

  describe('getAll()', () => {
    it('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      const tasks = taskService.getAll();
      expect(tasks.length).toBe(2);
    });
  });

  describe('findById()', () => {
    it('should return the correct task by id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return undefined if task not found', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus()', () => {
    it('should return tasks with the specified status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });
      const todos = taskService.getByStatus('todo');
      expect(todos.length).toBe(1);
      expect(todos[0].title).toBe('Task 1');
    });

    // BUG FIX VERIFIED: getByStatus now uses === instead of .includes()
    // Previously, querying 'do' would incorrectly match 'done' via substring matching.
    // After fix, only exact status matches are returned.
    it('should NOT return tasks via substring matching (bug fix verified)', () => {
      taskService.create({ title: 'Task Done', status: 'done' });
      // 'do' is a substring of 'done', but should NOT match after the fix
      const doTasks = taskService.getByStatus('do');
      
      // After fix: exact matching returns 0 results for partial string 'do'
      expect(doTasks.length).toBe(0); 
    });
  });

  describe('getPaginated()', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    // BUG FIX VERIFIED: getPaginated now uses (page - 1) * limit for correct 1-based pagination.
    // Previously, page 1 with limit 10 would skip the first 10 items (offset = 1*10 = 10).
    // After fix, page 1 correctly starts at offset 0.
    it('should return the correct first page of results (bug fix verified)', () => {
      const page1 = taskService.getPaginated(1, 10);
      
      // After fix: page 1 correctly returns 'Task 1' through 'Task 10'
      expect(page1[0].title).toBe('Task 1'); 
      expect(page1[9].title).toBe('Task 10');
      expect(page1.length).toBe(10);
    });

    it('should return correct second page', () => {
      const page2 = taskService.getPaginated(2, 10);
      expect(page2[0].title).toBe('Task 11');
      expect(page2.length).toBe(10);
    });

    it('should return partial last page', () => {
      const page3 = taskService.getPaginated(3, 10);
      expect(page3[0].title).toBe('Task 21');
      expect(page3.length).toBe(5); // 25 total, page 3 has 5 remaining
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 100000).toISOString();
      const futureDate = new Date(now.getTime() + 100000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // not overdue because done

      const stats = taskService.getStats();
      expect(stats.todo).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update()', () => {
    it('should update an existing task', () => {
      const task = taskService.create({ title: 'Old Title' });
      const updated = taskService.update(task.id, { title: 'New Title', status: 'in_progress' });
      expect(updated.title).toBe('New Title');
      expect(updated.status).toBe('in_progress');
      
      const fetched = taskService.findById(task.id);
      expect(fetched.title).toBe('New Title');
    });

    it('should return null when updating a non-existent task', () => {
      const updated = taskService.update('invalid-id', { title: 'New' });
      expect(updated).toBeNull();
    });
  });

  describe('remove()', () => {
    it('should remove an existing task', () => {
      const task = taskService.create({ title: 'To be removed' });
      const result = taskService.remove(task.id);
      expect(result).toBe(true);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return false when removing non-existent task', () => {
      const result = taskService.remove('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('completeTask()', () => {
    it('should mark a task as completed', () => {
      const task = taskService.create({ title: 'To complete' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    it('should return null if task does not exist', () => {
      const result = taskService.completeTask('invalid-id');
      expect(result).toBeNull();
    });

    // BUG FIX VERIFIED: completeTask no longer resets priority to 'medium'.
    // Previously, completing a high-priority task would silently overwrite priority to 'medium'.
    // After fix, the original priority is preserved.
    it('should preserve the original priority when completing a task (bug fix verified)', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      
      // After fix: priority stays 'high' as originally set
      expect(completed.priority).toBe('high');
    });
  });
});
