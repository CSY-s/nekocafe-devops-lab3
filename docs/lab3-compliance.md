# 实验三 D3-2 功能达成清单

## 已完成

| 要求 | 当前实现 |
| --- | --- |
| 选取 2 个核心服务 | 已实现预约服务 `reservation` 与会员服务 `member` |
| Monorepo 结构 | 已将前端、两个后端、Docker、CI/CD、Helm、观测配置放在同一仓库 |
| README 一键启动 | 已提供 `docker compose up -d --build` 与 `make up` |
| 本地完整栈 | `frontend`、`reservation`、`member`、Postgres、Redis 均接入 compose |
| Dockerfile | 三个应用服务均有 Dockerfile |
| 依赖锁文件 | Node 服务含 `package-lock.json`，Python 服务使用标准库与 `requirements.txt` |
| 登录注册 | 支持用户登录、管理员登录、用户注册、管理员邀请码注册 |
| 用户业务 | 用户可创建预约、查看自己的预约、取消预约 |
| 管理员业务 | 管理员可查看全部预约、确认、入座、取消、删除预约，查看会员档案 |
| 健康检查 | 后端提供 `/healthz`、`/readyz` |
| 指标接口 | 后端提供 Prometheus 文本格式 `/metrics` |
| 结构化日志 | 后端输出 JSON 日志，包含服务名、路径、trace_id、耗时 |
| CI 流水线 | `.github/workflows/ci.yml` 覆盖 Lint、Unit Test、SAST、Build、Scan、Integration、Push |
| CD 流水线 | `.github/workflows/cd.yml` 覆盖 Helm lint、dev 部署、5% 金丝雀、健康门禁、回滚 |
| Helm Chart | `infra/helm` 包含 dev/staging/prod values 与 deployment/service/ingress/hpa/pdb 等 |
| 可观测性配置 | `infra/observability` 包含 Grafana Dashboard 与 Prometheus Alert 规则 |
| Runbook/回滚 | `docs/runbook.md` 与 `docs/rollback.md` 已提供 |

## 仍需实验环境截图或真实运行证明

| 要求 | 说明 |
| --- | --- |
| 镜像大小小于 200MB | 需要在启动 Docker Desktop 后执行 `docker images` 截图 |
| Trivy 无 HIGH/CRITICAL | 需要真实运行 Trivy 或 GitHub Actions 截图 |
| CI/CD 成功截图 | 需要推送到 GitHub 后截取 Actions 运行成功页面 |
| Helm lint / kube-linter 截图 | 需要本机安装 Helm/kube-linter 或在 CI 中运行后截图 |
| Grafana Dashboard 截图 | 需要启动 Prometheus/Grafana 或导入 dashboard 后截图 |
| DORA 指标 14 天数据 | 属于 D3-7 Excel 报告，不是 D3-2 文件夹本身 |

## 结论

D3-2 作为“源代码与配置仓库”已经具备完整可运行项目的主体内容。实验三最终提交还需要配合 D3-3 到 D3-7 补充截图、扫描报告、CI/CD 运行记录、Grafana 截图和 DORA 指标数据。
