import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { RequestTimingMiddleware } from "./common/request-timing.middleware";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { HostelsModule } from "./hostels/hostels.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SessionModule } from "./session/session.module";
import { SettingsModule } from "./settings/settings.module";
import { StructureModule } from "./structure/structure.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    SessionModule,
    SettingsModule,
    StructureModule,
    AuditModule,
    MembershipsModule,
    HostelsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTimingMiddleware).forRoutes("*");
  }
}
