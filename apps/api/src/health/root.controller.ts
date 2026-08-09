import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

/** Browser-friendly landing for the API host (avoids a bare Nest 404). */
@Controller()
export class RootController {
  @Public()
  @Get()
  root() {
    return {
      ok: true,
      service: "vaikuntham-api",
      health: "/health",
      apiPrefix: "/v1",
    };
  }
}
