import { alumniAssociationRepository, AssociationSearchCriteria } from '../repositories/alumniAssociationRepository';
import { AlumniAssociation, ListResponse } from '../types/models';

export class AlumniAssociationService {
  async getList(criteria: AssociationSearchCriteria): Promise<ListResponse<AlumniAssociation>> {
    return alumniAssociationRepository.findAll(criteria);
  }
  async getById(id: string): Promise<AlumniAssociation | null> {
    return alumniAssociationRepository.findById(id);
  }
  async create(data: Partial<AlumniAssociation>): Promise<AlumniAssociation> {
    if (!data.city) throw new Error('城市不能为空');
    return alumniAssociationRepository.create(data);
  }
  async update(id: string, data: Partial<AlumniAssociation>): Promise<AlumniAssociation | null> {
    const existing = await alumniAssociationRepository.findById(id);
    if (!existing) throw new Error('校友会不存在');
    return alumniAssociationRepository.update(id, data);
  }
  async delete(id: string): Promise<boolean> {
    const existing = await alumniAssociationRepository.findById(id);
    if (!existing) throw new Error('校友会不存在');
    return alumniAssociationRepository.delete(id);
  }
}

export const alumniAssociationService = new AlumniAssociationService();
