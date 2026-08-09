import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import {
  allowAuthDevBypass,
  isAuthDevBypass,
} from "../../src/auth/auth.utils";

describe("authz (integration)", () => {
  let app: INestApplication;
  const prevBypass = process.env.AUTH_DEV_BYPASS;

  beforeAll(async () => {
    process.env.AUTH_DEV_BYPASS = "false";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    process.env.AUTH_DEV_BYPASS = prevBypass;
    await app.close();
  });

  it("GET /health is public", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("GET /v1/session requires auth", async () => {
    const res = await request(app.getHttpServer()).get("/v1/session");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("GET /v1/settings requires auth", async () => {
    const res = await request(app.getHttpServer()).get("/v1/settings");
    expect(res.status).toBe(401);
  });
});

describe("authz with dev bypass (integration)", () => {
  let app: INestApplication;
  const prevBypass = process.env.AUTH_DEV_BYPASS;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    process.env.NODE_ENV = "development";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    process.env.AUTH_DEV_BYPASS = prevBypass;
    process.env.NODE_ENV = prevNodeEnv;
    await app.close();
  });

  it("allowAuthDevBypass requires header or localhost (CB-160)", () => {
    expect(isAuthDevBypass()).toBe(true);
    expect(
      allowAuthDevBypass({
        host: "api.example.com",
        remoteAddress: "203.0.113.10",
      }),
    ).toBe(false);
    expect(
      allowAuthDevBypass({
        bypassHeader: "true",
        host: "api.example.com",
        remoteAddress: "203.0.113.10",
      }),
    ).toBe(true);
  });

  it("GET /v1/session returns dev admin session", async () => {
    const res = await request(app.getHttpServer()).get("/v1/session");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("GET /v1/memberships/invites requires manageHostel (allowed for dev admin)", async () => {
    const res = await request(app.getHttpServer()).get("/v1/memberships/invites");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
