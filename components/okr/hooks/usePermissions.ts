import { useUser } from '../../../contexts/DirectUserContext';
import { UserRole } from '../../../types';
import type { OKR } from '../types/okr.types';
import type { Sprint } from '../types/sprint.types';

interface OKRPermissions {
  canCreate: boolean;
  canEdit: (okr: OKR) => boolean;
  canDelete: (okr: OKR) => boolean;
  canViewAll: boolean;
}

interface SprintPermissions {
  canCreate: boolean;
  canEdit: (sprint: Sprint) => boolean;
  canDelete: (sprint: Sprint) => boolean;
  canViewAll: boolean;
}

interface Permissions {
  okr: OKRPermissions;
  sprint: SprintPermissions;
  isReadOnly: boolean;
  isCEO: boolean;
  isHEAD: boolean;
  isOP: boolean;
  userDepartment: string | null;
}

export function usePermissions(): Permissions {
  const { user } = useUser();

  // Se não há usuário, retorna tudo como false/read-only
  if (!user) {
    return {
      okr: {
        canCreate: false,
        canEdit: () => false,
        canDelete: () => false,
        canViewAll: true,
      },
      sprint: {
        canCreate: false,
        canEdit: () => false,
        canDelete: () => false,
        canViewAll: true,
      },
      isReadOnly: true,
      isCEO: false,
      isHEAD: false,
      isOP: true,
      userDepartment: null,
    };
  }

  const isCEO = user.role === UserRole.SuperAdmin;
  const isHEAD = user.role === UserRole.Admin;
  const isOP = user.role === UserRole.User;
  
  // Assumindo que o usuário tem um campo 'department' (comercial, marketing, projetos, geral)
  // Se não tiver, precisamos buscar do Supabase profiles
  const userDepartment = (user as any).department || null;

  // ============================================
  // PERMISSÕES DE OKR
  // ============================================
  
  const okrPermissions: OKRPermissions = {
    // CEO pode criar qualquer OKR
    // HEAD pode criar OKRs setoriais do próprio departamento
    canCreate: isCEO || isHEAD,

    // CEO pode editar qualquer OKR
    // HEAD pode editar apenas OKRs do próprio departamento
    canEdit: (okr: OKR) => {
      if (isCEO) return true;
      if (isHEAD && userDepartment) {
        return okr.department === userDepartment;
      }
      return false;
    },

    // CEO pode deletar qualquer OKR
    // HEAD pode deletar apenas OKRs do próprio departamento
    canDelete: (okr: OKR) => {
      if (isCEO) return true;
      if (isHEAD && userDepartment) {
        return okr.department === userDepartment;
      }
      return false;
    },

    // Todos podem ver todos os OKRs (RLS garante o filtro no backend)
    canViewAll: true,
  };

  // ============================================
  // PERMISSÕES DE SPRINT
  // ============================================
  
  const sprintPermissions: SprintPermissions = {
    // CEO pode criar qualquer Sprint
    // HEAD pode criar Sprints do próprio departamento
    canCreate: isCEO || isHEAD,

    // CEO pode editar qualquer Sprint
    // HEAD pode editar apenas Sprints do próprio departamento
    canEdit: (sprint: Sprint) => {
      if (isCEO) return true;
      if (isHEAD && userDepartment) {
        return sprint.department === userDepartment;
      }
      return false;
    },

    // CEO pode deletar qualquer Sprint
    // HEAD pode deletar apenas Sprints do próprio departamento
    canDelete: (sprint: Sprint) => {
      if (isCEO) return true;
      if (isHEAD && userDepartment) {
        return sprint.department === userDepartment;
      }
      return false;
    },

    // Todos podem ver todas as Sprints (RLS garante o filtro no backend)
    canViewAll: true,
  };

  return {
    okr: okrPermissions,
    sprint: sprintPermissions,
    isReadOnly: isOP,
    isCEO,
    isHEAD,
    isOP,
    userDepartment,
  };
}

