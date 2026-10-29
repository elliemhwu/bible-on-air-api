import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but lets anonymous requests through with `request.user`
 * set to null. Used by public endpoints that show more to signed-in staff.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser | null {
    return user || null;
  }
}
