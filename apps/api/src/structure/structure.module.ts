import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { StructureController } from "./structure.controller";
import { StructureService } from "./structure.service";

@Module({
  imports: [AuditModule],
  controllers: [StructureController],
  providers: [StructureService],
})
export class StructureModule {}
