import { SetMetadata } from '@nestjs/common';

export const PRIVILEGE_KEY = 'privilege';
export const RequirePrivilege = (privilege: string) => SetMetadata(PRIVILEGE_KEY, privilege);
