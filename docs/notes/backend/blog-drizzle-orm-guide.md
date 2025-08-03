# Drizzle ORM 完全指南：从入门到精通

## 前言

在现代 TypeScript 开发中，如何优雅地处理数据库操作一直是个重要话题。今天我要介绍的 Drizzle ORM，是一个新兴但极具潜力的解决方案。它不仅提供了完整的类型安全，还保持了接近原生 SQL 的性能和灵活性。

## 什么是 Drizzle？

Drizzle 是一个 **TypeScript 优先、轻量级、高性能** 的 ORM。与其说它是 ORM（对象关系映射），不如说它是一个"类型安全的 SQL 查询构建器"。

### 核心特点

- 🚀 **零运行时开销**：查询在构建时编译成 SQL
- 🔒 **100% 类型安全**：从模式定义到查询结果
- 📦 **轻量级**：核心包仅 ~50KB
- 🎯 **SQL-like 语法**：学习成本低
- 🔧 **灵活性高**：支持复杂查询和原生 SQL

## 为什么选择 Drizzle？

### 1. 类型安全的极致体验

```typescript
// 定义模式时，TypeScript 会记住每个字段
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
  createdAt: timestamp('created_at').defaultNow()
})

// 查询时，IDE 会提供完整的自动补全
const result = await db
  .select()
  .from(users)
  .where(eq(users.email, 'test@example.com')) // ✅ email 字段存在
  // .where(eq(users.emial, '...')) // ❌ 拼写错误会立即报错
```

### 2. 性能对比

```typescript
// Drizzle - 直接生成 SQL，无额外开销
const users = await db.select().from(users).where(eq(users.age, 18))
// 生成: SELECT * FROM users WHERE age = $1

// Prisma - 需要经过 ORM 层处理
const users = await prisma.user.findMany({ where: { age: 18 } })
// 需要解析、转换、验证等步骤
```

## 快速开始

### 安装

```bash
# 安装核心包
bun add drizzle-orm postgres
bun add -d drizzle-kit @types/pg

# 或使用 npm/yarn/pnpm
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/pg
```

### 基础配置

1. **创建配置文件** `drizzle.config.ts`：

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

2. **设置数据库连接** `src/db/index.ts`：

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)

export const db = drizzle(client)
```

## 核心概念详解

### 1. Schema 定义

```typescript
import { pgTable, serial, text, integer, timestamp, boolean, uuid, decimal, jsonb } from 'drizzle-orm/pg-core'

// 用户表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  age: integer('age'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// 订单表
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// 多对多关系 - 用户角色表
export const usersToRoles = pgTable('users_to_roles', {
  userId: uuid('user_id').notNull().references(() => users.id),
  roleId: integer('role_id').notNull().references(() => roles.id),
}, (table) => ({
  pk: primaryKey(table.userId, table.roleId), // 复合主键
}))
```

### 2. 基础查询操作

#### 查询数据

```typescript
// 1. 查询所有数据
const allUsers = await db.select().from(users)

// 2. 条件查询
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true))

// 3. 多条件查询
const specificUsers = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      gte(users.age, 18),
      like(users.email, '%@gmail.com')
    )
  )

// 4. 排序和分页
const paginatedUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(10)
  .offset(20)

// 5. 选择特定字段
const userEmails = await db
  .select({
    id: users.id,
    email: users.email,
    fullName: users.name, // 可以重命名
  })
  .from(users)
```

#### 插入数据

```typescript
// 1. 插入单条数据
const newUser = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Doe',
    age: 25,
  })
  .returning() // 返回插入的数据

// 2. 批量插入
const newUsers = await db
  .insert(users)
  .values([
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
    { email: 'user3@example.com', name: 'User 3' },
  ])
  .returning()

// 3. 冲突处理
const upsertUser = await db
  .insert(users)
  .values({
    email: 'existing@example.com',
    name: 'Updated Name',
  })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Updated Name', updatedAt: new Date() },
  })
```

#### 更新数据

```typescript
// 1. 更新单个字段
const updated = await db
  .update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId))
  .returning()

// 2. 更新多个字段
const updatedUser = await db
  .update(users)
  .set({
    name: 'New Name',
    age: sql`${users.age} + 1`, // 使用 SQL 表达式
    updatedAt: new Date(),
  })
  .where(eq(users.email, 'john@example.com'))

// 3. 条件更新
const deactivateOldUsers = await db
  .update(users)
  .set({ isActive: false })
  .where(
    and(
      lt(users.createdAt, new Date('2023-01-01')),
      eq(users.isActive, true)
    )
  )
```

#### 删除数据

```typescript
// 1. 删除特定记录
const deleted = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning()

// 2. 批量删除
const deletedInactive = await db
  .delete(users)
  .where(eq(users.isActive, false))
```

### 3. 高级查询

#### 联表查询

```typescript
// 1. Inner Join
const usersWithOrders = await db
  .select({
    userName: users.name,
    userEmail: users.email,
    orderId: orders.id,
    orderAmount: orders.amount,
  })
  .from(users)
  .innerJoin(orders, eq(users.id, orders.userId))

// 2. Left Join
const usersWithOptionalOrders = await db
  .select()
  .from(users)
  .leftJoin(orders, eq(users.id, orders.userId))

// 3. 多表联接
const complexQuery = await db
  .select({
    user: users,
    order: orders,
    role: roles,
  })
  .from(users)
  .leftJoin(orders, eq(users.id, orders.userId))
  .leftJoin(usersToRoles, eq(users.id, usersToRoles.userId))
  .leftJoin(roles, eq(usersToRoles.roleId, roles.id))
  .where(eq(users.isActive, true))
```

#### 聚合查询

```typescript
// 1. 计数
const userCount = await db
  .select({ count: count() })
  .from(users)

// 2. 分组统计
const orderStats = await db
  .select({
    userId: orders.userId,
    totalAmount: sum(orders.amount),
    orderCount: count(),
    avgAmount: avg(orders.amount),
  })
  .from(orders)
  .groupBy(orders.userId)
  .having(gt(count(), 5)) // Having 子句

// 3. 复杂聚合
const monthlyRevenue = await db
  .select({
    month: sql<string>`DATE_TRUNC('month', ${orders.createdAt})`,
    revenue: sum(orders.amount),
    orderCount: count(),
  })
  .from(orders)
  .where(eq(orders.status, 'completed'))
  .groupBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
  .orderBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
```

#### 子查询

```typescript
// 1. 在 WHERE 中使用子查询
const activeUsersWithOrders = await db
  .select()
  .from(users)
  .where(
    inArray(
      users.id,
      db.select({ id: orders.userId }).from(orders).where(eq(orders.status, 'completed'))
    )
  )

// 2. 在 SELECT 中使用子查询
const usersWithOrderCount = await db
  .select({
    ...users,
    orderCount: sql<number>`(
      SELECT COUNT(*) 
      FROM ${orders} 
      WHERE ${orders.userId} = ${users.id}
    )`,
  })
  .from(users)
```

### 4. 事务处理

```typescript
// 1. 基础事务
const result = await db.transaction(async (tx) => {
  // 创建用户
  const [user] = await tx
    .insert(users)
    .values({ email: 'new@example.com', name: 'New User' })
    .returning()

  // 创建订单
  const [order] = await tx
    .insert(orders)
    .values({ userId: user.id, amount: '99.99', status: 'pending' })
    .returning()

  return { user, order }
})

// 2. 带回滚的事务
async function transferMoney(fromUserId: string, toUserId: string, amount: number) {
  try {
    await db.transaction(async (tx) => {
      // 扣除发送方余额
      const [sender] = await tx
        .update(users)
        .set({ balance: sql`balance - ${amount}` })
        .where(eq(users.id, fromUserId))
        .returning()

      if (sender.balance < 0) {
        throw new Error('余额不足')
      }

      // 增加接收方余额
      await tx
        .update(users)
        .set({ balance: sql`balance + ${amount}` })
        .where(eq(users.id, toUserId))

      // 记录交易
      await tx.insert(transactions).values({
        fromUserId,
        toUserId,
        amount,
        type: 'transfer',
      })
    })
  } catch (error) {
    console.error('转账失败:', error)
    throw error
  }
}
```

### 5. 性能优化

#### Prepared Statements

```typescript
// 1. 创建预编译语句
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('userId')))
  .prepare('getUserById')

const getOrdersByStatus = db
  .select()
  .from(orders)
  .where(eq(orders.status, sql.placeholder('status')))
  .limit(sql.placeholder('limit'))
  .prepare('getOrdersByStatus')

// 2. 复用预编译语句
const user1 = await getUserById.execute({ userId: 'uuid-1' })
const user2 = await getUserById.execute({ userId: 'uuid-2' })

const pendingOrders = await getOrdersByStatus.execute({ 
  status: 'pending', 
  limit: 10 
})
```

#### 批量操作优化

```typescript
// 1. 使用事务批量插入
async function bulkInsertUsers(userData: NewUser[]) {
  const BATCH_SIZE = 1000
  
  await db.transaction(async (tx) => {
    for (let i = 0; i < userData.length; i += BATCH_SIZE) {
      const batch = userData.slice(i, i + BATCH_SIZE)
      await tx.insert(users).values(batch)
    }
  })
}

// 2. 使用 COPY 命令（PostgreSQL）
async function superFastBulkInsert(data: any[]) {
  const values = data.map(d => `(${d.id}, '${d.name}', '${d.email}')`).join(',')
  
  await db.execute(sql`
    INSERT INTO ${users} (id, name, email)
    VALUES ${sql.raw(values)}
  `)
}
```

## 实战技巧

### 1. 类型推断和复用

```typescript
// 从 schema 推断类型
export type User = typeof users.$inferSelect       // 查询结果类型
export type NewUser = typeof users.$inferInsert    // 插入数据类型
export type UserId = User['id']                    // 单个字段类型

// 创建可复用的查询片段
const activeUsersBase = db
  .select()
  .from(users)
  .where(eq(users.isActive, true))

// 基于片段构建不同查询
const activeUserEmails = await activeUsersBase
  .select({ email: users.email })

const activeUserCount = await activeUsersBase
  .select({ count: count() })
```

### 2. 动态查询构建

```typescript
interface UserFilters {
  name?: string
  email?: string
  isActive?: boolean
  minAge?: number
}

async function searchUsers(filters: UserFilters) {
  const conditions = []

  if (filters.name) {
    conditions.push(like(users.name, `%${filters.name}%`))
  }
  if (filters.email) {
    conditions.push(eq(users.email, filters.email))
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive))
  }
  if (filters.minAge) {
    conditions.push(gte(users.age, filters.minAge))
  }

  return db
    .select()
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
}
```

### 3. 自定义 SQL 函数

```typescript
// 1. 创建自定义函数
const lower = (column: AnyColumn) => sql<string>`lower(${column})`
const coalesce = <T>(column: SQL<T>, defaultValue: T) => 
  sql<T>`coalesce(${column}, ${defaultValue})`

// 2. 使用自定义函数
const searchResults = await db
  .select()
  .from(users)
  .where(like(lower(users.email), '%gmail.com'))

const usersWithDefaults = await db
  .select({
    id: users.id,
    name: coalesce(users.name, 'Anonymous'),
    age: coalesce(users.age, 0),
  })
  .from(users)
```

### 4. 迁移管理

```typescript
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}

// src/db/seed.ts
import { db } from './index'
import { users, roles } from './schema'

async function seed() {
  console.log('🌱 开始填充数据...')

  // 创建角色
  const [adminRole, userRole] = await db
    .insert(roles)
    .values([
      { name: 'admin', permissions: ['read', 'write', 'delete'] },
      { name: 'user', permissions: ['read'] },
    ])
    .returning()

  // 创建用户
  await db.insert(users).values([
    {
      email: 'admin@example.com',
      name: 'Admin User',
      roleId: adminRole.id,
    },
    {
      email: 'user@example.com',
      name: 'Regular User',
      roleId: userRole.id,
    },
  ])

  console.log('✅ 数据填充完成!')
}

seed().catch(console.error)
```

## 与其他技术集成

### 1. 与 tRPC 集成

```typescript
// server/routers/user.ts
import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const userRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(users)
        .limit(input.limit)
        .offset(input.offset)

      return result
    }),

  create: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const [user] = await db
        .insert(users)
        .values(input)
        .returning()

      return user
    }),
})
```

### 2. 与 Next.js App Router 集成

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = parseInt(searchParams.get('offset') || '0')

  const result = await db
    .select()
    .from(users)
    .limit(limit)
    .offset(offset)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const [user] = await db
    .insert(users)
    .values(body)
    .returning()

  return NextResponse.json(user, { status: 201 })
}
```

## 常见问题和解决方案

### 1. 连接池配置

```typescript
// 开发环境
const client = postgres(connectionString, {
  max: 1, // 开发环境使用单连接
})

// 生产环境
const client = postgres(connectionString, {
  max: 20,        // 最大连接数
  idle_timeout: 30, // 空闲超时
  connect_timeout: 10, // 连接超时
})
```

### 2. 处理大量数据

```typescript
// 使用游标处理大量数据
async function* getUsers() {
  const batchSize = 1000
  let offset = 0

  while (true) {
    const batch = await db
      .select()
      .from(users)
      .limit(batchSize)
      .offset(offset)

    if (batch.length === 0) break

    yield batch
    offset += batchSize
  }
}

// 使用
for await (const batch of getUsers()) {
  await processBatch(batch)
}
```

### 3. 处理时区

```typescript
// 定义时区感知的时间戳
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  // 存储 UTC 时间
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  // 本地时间展示
  localTime: timestamp('local_time', { withTimezone: false }),
})

// 查询时转换时区
const eventsInLocalTime = await db
  .select({
    id: events.id,
    occurredAt: sql<string>`${events.occurredAt} AT TIME ZONE 'Asia/Shanghai'`,
  })
  .from(events)
```

## 性能监控

```typescript
// 添加查询日志
const db = drizzle(client, {
  logger: {
    logQuery(query, params) {
      console.log('Query:', query)
      console.log('Params:', params)
    },
  },
})

// 性能追踪
async function trackQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await queryFn()
    const duration = performance.now() - start
    console.log(`Query "${name}" took ${duration.toFixed(2)}ms`)
    return result
  } catch (error) {
    console.error(`Query "${name}" failed:`, error)
    throw error
  }
}

// 使用
const users = await trackQuery('getActiveUsers', () =>
  db.select().from(users).where(eq(users.isActive, true))
)
```

## 总结

Drizzle ORM 提供了一种全新的数据库操作方式：

1. **类型安全**：从定义到查询，全程 TypeScript 保护
2. **高性能**：接近原生 SQL 的执行效率
3. **灵活性**：支持复杂查询和原生 SQL
4. **开发体验**：优秀的 IDE 支持和错误提示
5. **轻量级**：最小的运行时开销

无论你是在构建小型项目还是大型应用，Drizzle 都能提供可靠的数据库解决方案。它特别适合：

- 重视类型安全的 TypeScript 项目
- 需要复杂查询的应用
- 对性能有高要求的场景
- 希望保持 SQL 控制力的开发者

希望这篇指南能帮助你掌握 Drizzle ORM，在项目中发挥它的最大价值！

## 相关资源

- [Drizzle 官方文档](https://orm.drizzle.team)
- [GitHub 仓库](https://github.com/drizzle-team/drizzle-orm)
- [Discord 社区](https://discord.gg/drizzle)
- [在线 Playground](https://drizzle.studio)

---

*如果你觉得这篇文章有帮助，请点赞支持！有任何问题欢迎在评论区讨论。*