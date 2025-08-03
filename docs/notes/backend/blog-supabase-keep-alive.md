# 如何防止 Supabase 免费项目被暂停：自动保活方案实战

## 背景

使用 Supabase 免费版搭建项目时，最让人头疼的问题之一就是：**如果超过 7 天没有数据库活动，项目会被自动暂停（paused）**。每次都需要手动去 Dashboard 重新激活，非常影响开发体验。

本文将分享一个完整的自动化解决方案，通过 GitHub Actions 定时执行保活脚本，让你的 Supabase 项目永远保持活跃状态。

## 问题分析

### 为什么会被暂停？

Supabase 免费版为了节省资源，会监测项目的活跃度。如果检测到项目在一段时间内没有任何数据库操作（查询、写入等），就会将其标记为不活跃并暂停服务。

### 传统解决方案的问题

1. **手动定期访问**：容易忘记，不可靠
2. **客户端定时请求**：需要保持客户端运行，不实用
3. **外部监控服务**：需要额外配置和维护

## 解决方案：GitHub Actions + 保活脚本

我们的方案利用 GitHub Actions 的定时任务功能，每天自动执行两次保活脚本，确保数据库始终有活动。

### 方案优势

- ✅ 完全免费（GitHub Actions 对公开仓库免费）
- ✅ 自动化运行，无需人工干预
- ✅ 可靠稳定，支持失败重试
- ✅ 易于监控和维护

## 实现步骤

### 1. 创建保活脚本

首先创建 `scripts/keep-alive.ts`：

```typescript
import { createClient } from "@supabase/supabase-js";

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("缺少必要的环境变量");
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log(`[${new Date().toISOString()}] 开始执行保活任务`);
  
  let successCount = 0;
  const operations = [];
  
  // 方法1: 使用 Supabase Storage API 健康检查
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Storage API 检查错误:", error);
      operations.push({ method: "Storage API check", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] Storage API 检查成功，Buckets 数量: ${data?.length || 0}`);
      operations.push({ method: "Storage API check", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("Storage API 异常:", error);
    operations.push({ method: "Storage API check", success: false, error: String(error) });
  }
  
  // 方法2: 创建一个临时的查询来保活
  try {
    // 尝试查询一个不存在的表，这足以保持连接活跃
    const { data, error } = await supabase
      .from(`_keep_alive_test_${Date.now()}`)
      .select('*')
      .limit(1);
    
    // 预期会报错（表不存在），但这足以保持连接活跃
    if (error && error.code === '42P01') {
      console.log(`[${new Date().toISOString()}] 保活查询执行成功（预期的表不存在错误）`);
      operations.push({ method: "Keep-alive query", success: true });
      successCount++;
    } else if (error) {
      console.error("保活查询错误:", error);
      operations.push({ method: "Keep-alive query", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] 保活查询意外成功`);
      operations.push({ method: "Keep-alive query", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("保活查询异常:", error);
    operations.push({ method: "Keep-alive query", success: false, error: String(error) });
  }
  
  // 方法3: Auth API 健康检查
  try {
    const { error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Auth session missing!') {
      console.error("Auth API 检查错误:", error);
      operations.push({ method: "Auth API check", success: false, error: error.message });
    } else {
      console.log(`[${new Date().toISOString()}] Auth API 检查成功`);
      operations.push({ method: "Auth API check", success: true });
      successCount++;
    }
  } catch (error) {
    console.error("Auth API 异常:", error);
    operations.push({ method: "Auth API check", success: false, error: String(error) });
  }
  
  // 总结
  console.log(`[${new Date().toISOString()}] 保活任务执行完成`);
  console.log(`成功操作数: ${successCount}/${operations.length}`);
  console.log("操作详情:", JSON.stringify(operations, null, 2));
  
  // 只要有一个操作成功就认为保活成功
  if (successCount === 0) {
    console.error("所有保活操作都失败了");
    process.exit(1);
  }
}

// 执行保活任务
keepAlive()
  .then(() => {
    console.log("保活脚本执行成功");
    process.exit(0);
  })
  .catch((error) => {
    console.error("保活脚本执行失败:", error);
    process.exit(1);
  });
```

### 2. 配置 GitHub Action

创建 `.github/workflows/keep-alive.yml`：

```yaml
name: Keep Supabase Alive

on:
  schedule:
    # 每天运行两次：北京时间上午 9 点和下午 9 点
    # UTC 时间 1:00 和 13:00 = 北京时间 9:00 和 21:00
    - cron: '0 1,13 * * *'
  workflow_dispatch: # 允许手动触发

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    environment: production  # 如果使用 environment 保护 secrets
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      
      - name: 设置 Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: 安装依赖
        run: bun install
      
      - name: 执行保活脚本
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
        run: bun run scripts/keep-alive.ts
      
      - name: 记录执行时间
        if: always()
        run: echo "保活任务执行完成于 $(date '+%Y-%m-%d %H:%M:%S')"
```

### 3. 配置 GitHub Secrets

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

- `NEXT_PUBLIC_SUPABASE_URL`：你的 Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 匿名密钥

如果使用了 environment，确保在对应的 environment 下配置这些 secrets。

### 4. 关键技术细节

#### 为什么使用多种保活方法？

我们实现了三种不同的保活方法，确保至少有一种能够成功：

1. **Storage API 检查**：调用存储桶列表接口
2. **数据库查询**：故意查询不存在的表
3. **Auth API 检查**：调用认证接口

这种冗余设计提高了保活的可靠性。

#### Supabase 客户端 vs 直连数据库

在实现过程中，我们发现了一个重要问题：

- **直连方式**（端口 5432）：在 GitHub Actions 环境中可能遇到网络连接问题
- **Supabase SDK**（HTTPS API）：更稳定可靠，推荐使用

```javascript
// ❌ 不推荐：直连数据库
const db = postgres('postgresql://...@db.project.supabase.co:5432/postgres')

// ✅ 推荐：使用 Supabase SDK
const supabase = createClient(url, key)
```

#### 使用连接池 URL

如果必须使用数据库直连（例如使用 Drizzle ORM），建议使用连接池 URL：

```
# 连接池 URL（推荐）
postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

# 直连 URL（可能有连接问题）
postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

### 5. 测试和验证

1. **本地测试**：
   ```bash
   bun run scripts/keep-alive.ts
   ```

2. **手动触发 GitHub Action**：
   ```bash
   gh workflow run keep-alive.yml
   ```

3. **查看运行结果**：
   ```bash
   gh run list --workflow=keep-alive.yml
   ```

## 运行效果

成功运行后，你会看到类似的日志：

```
[2025-08-03T02:16:26.667Z] 开始执行保活任务
[2025-08-03T02:16:27.619Z] Storage API 检查成功，Buckets 数量: 0
[2025-08-03T02:16:29.217Z] 保活查询执行成功（预期的表不存在错误）
[2025-08-03T02:16:29.219Z] Auth API 检查成功
[2025-08-03T02:16:29.219Z] 保活任务执行完成
成功操作数: 3/4
保活脚本执行成功
```

## 最佳实践

1. **设置合理的执行频率**：每天 2 次足够，太频繁可能触发速率限制
2. **监控执行状态**：定期检查 GitHub Actions 的执行历史
3. **处理失败情况**：GitHub Actions 支持失败重试，可以在 workflow 中配置
4. **安全考虑**：使用 GitHub Secrets 保护敏感信息，不要在代码中硬编码

## 故障排查

### 常见问题

1. **连接超时**
   - 检查 DATABASE_URL 格式是否正确
   - 尝试使用连接池 URL 而非直连 URL
   - 确保 Supabase 项目处于活跃状态

2. **环境变量未找到**
   - 确认 GitHub Secrets 配置正确
   - 检查 environment 设置是否匹配
   - 验证变量名称拼写

3. **权限错误**
   - 确保使用的是正确的 API 密钥
   - 检查 Supabase 的 RLS 策略设置

## 总结

通过 GitHub Actions 和简单的保活脚本，我们成功解决了 Supabase 免费项目被暂停的问题。这个方案：

- 🚀 完全自动化，一次配置永久生效
- 💰 零成本，利用免费的 GitHub Actions
- 🔒 安全可靠，使用环境变量保护敏感信息
- 📊 易于监控，可以随时查看执行状态

希望这个方案能帮助到使用 Supabase 免费版的开发者们，让大家能够专注于产品开发，而不是担心数据库被暂停的问题。

## 相关资源

- [Supabase 官方文档](https://supabase.com/docs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [示例代码仓库](https://github.com/your-repo/supabase-keep-alive)

---

*如果这篇文章对你有帮助，欢迎点赞和分享！有问题可以在评论区讨论。*