import { Module } from "@nestjs/common";
import { AllotmentController } from "./allotment.controller";
import { AllotmentService } from "./allotment.service";

@Module({
  controllers: [AllotmentController],
  providers: [AllotmentService],
  exports: [AllotmentService],
})
export class AllotmentModule {}
