import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { HostelsController } from "./hostels.controller";
import { HostelsService } from "./hostels.service";

@Module({
  imports: [AuditModule],
  controllers: [HostelsController],
  providers: [HostelsService],
  exports: [HostelsService],
})
export class HostelsModule {}
