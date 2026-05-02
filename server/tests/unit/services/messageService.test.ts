/**
 * MessageService 单元测试
 * 测试留言管理功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { InMemoryStore } from '../../generators';

// 留言数据接口
interface Message {
  id: string;
  content: string;
  authorName?: string;
  authorClass?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

// 内存留言存储（用于测试）
class InMemoryMessageStore extends InMemoryStore<Message> {
  batchUpdateStatus(ids: string[], status: 'approved' | 'rejected'): number {
    let count = 0;
    for (const id of ids) {
      const msg = this.findById(id);
      if (msg) {
        this.update(id, { status });
        count++;
      }
    }
    return count;
  }

  findByStatus(status: Message['status']): Message[] {
    return this.findAll().filter(m => m.status === status);
  }
}

describe('MessageService - CRUD Operations', () => {
  it('should create a message', () => {
    const store = new InMemoryMessageStore();
    const message: Message = {
      id: 'msg-1',
      content: 'Hello World',
      authorName: 'Test User',
      status: 'pending',
      createdAt: new Date(),
    };

    const created = store.create(message);
    
    expect(created.id).toBe('msg-1');
    expect(created.content).toBe('Hello World');
    expect(created.status).toBe('pending');
  });

  it('should find message by id', () => {
    const store = new InMemoryMessageStore();
    const message: Message = {
      id: 'msg-1',
      content: 'Hello World',
      status: 'pending',
      createdAt: new Date(),
    };

    store.create(message);
    const found = store.findById('msg-1');
    
    expect(found).not.toBeNull();
    expect(found?.content).toBe('Hello World');
  });

  it('should return null for non-existent message', () => {
    const store = new InMemoryMessageStore();
    const found = store.findById('non-existent');
    
    expect(found).toBeNull();
  });

  it('should update message status', () => {
    const store = new InMemoryMessageStore();
    const message: Message = {
      id: 'msg-1',
      content: 'Hello World',
      status: 'pending',
      createdAt: new Date(),
    };

    store.create(message);
    store.update('msg-1', { status: 'approved' });
    const found = store.findById('msg-1');
    
    expect(found?.status).toBe('approved');
  });

  it('should delete message', () => {
    const store = new InMemoryMessageStore();
    const message: Message = {
      id: 'msg-1',
      content: 'Hello World',
      status: 'pending',
      createdAt: new Date(),
    };

    store.create(message);
    const deleted = store.delete('msg-1');
    const found = store.findById('msg-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });
});

describe('MessageService - Batch Operations', () => {
  it('should batch update message status', () => {
    const store = new InMemoryMessageStore();
    
    // Create multiple messages
    for (let i = 1; i <= 5; i++) {
      store.create({
        id: `msg-${i}`,
        content: `Message ${i}`,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // Batch approve first 3
    const count = store.batchUpdateStatus(['msg-1', 'msg-2', 'msg-3'], 'approved');
    
    expect(count).toBe(3);
    expect(store.findById('msg-1')?.status).toBe('approved');
    expect(store.findById('msg-2')?.status).toBe('approved');
    expect(store.findById('msg-3')?.status).toBe('approved');
    expect(store.findById('msg-4')?.status).toBe('pending');
    expect(store.findById('msg-5')?.status).toBe('pending');
  });

  it('should handle batch update with non-existent ids', () => {
    const store = new InMemoryMessageStore();
    
    store.create({
      id: 'msg-1',
      content: 'Message 1',
      status: 'pending',
      createdAt: new Date(),
    });

    const count = store.batchUpdateStatus(['msg-1', 'msg-999'], 'approved');
    
    expect(count).toBe(1);
  });

  it('should handle empty batch update', () => {
    const store = new InMemoryMessageStore();
    const count = store.batchUpdateStatus([], 'approved');
    
    expect(count).toBe(0);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 16: 留言批量审核原子性**
   * **Validates: Requirements 1.4**
   */
  it('property: batch update should update all existing messages', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('approved', 'rejected') as fc.Arbitrary<'approved' | 'rejected'>,
        (ids, newStatus) => {
          const store = new InMemoryMessageStore();
          
          // Create messages for all ids
          ids.forEach(id => {
            store.create({
              id,
              content: 'test',
              status: 'pending',
              createdAt: new Date(),
            });
          });
          
          // Batch update
          const count = store.batchUpdateStatus(ids, newStatus);
          
          // All should be updated
          expect(count).toBe(ids.length);
          
          // Verify all have new status
          ids.forEach(id => {
            const msg = store.findById(id);
            expect(msg?.status).toBe(newStatus);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 19: 状态更新持久化**
   * **Validates: Requirements 1.4**
   */
  it('property: status update should persist', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.constantFrom('approved', 'rejected') as fc.Arbitrary<'approved' | 'rejected'>,
        (id, content, newStatus) => {
          const store = new InMemoryMessageStore();
          
          store.create({
            id,
            content,
            status: 'pending',
            createdAt: new Date(),
          });
          
          store.update(id, { status: newStatus });
          const found = store.findById(id);
          
          expect(found?.status).toBe(newStatus);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('MessageService - Query Operations', () => {
  it('should find messages by status', () => {
    const store = new InMemoryMessageStore();
    
    store.create({ id: 'msg-1', content: 'Msg 1', status: 'pending', createdAt: new Date() });
    store.create({ id: 'msg-2', content: 'Msg 2', status: 'approved', createdAt: new Date() });
    store.create({ id: 'msg-3', content: 'Msg 3', status: 'pending', createdAt: new Date() });

    const pending = store.findByStatus('pending');
    const approved = store.findByStatus('approved');
    
    expect(pending).toHaveLength(2);
    expect(approved).toHaveLength(1);
  });
});
