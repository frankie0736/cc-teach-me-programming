# Cloudflare 生态系统完全指南

> 从零到一掌握 Cloudflare Workers 及其生态系统

## 目录

- [第一部分：基础概念](#第一部分基础概念)
  - [什么是 Cloudflare Workers](#什么是-cloudflare-workers)
  - [边缘计算的优势](#边缘计算的优势)
  - [适用场景分析](#适用场景分析)
- [第二部分：核心组件](#第二部分核心组件)
  - [计算服务](#计算服务)
  - [存储服务](#存储服务)
  - [消息队列](#消息队列)
  - [其他服务](#其他服务)
- [第三部分：实战架构](#第三部分实战架构)
  - [异步架构设计](#异步架构设计)
  - [常见架构模式](#常见架构模式)
  - [最佳实践](#最佳实践)
- [第四部分：应用案例](#第四部分应用案例)
  - [适合的应用类型](#适合的应用类型)
  - [不适合的场景](#不适合的场景)
  - [真实案例分析](#真实案例分析)
- [第五部分：开发指南](#第五部分开发指南)
  - [环境搭建](#环境搭建)
  - [开发流程](#开发流程)
  - [部署和监控](#部署和监控)
- [第六部分：进阶主题](#第六部分进阶主题)
  - [性能优化](#性能优化)
  - [安全最佳实践](#安全最佳实践)
  - [成本优化](#成本优化)

---

## 第一部分：基础概念

### 什么是 Cloudflare Workers

Cloudflare Workers 是一个**无服务器（Serverless）边缘计算平台**，让开发者能够在 Cloudflare 的全球网络上运行 JavaScript、TypeScript、Rust 和 C++ 代码。

#### 核心特点

1. **全球分布**：代码自动部署到 200+ 个数据中心
2. **零冷启动**：基于 V8 引擎，毫秒级启动
3. **按需计费**：只为实际使用付费
4. **自动扩展**：无需担心流量峰值

#### 与传统云服务对比

| 特性 | Cloudflare Workers | AWS Lambda | 传统服务器 |
|------|-------------------|------------|------------|
| 部署位置 | 全球边缘节点 | 特定区域 | 单一位置 |
| 冷启动 | < 5ms | 100-1000ms | N/A |
| 全球延迟 | < 50ms | 需要多区域部署 | 依赖 CDN |
| 运维成本 | 零 | 低 | 高 |
| 扩展性 | 自动 | 自动 | 手动 |

### 边缘计算的优势

```
传统架构：
用户 ─────────────> 中心服务器 ──────> 数据库
     （跨洋延迟）        │
                        ▼
                      处理请求
                        │
     <─────────────────┘
     （返回延迟）

边缘计算架构：
用户 ──> 最近的边缘节点 ──> 缓存/计算
     （本地延迟）     │
                     ▼
                 (仅必要时)
                     │
                 中心数据库
```

#### 主要优势

1. **低延迟**：就近处理，减少网络延迟
2. **高可用**：自动故障转移
3. **成本效益**：减少带宽成本
4. **更好的用户体验**：快速响应

### 适用场景分析

#### ✅ 完美适用

- API 网关和路由
- 静态网站生成
- A/B 测试
- 请求验证和过滤
- 图片优化和调整
- 地理位置路由
- 实时个性化

#### ⚠️ 需要评估

- 复杂的数据库操作
- 长时间运行的任务
- 大文件处理
- WebSocket 连接

#### ❌ 不建议使用

- 需要持久连接的应用
- CPU 密集型计算
- 需要特定运行环境

---

## 第二部分：核心组件

### 完整生态系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare 生态系统全景图                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🌐 网络层                                                    │
│  ├── CDN：全球内容分发网络                                      │
│  ├── DNS：权威 DNS 服务                                       │
│  ├── Load Balancing：负载均衡                                 │
│  └── Argo Smart Routing：智能路由                             │
│                                                              │
│  💻 计算层                                                    │
│  ├── Workers：无服务器函数                                     │
│  ├── Pages：静态网站托管                                       │
│  ├── Durable Objects：有状态的单实例计算                        │
│  └── Workers AI：AI 模型推理                                  │
│                                                              │
│  💾 存储层                                                    │
│  ├── KV：键值存储（最终一致性）                                  │
│  ├── R2：对象存储（S3 兼容）                                   │
│  ├── D1：SQLite 数据库                                       │
│  ├── Durable Objects Storage：强一致性存储                     │
│  └── Cache API：缓存存储                                     │
│                                                              │
│  📨 消息与队列                                                │
│  ├── Queues：消息队列                                        │
│  ├── Pub/Sub：发布订阅（Beta）                                │
│  └── Email Workers：邮件路由和处理                             │
│                                                              │
│  🔧 开发者工具                                                │
│  ├── Wrangler CLI：命令行工具                                 │
│  ├── Analytics Engine：自定义分析                             │
│  ├── Tail Workers：日志处理                                  │
│  └── Workers Analytics：性能监控                              │
│                                                              │
│  🛡️ 安全服务                                                 │
│  ├── Web Application Firewall (WAF)                         │
│  ├── DDoS Protection                                        │
│  ├── Bot Management                                         │
│  └── Zero Trust：零信任网络访问                                │
│                                                              │
│  📹 媒体服务                                                  │
│  ├── Stream：视频流处理                                       │
│  ├── Images：图片优化和调整                                    │
│  └── Cloudflare TV：直播服务                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 计算服务

#### 1. Workers - 核心计算单元

```javascript
// 基础 Worker 示例
export default {
  async fetch(request, env, ctx) {
    // request: 传入的 HTTP 请求
    // env: 环境变量和绑定
    // ctx: 执行上下文
    
    const url = new URL(request.url);
    
    // 路由处理
    switch (url.pathname) {
      case '/api/users':
        return handleUsers(request, env);
      case '/api/posts':
        return handlePosts(request, env);
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
  
  // 定时触发器
  async scheduled(event, env, ctx) {
    // 定时任务逻辑
    await cleanupOldData(env);
  },
  
  // 队列消费者
  async queue(batch, env, ctx) {
    // 处理队列消息
    for (const message of batch.messages) {
      await processMessage(message);
      message.ack();
    }
  }
};

// 环境变量类型定义
interface Env {
  // KV 命名空间
  MY_KV: KVNamespace;
  // D1 数据库
  MY_DB: D1Database;
  // R2 存储桶
  MY_BUCKET: R2Bucket;
  // Durable Object
  MY_DO: DurableObjectNamespace;
  // 队列
  MY_QUEUE: Queue;
  // 环境变量
  API_KEY: string;
}
```

#### 2. Durable Objects - 有状态计算

```javascript
// Durable Object 类定义
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 恢复持久化状态
    this.state.blockConcurrencyWhile(async () => {
      this.messages = await this.state.storage.get('messages') || [];
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/websocket':
        return this.handleWebSocket(request);
      case '/messages':
        return new Response(JSON.stringify(this.messages));
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  async handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    this.state.acceptWebSocket(server);
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws, message) {
    // 广播消息给所有连接
    const data = JSON.parse(message);
    this.messages.push(data);
    
    // 持久化消息
    await this.state.storage.put('messages', this.messages);
    
    // 广播给所有客户端
    this.state.getWebSockets().forEach(client => {
      client.send(message);
    });
  }
}

// Worker 中使用 Durable Object
export default {
  async fetch(request, env) {
    const roomId = 'global-chat';
    const id = env.CHAT_ROOM.idFromName(roomId);
    const room = env.CHAT_ROOM.get(id);
    
    // 将请求转发给 Durable Object
    return room.fetch(request);
  }
};
```

#### 3. Pages - 静态网站托管

```javascript
// pages/functions/api/[[route]].js
// Pages Functions - 为静态网站添加动态功能

export async function onRequest(context) {
  const {
    request,    // HTTP 请求
    env,        // 环境变量
    params,     // URL 参数
    waitUntil,  // 延长执行时间
    next,       // 中间件链
    data,       // 共享数据
  } = context;
  
  // 处理 API 请求
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(request, env);
  }
  
  // 继续处理静态资源
  return next();
}

// 中间件示例
export const onRequest = [
  authMiddleware,
  loggingMiddleware,
  handleRequest
];
```

### 存储服务

#### 1. KV - 键值存储

```javascript
// KV 存储特点：
// - 最终一致性（全球同步需要 60 秒）
// - 高读取性能（< 10ms）
// - 值大小限制：25MB
// - 适合：缓存、配置、会话

// 基础操作
await env.MY_KV.put('key', 'value');
await env.MY_KV.put('json-key', JSON.stringify(data));
await env.MY_KV.put('key-with-ttl', 'value', {
  expirationTtl: 60 * 60 * 24, // 24小时
});

// 读取
const value = await env.MY_KV.get('key');
const jsonValue = await env.MY_KV.get('json-key', 'json');
const streamValue = await env.MY_KV.get('large-key', 'stream');

// 列表操作
const list = await env.MY_KV.list({
  prefix: 'user:',
  limit: 100,
  cursor: 'next-cursor'
});

// 批量删除
for (const key of keysToDelete) {
  await env.MY_KV.delete(key);
}

// 带元数据存储
await env.MY_KV.put('key', 'value', {
  metadata: { 
    created: Date.now(),
    author: 'user123'
  }
});

const { value, metadata } = await env.MY_KV.getWithMetadata('key');
```

#### 2. R2 - 对象存储

```javascript
// R2 特点：
// - S3 兼容 API
// - 无出口费用
// - 强一致性
// - 适合：文件存储、备份、静态资源

// 上传文件
await env.MY_BUCKET.put('path/to/file.pdf', file.stream(), {
  httpMetadata: {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=31536000',
  },
  customMetadata: {
    uploadedBy: userId,
    version: '1.0'
  }
});

// 读取文件
const object = await env.MY_BUCKET.get('path/to/file.pdf');
if (object) {
  const blob = await object.blob();
  return new Response(blob, {
    headers: {
      'Content-Type': object.httpMetadata.contentType,
    }
  });
}

// 列出文件
const list = await env.MY_BUCKET.list({
  prefix: 'uploads/',
  limit: 100,
  include: ['httpMetadata', 'customMetadata']
});

// 删除文件
await env.MY_BUCKET.delete('path/to/file.pdf');

// 批量操作
const multipartUpload = await env.MY_BUCKET.createMultipartUpload('large-file');
// ... 上传 parts
await multipartUpload.complete(uploadedParts);

// 生成预签名 URL
const url = await env.MY_BUCKET.createSignedUrl('path/to/file.pdf', {
  expiresIn: 3600, // 1小时
});
```

#### 3. D1 - SQL 数据库

```javascript
// D1 特点：
// - SQLite 兼容
// - 强一致性
// - 支持事务
// - 大小限制：10GB（Beta）

// 创建表
await env.DB.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
  )
`).run();

// 插入数据
const stmt = env.DB.prepare(
  'INSERT INTO users (email, name, metadata) VALUES (?, ?, ?)'
);
const result = await stmt.bind(
  'user@example.com',
  'John Doe',
  JSON.stringify({ role: 'admin' })
).run();

// 查询数据
const users = await env.DB.prepare(
  'SELECT * FROM users WHERE created_at > ? ORDER BY id DESC LIMIT ?'
).bind('2024-01-01', 10).all();

// 事务处理
await env.DB.batch([
  env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')
    .bind(100, 'account1'),
  env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
    .bind(100, 'account2'),
  env.DB.prepare('INSERT INTO transactions (from_id, to_id, amount) VALUES (?, ?, ?)')
    .bind('account1', 'account2', 100)
]);

// 使用 JSON 函数
const jsonQuery = await env.DB.prepare(`
  SELECT 
    id,
    name,
    json_extract(metadata, '$.role') as role,
    json_extract(metadata, '$.permissions') as permissions
  FROM users
  WHERE json_extract(metadata, '$.role') = 'admin'
`).all();

// 全文搜索
await env.DB.prepare(`
  CREATE VIRTUAL TABLE posts_fts USING fts5(title, content);
`).run();

const searchResults = await env.DB.prepare(`
  SELECT * FROM posts_fts WHERE posts_fts MATCH ?
`).bind('cloudflare workers').all();
```

### 消息队列

#### Queues - 异步处理

```javascript
// 生产者 - 发送消息
export default {
  async fetch(request, env) {
    const data = await request.json();
    
    // 发送单个消息
    await env.MY_QUEUE.send({
      type: 'email',
      to: data.email,
      subject: 'Welcome!',
      timestamp: Date.now()
    });
    
    // 批量发送
    const messages = users.map(user => ({
      body: { userId: user.id, action: 'notify' },
      delaySeconds: 60 // 延迟 60 秒
    }));
    await env.MY_QUEUE.sendBatch(messages);
    
    return new Response('Queued');
  }
};

// 消费者 - 处理消息
export default {
  async queue(batch, env, ctx) {
    console.log(`Processing ${batch.messages.length} messages`);
    
    for (const message of batch.messages) {
      try {
        const { type, to, subject } = message.body;
        
        switch (type) {
          case 'email':
            await sendEmail(to, subject, env);
            break;
          case 'sms':
            await sendSMS(to, message.body.text, env);
            break;
          case 'webhook':
            await callWebhook(message.body.url, message.body.data);
            break;
        }
        
        // 确认消息已处理
        message.ack();
      } catch (error) {
        // 重试消息
        message.retry();
      }
    }
  }
};

// 死信队列处理
export default {
  async queue(batch, env) {
    // 处理失败的消息
    for (const message of batch.messages) {
      await env.DB.prepare(
        'INSERT INTO failed_messages (body, error, timestamp) VALUES (?, ?, ?)'
      ).bind(
        JSON.stringify(message.body),
        message.error,
        new Date().toISOString()
      ).run();
      
      message.ack();
    }
  }
};
```

---

## 第三部分：实战架构

### 异步架构设计

#### 1. 事件驱动架构

```javascript
// 事件总线实现
class EventBus {
  constructor(env) {
    this.env = env;
  }
  
  async emit(event, data) {
    // 根据事件类型路由到不同队列
    const routing = {
      'order.created': ['INVENTORY_QUEUE', 'PAYMENT_QUEUE', 'EMAIL_QUEUE'],
      'order.paid': ['SHIPPING_QUEUE', 'ANALYTICS_QUEUE'],
      'order.shipped': ['EMAIL_QUEUE', 'TRACKING_QUEUE'],
      'order.delivered': ['REVIEW_QUEUE', 'ANALYTICS_QUEUE']
    };
    
    const queues = routing[event] || [];
    
    await Promise.all(
      queues.map(queueName => 
        this.env[queueName].send({
          event,
          data,
          timestamp: Date.now(),
          correlationId: crypto.randomUUID()
        })
      )
    );
  }
}

// 使用示例
export default {
  async fetch(request, env) {
    const order = await request.json();
    const eventBus = new EventBus(env);
    
    // 保存订单
    await env.DB.prepare(
      'INSERT INTO orders (id, data) VALUES (?, ?)'
    ).bind(order.id, JSON.stringify(order)).run();
    
    // 发布事件
    await eventBus.emit('order.created', order);
    
    return new Response(JSON.stringify({ 
      status: 'accepted',
      orderId: order.id 
    }));
  }
};
```

#### 2. CQRS 模式实现

```javascript
// 命令处理器
class CommandHandler {
  constructor(env) {
    this.env = env;
  }
  
  async handle(command) {
    switch (command.type) {
      case 'CREATE_ORDER':
        return this.createOrder(command.data);
      case 'UPDATE_INVENTORY':
        return this.updateInventory(command.data);
      case 'PROCESS_PAYMENT':
        return this.processPayment(command.data);
    }
  }
  
  async createOrder(data) {
    // 写入事件存储
    const event = {
      id: crypto.randomUUID(),
      type: 'OrderCreated',
      aggregateId: data.orderId,
      data: data,
      timestamp: Date.now()
    };
    
    await this.env.EVENT_STORE.put(
      `event:${event.id}`,
      JSON.stringify(event)
    );
    
    // 更新读模型
    await this.env.READ_MODEL_QUEUE.send(event);
    
    return { success: true, eventId: event.id };
  }
}

// 查询处理器
class QueryHandler {
  constructor(env) {
    this.env = env;
  }
  
  async handle(query) {
    switch (query.type) {
      case 'GET_ORDER':
        return this.getOrder(query.orderId);
      case 'LIST_ORDERS':
        return this.listOrders(query.filters);
      case 'GET_ORDER_HISTORY':
        return this.getOrderHistory(query.orderId);
    }
  }
  
  async getOrder(orderId) {
    // 从读模型获取
    const order = await this.env.DB.prepare(
      'SELECT * FROM order_view WHERE id = ?'
    ).bind(orderId).first();
    
    return order;
  }
  
  async getOrderHistory(orderId) {
    // 获取事件历史
    const events = await this.env.KV.list({
      prefix: `event:order:${orderId}:`
    });
    
    const history = await Promise.all(
      events.keys.map(key => 
        this.env.KV.get(key.name, 'json')
      )
    );
    
    return history.sort((a, b) => a.timestamp - b.timestamp);
  }
}
```

#### 3. Saga 模式 - 分布式事务

```javascript
// Saga 协调器
class SagaOrchestrator {
  constructor(env) {
    this.env = env;
  }
  
  async executeSaga(sagaDefinition, context) {
    const sagaId = crypto.randomUUID();
    const completedSteps = [];
    
    try {
      // 执行每个步骤
      for (const step of sagaDefinition.steps) {
        const result = await this.executeStep(step, context);
        
        completedSteps.push({
          step: step.name,
          result,
          compensate: step.compensate
        });
        
        // 保存 Saga 状态
        await this.env.KV.put(
          `saga:${sagaId}`,
          JSON.stringify({
            id: sagaId,
            status: 'in_progress',
            completedSteps,
            context
          })
        );
      }
      
      // Saga 成功完成
      await this.env.KV.put(
        `saga:${sagaId}`,
        JSON.stringify({
          id: sagaId,
          status: 'completed',
          completedSteps,
          context
        })
      );
      
      return { success: true, sagaId };
      
    } catch (error) {
      // 补偿已完成的步骤
      await this.compensate(completedSteps, context);
      
      await this.env.KV.put(
        `saga:${sagaId}`,
        JSON.stringify({
          id: sagaId,
          status: 'compensated',
          error: error.message,
          completedSteps,
          context
        })
      );
      
      throw error;
    }
  }
  
  async executeStep(step, context) {
    const queue = this.env[step.queue];
    
    // 发送命令到队列
    await queue.send({
      action: step.action,
      data: context,
      sagaId: context.sagaId
    });
    
    // 等待结果（通过 Durable Object 或轮询）
    return this.waitForResult(step.name, context.sagaId);
  }
  
  async compensate(completedSteps, context) {
    // 反向执行补偿操作
    for (const step of completedSteps.reverse()) {
      if (step.compensate) {
        await this.env[step.compensate.queue].send({
          action: step.compensate.action,
          data: context,
          originalResult: step.result
        });
      }
    }
  }
}

// 使用示例：订单处理 Saga
const orderSaga = {
  name: 'ProcessOrder',
  steps: [
    {
      name: 'reserve_inventory',
      queue: 'INVENTORY_QUEUE',
      action: 'RESERVE',
      compensate: {
        queue: 'INVENTORY_QUEUE',
        action: 'RELEASE'
      }
    },
    {
      name: 'charge_payment',
      queue: 'PAYMENT_QUEUE',
      action: 'CHARGE',
      compensate: {
        queue: 'PAYMENT_QUEUE',
        action: 'REFUND'
      }
    },
    {
      name: 'create_shipping',
      queue: 'SHIPPING_QUEUE',
      action: 'CREATE_SHIPMENT',
      compensate: {
        queue: 'SHIPPING_QUEUE',
        action: 'CANCEL_SHIPMENT'
      }
    }
  ]
};
```

### 常见架构模式

#### 1. API 网关模式

```javascript
// API 网关实现
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 认证
    const auth = await authenticate(request, env);
    if (!auth.valid) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 限流
    const rateLimitOk = await checkRateLimit(auth.userId, env);
    if (!rateLimitOk) {
      return new Response('Too Many Requests', { status: 429 });
    }
    
    // 路由到不同的后端服务
    const routes = {
      '/api/users': 'https://users-service.internal',
      '/api/orders': 'https://orders-service.internal',
      '/api/products': 'https://products-service.internal'
    };
    
    for (const [path, backend] of Object.entries(routes)) {
      if (url.pathname.startsWith(path)) {
        // 添加追踪头
        const headers = new Headers(request.headers);
        headers.set('X-Request-ID', crypto.randomUUID());
        headers.set('X-User-ID', auth.userId);
        
        // 转发请求
        const backendUrl = backend + url.pathname.slice(path.length);
        const response = await fetch(backendUrl, {
          method: request.method,
          headers,
          body: request.body
        });
        
        // 记录日志
        ctx.waitUntil(
          logRequest(request, response, auth.userId, env)
        );
        
        return response;
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

// 限流实现（使用 Durable Objects）
export class RateLimiter {
  constructor(state) {
    this.state = state;
    this.limiter = {};
  }
  
  async fetch(request) {
    const { userId, limit = 100, window = 60 } = await request.json();
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    // 清理过期记录
    if (!this.limiter[userId]) {
      this.limiter[userId] = [];
    }
    
    this.limiter[userId] = this.limiter[userId].filter(
      time => time > windowStart
    );
    
    // 检查限制
    if (this.limiter[userId].length >= limit) {
      return new Response(JSON.stringify({ 
        allowed: false,
        retryAfter: this.limiter[userId][0] + window * 1000 - now
      }));
    }
    
    // 记录请求
    this.limiter[userId].push(now);
    
    return new Response(JSON.stringify({ 
      allowed: true,
      remaining: limit - this.limiter[userId].length
    }));
  }
}
```

#### 2. 缓存策略模式

```javascript
// 多级缓存实现
class CacheStrategy {
  constructor(env) {
    this.env = env;
  }
  
  async get(key, fetcher) {
    // 1. 尝试从边缘缓存获取
    const cacheKey = new Request(`https://cache.local/${key}`);
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    
    if (response) {
      console.log('Cache hit: edge cache');
      return response;
    }
    
    // 2. 尝试从 KV 获取
    const kvData = await this.env.CACHE_KV.get(key);
    if (kvData) {
      console.log('Cache hit: KV');
      response = new Response(kvData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // 更新边缘缓存
      await cache.put(cacheKey, response.clone());
      return response;
    }
    
    // 3. 从源获取数据
    console.log('Cache miss: fetching from origin');
    const data = await fetcher();
    
    // 4. 更新所有缓存层
    response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5分钟
      }
    });
    
    // 异步更新缓存
    this.env.ctx.waitUntil(
      Promise.all([
        cache.put(cacheKey, response.clone()),
        this.env.CACHE_KV.put(key, JSON.stringify(data), {
          expirationTtl: 3600 // 1小时
        })
      ])
    );
    
    return response;
  }
  
  async invalidate(pattern) {
    // 清理匹配的缓存
    const keys = await this.env.CACHE_KV.list({ prefix: pattern });
    
    await Promise.all(
      keys.keys.map(key => this.env.CACHE_KV.delete(key.name))
    );
    
    // 注意：边缘缓存需要通过 Purge API 清理
  }
}

// 使用示例
export default {
  async fetch(request, env, ctx) {
    const cache = new CacheStrategy({ ...env, ctx });
    
    const productId = new URL(request.url).pathname.split('/').pop();
    
    return cache.get(`product:${productId}`, async () => {
      // 从数据库获取产品信息
      const product = await env.DB.prepare(
        'SELECT * FROM products WHERE id = ?'
      ).bind(productId).first();
      
      // 聚合相关数据
      const [reviews, inventory] = await Promise.all([
        getProductReviews(productId, env),
        getProductInventory(productId, env)
      ]);
      
      return {
        ...product,
        reviews,
        inventory
      };
    });
  }
};
```

#### 3. 微服务编排模式

```javascript
// 服务编排器
class ServiceOrchestrator {
  constructor(env) {
    this.env = env;
    this.services = {
      users: new UserService(env),
      orders: new OrderService(env),
      inventory: new InventoryService(env),
      shipping: new ShippingService(env)
    };
  }
  
  async processCheckout(checkoutData) {
    const workflow = [
      // 步骤 1: 验证用户
      {
        name: 'validateUser',
        service: 'users',
        method: 'validate',
        input: () => ({ userId: checkoutData.userId }),
        required: true
      },
      
      // 步骤 2: 检查库存（并行）
      {
        name: 'checkInventory',
        service: 'inventory',
        method: 'checkAvailability',
        input: () => ({ items: checkoutData.items }),
        parallel: true,
        required: true
      },
      
      // 步骤 3: 计算运费（并行）
      {
        name: 'calculateShipping',
        service: 'shipping',
        method: 'calculateCost',
        input: (context) => ({
          items: checkoutData.items,
          address: context.validateUser.address
        }),
        parallel: true,
        required: false
      },
      
      // 步骤 4: 创建订单
      {
        name: 'createOrder',
        service: 'orders',
        method: 'create',
        input: (context) => ({
          ...checkoutData,
          shippingCost: context.calculateShipping?.cost || 0
        }),
        required: true
      }
    ];
    
    return this.executeWorkflow(workflow);
  }
  
  async executeWorkflow(workflow) {
    const context = {};
    const parallelGroup = [];
    
    for (const step of workflow) {
      if (step.parallel) {
        // 收集并行任务
        parallelGroup.push(step);
      } else {
        // 执行并行组
        if (parallelGroup.length > 0) {
          const results = await Promise.allSettled(
            parallelGroup.map(s => this.executeStep(s, context))
          );
          
          for (let i = 0; i < parallelGroup.length; i++) {
            const step = parallelGroup[i];
            const result = results[i];
            
            if (result.status === 'fulfilled') {
              context[step.name] = result.value;
            } else if (step.required) {
              throw new Error(`Step ${step.name} failed: ${result.reason}`);
            }
          }
          
          parallelGroup.length = 0;
        }
        
        // 执行当前步骤
        try {
          context[step.name] = await this.executeStep(step, context);
        } catch (error) {
          if (step.required) {
            throw error;
          }
          console.error(`Optional step ${step.name} failed:`, error);
        }
      }
    }
    
    return context;
  }
  
  async executeStep(step, context) {
    const service = this.services[step.service];
    const input = typeof step.input === 'function' 
      ? step.input(context) 
      : step.input;
    
    return service[step.method](input);
  }
}
```

### 最佳实践

#### 1. 错误处理和重试

```javascript
// 重试机制实现
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
  }
  
  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(context);
      } catch (error) {
        lastError = error;
        
        // 检查是否可重试
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          throw error;
        }
        
        // 计算延迟
        const delay = Math.min(
          this.initialDelay * Math.pow(this.backoffMultiplier, attempt),
          this.maxDelay
        );
        
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  isRetryable(error) {
    // 只重试临时性错误
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return error.status && retryableCodes.includes(error.status);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 断路器模式
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.resetTimeout = options.resetTimeout || 30000;
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await Promise.race([
        fn(),
        this.timeoutPromise(this.timeout)
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
    }
  }
  
  timeoutPromise(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }
}
```

#### 2. 监控和日志

```javascript
// 结构化日志
class Logger {
  constructor(env) {
    this.env = env;
  }
  
  async log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
      environment: this.env.ENVIRONMENT,
      region: this.env.CF_REGION
    };
    
    // 发送到日志队列
    await this.env.LOG_QUEUE.send(logEntry);
    
    // 控制台输出
    console.log(JSON.stringify(logEntry));
  }
  
  async error(message, error, metadata = {}) {
    await this.log('ERROR', message, {
      ...metadata,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }
  
  async metric(name, value, tags = {}) {
    await this.env.METRICS_QUEUE.send({
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }
}

// 请求追踪
class RequestTracer {
  constructor() {
    this.traceId = crypto.randomUUID();
    this.spans = [];
  }
  
  startSpan(name) {
    const span = {
      name,
      traceId: this.traceId,
      spanId: crypto.randomUUID(),
      startTime: Date.now(),
      tags: {}
    };
    
    this.spans.push(span);
    return span;
  }
  
  endSpan(span, status = 'success') {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
  }
  
  addTag(span, key, value) {
    span.tags[key] = value;
  }
  
  async flush(env) {
    await env.TRACES_QUEUE.send({
      traceId: this.traceId,
      spans: this.spans
    });
  }
}

// 使用示例
export default {
  async fetch(request, env, ctx) {
    const logger = new Logger(env);
    const tracer = new RequestTracer();
    
    const mainSpan = tracer.startSpan('handle_request');
    
    try {
      // 记录请求
      await logger.log('INFO', 'Request received', {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers)
      });
      
      // 处理请求
      const dbSpan = tracer.startSpan('database_query');
      const data = await env.DB.prepare('SELECT * FROM users').all();
      tracer.endSpan(dbSpan);
      
      // 记录指标
      await logger.metric('request_count', 1, {
        endpoint: new URL(request.url).pathname
      });
      
      tracer.endSpan(mainSpan);
      
      // 异步刷新追踪数据
      ctx.waitUntil(tracer.flush(env));
      
      return new Response(JSON.stringify(data));
      
    } catch (error) {
      tracer.endSpan(mainSpan, 'error');
      await logger.error('Request failed', error, {
        url: request.url
      });
      
      throw error;
    }
  }
};
```

---

## 第四部分：应用案例

### 适合的应用类型

#### 1. SaaS 应用示例

```javascript
// 多租户 SaaS 应用架构
class MultiTenantApp {
  constructor(env) {
    this.env = env;
  }
  
  async handleRequest(request) {
    // 1. 识别租户
    const tenant = await this.identifyTenant(request);
    
    // 2. 租户隔离
    const tenantDb = this.getTenantDb(tenant.id);
    const tenantStorage = this.getTenantStorage(tenant.id);
    
    // 3. 应用租户特定配置
    const config = await this.getTenantConfig(tenant.id);
    
    // 4. 处理业务逻辑
    return this.processRequest(request, {
      tenant,
      db: tenantDb,
      storage: tenantStorage,
      config
    });
  }
  
  async identifyTenant(request) {
    // 从域名识别
    const hostname = new URL(request.url).hostname;
    const subdomain = hostname.split('.')[0];
    
    // 从数据库获取租户信息
    const tenant = await this.env.DB.prepare(
      'SELECT * FROM tenants WHERE subdomain = ? OR custom_domain = ?'
    ).bind(subdomain, hostname).first();
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    return tenant;
  }
  
  getTenantDb(tenantId) {
    // 租户数据隔离策略
    return {
      prepare: (sql) => {
        // 自动添加租户过滤
        const modifiedSql = sql.replace(
          /FROM (\w+)/g,
          `FROM $1 WHERE tenant_id = '${tenantId}'`
        );
        return this.env.DB.prepare(modifiedSql);
      }
    };
  }
  
  getTenantStorage(tenantId) {
    // 租户存储隔离
    return {
      put: (key, value) => 
        this.env.R2.put(`${tenantId}/${key}`, value),
      get: (key) => 
        this.env.R2.get(`${tenantId}/${key}`)
    };
  }
}

// 计费和限制
class BillingManager {
  async checkUsage(tenantId, resource) {
    const usage = await this.getUsage(tenantId, resource);
    const limit = await this.getLimit(tenantId, resource);
    
    if (usage >= limit) {
      throw new Error(`Usage limit exceeded for ${resource}`);
    }
    
    // 记录使用量
    await this.recordUsage(tenantId, resource, 1);
  }
  
  async getUsage(tenantId, resource) {
    const key = `usage:${tenantId}:${resource}:${this.getCurrentPeriod()}`;
    return parseInt(await this.env.KV.get(key) || '0');
  }
  
  async recordUsage(tenantId, resource, amount) {
    const key = `usage:${tenantId}:${resource}:${this.getCurrentPeriod()}`;
    const current = await this.getUsage(tenantId, resource);
    
    await this.env.KV.put(key, String(current + amount), {
      expirationTtl: 86400 * 31 // 31天后过期
    });
    
    // 异步计费
    await this.env.BILLING_QUEUE.send({
      tenantId,
      resource,
      amount,
      timestamp: Date.now()
    });
  }
}
```

#### 2. 电商平台示例

```javascript
// 完整电商系统架构
class EcommerceSystem {
  // 产品服务
  async handleProduct(request, env) {
    const url = new URL(request.url);
    const productId = url.pathname.split('/').pop();
    
    if (request.method === 'GET') {
      // 获取产品信息（带缓存）
      const cacheKey = `product:${productId}`;
      let product = await env.KV.get(cacheKey, 'json');
      
      if (!product) {
        product = await env.DB.prepare(
          'SELECT * FROM products WHERE id = ?'
        ).bind(productId).first();
        
        // 缓存产品信息
        await env.KV.put(cacheKey, JSON.stringify(product), {
          expirationTtl: 3600
        });
      }
      
      // 实时库存查询
      const inventory = await this.getInventory(productId, env);
      
      return new Response(JSON.stringify({
        ...product,
        inventory
      }));
    }
  }
  
  // 购物车服务（使用 Durable Object）
  async handleCart(request, env) {
    const userId = await this.getUserId(request);
    const cartId = env.CART.idFromName(userId);
    const cart = env.CART.get(cartId);
    
    return cart.fetch(request);
  }
  
  // 订单处理
  async createOrder(orderData, env) {
    const orderId = crypto.randomUUID();
    
    // 开始事务
    const transaction = new OrderTransaction(orderId);
    
    try {
      // 1. 验证库存
      await transaction.step('VALIDATE_INVENTORY', async () => {
        for (const item of orderData.items) {
          const available = await this.checkInventory(
            item.productId, 
            item.quantity,
            env
          );
          
          if (!available) {
            throw new Error(`Product ${item.productId} out of stock`);
          }
        }
      });
      
      // 2. 计算价格
      const total = await transaction.step('CALCULATE_TOTAL', async () => {
        let sum = 0;
        for (const item of orderData.items) {
          const product = await env.DB.prepare(
            'SELECT price FROM products WHERE id = ?'
          ).bind(item.productId).first();
          
          sum += product.price * item.quantity;
        }
        
        // 应用折扣
        const discount = await this.calculateDiscount(orderData, env);
        
        return sum - discount;
      });
      
      // 3. 创建订单记录
      await transaction.step('CREATE_ORDER', async () => {
        await env.DB.prepare(`
          INSERT INTO orders (id, user_id, total, status, data)
          VALUES (?, ?, ?, 'pending', ?)
        `).bind(
          orderId,
          orderData.userId,
          total,
          JSON.stringify(orderData)
        ).run();
      });
      
      // 4. 扣减库存
      await transaction.step('RESERVE_INVENTORY', async () => {
        await env.INVENTORY_QUEUE.send({
          action: 'RESERVE',
          orderId,
          items: orderData.items
        });
      });
      
      // 5. 处理支付
      await transaction.step('PROCESS_PAYMENT', async () => {
        await env.PAYMENT_QUEUE.send({
          action: 'CHARGE',
          orderId,
          amount: total,
          paymentMethod: orderData.paymentMethod
        });
      });
      
      await transaction.commit(env);
      
      return { orderId, total, status: 'processing' };
      
    } catch (error) {
      await transaction.rollback(env);
      throw error;
    }
  }
  
  // 推荐系统
  async getRecommendations(userId, env) {
    // 获取用户历史
    const history = await env.DB.prepare(`
      SELECT p.category, COUNT(*) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      GROUP BY p.category
      ORDER BY count DESC
      LIMIT 5
    `).bind(userId).all();
    
    // 基于历史推荐
    const categories = history.results.map(h => h.category);
    
    const recommendations = await env.DB.prepare(`
      SELECT * FROM products
      WHERE category IN (${categories.map(() => '?').join(',')})
      AND id NOT IN (
        SELECT DISTINCT product_id 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = ?
      )
      ORDER BY sales_rank DESC
      LIMIT 10
    `).bind(...categories, userId).all();
    
    return recommendations.results;
  }
}

// 购物车 Durable Object
export class ShoppingCart {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;
    
    switch (`${method} ${url.pathname}`) {
      case 'GET /':
        return this.getCart();
      case 'POST /add':
        return this.addItem(await request.json());
      case 'DELETE /remove':
        return this.removeItem(await request.json());
      case 'POST /checkout':
        return this.checkout();
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
  
  async getCart() {
    const items = await this.state.storage.get('items') || [];
    return new Response(JSON.stringify({ items }));
  }
  
  async addItem(item) {
    const items = await this.state.storage.get('items') || [];
    
    const existing = items.find(i => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    
    await this.state.storage.put('items', items);
    
    return new Response(JSON.stringify({ success: true, items }));
  }
  
  async checkout() {
    const items = await this.state.storage.get('items') || [];
    
    if (items.length === 0) {
      return new Response('Cart is empty', { status: 400 });
    }
    
    // 创建订单
    await this.env.ORDER_QUEUE.send({
      action: 'CREATE',
      items,
      userId: this.state.id.name
    });
    
    // 清空购物车
    await this.state.storage.delete('items');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Order created'
    }));
  }
}
```

### 不适合的场景

#### 复杂事务系统示例

```javascript
// ❌ 不适合：银行核心系统
// 原因：需要强事务一致性、复杂的锁机制

// 这种复杂事务在 Cloudflare 很难实现
async function bankTransfer(fromAccount, toAccount, amount) {
  // 需要的功能（CF 不支持）：
  // 1. 分布式事务
  // 2. 两阶段提交
  // 3. 行级锁
  // 4. 事务隔离级别控制
  
  /*
  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  
  -- 锁定账户（CF D1 不支持）
  SELECT * FROM accounts WHERE id = ? FOR UPDATE;
  
  -- 检查余额
  IF balance < amount THEN
    ROLLBACK;
  END IF;
  
  -- 转账
  UPDATE accounts SET balance = balance - ? WHERE id = ?;
  UPDATE accounts SET balance = balance + ? WHERE id = ?;
  
  -- 审计日志
  INSERT INTO audit_log (...) VALUES (...);
  
  -- 触发器和存储过程（CF 不支持）
  CALL notify_transaction(...);
  
  COMMIT;
  */
}

// ❌ 不适合：ERP 系统
// 原因：表关系极其复杂、需要大量 JOIN

// 典型 ERP 查询（CF D1 性能不足）
const complexERPQuery = `
  WITH recursive bom AS (
    SELECT 
      p.id,
      p.parent_id,
      p.component_id,
      p.quantity,
      1 as level
    FROM product_bom p
    WHERE p.parent_id = ?
    
    UNION ALL
    
    SELECT 
      p.id,
      p.parent_id,
      p.component_id,
      p.quantity * b.quantity,
      b.level + 1
    FROM product_bom p
    JOIN bom b ON p.parent_id = b.component_id
  )
  SELECT 
    b.*,
    p.name,
    p.cost,
    i.quantity as stock,
    s.lead_time,
    v.name as vendor_name
  FROM bom b
  JOIN products p ON b.component_id = p.id
  JOIN inventory i ON p.id = i.product_id
  JOIN suppliers s ON p.supplier_id = s.id
  JOIN vendors v ON s.vendor_id = v.id
  WHERE b.level <= 5
  ORDER BY b.level, p.name;
`;

// ❌ 不适合：实时游戏服务器
// 原因：需要持久 WebSocket、低延迟状态同步

class GameServer {
  // CF 的限制：
  // 1. WebSocket 连接有时间限制
  // 2. 无法维持游戏循环
  // 3. 无法做帧同步
  // 4. CPU 时间限制（30秒）
  
  gameLoop() {
    // CF 无法运行持续的游戏循环
    setInterval(() => {
      this.updatePhysics();
      this.checkCollisions();
      this.broadcastState();
    }, 16); // 60 FPS - CF 不支持
  }
}
```

### 真实案例分析

#### 案例 1：Discord 使用 Workers

```javascript
// Discord 如何使用 Workers 处理邀请链接

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const inviteCode = url.pathname.slice(1);
    
    // 1. 验证邀请码
    const invite = await env.KV.get(`invite:${inviteCode}`, 'json');
    
    if (!invite) {
      return Response.redirect('https://discord.com/404');
    }
    
    // 2. 检查邀请是否过期
    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      await env.KV.delete(`invite:${inviteCode}`);
      return Response.redirect('https://discord.com/expired');
    }
    
    // 3. 记录分析数据
    await env.ANALYTICS.send({
      event: 'invite_clicked',
      inviteCode,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      timestamp: Date.now()
    });
    
    // 4. 更新使用次数
    if (invite.maxUses) {
      invite.uses = (invite.uses || 0) + 1;
      if (invite.uses >= invite.maxUses) {
        await env.KV.delete(`invite:${inviteCode}`);
      } else {
        await env.KV.put(
          `invite:${inviteCode}`,
          JSON.stringify(invite)
        );
      }
    }
    
    // 5. 重定向到 Discord 应用
    return Response.redirect(
      `discord://invite/${inviteCode}`,
      302
    );
  }
};
```

#### 案例 2：Shopify Oxygen

```javascript
// Shopify 的 Oxygen 平台（基于 Workers）

// 产品页面渲染
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const productHandle = url.pathname.split('/').pop();
    
    // 1. 获取产品数据
    const product = await getProduct(productHandle, env);
    
    // 2. 个性化推荐
    const recommendations = await getRecommendations(
      product,
      request.headers.get('CF-IPCountry'),
      env
    );
    
    // 3. 库存检查
    const inventory = await checkInventory(
      product.variants,
      env
    );
    
    // 4. 价格本地化
    const prices = localizePrice(
      product.price,
      request.headers.get('CF-IPCountry')
    );
    
    // 5. 渲染 HTML
    const html = renderProductPage({
      product,
      recommendations,
      inventory,
      prices
    });
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
};

// Hydrogen (Shopify 的 React 框架) 集成
export async function loader({ request, env }) {
  const { storefront } = env;
  
  // GraphQL 查询
  const { product } = await storefront.query(
    PRODUCT_QUERY,
    {
      variables: { handle: request.params.handle }
    }
  );
  
  return json({ product });
}
```

---

## 第五部分：开发指南

### 环境搭建

#### 1. 安装和配置

```bash
# 安装 Wrangler CLI
npm install -g wrangler
# 或使用 pnpm/yarn/bun
bun install -g wrangler

# 登录 Cloudflare
wrangler login

# 初始化项目
wrangler init my-worker
# 选择模板：
# - Hello World
# - TypeScript
# - Scheduled Worker
# - Queue Consumer

# 项目结构
my-worker/
├── src/
│   └── index.ts          # Worker 代码
├── wrangler.toml         # 配置文件
├── package.json
├── tsconfig.json
└── .dev.vars            # 本地开发环境变量
```

#### 2. wrangler.toml 完整配置

```toml
# 基础配置
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# 环境配置
[env.production]
name = "my-worker-production"
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "example.com/*", zone_name = "example.com" }
]

[env.staging]
name = "my-worker-staging"
vars = { ENVIRONMENT = "staging" }

# KV 命名空间
[[kv_namespaces]]
binding = "CACHE_KV"
id = "xxxxxx"
preview_id = "yyyyyy"

# D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxx"

# R2 存储桶
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

# 队列 - 生产者
[[queues.producers]]
binding = "MY_QUEUE"
queue = "my-queue"

# 队列 - 消费者
[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "my-dlq"

# Durable Objects
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "my-worker"

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]

# 定时任务
[triggers]
crons = ["*/5 * * * *", "0 0 * * *"]

# 构建配置
[build]
command = "npm run build"
[build.upload]
format = "service-worker"

# 使用限制
[limits]
cpu_ms = 50

# 日志
[observability]
enabled = true

# 环境变量和密钥
[vars]
API_VERSION = "v1"
FEATURE_FLAG = "true"

# 密钥（使用 wrangler secret put 设置）
# API_KEY = "secret"
# DATABASE_URL = "secret"

# 开发服务器配置
[dev]
port = 8787
local_protocol = "http"
upstream_protocol = "https"
host = "0.0.0.0"
```

### 开发流程

#### 1. 本地开发

```bash
# 启动开发服务器
wrangler dev

# 带特定端口
wrangler dev --port 3000

# 使用本地持久化
wrangler dev --local --persist

# 测试定时任务
wrangler dev --test-scheduled

# 尾部日志
wrangler tail
```

#### 2. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 3. 测试策略

```javascript
// 单元测试 (使用 Vitest)
import { describe, it, expect } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Worker Tests', () => {
  let worker;
  
  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true }
    });
  });
  
  afterAll(async () => {
    await worker.stop();
  });
  
  it('should return 200 response', async () => {
    const response = await worker.fetch('/');
    expect(response.status).toBe(200);
  });
  
  it('should handle JSON data', async () => {
    const response = await worker.fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});

// 集成测试
describe('Integration Tests', () => {
  it('should process queue messages', async () => {
    const env = getMiniflareBindings();
    
    // 发送消息到队列
    await env.MY_QUEUE.send({ test: 'message' });
    
    // 等待处理
    await sleep(1000);
    
    // 验证结果
    const result = await env.KV.get('processed');
    expect(result).toBeTruthy();
  });
});

// 端到端测试
import { chromium } from 'playwright';

describe('E2E Tests', () => {
  it('should load the page', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:8787');
    
    const title = await page.title();
    expect(title).toBe('My App');
    
    await browser.close();
  });
});
```

### 部署和监控

#### 1. 部署流程

```bash
# 部署到生产环境
wrangler deploy

# 部署到特定环境
wrangler deploy --env staging

# 预览部署
wrangler deploy --dry-run

# 回滚部署
wrangler rollback [deployment-id]

# 查看部署历史
wrangler deployments list

# 设置密钥
wrangler secret put API_KEY
# 输入密钥值（不会显示）

# 批量设置密钥
echo "SECRET_VALUE" | wrangler secret put SECRET_NAME

# 列出密钥
wrangler secret list

# 删除密钥
wrangler secret delete SECRET_NAME
```

#### 2. 监控和日志

```javascript
// 自定义分析引擎
export default {
  async fetch(request, env, ctx) {
    const start = Date.now();
    
    try {
      const response = await handleRequest(request, env);
      
      // 记录指标
      ctx.waitUntil(
        env.ANALYTICS.writeDataPoint({
          blobs: [
            request.method,
            new URL(request.url).pathname,
            String(response.status)
          ],
          doubles: [Date.now() - start],
          indexes: [request.cf?.colo]
        })
      );
      
      return response;
    } catch (error) {
      // 错误追踪
      ctx.waitUntil(
        logError(error, request, env)
      );
      
      throw error;
    }
  }
};

// 实时日志流
wrangler tail --format pretty

// 过滤日志
wrangler tail --status 500-599

// 保存日志到文件
wrangler tail --format json > logs.json

// 使用 Workers Analytics Engine
const analytics = env.ANALYTICS;

// 写入数据点
await analytics.writeDataPoint({
  indexes: ['user123', 'purchase'],
  blobs: ['product-xyz'],
  doubles: [99.99]
});

// 查询分析数据
const result = await analytics.query({
  dimensions: ['blob1'],
  metrics: ['count', 'sum'],
  filters: {
    index1: 'user123'
  },
  since: '2024-01-01',
  until: '2024-01-31'
});
```

#### 3. 性能监控

```javascript
// 性能追踪
class PerformanceTracker {
  constructor() {
    this.metrics = [];
  }
  
  measure(name, fn) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  async flush(env) {
    if (this.metrics.length === 0) return;
    
    await env.METRICS_KV.put(
      `metrics:${Date.now()}`,
      JSON.stringify(this.metrics),
      { expirationTtl: 86400 * 7 } // 7天
    );
  }
}

// 使用示例
export default {
  async fetch(request, env, ctx) {
    const tracker = new PerformanceTracker();
    
    // 测量数据库查询
    const data = await tracker.measure('db_query', async () => {
      return env.DB.prepare('SELECT * FROM users').all();
    });
    
    // 测量 API 调用
    const apiResult = await tracker.measure('api_call', async () => {
      return fetch('https://api.example.com/data');
    });
    
    // 异步刷新指标
    ctx.waitUntil(tracker.flush(env));
    
    return new Response(JSON.stringify(data));
  }
};
```

---

## 第六部分：进阶主题

### 性能优化

#### 1. 缓存策略

```javascript
// 多层缓存实现
class CacheManager {
  constructor(env, ctx) {
    this.env = env;
    this.ctx = ctx;
    this.cache = caches.default;
  }
  
  async get(key, fetcher, options = {}) {
    const {
      ttl = 3600,
      staleWhileRevalidate = false,
      cacheControl = 'public, max-age=3600'
    } = options;
    
    // L1: 内存缓存（请求级别）
    if (this.memoryCache?.[key]) {
      return this.memoryCache[key];
    }
    
    // L2: Edge Cache
    const cacheKey = new Request(`https://cache.local/${key}`);
    let cached = await this.cache.match(cacheKey);
    
    if (cached) {
      const age = Date.now() - new Date(cached.headers.get('date')).getTime();
      
      if (staleWhileRevalidate && age > ttl * 1000) {
        // 返回过期内容，后台更新
        this.ctx.waitUntil(this.refresh(key, fetcher, cacheKey));
        return cached;
      }
      
      return cached;
    }
    
    // L3: KV 缓存
    const kvData = await this.env.CACHE_KV.get(key);
    if (kvData) {
      const response = new Response(kvData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': cacheControl
        }
      });
      
      // 更新 Edge Cache
      await this.cache.put(cacheKey, response.clone());
      
      return response;
    }
    
    // 获取新数据
    const data = await fetcher();
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl
      }
    });
    
    // 更新所有缓存层
    this.ctx.waitUntil(
      Promise.all([
        this.cache.put(cacheKey, response.clone()),
        this.env.CACHE_KV.put(key, JSON.stringify(data), {
          expirationTtl: ttl
        })
      ])
    );
    
    // 更新内存缓存
    this.memoryCache = this.memoryCache || {};
    this.memoryCache[key] = response.clone();
    
    return response;
  }
  
  async invalidate(pattern) {
    // 清理 KV
    const keys = await this.env.CACHE_KV.list({ prefix: pattern });
    await Promise.all(
      keys.keys.map(k => this.env.CACHE_KV.delete(k.name))
    );
    
    // Edge Cache 需要通过 API 清理
    await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prefixes: [`https://cache.local/${pattern}`]
      })
    });
  }
}
```

#### 2. 并发优化

```javascript
// 请求合并（Request Coalescing）
class RequestCoalescer {
  constructor() {
    this.pending = new Map();
  }
  
  async fetch(key, fetcher) {
    // 如果已有相同请求在处理，等待结果
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // 创建新请求
    const promise = fetcher().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

// 批处理优化
class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.batchTimeout = options.batchTimeout || 100;
    this.queue = [];
    this.timer = null;
  }
  
  async add(item) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchTimeout);
      }
    });
  }
  
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map(b => b.item);
    
    try {
      const results = await this.processBatch(items);
      
      batch.forEach((b, i) => {
        b.resolve(results[i]);
      });
    } catch (error) {
      batch.forEach(b => b.reject(error));
    }
  }
  
  async processBatch(items) {
    // 批量处理逻辑
    return Promise.all(items.map(item => processItem(item)));
  }
}
```

### 安全最佳实践

#### 1. 认证和授权

```javascript
// JWT 认证实现
class JWTAuth {
  constructor(secret) {
    this.secret = secret;
  }
  
  async verify(token) {
    const [header, payload, signature] = token.split('.');
    
    // 验证签名
    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${payload}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBuffer = this.base64UrlDecode(signature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      data
    );
    
    if (!valid) {
      throw new Error('Invalid signature');
    }
    
    // 解析 payload
    const payloadJson = atob(payload);
    const claims = JSON.parse(payloadJson);
    
    // 验证过期时间
    if (claims.exp && Date.now() / 1000 > claims.exp) {
      throw new Error('Token expired');
    }
    
    return claims;
  }
  
  async sign(payload) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const encoder = new TextEncoder();
    const headerBase64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadBase64 = this.base64UrlEncode(JSON.stringify(payload));
    
    const data = encoder.encode(`${headerBase64}.${payloadBase64}`);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, data);
    const signatureBase64 = this.base64UrlEncode(signature);
    
    return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
  }
  
  base64UrlEncode(data) {
    const base64 = btoa(
      typeof data === 'string' 
        ? data 
        : String.fromCharCode(...new Uint8Array(data))
    );
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  base64UrlDecode(data) {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// 使用示例
export default {
  async fetch(request, env) {
    const auth = new JWTAuth(env.JWT_SECRET);
    
    // 验证 token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    try {
      const claims = await auth.verify(token);
      
      // 检查权限
      if (!claims.permissions?.includes('read')) {
        return new Response('Forbidden', { status: 403 });
      }
      
      // 处理请求
      return handleAuthenticatedRequest(request, claims, env);
      
    } catch (error) {
      return new Response('Invalid token', { status: 401 });
    }
  }
};
```

#### 2. 输入验证和清理

```javascript
// 输入验证器
class Validator {
  constructor(schema) {
    this.schema = schema;
  }
  
  validate(data) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(this.schema)) {
      const value = data[field];
      
      // 必填检查
      if (rules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // 类型检查
      if (value && rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
        }
      }
      
      // 长度检查
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
      
      // 正则验证
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      
      // 自定义验证
      if (value && rules.validate) {
        const error = rules.validate(value);
        if (error) errors.push(error);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  sanitize(data) {
    const cleaned = {};
    
    for (const [field, value] of Object.entries(data)) {
      if (!this.schema[field]) continue;
      
      const rules = this.schema[field];
      let cleanValue = value;
      
      // XSS 清理
      if (rules.type === 'string' && !rules.allowHtml) {
        cleanValue = this.escapeHtml(cleanValue);
      }
      
      // SQL 注入防护
      if (rules.type === 'string' && !rules.allowSql) {
        cleanValue = cleanValue.replace(/['";\\]/g, '');
      }
      
      // 类型转换
      if (rules.type === 'number') {
        cleanValue = Number(cleanValue);
      }
      
      cleaned[field] = cleanValue;
    }
    
    return cleaned;
  }
  
  escapeHtml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return str.replace(/[&<>"'/]/g, char => map[char]);
  }
}

// 使用示例
const userSchema = {
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  password: {
    required: true,
    type: 'string',
    minLength: 8,
    validate: (pwd) => {
      if (!/[A-Z]/.test(pwd)) return 'Password must contain uppercase';
      if (!/[0-9]/.test(pwd)) return 'Password must contain number';
      return null;
    }
  },
  age: {
    type: 'number',
    min: 0,
    max: 150
  }
};

export default {
  async fetch(request, env) {
    const data = await request.json();
    const validator = new Validator(userSchema);
    
    // 验证输入
    const validation = validator.validate(data);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        errors: validation.errors
      }), { status: 400 });
    }
    
    // 清理输入
    const cleaned = validator.sanitize(data);
    
    // 处理请求
    return processRequest(cleaned, env);
  }
};
```

### 成本优化

#### 1. 请求优化

```javascript
// 请求去重
class RequestDeduplicator {
  constructor(env) {
    this.env = env;
  }
  
  async process(requestId, handler) {
    // 检查是否已处理
    const existing = await this.env.KV.get(`req:${requestId}`);
    if (existing) {
      return JSON.parse(existing);
    }
    
    // 处理请求
    const result = await handler();
    
    // 缓存结果（防止重复处理）
    await this.env.KV.put(
      `req:${requestId}`,
      JSON.stringify(result),
      { expirationTtl: 3600 }
    );
    
    return result;
  }
}

// 响应压缩
function compressResponse(response, acceptEncoding) {
  const { readable, writable } = new TransformStream();
  
  let compressionStream;
  let encoding;
  
  if (acceptEncoding.includes('br')) {
    compressionStream = new CompressionStream('br');
    encoding = 'br';
  } else if (acceptEncoding.includes('gzip')) {
    compressionStream = new CompressionStream('gzip');
    encoding = 'gzip';
  } else if (acceptEncoding.includes('deflate')) {
    compressionStream = new CompressionStream('deflate');
    encoding = 'deflate';
  } else {
    return response;
  }
  
  response.body.pipeTo(compressionStream.writable);
  compressionStream.readable.pipeTo(writable);
  
  return new Response(readable, {
    headers: {
      ...Object.fromEntries(response.headers),
      'Content-Encoding': encoding
    }
  });
}

// 智能缓存
class SmartCache {
  async shouldCache(request, response) {
    // 不缓存的条件
    if (request.method !== 'GET') return false;
    if (response.status !== 200) return false;
    if (response.headers.get('Cache-Control')?.includes('no-store')) return false;
    
    // 基于内容大小决定
    const size = response.headers.get('Content-Length');
    if (size && parseInt(size) > 5 * 1024 * 1024) return false; // > 5MB
    
    return true;
  }
  
  getCacheDuration(response) {
    const contentType = response.headers.get('Content-Type');
    
    // 基于内容类型的缓存策略
    if (contentType?.includes('image/')) return 86400 * 30; // 30天
    if (contentType?.includes('text/css')) return 86400 * 7; // 7天
    if (contentType?.includes('application/javascript')) return 86400 * 7;
    if (contentType?.includes('text/html')) return 300; // 5分钟
    
    return 3600; // 默认1小时
  }
}
```

#### 2. 资源管理

```javascript
// 连接池管理
class ConnectionPool {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 10;
    this.connections = [];
    this.waiting = [];
  }
  
  async acquire() {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }
    
    if (this.active < this.maxConnections) {
      return this.createConnection();
    }
    
    // 等待可用连接
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }
  
  release(connection) {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve(connection);
    } else {
      this.connections.push(connection);
    }
  }
  
  async createConnection() {
    // 创建新连接
    this.active++;
    return new Connection();
  }
}

// 资源清理
export default {
  async fetch(request, env, ctx) {
    const resources = [];
    
    try {
      // 分配资源
      const connection = await connectionPool.acquire();
      resources.push(() => connectionPool.release(connection));
      
      const tempFile = await createTempFile();
      resources.push(() => deleteTempFile(tempFile));
      
      // 处理请求
      const response = await processRequest(request, { connection, tempFile });
      
      return response;
      
    } finally {
      // 确保资源清理
      ctx.waitUntil(
        Promise.all(resources.map(cleanup => cleanup()))
      );
    }
  }
};
```

## 总结

### 核心要点

1. **Cloudflare Workers 是边缘优先的无服务器平台**
   - 全球部署，低延迟
   - 自动扩展，零运维
   - 按使用付费

2. **完整的生态系统**
   - 计算：Workers, Durable Objects, Pages
   - 存储：KV, R2, D1
   - 消息：Queues, Email Workers
   - 安全：WAF, DDoS Protection

3. **适用场景**
   - API 网关和微服务
   - 静态网站 + 动态功能
   - 中小型 SaaS 应用
   - IoT 数据收集
   - 内容个性化

4. **最佳实践**
   - 使用多层缓存
   - 实施请求合并和批处理
   - 做好错误处理和重试
   - 监控性能和成本

### 学习路径

1. **入门阶段**
   - 创建第一个 Worker
   - 理解请求/响应模型
   - 使用 KV 存储

2. **进阶阶段**
   - 掌握 Durable Objects
   - 实现队列处理
   - 使用 D1 数据库

3. **高级阶段**
   - 设计异步架构
   - 实施 CQRS/Event Sourcing
   - 优化性能和成本

### 资源链接

- [官方文档](https://developers.cloudflare.com/workers/)
- [示例代码](https://github.com/cloudflare/workers-examples)
- [Discord 社区](https://discord.gg/cloudflaredev)
- [Workers 模板](https://workers.cloudflare.com/templates)

### 未来展望

Cloudflare 正在持续扩展其平台能力：

- **AI 推理**：Workers AI 提供边缘 AI 能力
- **向量数据库**：即将推出向量存储
- **WebGPU**：GPU 加速计算
- **更大的限制**：CPU 时间、内存、存储

边缘计算是未来的重要趋势，Cloudflare Workers 提供了一个强大且易用的平台来构建下一代应用。

---

*本指南将持续更新，欢迎反馈和贡献。*

*最后更新：2024年*