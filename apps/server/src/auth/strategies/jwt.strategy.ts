import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PayloadToken } from '../models/token.model';
import { AuthService } from '../services/auth/auth.service';
import config from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private authService: AuthService,
    @Inject(config.KEY) configService: ConfigType<typeof config>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: '1d',
      secretOrKey: configService.jwtSecret,
    });
  }

  validate(payload: PayloadToken) {
    return payload;
  }
}
