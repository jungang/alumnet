import { donationProjectRepository, DonationProjectSearchCriteria } from '../repositories/donationProjectRepository';
import { DonationProject, DonationProjectStatus, ListResponse } from '../types/models';

export class DonationProjectService {
  async getList(criteria: DonationProjectSearchCriteria): Promise<ListResponse<DonationProject>> {
    return donationProjectRepository.findAll(criteria);
  }

  async getById(id: string): Promise<DonationProject | null> {
    return donationProjectRepository.findById(id);
  }

  async create(data: { name: string; description?: string; targetAmount: number }): Promise<DonationProject> {
    if (!data.name || !data.targetAmount) throw new Error('项目名称和目标金额不能为空');
    return donationProjectRepository.create(data);
  }

  async update(id: string, data: Partial<{ name: string; description: string; targetAmount: number; status: DonationProjectStatus }>): Promise<DonationProject | null> {
    const existing = await donationProjectRepository.findById(id);
    if (!existing) throw new Error('捐赠项目不存在');
    return donationProjectRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await donationProjectRepository.findById(id);
    if (!existing) throw new Error('捐赠项目不存在');
    return donationProjectRepository.delete(id);
  }

  async getDonationRecords(projectId: string): Promise<any[]> {
    return donationProjectRepository.getDonationRecords(projectId);
  }
}

export const donationProjectService = new DonationProjectService();
