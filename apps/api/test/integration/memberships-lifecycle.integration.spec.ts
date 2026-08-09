import { INestApplication } from "@nestjs/common";
import { Role } from "@vaikuntham/db";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";

describe("memberships lifecycle (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const prevBypass = process.env.AUTH_DEV_BYPASS;

  beforeAll(async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    process.env.AUTH_DEV_BYPASS = prevBypass;
    await app.close();
  });

  it("PATCH role and DELETE member are scoped to manageHostel", async () => {
    const hostel = await prisma.hostel.findFirstOrThrow({
      where: { slug: "demo-hostel" },
    });

    const extra = await prisma.membership.create({
      data: {
        hostelId: hostel.id,
        clerkUserId: "test_warden_lifecycle",
        role: Role.WARDEN,
      },
    });

    const patch = await request(app.getHttpServer())
      .patch(`/v1/memberships/${extra.id}`)
      .send({ role: Role.ACCOUNTANT });
    expect(patch.status).toBe(200);
    expect(patch.body.ok).toBe(true);
    expect(patch.body.data.role).toBe("ACCOUNTANT");

    const del = await request(app.getHttpServer()).delete(
      `/v1/memberships/${extra.id}`,
    );
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const gone = await prisma.membership.findUnique({
      where: { id: extra.id },
    });
    expect(gone).toBeNull();
  });

  it("cannot demote the last admin", async () => {
    const admin = await prisma.membership.findFirstOrThrow({
      where: { role: Role.ADMIN, clerkUserId: "dev_user_admin" },
    });

    const res = await request(app.getHttpServer())
      .patch(`/v1/memberships/${admin.id}`)
      .send({ role: Role.WARDEN });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("LAST_ADMIN");
  });

  it("cannot revoke own membership", async () => {
    const self = await prisma.membership.findFirstOrThrow({
      where: { clerkUserId: "dev_user_admin" },
    });

    const res = await request(app.getHttpServer()).delete(
      `/v1/memberships/${self.id}`,
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SELF_REVOKE");
  });
});
