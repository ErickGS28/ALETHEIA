// Tipos compartidos entre frontend y backend — fuente de verdad única

export type Role = 'SOLICITANTE' | 'ADMINISTRADOR' | 'ABOGADO' | 'APROBADOR' | 'FIRMANTE';

export type ContractStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ADMIN_REVIEW'
  | 'LAWYER_REVIEW'
  | 'APPROVAL_PENDING'
  | 'SIGNING'
  | 'SIGNED'
  | 'REJECTED'
  | 'CANCELLED';

export type ProviderType = 'FISICA' | 'MORAL';

export type Privilege =
  | 'CONTRACT_CREATE'
  | 'CONTRACT_EDIT'
  | 'CONTRACT_SUBMIT'
  | 'CONTRACT_CANCEL'
  | 'CONTRACT_RECOVER'
  | 'CONTRACT_REVIEW_ADMIN'
  | 'CONTRACT_REVIEW_LAWYER'
  | 'CONTRACT_APPROVE'
  | 'CONTRACT_SIGN'
  | 'CONTRACT_VIEW_ALL'
  | 'CONTRACT_VIEW_AREA'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VERSION'
  | 'WORKFLOW_CONFIG'
  | 'USERS_MANAGE'
  | 'AREAS_MANAGE'
  | 'APODERADOS_MANAGE'
  | 'TEMPLATES_MANAGE'
  | 'REPORTS_VIEW';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  privileges: Privilege[];
}

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message: string;
}
