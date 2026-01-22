import { User, UserRole } from '../types';

export const canAccessCalculadora = (user: User | null): boolean => {
    if (!user) return false;
    if (user.role !== UserRole.User) return true;
    const department = (user.department || '').trim().toLowerCase();
    const cargo = (user.cargo || '').trim();
    return department === 'comercial' && cargo.length > 0;
};

export const canAccessCalls = (user: User | null): boolean => {
    if (!user) return false;
    if (user.role === UserRole.SuperAdmin || user.role === UserRole.Admin) return true;
    const department = (user.department || '').trim().toLowerCase();
    return department === 'comercial';
};
