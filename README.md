# NekoCafe DevOps PoC

NekoCafe 猫咪主题餐饮预约平台的实验三 D3-2 源代码与配置仓库。仓库采用 Monorepo，将预约服务、会员服务、容器编排、CI/CD、Helm 与运维文档放在同一仓库中，便于课程实验在 30 分钟内完成 clone、构建、验证与演示。

## 架构取舍

- Monorepo：两个核心服务共享同一套 CI/CD、docker compose、Helm 与可观测性配置，适合课程 PoC 快速演示端到端流水线。
- 轻量服务：预约服务使用 Python 标准库 HTTP server，会员服务使用 Node.js 标准库 HTTP server，降低依赖下载失败的风险。
- 配置外置：端口、环境名、服务名、下游地址均通过环境变量注入，Secret 不进入代码仓库。

## 目录结构

```text
.
├── README.md
├── Makefile
├── docker-compose.yml
├── .editorconfig
├── .pre-commit-config.yaml
├── .github/workflows/
│   ├── ci.yml
│   └── cd.yml
├── docs/
│   ├── runbook.md
│   └── rollback.md
├── infra/
│   ├── helm/
│   └── observability/
└── services/
    ├── member/
    ├── frontend/
    └── reservation/
```

## 一键启动

```bash
make up
```

等价命令：

```bash
docker compose up -d --build
```

服务地址：

- 前端页面：http://localhost:8080
- 预约服务：http://localhost:8081
- 会员服务：http://localhost:8082

## 本地验证

```bash
make smoke
make test
```

手工验证：

```bash
curl http://localhost:8080
curl http://localhost:8081/healthz
curl http://localhost:8082/healthz
curl http://localhost:8081/reservations
curl http://localhost:8082/members/M001
curl http://localhost:8082/members
```

浏览器演示入口：

```text
http://localhost:8080
```

前端分为登录注册与三个业务视角：

- 登录：用户账号 `M001`-`M005` 默认密码 `123456`；管理员账号 `A001`/`A002` 默认密码 `admin123`。
- 注册用户：填写姓名和密码后生成新的会员账号，默认等级为 `BRONZE`。
- 注册管理员：填写姓名、密码和邀请码 `NEKO-ADMIN` 后生成新的管理员账号。
- 用户预约：用户登录后只能查看和取消自己的预约，可以创建新的预约。
- 管理员：管理员登录后查看全部预约和会员档案，并执行确认、入座、取消、删除。
- 运维状态：查看后端健康检查和 Prometheus 指标入口。

创建预约示例：

```bash
curl -X POST http://localhost:8081/reservations \
  -H "Content-Type: application/json" \
  -d "{\"memberId\":\"M001\",\"tableSize\":2,\"slot\":\"2026-05-20T18:30:00+08:00\"}"
```

管理员更新预约状态示例：

```bash
curl -X PATCH http://localhost:8081/reservations/R-1001 \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"SEATED\"}"
```

登录接口示例：

```bash
curl -X POST http://localhost:8082/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"M001\",\"password\":\"123456\"}"
```

注册用户示例：

```bash
curl -X POST http://localhost:8082/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"customer\",\"name\":\"New User\",\"password\":\"secret1\"}"
```

## CI/CD 阶段

CI 流水线包含：

```text
Lint -> Unit Test -> SAST -> Build -> Container Scan -> Integration Test -> Push Image
```

CD 流水线包含：

```text
Deploy dev -> Canary 5% -> Health Gate -> Promote 100% -> Auto Rollback
```

生产部署的敏感配置通过 GitHub Secrets 或集群 Secret 注入，仓库只保留模板和变量名。

## 可观测性

两个服务均输出：

- `/healthz`：存活检查
- `/readyz`：就绪检查
- `/metrics`：Prometheus 文本格式指标
- JSON 结构化日志：包含 `service`、`path`、`method`、`trace_id`

Grafana Dashboard 与 Prometheus 告警规则位于 `infra/observability/`。

## 常用命令

```bash
make up          # 启动完整本地栈
make down        # 停止并清理本地栈
make test        # 运行服务单元测试
make lint        # 语法与格式基础检查
make smoke       # 本地健康检查
make build       # 构建镜像
```

## 实验三达成情况

D3-2 的功能达成清单见 `docs/lab3-compliance.md`。该仓库已包含可运行项目主体；Trivy 扫描截图、CI/CD 成功截图、Grafana 截图和 DORA 指标数据需要在真实实验环境运行后补充到 D3-3 到 D3-7。
