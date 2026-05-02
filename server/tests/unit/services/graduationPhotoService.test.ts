/**
 * GraduationPhotoService 单元测试
 * 测试毕业照管理功能
 */

import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../../generators';

interface FaceTag {
  alumniId?: string;
  name: string;
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface GraduationPhoto {
  id: string;
  year: number;
  className: string;
  originalUrl: string;
  restoredUrl?: string;
  faceTags: FaceTag[];
}

class InMemoryPhotoStore extends InMemoryStore<GraduationPhoto> {
  findByYear(year: number): GraduationPhoto[] {
    return this.findAll().filter(p => p.year === year);
  }

  findByClassName(className: string): GraduationPhoto[] {
    return this.findAll().filter(p => p.className === className);
  }

  addFaceTag(photoId: string, tag: FaceTag): GraduationPhoto | null {
    const photo = this.findById(photoId);
    if (!photo) return null;
    
    const updatedTags = [...photo.faceTags, tag];
    return this.update(photoId, { faceTags: updatedTags });
  }

  removeFaceTag(photoId: string, tagIndex: number): GraduationPhoto | null {
    const photo = this.findById(photoId);
    if (!photo || tagIndex < 0 || tagIndex >= photo.faceTags.length) return null;
    
    const updatedTags = photo.faceTags.filter((_, i) => i !== tagIndex);
    return this.update(photoId, { faceTags: updatedTags });
  }

  updateFaceTag(photoId: string, tagIndex: number, updates: Partial<FaceTag>): GraduationPhoto | null {
    const photo = this.findById(photoId);
    if (!photo || tagIndex < 0 || tagIndex >= photo.faceTags.length) return null;
    
    const updatedTags = [...photo.faceTags];
    updatedTags[tagIndex] = { ...updatedTags[tagIndex], ...updates };
    return this.update(photoId, { faceTags: updatedTags });
  }
}

describe('GraduationPhotoService - CRUD Operations', () => {
  it('should create a graduation photo', () => {
    const store = new InMemoryPhotoStore();
    
    const photo = store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    expect(photo.id).toBe('photo-1');
    expect(photo.year).toBe(2020);
    expect(photo.faceTags).toHaveLength(0);
  });

  it('should find photo by id', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    const found = store.findById('photo-1');
    
    expect(found).not.toBeNull();
    expect(found?.year).toBe(2020);
  });

  it('should update photo', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    store.update('photo-1', { restoredUrl: 'https://example.com/restored.jpg' });
    const found = store.findById('photo-1');
    
    expect(found?.restoredUrl).toBe('https://example.com/restored.jpg');
  });

  it('should delete photo', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    const deleted = store.delete('photo-1');
    const found = store.findById('photo-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });
});

describe('GraduationPhotoService - Query Operations', () => {
  it('should find photos by year', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({ id: 'p1', year: 2020, className: 'A', originalUrl: 'url1', faceTags: [] });
    store.create({ id: 'p2', year: 2021, className: 'B', originalUrl: 'url2', faceTags: [] });
    store.create({ id: 'p3', year: 2020, className: 'C', originalUrl: 'url3', faceTags: [] });

    const photos2020 = store.findByYear(2020);
    
    expect(photos2020).toHaveLength(2);
    expect(photos2020.every(p => p.year === 2020)).toBe(true);
  });

  it('should find photos by class name', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({ id: 'p1', year: 2020, className: 'Class A', originalUrl: 'url1', faceTags: [] });
    store.create({ id: 'p2', year: 2021, className: 'Class B', originalUrl: 'url2', faceTags: [] });
    store.create({ id: 'p3', year: 2022, className: 'Class A', originalUrl: 'url3', faceTags: [] });

    const classAPhotos = store.findByClassName('Class A');
    
    expect(classAPhotos).toHaveLength(2);
    expect(classAPhotos.every(p => p.className === 'Class A')).toBe(true);
  });
});

describe('GraduationPhotoService - Face Tag Operations', () => {
  it('should add face tag to photo', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    const tag: FaceTag = {
      name: 'John Doe',
      boundingBox: { x: 10, y: 10, width: 20, height: 20 },
    };

    const updated = store.addFaceTag('photo-1', tag);
    
    expect(updated?.faceTags).toHaveLength(1);
    expect(updated?.faceTags[0].name).toBe('John Doe');
  });

  it('should remove face tag from photo', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [
        { name: 'John', boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
        { name: 'Jane', boundingBox: { x: 50, y: 50, width: 20, height: 20 } },
      ],
    });

    const updated = store.removeFaceTag('photo-1', 0);
    
    expect(updated?.faceTags).toHaveLength(1);
    expect(updated?.faceTags[0].name).toBe('Jane');
  });

  it('should update face tag', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [
        { name: 'Unknown', boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
      ],
    });

    const updated = store.updateFaceTag('photo-1', 0, { name: 'John Doe', alumniId: 'alumni-1' });
    
    expect(updated?.faceTags[0].name).toBe('John Doe');
    expect(updated?.faceTags[0].alumniId).toBe('alumni-1');
  });

  it('should return null when updating non-existent tag', () => {
    const store = new InMemoryPhotoStore();
    
    store.create({
      id: 'photo-1',
      year: 2020,
      className: 'Class A',
      originalUrl: 'https://example.com/photo.jpg',
      faceTags: [],
    });

    const updated = store.updateFaceTag('photo-1', 0, { name: 'John' });
    
    expect(updated).toBeNull();
  });
});
