const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('validators', () => {
  describe('validateCreateTask()', () => {
    it('should return null for valid task data', () => {
      const validBody = {
        title: 'Valid Task',
        status: 'todo',
        priority: 'high',
        dueDate: '2024-12-31T00:00:00.000Z'
      };
      expect(validateCreateTask(validBody)).toBeNull();
    });

    it('should return error if title is missing', () => {
      const invalidBody = { status: 'todo' };
      expect(validateCreateTask(invalidBody)).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is empty string', () => {
      const invalidBody = { title: '   ' };
      expect(validateCreateTask(invalidBody)).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is not a string', () => {
      const invalidBody = { title: 123 };
      expect(validateCreateTask(invalidBody)).toBe('title is required and must be a non-empty string');
    });

    it('should return error if status is invalid', () => {
      const invalidBody = { title: 'Test', status: 'invalid_status' };
      expect(validateCreateTask(invalidBody)).toContain('status must be one of');
    });

    it('should allow omitting status (it uses default)', () => {
      const validBody = { title: 'Test' };
      expect(validateCreateTask(validBody)).toBeNull();
    });

    it('should return error if priority is invalid', () => {
      const invalidBody = { title: 'Test', priority: 'super_high' };
      expect(validateCreateTask(invalidBody)).toContain('priority must be one of');
    });

    it('should return error if dueDate is invalid', () => {
      const invalidBody = { title: 'Test', dueDate: 'invalid-date' };
      expect(validateCreateTask(invalidBody)).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask()', () => {
    it('should return null for valid update data', () => {
      const validBody = {
        title: 'Updated Task',
        status: 'done',
        priority: 'low',
        dueDate: '2025-01-01T00:00:00.000Z'
      };
      expect(validateUpdateTask(validBody)).toBeNull();
    });

    it('should allow empty body (no updates)', () => {
      const validBody = {};
      expect(validateUpdateTask(validBody)).toBeNull();
    });

    it('should return error if title is empty string', () => {
      const invalidBody = { title: '   ' };
      expect(validateUpdateTask(invalidBody)).toBe('title must be a non-empty string');
    });

    it('should return error if title is not a string', () => {
      const invalidBody = { title: 123 };
      expect(validateUpdateTask(invalidBody)).toBe('title must be a non-empty string');
    });

    it('should return error if status is invalid', () => {
      const invalidBody = { status: 'unknown' };
      expect(validateUpdateTask(invalidBody)).toContain('status must be one of');
    });

    it('should return error if priority is invalid', () => {
      const invalidBody = { priority: 'urgent' };
      expect(validateUpdateTask(invalidBody)).toContain('priority must be one of');
    });

    it('should return error if dueDate is invalid', () => {
      const invalidBody = { dueDate: 'not-a-date' };
      expect(validateUpdateTask(invalidBody)).toBe('dueDate must be a valid ISO date string');
    });
  });
});
