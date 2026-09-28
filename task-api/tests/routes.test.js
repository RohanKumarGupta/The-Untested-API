const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Routes', () => {
  // Clear the in-memory task store before each test
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return an empty list initially (happy path, empty list)', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks when no query params are provided (happy path)', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
    
    it('should filter tasks by status (GET /tasks?status=todo)', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('should return paginated tasks (GET /tasks?page=1&limit=2)', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });
  });

  describe('POST /tasks', () => {
    it('should create a task when valid data is provided (happy path)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task', description: 'Desc', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({ description: 'Desc' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T', status: 'invalid_status' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T', priority: 'ultra' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T', dueDate: 'not-a-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task successfully (happy path)', async () => {
      const task = taskService.create({ title: 'Old Title' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title', status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 when updating a non-existent task (not found)', async () => {
      const res = await request(app).put('/tasks/non-existent-id').send({ title: 'Title' });
      expect(res.status).toBe(404);
    });

    it('should return 400 when update body has invalid fields (invalid body)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ priority: 'super-high' }); // invalid priority
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task successfully (happy path)', async () => {
      const task = taskService.create({ title: 'Task to delete' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.getAll().length).toBe(0);
    });

    it('should return 404 when deleting a non-existent task (not found)', async () => {
      const res = await request(app).delete('/tasks/invalid-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark an existing task as completed (happy path)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });

    it('should return 404 when completing a non-existent task (not found)', async () => {
      const res = await request(app).patch('/tasks/invalid-id/complete');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /tasks/stats', () => {
    // Stats endpoint returns flat counts: { todo, in_progress, done, overdue }
    it('should return correct stats when empty (empty)', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0
      });
    });

    it('should return correct stats with tasks (with tasks)', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
      expect(res.body.done).toBe(1);
    });

    it('should count overdue tasks correctly (with overdue)', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      taskService.create({ title: 'Overdue Task', dueDate: pastDate.toISOString(), status: 'todo' });
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body.overdue).toBe(1);
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task successfully (happy path)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'John Doe' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('John Doe');
    });

    it('should allow re-assignment (re-assignment)', async () => {
      const task = taskService.create({ title: 'Task' });
      await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'John' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Jane' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane');
    });

    it('should return 404 when assigning a non-existent task (not found)', async () => {
      const res = await request(app).patch('/tasks/invalid-id/assign').send({ assignee: 'John' });
      expect(res.status).toBe(404);
    });

    it('should return 400 when assignee is missing (missing assignee)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 when assignee is empty (empty assignee)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when assignee is not a string (non-string assignee)', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 123 });
      expect(res.status).toBe(400);
    });
  });
});
