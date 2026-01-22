import { useUser } from '../../../contexts/DirectUserContext';
import { UserRole } from '../../../types';
import type { OKR } from '../types/okr.types';
import type { Sprint, SprintItem } from '../types/sprint.types';
import type { UnifiedTask } from '../types/task.types';
import { TaskSource } from '../types/task.types';

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

interface SprintItemPermissions {
  canCreate: boolean;
  canEdit: (item: SprintItem) => boolean;
  canDelete: (item: SprintItem) => boolean;
}

interface TaskPermissions {
  canCreate: boolean;
  canEdit: (task: UnifiedTask) => boolean;
  canDelete: (task: UnifiedTask) => boolean;
  canViewOwn: boolean;
}

interface Permissions {
  okr: OKRPermissions;
  sprint: SprintPermissions;
  sprintItem: SprintItemPermissions;
  task: TaskPermissions;
  isReadOnly: boolean;
  isCEO: boolean;
  isHEAD: boolean;
  isOP: boolean;
  userDepartment: string | null;
  userId: string | null;
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
      sprintItem: {
        canCreate: false,
        canEdit: () => false,
        canDelete: () => false,
      },
      task: {
        canCreate: false,
        canEdit: () => false,
        canDelete: () => false,
        canViewOwn: false,
      },
      isReadOnly: true,
      isCEO: false,
      isHEAD: false,
      isOP: true,
      userDepartment: null,
      userId: null,
    };
  }

  const normalizedRole = (user.role || '').toString().toUpperCase();
  const isCEO = normalizedRole === UserRole.SuperAdmin;
  const isHEAD = normalizedRole === UserRole.Admin;
  const isOP = normalizedRole === UserRole.User;
  
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

  // ============================================
  // PERMISSÕES DE SPRINT ITEMS
  // ============================================
  
  const sprintItemPermissions: SprintItemPermissions = {
    // CEO e HEAD podem criar itens em qualquer sprint
    // OP pode criar itens (serão atribuídos a ele)
    canCreate: isCEO || isHEAD,

    // CEO e HEAD podem editar qualquer item
    // OP pode editar apenas itens onde é responsável
    canEdit: (item: SprintItem) => {
      if (isCEO || isHEAD) return true;
      // OP só pode editar itens onde é responsável
      if (isOP && item.responsible_user_id === user.id) {
        return true;
      }
      return false;
    },

    // CEO e HEAD podem deletar qualquer item
    // OP pode deletar apenas itens onde é responsável
    canDelete: (item: SprintItem) => {
      if (isCEO || isHEAD) return true;
      // OP só pode deletar itens onde é responsável
      if (isOP && item.responsible_user_id === user.id) {
        return true;
      }
      return false;
    },
  };

  // ============================================
  // PERMISSÕES DE TASKS (Pessoais + Sprint)
  // ============================================
  
  const taskPermissions: TaskPermissions = {
    // Todos os usuários podem criar tasks pessoais
    canCreate: true,

    // Usuário pode editar:
    // - Tasks pessoais próprias
    // - Tasks de sprint onde é responsável
    canEdit: (task: UnifiedTask) => {
      if (task.source === TaskSource.PERSONAL) {
        return task.user_id === user.id;
      }
      // Para tasks de sprint, verificar se é responsável
      return task.responsible_user_id === user.id || isCEO || isHEAD;
    },

    // Usuário pode deletar:
    // - Apenas tasks pessoais próprias
    // - Tasks de sprint: apenas CEO/HEAD podem deletar
    canDelete: (task: UnifiedTask) => {
      if (task.source === TaskSource.PERSONAL) {
        return task.user_id === user.id;
      }
      // Tasks de sprint: apenas gestor pode deletar
      return isCEO || isHEAD;
    },

    // Todos os usuários podem ver suas próprias tasks
    canViewOwn: true,
  };

  return {
    okr: okrPermissions,
    sprint: sprintPermissions,
    sprintItem: sprintItemPermissions,
    task: taskPermissions,
    isReadOnly: isOP,
    isCEO,
    isHEAD,
    isOP,
    userDepartment,
    userId: user.id,
  };
}

