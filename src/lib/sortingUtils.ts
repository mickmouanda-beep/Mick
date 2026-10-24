import { Student } from '../types';

export const sortStudents = (students: Student[]): Student[] => {
  return [...students].sort((a, b) => {
    const lastNameA = (a.last_name || '').toLowerCase();
    const lastNameB = (b.last_name || '').toLowerCase();
    
    const lastNameComparison = lastNameA.localeCompare(lastNameB, 'fr', { sensitivity: 'base' });
    if (lastNameComparison !== 0) return lastNameComparison;
    
    const firstNameA = (a.first_name || '').toLowerCase();
    const firstNameB = (b.first_name || '').toLowerCase();
    
    return firstNameA.localeCompare(firstNameB, 'fr', { sensitivity: 'base' });
  });
};
