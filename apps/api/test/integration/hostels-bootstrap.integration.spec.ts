import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Role } from "@vaikuntham/db";
import { API_ROUTES } from "@vaikuntham/shared";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { AuthService } from "../../src/auth/auth.service";
import { prisma, resetDatabase } from "./helpers";

const BOOTSTRAP_TOKEN = "test-hostel-bootstrap-token";

describe("hostel bootstrap (integration)", () => {
  let app: INestApplication;
  let auth: AuthService;
  const prev = {
    AUTH_DEV_BYPASS: process.env.AUTH_DEV_BYPASS,
    HOSTEL_BOOTSTRAP_TOKEN: process.env.HOSTEL_BOOTSTRAP_TOKEN,
  };

  beforeAll(async () => {
    process.env.AUTH_DEV_BYPASS = "false";
    process.env.HOSTEL_BOOTSTRAP_TOKEN = BOOTSTRAP_TOKEN;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    auth = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    process.env.AUTH_DEV_BYPASS = prev.AUTH_DEV_BYPASS;
    process.env.HOSTEL_BOOTSTRAP_TOKEN = prev.HOSTEL_BOOTSTRAP_TOKEN;
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects create without bootstrap token", async () => {
    const res = await request(app.getHttpServer())
      .post(API_ROUTES.hostels.root)
      .send({ name: "New Hostel" });
    expect(res.status).toBe(401);
  });

  it("creates hostel, links org, and bootstraps first user as ADMIN", async () => {
    const createRes = await request(app.getHttpServer())
      .post(API_ROUTES.hostels.root)
      .set("Authorization", `Bearer ${BOOTSTRAP_TOKEN}`)
      .send({
        name: "Green Valley Hostel",
        address: "12 MG Road",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ok).toBe(true);
    expect(createRes.body.data.slug).toBe("green-valley-hostel");
    expect(createRes.body.data.clerkOrgId).toBeNull();

    const hostelId = createRes.body.data.id as string;
    const orgId = "org_bootstrap_demo";

    const linkRes = await request(app.getHttpServer())
      .patch(API_ROUTES.hostels.linkOrg(hostelId))
      .set("Authorization", `Bearer ${BOOTSTRAP_TOKEN}`)
      .send({ clerkOrgId: orgId });

    expect(linkRes.status).toBe(200);
    expect(linkRes.body.data.clerkOrgId).toBe(orgId);

    // Idempotent re-link
    const again = await request(app.getHttpServer())
      .patch(API_ROUTES.hostels.linkOrg(hostelId))
      .set("Authorization", `Bearer ${BOOTSTRAP_TOKEN}`)
      .send({ clerkOrgId: orgId });
    expect(again.status).toBe(200);

    const session = await auth.resolveSessionFromClerk({
      userId: "user_first_admin",
      orgId,
      email: "admin@greenvalley.example",
    });

    expect(session.hostelId).toBe(hostelId);
    expect(session.role).toBe(Role.ADMIN);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "hostel.create", entityId: hostelId },
    });
    expect(audit).not.toBeNull();
  });

  it("rejects linking an org already used by another hostel", async () => {
    await prisma.hostel.create({
      data: {
        name: "Taken",
        slug: "taken",
        clerkOrgId: "org_taken",
      },
    });

    const createRes = await request(app.getHttpServer())
      .post(API_ROUTES.hostels.root)
      .set("Authorization", `Bearer ${BOOTSTRAP_TOKEN}`)
      .send({ name: "Other Hostel", slug: "other-hostel" });

    const linkRes = await request(app.getHttpServer())
      .patch(API_ROUTES.hostels.linkOrg(createRes.body.data.id))
      .set("Authorization", `Bearer ${BOOTSTRAP_TOKEN}`)
      .send({ clerkOrgId: "org_taken" });

    expect(linkRes.status).toBe(409);
    expect(linkRes.body.code).toBe("ORG_TAKEN");
  });
});
