import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/users/user.module';
import { configEnv } from 'src/utils/config';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      async useFactory() {
        return {
          secret: configEnv.JWT_SECRET,
          signOptions: {
            expiresIn: configEnv.JWT_EXPIRE_AT,
          },
        };
      },
    }),
    UserModule,
  ],
  providers: [AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
