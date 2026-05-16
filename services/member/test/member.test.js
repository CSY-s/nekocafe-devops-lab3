const assert = require("node:assert");

const { accounts, healthPayload, login, members, metricsPayload, register } = require("../src/index");

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

run("health payload is ok", () => {
  const payload = healthPayload();
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "member");
});

run("seed data contains users and admins", () => {
  assert.equal(members.get("M001").level, "GOLD");
  assert.equal(accounts.get("A001").role, "admin");
});

run("login accepts valid credentials", () => {
  const [status, body] = login({ accountId: "M001", password: "123456" });
  assert.equal(status, 200);
  assert.equal(body.session.role, "customer");
  assert.equal(body.member.id, "M001");
});

run("login rejects invalid credentials", () => {
  const [status, body] = login({ accountId: "M001", password: "bad-password" });
  assert.equal(status, 401);
  assert.equal(body.error, "invalid_credentials");
});

run("register creates a new customer account and member", () => {
  const [status, body] = register({ role: "customer", name: "New User", password: "secret1" });
  assert.equal(status, 201);
  assert.equal(body.session.role, "customer");
  assert.ok(members.has(body.session.memberId));
});

run("register creates an admin only with invite code", () => {
  const [status, body] = register({
    role: "admin",
    name: "New Admin",
    password: "secret1",
    inviteCode: "NEKO-ADMIN",
  });
  assert.equal(status, 201);
  assert.equal(body.session.role, "admin");
});

run("metrics are prometheus text", () => {
  assert.match(metricsPayload(), /nekocafe_member_requests_total/);
  assert.match(metricsPayload(), /nekocafe_accounts_total/);
});
