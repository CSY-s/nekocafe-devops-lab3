# Runbook

## 服务异常告警时

1. 在 Grafana 查看 QPS、P99 延迟、错误率、CPU/内存面板。
2. 在 Loki 检索最近 5 分钟的 `level="error"` 日志，并按 `trace_id` 聚合。
3. 在 Tempo 或 Jaeger 中用 `trace_id` 定位慢接口、下游服务和节点。
4. 如果错误率持续超过 1%，执行 `docs/rollback.md` 中的一键回滚。

## 常用排查命令

```bash
docker compose ps
docker compose logs -f reservation member
curl -fsS http://localhost:8081/metrics
curl -fsS http://localhost:8082/metrics
```

## 故障分级

| 级别 | 判断标准 | 处理时限 |
| --- | --- | --- |
| P1 | 预约核心接口不可用或错误率 > 5% | 15 分钟内恢复 |
| P2 | P99 延迟 > 1s 且持续 10 分钟 | 30 分钟内缓解 |
| P3 | 单实例异常但整体可用 | 当日修复 |
