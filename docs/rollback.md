# Rollback

## 一键回滚命令

```bash
helm rollback nekocafe -n nekocafe-prod
```

## 回滚触发条件

- P95 延迟连续 5 分钟大于 500ms。
- HTTP 5xx 错误率连续 5 分钟大于 1%。
- 新版本关键业务接口 `/reservations` 或 `/members/{id}` 健康检查失败。

## 回滚后检查

```bash
kubectl rollout status deployment/nekocafe-reservation -n nekocafe-prod
kubectl rollout status deployment/nekocafe-member -n nekocafe-prod
kubectl get pods -n nekocafe-prod
```

确认 Grafana 中错误率恢复到 1% 以下后，在缺陷台账记录事故开始时间、回滚时间、恢复时间和根因。
