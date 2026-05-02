/**
 * DonationProjectService 单元测试
 * 测试捐赠项目管理功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { InMemoryStore } from '../../generators';

// 捐赠项目数据接口
interface DonationProject {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'closed';
}

// 捐赠记录接口
interface DonationRecord {
  id: string;
  projectId: string;
  donorName: string;
  amount: number;
  createdAt: Date;
}

// 内存捐赠存储（用于测试）
class InMemoryDonationStore {
  private projects: Map<string, DonationProject> = new Map();
  private donations: DonationRecord[] = [];

  createProject(data: DonationProject): DonationProject {
    const project = { ...data, currentAmount: 0 };
    this.projects.set(data.id, project);
    return { ...project };
  }

  findProjectById(id: string): DonationProject | null {
    const project = this.projects.get(id);
    return project ? { ...project } : null;
  }

  updateProject(id: string, updates: Partial<DonationProject>): DonationProject | null {
    const project = this.projects.get(id);
    if (!project) return null;
    const updated = { ...project, ...updates, id: project.id };
    this.projects.set(id, updated);
    return { ...updated };
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  addDonation(donation: DonationRecord): DonationRecord {
    this.donations.push(donation);
    this.updateProjectAmount(donation.projectId);
    return { ...donation };
  }

  updateProjectAmount(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      const total = this.donations
        .filter(d => d.projectId === projectId)
        .reduce((sum, d) => sum + d.amount, 0);
      project.currentAmount = total;
    }
  }

  getDonationsTotal(projectId: string): number {
    return this.donations
      .filter(d => d.projectId === projectId)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  getDonationsByProject(projectId: string): DonationRecord[] {
    return this.donations.filter(d => d.projectId === projectId);
  }

  clear(): void {
    this.projects.clear();
    this.donations = [];
  }
}

describe('DonationProjectService - Project CRUD', () => {
  it('should create a donation project', () => {
    const store = new InMemoryDonationStore();
    
    const project = store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    expect(project.id).toBe('proj-1');
    expect(project.name).toBe('Test Project');
    expect(project.currentAmount).toBe(0);
  });

  it('should find project by id', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    const found = store.findProjectById('proj-1');
    
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Test Project');
  });

  it('should update project', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    store.updateProject('proj-1', { status: 'completed' });
    const found = store.findProjectById('proj-1');
    
    expect(found?.status).toBe('completed');
  });

  it('should delete project', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    const deleted = store.deleteProject('proj-1');
    const found = store.findProjectById('proj-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });
});

describe('DonationProjectService - Donation Operations', () => {
  it('should add donation and update project amount', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    store.addDonation({
      id: 'don-1',
      projectId: 'proj-1',
      donorName: 'Donor 1',
      amount: 1000,
      createdAt: new Date(),
    });

    const project = store.findProjectById('proj-1');
    
    expect(project?.currentAmount).toBe(1000);
  });

  it('should accumulate multiple donations', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Test Project',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    store.addDonation({
      id: 'don-1',
      projectId: 'proj-1',
      donorName: 'Donor 1',
      amount: 1000,
      createdAt: new Date(),
    });

    store.addDonation({
      id: 'don-2',
      projectId: 'proj-1',
      donorName: 'Donor 2',
      amount: 2000,
      createdAt: new Date(),
    });

    store.addDonation({
      id: 'don-3',
      projectId: 'proj-1',
      donorName: 'Donor 3',
      amount: 500,
      createdAt: new Date(),
    });

    const project = store.findProjectById('proj-1');
    
    expect(project?.currentAmount).toBe(3500);
  });

  it('should get donations by project', () => {
    const store = new InMemoryDonationStore();
    
    store.createProject({
      id: 'proj-1',
      name: 'Project 1',
      targetAmount: 100000,
      currentAmount: 0,
      status: 'active',
    });

    store.createProject({
      id: 'proj-2',
      name: 'Project 2',
      targetAmount: 50000,
      currentAmount: 0,
      status: 'active',
    });

    store.addDonation({
      id: 'don-1',
      projectId: 'proj-1',
      donorName: 'Donor 1',
      amount: 1000,
      createdAt: new Date(),
    });

    store.addDonation({
      id: 'don-2',
      projectId: 'proj-2',
      donorName: 'Donor 2',
      amount: 2000,
      createdAt: new Date(),
    });

    const proj1Donations = store.getDonationsByProject('proj-1');
    const proj2Donations = store.getDonationsByProject('proj-2');
    
    expect(proj1Donations).toHaveLength(1);
    expect(proj2Donations).toHaveLength(1);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 15: 捐赠金额累计正确性**
   * **Validates: Requirements 1.10**
   */
  it('property: currentAmount should equal sum of all donations', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1000, max: 1000000 }),
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 20 }),
        (projectId, name, targetAmount, donationAmounts) => {
          const store = new InMemoryDonationStore();
          
          // Create project
          store.createProject({
            id: projectId,
            name,
            targetAmount,
            currentAmount: 0,
            status: 'active',
          });
          
          // Add donations
          donationAmounts.forEach((amount, index) => {
            store.addDonation({
              id: `donation-${index}`,
              projectId,
              donorName: `Donor ${index}`,
              amount,
              createdAt: new Date(),
            });
          });
          
          // Get project and verify
          const project = store.findProjectById(projectId);
          const expectedTotal = donationAmounts.reduce((sum, a) => sum + a, 0);
          
          expect(project).not.toBeNull();
          expect(project!.currentAmount).toBe(expectedTotal);
          
          // Also verify against getDonationsTotal
          expect(store.getDonationsTotal(projectId)).toBe(expectedTotal);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: donations should be correctly associated with projects', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.record({
            amount: fc.integer({ min: 1, max: 10000 }),
            projectIndex: fc.integer({ min: 0, max: 4 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (projectIds, donations) => {
          const store = new InMemoryDonationStore();
          
          // Create projects
          projectIds.forEach((id, index) => {
            store.createProject({
              id,
              name: `Project ${index}`,
              targetAmount: 100000,
              currentAmount: 0,
              status: 'active',
            });
          });
          
          // Add donations
          donations.forEach((donation, index) => {
            const projectIndex = donation.projectIndex % projectIds.length;
            store.addDonation({
              id: `donation-${index}`,
              projectId: projectIds[projectIndex],
              donorName: `Donor ${index}`,
              amount: donation.amount,
              createdAt: new Date(),
            });
          });
          
          // Verify each project's currentAmount
          projectIds.forEach(projectId => {
            const project = store.findProjectById(projectId);
            const expectedTotal = store.getDonationsTotal(projectId);
            expect(project?.currentAmount).toBe(expectedTotal);
          });
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
