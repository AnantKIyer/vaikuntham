import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

@Global()
@Module({
  imports: [AuditModule],
  providers: [
    AuthService,
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
