/**
 * VideoGreetingService 单元测试
 * 测试视频祝福管理功能
 */

import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../../generators';

type VideoGreetingStatus = 'pending' | 'approved' | 'rejected' | 'featured';

interface VideoGreeting {
  id: string;
  alumniId?: string;
  alumniName: string;
  alumniClass?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: VideoGreetingStatus;
  rejectionReason?: string;
  viewCount: number;
}

class InMemoryVideoStore extends InMemoryStore<VideoGreeting> {
  findByStatus(status: VideoGreetingStatus): VideoGreeting[] {
    return this.findAll().filter(v => v.status === status);
  }

  findFeatured(): VideoGreeting[] {
    return this.findAll().filter(v => v.status === 'featured');
  }

  approve(id: string): VideoGreeting | null {
    return this.update(id, { status: 'approved', rejectionReason: undefined });
  }

  reject(id: string, reason: string): VideoGreeting | null {
    return this.update(id, { status: 'rejected', rejectionReason: reason });
  }

  feature(id: string): VideoGreeting | null {
    const video = this.findById(id);
    if (!video || video.status !== 'approved') return null;
    return this.update(id, { status: 'featured' });
  }

  incrementViewCount(id: string): VideoGreeting | null {
    const video = this.findById(id);
    if (!video) return null;
    return this.update(id, { viewCount: video.viewCount + 1 });
  }
}

describe('VideoGreetingService - CRUD Operations', () => {
  it('should create a video greeting', () => {
    const store = new InMemoryVideoStore();
    
    const video = store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings from Class of 2020',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    expect(video.id).toBe('video-1');
    expect(video.status).toBe('pending');
    expect(video.viewCount).toBe(0);
  });

  it('should find video by id', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    const found = store.findById('video-1');
    
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Greetings');
  });

  it('should update video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    store.update('video-1', { description: 'A heartfelt message' });
    const found = store.findById('video-1');
    
    expect(found?.description).toBe('A heartfelt message');
  });

  it('should delete video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    const deleted = store.delete('video-1');
    const found = store.findById('video-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });
});

describe('VideoGreetingService - Status Management', () => {
  it('should approve video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    const approved = store.approve('video-1');
    
    expect(approved?.status).toBe('approved');
  });

  it('should reject video with reason', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    const rejected = store.reject('video-1', 'Inappropriate content');
    
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.rejectionReason).toBe('Inappropriate content');
  });

  it('should feature approved video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'approved',
      viewCount: 0,
    });

    const featured = store.feature('video-1');
    
    expect(featured?.status).toBe('featured');
  });

  it('should not feature pending video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'pending',
      viewCount: 0,
    });

    const featured = store.feature('video-1');
    
    expect(featured).toBeNull();
  });

  it('should not feature rejected video', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'rejected',
      viewCount: 0,
    });

    const featured = store.feature('video-1');
    
    expect(featured).toBeNull();
  });
});

describe('VideoGreetingService - Query Operations', () => {
  it('should find videos by status', () => {
    const store = new InMemoryVideoStore();
    
    store.create({ id: '1', alumniName: 'A', title: 'T1', videoUrl: 'u1', status: 'pending', viewCount: 0 });
    store.create({ id: '2', alumniName: 'B', title: 'T2', videoUrl: 'u2', status: 'approved', viewCount: 0 });
    store.create({ id: '3', alumniName: 'C', title: 'T3', videoUrl: 'u3', status: 'pending', viewCount: 0 });

    const pending = store.findByStatus('pending');
    
    expect(pending).toHaveLength(2);
    expect(pending.every(v => v.status === 'pending')).toBe(true);
  });

  it('should find featured videos', () => {
    const store = new InMemoryVideoStore();
    
    store.create({ id: '1', alumniName: 'A', title: 'T1', videoUrl: 'u1', status: 'featured', viewCount: 100 });
    store.create({ id: '2', alumniName: 'B', title: 'T2', videoUrl: 'u2', status: 'approved', viewCount: 50 });
    store.create({ id: '3', alumniName: 'C', title: 'T3', videoUrl: 'u3', status: 'featured', viewCount: 200 });

    const featured = store.findFeatured();
    
    expect(featured).toHaveLength(2);
    expect(featured.every(v => v.status === 'featured')).toBe(true);
  });
});

describe('VideoGreetingService - View Count', () => {
  it('should increment view count', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'approved',
      viewCount: 10,
    });

    store.incrementViewCount('video-1');
    const found = store.findById('video-1');
    
    expect(found?.viewCount).toBe(11);
  });

  it('should increment view count multiple times', () => {
    const store = new InMemoryVideoStore();
    
    store.create({
      id: 'video-1',
      alumniName: 'John Doe',
      title: 'Greetings',
      videoUrl: 'https://example.com/video.mp4',
      status: 'approved',
      viewCount: 0,
    });

    store.incrementViewCount('video-1');
    store.incrementViewCount('video-1');
    store.incrementViewCount('video-1');
    
    const found = store.findById('video-1');
    
    expect(found?.viewCount).toBe(3);
  });

  it('should return null when incrementing non-existent video', () => {
    const store = new InMemoryVideoStore();
    
    const result = store.incrementViewCount('non-existent');
    
    expect(result).toBeNull();
  });
});
