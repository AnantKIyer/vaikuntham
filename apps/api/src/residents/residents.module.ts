import { Module } from "@nestjs/common";
import { AllotmentModule } from "../allotment/allotment.module";
import { AuditModule } from "../audit/audit.module";
import { ResidentsController } from "./residents.controller";
import { ResidentsService } from "./residents.service";

@Module({
  imports: [AuditModule, AllotmentModule],
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class ResidentsModule {}
