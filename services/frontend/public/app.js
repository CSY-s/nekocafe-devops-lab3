const reservationApi = "http://localhost:8081";
const memberApi = "http://localhost:8082";
const sessionKey = "nekocafe.session";

const elements = {
  authScreen: document.querySelector("#authScreen"),
  authTabs: document.querySelectorAll(".tab"),
  loginForm: document.querySelector("#loginForm"),
  registerCustomerForm: document.querySelector("#registerCustomerForm"),
  registerAdminForm: document.querySelector("#registerAdminForm"),
  logoutBtn: document.querySelector("#logoutBtn"),
  sessionText: document.querySelector("#sessionText"),
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  reservationStatus: document.querySelector("#reservationStatus"),
  memberStatus: document.querySelector("#memberStatus"),
  reservationCount: document.querySelector("#reservationCount"),
  reservationScope: document.querySelector("#reservationScope"),
  currentRole: document.querySelector("#currentRole"),
  currentAccount: document.querySelector("#currentAccount"),
  memberCard: document.querySelector("#memberCard"),
  memberList: document.querySelector("#memberList"),
  customerReservationList: document.querySelector("#customerReservationList"),
  adminReservationList: document.querySelector("#adminReservationList"),
  refreshBtn: document.querySelector("#refreshBtn"),
  reservationForm: document.querySelector("#reservationForm"),
  toast: document.querySelector("#toast"),
};

let currentSession = null;
let currentMember = null;
let membersCache = [];
let reservationsCache = [];

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || body.error || `HTTP ${response.status}`);
  }
  return body;
}

function saveSession(session, member) {
  currentSession = session;
  currentMember = member || null;
  localStorage.setItem(sessionKey, JSON.stringify({ session, member }));
}

function loadSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

function clearSession() {
  currentSession = null;
  currentMember = null;
  localStorage.removeItem(sessionKey);
  elements.authScreen.classList.remove("hidden");
  updateSessionHeader();
  showView("customerView");
}

function updateSessionHeader() {
  if (!currentSession) {
    elements.sessionText.textContent = "未登录";
    elements.currentRole.textContent = "-";
    elements.currentAccount.textContent = "-";
    return;
  }
  const roleLabel = currentSession.role === "admin" ? "管理员" : "用户";
  elements.sessionText.textContent = `${roleLabel} / ${currentSession.accountId} / ${currentSession.displayName}`;
  elements.currentRole.textContent = roleLabel;
  elements.currentAccount.textContent = currentSession.accountId;
}

function showView(viewId) {
  elements.navItems.forEach((nav) => nav.classList.toggle("active", nav.dataset.view === viewId));
  elements.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
}

function applyRoleNavigation() {
  const isAdmin = currentSession?.role === "admin";
  elements.navItems.forEach((item) => {
    const adminOnly = item.dataset.view === "adminView" || item.dataset.view === "opsView";
    const customerOnly = item.dataset.view === "customerView";
    item.classList.toggle("hidden", (adminOnly && !isAdmin) || (customerOnly && isAdmin));
  });
  showView(isAdmin ? "adminView" : "customerView");
}

function showAuthMode(mode) {
  elements.authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
  elements.loginForm.classList.toggle("hidden", mode !== "login");
  elements.registerCustomerForm.classList.toggle("hidden", mode !== "registerCustomer");
  elements.registerAdminForm.classList.toggle("hidden", mode !== "registerAdmin");
}

function setStatus(element, ok) {
  element.textContent = ok ? "正常" : "异常";
  element.classList.toggle("is-error", !ok);
}

async function loadHealth() {
  const checks = await Promise.allSettled([
    fetchJson(`${reservationApi}/healthz`),
    fetchJson(`${memberApi}/healthz`),
  ]);
  setStatus(elements.reservationStatus, checks[0].status === "fulfilled");
  setStatus(elements.memberStatus, checks[1].status === "fulfilled");
}

async function loadMembers() {
  const data = await fetchJson(`${memberApi}/members`);
  membersCache = data.items || [];
  renderMemberList();
}

async function loadReservations() {
  const query = currentSession?.role === "customer" ? `?memberId=${encodeURIComponent(currentSession.memberId)}` : "";
  const data = await fetchJson(`${reservationApi}/reservations${query}`);
  reservationsCache = data.items || [];
  renderReservations();
}

function renderMemberCard() {
  if (!currentMember) {
    elements.memberCard.innerHTML = "<p>管理员账号可在管理端处理预约和查看会员档案。</p>";
    return;
  }
  elements.memberCard.innerHTML = `
    <dl>
      <dt>编号</dt><dd>${currentMember.id}</dd>
      <dt>姓名</dt><dd>${currentMember.name}</dd>
      <dt>等级</dt><dd>${currentMember.level}</dd>
      <dt>积分</dt><dd>${currentMember.points}</dd>
      <dt>优惠券</dt><dd>${(currentMember.coupons || []).join("、") || "无"}</dd>
    </dl>
  `;
}

function renderMemberList() {
  elements.memberList.innerHTML = membersCache
    .map(
      (member) => `
        <article>
          <dl>
            <dt>编号</dt><dd>${member.id}</dd>
            <dt>姓名</dt><dd>${member.name}</dd>
            <dt>等级</dt><dd>${member.level}</dd>
            <dt>积分</dt><dd>${member.points}</dd>
            <dt>优惠券</dt><dd>${(member.coupons || []).join("、") || "无"}</dd>
          </dl>
        </article>
      `,
    )
    .join("");
}

function reservationRow(item, adminMode) {
  return `
    <div class="list-item">
      <strong>${item.id}</strong>
      <span>${item.memberId} / ${item.tableSize} 人 / ${item.slot}${item.note ? ` / ${item.note}` : ""}</span>
      <div class="admin-actions">
        <span class="badge">${item.status}</span>
        ${
          adminMode
            ? `
              <button type="button" data-status="CONFIRMED" data-id="${item.id}">确认</button>
              <button type="button" data-status="SEATED" data-id="${item.id}">入座</button>
              <button type="button" data-status="CANCELLED" data-id="${item.id}">取消</button>
              <button type="button" data-delete="${item.id}">删除</button>
            `
            : item.status !== "CANCELLED"
              ? `<button type="button" data-status="CANCELLED" data-id="${item.id}">取消预约</button>`
              : ""
        }
      </div>
    </div>
  `;
}

function renderReservations() {
  elements.reservationCount.textContent = String(reservationsCache.length);
  elements.reservationScope.textContent = currentSession?.role === "admin" ? "全部预约" : "我的预约";

  if (currentSession?.role === "admin") {
    elements.adminReservationList.innerHTML = reservationsCache.map((item) => reservationRow(item, true)).join("");
    elements.customerReservationList.innerHTML = "";
  } else {
    elements.customerReservationList.innerHTML = reservationsCache.map((item) => reservationRow(item, false)).join("");
    elements.adminReservationList.innerHTML = "";
  }
}

async function login(accountId, password) {
  const data = await fetchJson(`${memberApi}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, password }),
  });
  saveSession(data.session, data.member);
  elements.authScreen.classList.add("hidden");
  updateSessionHeader();
  applyRoleNavigation();
  await refreshAll();
}

async function register(role, payload) {
  const data = await fetchJson(`${memberApi}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, ...payload }),
  });
  saveSession(data.session, data.member);
  elements.authScreen.classList.add("hidden");
  updateSessionHeader();
  applyRoleNavigation();
  await refreshAll();
}

async function updateReservationStatus(id, status) {
  await fetchJson(`${reservationApi}/reservations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  await loadReservations();
}

async function deleteReservation(id) {
  await fetchJson(`${reservationApi}/reservations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await loadReservations();
}

async function refreshAll() {
  try {
    await Promise.all([loadHealth(), loadMembers()]);
    renderMemberCard();
    if (currentSession) {
      await loadReservations();
    }
  } catch (error) {
    showToast(`刷新失败：${error.message}`);
  }
}

elements.authTabs.forEach((tab) => {
  tab.addEventListener("click", () => showAuthMode(tab.dataset.authMode));
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await login(form.get("accountId"), form.get("password"));
  } catch (error) {
    showToast(`登录失败：${error.message}`);
  }
});

elements.registerCustomerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await register("customer", { name: form.get("name"), password: form.get("password") });
  } catch (error) {
    showToast(`注册失败：${error.message}`);
  }
});

elements.registerAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await register("admin", {
      name: form.get("name"),
      password: form.get("password"),
      inviteCode: form.get("inviteCode"),
    });
  } catch (error) {
    showToast(`注册失败：${error.message}`);
  }
});

elements.logoutBtn.addEventListener("click", clearSession);
elements.refreshBtn.addEventListener("click", refreshAll);

elements.navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.view));
});

elements.reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentSession?.role !== "customer") {
    showToast("请使用用户账号创建预约。");
    return;
  }

  const form = new FormData(event.currentTarget);
  const payload = {
    memberId: currentSession.memberId,
    tableSize: Number(form.get("tableSize")),
    slot: form.get("slot"),
    note: form.get("note"),
  };

  try {
    await fetchJson(`${reservationApi}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    event.currentTarget.reset();
    event.currentTarget.elements.tableSize.value = "2";
    event.currentTarget.elements.slot.value = "2026-05-20T18:30:00+08:00";
    showToast("预约已创建。");
    await loadReservations();
  } catch (error) {
    showToast(`创建失败：${error.message}`);
  }
});

document.addEventListener("click", async (event) => {
  const statusButton = event.target.closest("button[data-status]");
  const deleteButton = event.target.closest("button[data-delete]");

  try {
    if (statusButton) {
      await updateReservationStatus(statusButton.dataset.id, statusButton.dataset.status);
      showToast("预约已更新。");
    }
    if (deleteButton) {
      await deleteReservation(deleteButton.dataset.delete);
      showToast("预约已删除。");
    }
  } catch (error) {
    showToast(`操作失败：${error.message}`);
  }
});

(async function bootstrap() {
  const saved = loadSavedSession();
  if (saved?.session) {
    currentSession = saved.session;
    currentMember = saved.member || null;
    elements.authScreen.classList.add("hidden");
    updateSessionHeader();
    applyRoleNavigation();
  }
  await refreshAll();
})();
