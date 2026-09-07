import { Module } from "@nestjs/common";
import { AllotmentController } from "./allotment.controller";
import { AllotmentService } from "./allotment.service";
import { FeesModule } from "../fees/fees.module";

@Module({
  imports: [FeesModule],
  controllers: [AllotmentController],
  providers: [AllotmentService],
  exports: [AllotmentService],
})
export class AllotmentModule {}
