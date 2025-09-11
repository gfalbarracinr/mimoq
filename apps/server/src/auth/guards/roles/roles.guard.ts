import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Role } from '../../models/roles.model';
import { ROLES_KEY } from '../../decorators/roles.decorator';
import { PayloadToken } from '../../models/token.model';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const usuario = request.user as PayloadToken;
    const isAuth = roles.some((role) => role === usuario.role);
    if (!isAuth) {
      throw new UnauthorizedException('su rol no esta autorizado');
    }
    return isAuth;
  }
}
