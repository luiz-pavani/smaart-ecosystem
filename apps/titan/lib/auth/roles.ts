/**
 * Helpers de permissão baseados na hierarquia de roles do Titan.
 *
 * Hierarquia (nivel_hierarquico em public.roles, menor = mais alto):
 *   1 master_access      → acesso total a tudo e todos
 *   2 federacao_admin    → tudo na sua federação e abaixo
 *   3 federacao_gestor   → gestão operacional da federação
 *   4 academia_admin     → tudo na sua academia
 *   5 academia_gestor    → gestão operacional da academia
 *   6 professor          → aulas + atletas da academia
 *   7 atleta             → acesso pessoal
 *
 * Princípio: `master_access` herda todos os escopos abaixo. Qualquer
 * checagem que aceite `academia_admin` DEVE aceitar `master_access`.
 */

export const ROLES = {
  MASTER: 'master_access',
  FED_ADMIN: 'federacao_admin',
  FED_GESTOR: 'federacao_gestor',
  ACAD_ADMIN: 'academia_admin',
  ACAD_GESTOR: 'academia_gestor',
  PROFESSOR: 'professor',
  ATLETA: 'atleta',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Conjuntos canônicos — use SEMPRE estes em vez de hardcoded literals.

export const FEDERATION_MANAGERS: readonly string[] = [
  ROLES.MASTER, ROLES.FED_ADMIN, ROLES.FED_GESTOR,
]

export const ACADEMY_MANAGERS: readonly string[] = [
  ROLES.MASTER, ROLES.FED_ADMIN, ROLES.FED_GESTOR,
  ROLES.ACAD_ADMIN, ROLES.ACAD_GESTOR,
]

export const ACADEMY_STAFF: readonly string[] = [
  ROLES.MASTER, ROLES.FED_ADMIN, ROLES.FED_GESTOR,
  ROLES.ACAD_ADMIN, ROLES.ACAD_GESTOR, ROLES.PROFESSOR,
]

export const PROFESSOR_APPROVERS: readonly string[] = [
  ROLES.MASTER, ROLES.FED_ADMIN, ROLES.FED_GESTOR, ROLES.ACAD_ADMIN,
]

export function isMaster(role: string | null | undefined): boolean {
  return role === ROLES.MASTER
}

export function isFederationManager(role: string | null | undefined): boolean {
  return !!role && FEDERATION_MANAGERS.includes(role)
}

export function isAcademyManager(role: string | null | undefined): boolean {
  return !!role && ACADEMY_MANAGERS.includes(role)
}

export function isAcademyStaff(role: string | null | undefined): boolean {
  return !!role && ACADEMY_STAFF.includes(role)
}

export function canApproveProfessor(role: string | null | undefined): boolean {
  return !!role && PROFESSOR_APPROVERS.includes(role)
}
