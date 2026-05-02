import { 
  classRosterRepository, 
  ClassRosterSearchCriteria 
} from '../repositories/classRosterRepository';
import { ClassRoster, ClassRosterDetail, ClassStudent, ListResponse, ImportResult } from '../types/models';

export class ClassRosterService {
  // 获取班级名录列表
  async getList(criteria: ClassRosterSearchCriteria): Promise<ListResponse<ClassRoster>> {
    return classRosterRepository.findAll(criteria);
  }

  // 获取班级名录详情（包含学生和照片）
  async getById(id: string): Promise<ClassRosterDetail | null> {
    return classRosterRepository.findById(id);
  }

  // 创建班级名录
  async create(data: {
    className: string;
    graduationYear: number;
    headTeacher?: string;
    studentCount?: number;
    description?: string;
  }): Promise<ClassRoster> {
    // 验证必填字段
    if (!data.className || !data.className.trim()) {
      throw new Error('班级名称不能为空');
    }
    if (!data.graduationYear) {
      throw new Error('毕业年份不能为空');
    }
    if (data.graduationYear < 1900 || data.graduationYear > 2100) {
      throw new Error('毕业年份无效');
    }

    return classRosterRepository.create(data);
  }

  // 更新班级名录
  async update(id: string, data: {
    className?: string;
    graduationYear?: number;
    headTeacher?: string;
    studentCount?: number;
    description?: string;
  }): Promise<ClassRoster | null> {
    const existing = await classRosterRepository.findById(id);
    if (!existing) {
      throw new Error('班级名录不存在');
    }

    // 验证年份
    if (data.graduationYear !== undefined) {
      if (data.graduationYear < 1900 || data.graduationYear > 2100) {
        throw new Error('毕业年份无效');
      }
    }

    return classRosterRepository.update(id, data);
  }

  // 删除班级名录
  async delete(id: string): Promise<boolean> {
    const existing = await classRosterRepository.findById(id);
    if (!existing) {
      throw new Error('班级名录不存在');
    }
    return classRosterRepository.delete(id);
  }

  // 关联毕业照
  async linkPhoto(classId: string, photoId: string): Promise<boolean> {
    const existing = await classRosterRepository.findById(classId);
    if (!existing) {
      throw new Error('班级名录不存在');
    }
    return classRosterRepository.linkPhoto(classId, photoId);
  }

  // 取消关联毕业照
  async unlinkPhoto(classId: string, photoId: string): Promise<boolean> {
    return classRosterRepository.unlinkPhoto(classId, photoId);
  }

  // 添加学生
  async addStudent(data: {
    classId: string;
    studentName: string;
    studentId?: string;
    alumniId?: string;
    seatNumber?: number;
  }): Promise<ClassStudent> {
    if (!data.studentName || !data.studentName.trim()) {
      throw new Error('学生姓名不能为空');
    }

    const existing = await classRosterRepository.findById(data.classId);
    if (!existing) {
      throw new Error('班级名录不存在');
    }

    return classRosterRepository.addStudent(data);
  }

  // 更新学生信息
  async updateStudent(studentId: string, data: {
    studentName?: string;
    studentId?: string;
    seatNumber?: number;
    alumniId?: string;
  }): Promise<ClassStudent | null> {
    if (data.studentName !== undefined && !data.studentName.trim()) {
      throw new Error('学生姓名不能为空');
    }
    return classRosterRepository.updateStudent(studentId, data);
  }

  // 删除学生
  async removeStudent(studentId: string): Promise<boolean> {
    return classRosterRepository.removeStudent(studentId);
  }

  // 批量导入学生
  async importStudents(classId: string, students: { studentName: string; studentId?: string; seatNumber?: number }[]): Promise<ImportResult> {
    const existing = await classRosterRepository.findById(classId);
    if (!existing) {
      throw new Error('班级名录不存在');
    }

    if (!students || students.length === 0) {
      throw new Error('学生列表不能为空');
    }

    return classRosterRepository.importStudents(classId, students);
  }

  // 获取筛选选项
  async getFilterOptions(): Promise<{ years: number[] }> {
    const [years] = await Promise.all([
      classRosterRepository.getYears(),
    ]);
    return { years };
  }
}

export const classRosterService = new ClassRosterService();
