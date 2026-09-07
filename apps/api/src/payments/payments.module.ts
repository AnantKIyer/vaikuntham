import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { FeesModule } from "../fees/fees.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuditModule, FeesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
