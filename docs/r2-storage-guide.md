# Cloudflare R2 存储技术指南

> 本文档记录了系统曾经使用的 Cloudflare R2 存储服务的完整技术实现。
> 创建日期：2025-01-08
> 状态：已废弃（系统已迁移到阿里云 OSS）

## 目录

1. [概述](#概述)
2. [环境配置](#环境配置)
3. [核心实现](#核心实现)
4. [API 集成](#api-集成)
5. [迁移相关](#迁移相关)
6. [工具脚本](#工具脚本)
7. [双写模式](#双写模式)
8. [性能优化](#性能优化)
9. [故障排查](#故障排查)
10. [迁移历史](#迁移历史)

## 概述

### 什么是 R2
Cloudflare R2 是一个兼容 S3 API 的对象存储服务，特点：
- 无出口流量费用
- 全球 CDN 加速
- S3 API 兼容
- 自动备份和版本控制

### 为什么迁移走
- 国内访问速度慢（服务器在海外）
- 经常出现 524 超时错误
- 上海用户访问延迟高
- 阿里云 OSS 本地节点更快

## 环境配置

### 必需的环境变量

```env
# Cloudflare R2 配置
R2_ACCOUNT_ID="455ff61978adea5b200403729a6d5188"
R2_ACCESS_KEY_ID="d587ee662c66917d9276531fb0954171"
R2_SECRET_ACCESS_KEY="11119104484a173ec4575f282b47d906d858d9c5ad1c911f0887f64e767fd52c"
R2_BUCKET_NAME="zetar-mold-production"
R2_PUBLIC_URL="https://imgs.zetar.ai"

# 迁移控制标志（双写模式）
ENABLE_DUAL_WRITE=true        # 启用双写（R2+OSS）
USE_OSS_FOR_WRITES=false      # 是否只写 OSS
```

### 环境变量验证 (src/env.js)

```javascript
// R2 Storage (optional - only if R2 is configured)
R2_ACCOUNT_ID: z.string().optional(),
R2_ACCESS_KEY_ID: z.string().optional(),
R2_SECRET_ACCESS_KEY: z.string().optional(),
R2_BUCKET_NAME: z.string().optional(),
R2_PUBLIC_URL: z.string().optional(),

// Migration flags
ENABLE_DUAL_WRITE: z.string().optional(),
USE_OSS_FOR_WRITES: z.string().optional(),
```

## 核心实现

### R2 存储库 (src/lib/r2-storage.ts)

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { env } from "@/env";

let s3Client: S3Client | null = null;

/**
 * 获取 S3 客户端实例（懒加载）
 */
function getS3Client(): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
}

/**
 * 检查 R2 存储是否已配置
 */
export function isR2Configured(): boolean {
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME
  );
}

/**
 * 上传文件到 R2
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const client = getS3Client();
  if (!client) {
    throw new Error("R2 storage is not configured");
  }

  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  }));

  return getR2PublicUrl(key);
}

/**
 * 从 R2 删除文件
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getS3Client();
  if (!client) {
    throw new Error("R2 storage is not configured");
  }

  await client.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * 获取 R2 文件的公共 URL
 */
export function getR2PublicUrl(key: string): string {
  // 返回相对路径，前端会处理完整 URL
  return `/${key.replace(/^\//, "")}`;
}

/**
 * 列出 R2 中的对象
 */
export async function listR2Objects(prefix: string): Promise<Array<{ key: string; uploaded?: Date }>> {
  const client = getS3Client();
  if (!client) {
    throw new Error("R2 storage is not configured");
  }

  const response = await client.send(new ListObjectsV2Command({
    Bucket: env.R2_BUCKET_NAME,
    Prefix: prefix,
  }));

  return (response.Contents || []).map((obj) => ({
    key: obj.Key || "",
    uploaded: obj.LastModified,
  }));
}

/**
 * 获取内容类型
 */
export function getContentTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
  };
  return contentTypes[ext || ''] || 'application/octet-stream';
}
```

## API 集成

### 上传 API 中的 R2 集成 (/api/upload/media/route.ts)

```typescript
// 双写模式实现
if (enableDualWrite && r2Configured && ossConfigured) {
  // 双写模式 - 同时上传到 R2 和 OSS
  console.log(`[Dual Write] Uploading ${key} to both R2 and OSS`);
  
  try {
    // OSS 优先（上海用户更快）
    publicUrl = await Promise.race([
      uploadToOSS(key, bufferToUpload, contentType, metadata),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OSS upload timeout")), uploadTimeout)
      ),
    ]);
    console.log(`[Dual Write] OSS upload successful for ${key}`);
    
    // R2 后台异步上传（不阻塞响应）
    uploadToR2(key, bufferToUpload, contentType, metadata)
      .then(() => console.log(`[Dual Write] R2 upload successful for ${key} (background)`))
      .catch((error) => console.error(`[Dual Write] R2 upload failed for ${key}:`, error));
      
  } catch (ossError) {
    console.error(`[Dual Write] OSS upload failed for ${key}:`, ossError);
    
    // OSS 失败时回退到 R2
    try {
      publicUrl = await Promise.race([
        uploadToR2(key, bufferToUpload, contentType, metadata),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("R2 upload timeout")), uploadTimeout)
        ),
      ]);
      console.log(`[Dual Write] R2 upload successful for ${key} (fallback)`);
    } catch (r2Error) {
      console.error(`[Dual Write] R2 upload also failed for ${key}:`, r2Error);
      throw new Error("Both OSS and R2 uploads failed");
    }
  }
} else if (r2Configured) {
  // 仅 R2 模式
  console.log(`[R2 Write] Uploading ${key} to R2`);
  publicUrl = await uploadToR2(key, bufferToUpload, contentType, metadata);
}
```

### 文件路径生成 (src/lib/image-utils.ts)

```typescript
/**
 * 获取 R2 存储路径
 */
export function getR2KeyPath(
  type: ImageUploadType,
  id: number,
  subtype: ImageSubtype
): string {
  const typePath = type === "mold" ? "molds" : "projects";
  return `uploads/${typePath}/${id}/${subtype}`;
}

/**
 * 生成唯一文件名
 */
export function generateImageFilename(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || 'jpg';
  const sanitizedName = originalName
    .replace(/\.[^/.]+$/, '') // 移除扩展名
    .replace(/[^a-zA-Z0-9-_]/g, '-') // 替换特殊字符
    .slice(0, 50); // 限制长度
  
  return `${timestamp}-${randomString}-${sanitizedName}.${extension}`;
}
```

## 迁移相关

### 文件迁移服务 (src/services/file-migration-service.ts)

```typescript
import { copyOSSObject, deleteFromOSS, listOSSObjects } from "@/lib/oss-storage";
import { deleteFromR2, listR2Objects } from "@/lib/r2-storage";

export class FileMigrationService {
  /**
   * 迁移临时文件到正式位置（R2）
   */
  async migrateR2TempFiles(
    userId: string,
    tempId: string,
    targetPath: string
  ): Promise<string[]> {
    const tempPrefix = `uploads/temp/${userId}/${tempId}/`;
    const files = await listR2Objects(tempPrefix);
    const migratedUrls: string[] = [];

    for (const file of files) {
      if (file.key) {
        const filename = file.key.split('/').pop();
        if (filename) {
          const newKey = `${targetPath}/${filename}`;
          
          // R2 不支持直接 copy，需要下载再上传
          // 这里简化处理，实际项目中返回临时 URL
          migratedUrls.push(`/${newKey}`);
          
          // 删除临时文件
          await deleteFromR2(file.key);
        }
      }
    }

    return migratedUrls;
  }

  /**
   * 清理过期的临时文件（R2）
   */
  async cleanupR2ExpiredTempFiles(hoursOld: number = 24): Promise<number> {
    const tempPrefix = 'uploads/temp/';
    const files = await listR2Objects(tempPrefix);
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const file of files) {
      if (file.key && file.uploaded && file.uploaded < cutoffTime) {
        await deleteFromR2(file.key);
        deletedCount++;
        console.log(`[Cleanup] Deleted expired temp file: ${file.key}`);
      }
    }

    return deletedCount;
  }
}
```

## 工具脚本

### R2 到 OSS 同步脚本 (tools/migration/sync-r2-to-oss.ts)

```typescript
#!/usr/bin/env bun
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

// 配置
const config = {
  r2: {
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    bucket: process.env.R2_BUCKET_NAME!,
  },
  oss: {
    endpoint: `https://${process.env.OSS_ENDPOINT}`,
    credentials: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.OSS_SECRET_ACCESS_KEY!,
    },
    bucket: process.env.OSS_BUCKET_NAME!,
  },
};

async function syncR2ToOSS(minutesAgo: number = 10) {
  const r2Client = new S3Client(config.r2);
  const ossClient = new S3Client(config.oss);
  
  // 获取最近更新的文件
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
  
  // 列出 R2 文件
  const listResponse = await r2Client.send(new ListObjectsV2Command({
    Bucket: config.r2.bucket,
  }));
  
  const filesToSync = (listResponse.Contents || [])
    .filter(obj => obj.LastModified && obj.LastModified > cutoffTime);
  
  console.log(`Found ${filesToSync.length} files to sync`);
  
  // 同步每个文件
  for (const file of filesToSync) {
    if (!file.Key) continue;
    
    try {
      // 从 R2 下载
      const getResponse = await r2Client.send(new GetObjectCommand({
        Bucket: config.r2.bucket,
        Key: file.Key,
      }));
      
      const body = await getResponse.Body?.transformToByteArray();
      if (!body) continue;
      
      // 上传到 OSS
      await ossClient.send(new PutObjectCommand({
        Bucket: config.oss.bucket,
        Key: file.Key,
        Body: body,
        ContentType: getResponse.ContentType,
      }));
      
      console.log(`✅ Synced: ${file.Key}`);
    } catch (error) {
      console.error(`❌ Failed to sync ${file.Key}:`, error);
    }
  }
}

// 执行同步
const minutes = parseInt(process.argv[2] || "10");
await syncR2ToOSS(minutes);
```

### 存储对比工具 (tools/migration/compare-storage.ts)

```typescript
#!/usr/bin/env bun

async function compareStorages() {
  const r2Files = await listR2Objects("");
  const ossFiles = await listOSSObjects("");
  
  const r2Keys = new Set(r2Files.map(f => f.key));
  const ossKeys = new Set(ossFiles.map(f => f.key));
  
  // 找出差异
  const onlyInR2 = [...r2Keys].filter(key => !ossKeys.has(key));
  const onlyInOSS = [...ossKeys].filter(key => !r2Keys.has(key));
  
  console.log(`Total files in R2: ${r2Keys.size}`);
  console.log(`Total files in OSS: ${ossKeys.size}`);
  console.log(`Files only in R2: ${onlyInR2.length}`);
  console.log(`Files only in OSS: ${onlyInOSS.length}`);
  
  if (onlyInR2.length > 0) {
    console.log("\nFiles missing in OSS:");
    onlyInR2.forEach(key => console.log(`  - ${key}`));
  }
  
  return {
    r2Count: r2Keys.size,
    ossCount: ossKeys.size,
    missingInOSS: onlyInR2,
    missingInR2: onlyInOSS,
  };
}
```

## 双写模式

### 双写策略
1. **优先级**：OSS 优先，R2 备份
2. **超时控制**：20-120 秒（视文件类型）
3. **失败处理**：任一成功即可
4. **异步备份**：R2 在后台上传，不阻塞响应

### 双写流程
```
用户上传 → API 接收
         ↓
    文件压缩（如果需要）
         ↓
    ┌─────────────┐
    │  双写判断   │
    └─────────────┘
         ↓
    双写模式启用？
    ├─ 是 → OSS 上传（主）
    │      ├─ 成功 → 返回 URL
    │      │        → R2 后台上传（备）
    │      └─ 失败 → R2 上传（回退）
    └─ 否 → 单存储上传
```

## 性能优化

### 1. 分块上传（大文件）
```typescript
// 对于大于 10MB 的文件使用分块上传
if (buffer.length > 10 * 1024 * 1024) {
  return await multipartUpload(key, buffer);
}
```

### 2. 并发控制
```typescript
// 限制并发上传数量
const CONCURRENT_UPLOADS = 5;
const uploadQueue = [];

for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
  const batch = files.slice(i, i + CONCURRENT_UPLOADS);
  await Promise.all(batch.map(file => uploadFile(file)));
}
```

### 3. 缓存优化
```typescript
// 缓存 S3 客户端实例
let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client(config);
  }
  return s3Client;
}
```

## 故障排查

### 常见问题

#### 1. 524 超时错误
**问题**：Cloudflare 网关超时（100 秒限制）
**解决**：
- 使用异步上传
- 增加超时时间
- 使用分块上传

#### 2. 上传失败
**问题**：大文件上传失败
**解决**：
```typescript
// 增加超时时间
const uploadTimeout = file.size > 50 * 1024 * 1024 ? 300000 : 60000;
```

#### 3. CORS 错误
**问题**：跨域访问被拒绝
**解决**：在 R2 bucket 设置 CORS 规则
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### 调试日志
```typescript
// 启用详细日志
console.log(`[R2] Uploading ${key} (${buffer.length} bytes)`);
console.log(`[R2] Upload successful: ${publicUrl}`);
console.error(`[R2] Upload failed:`, error);
```

## 迁移历史

### 时间线
- **2024-12-15**: 开始使用 R2 存储
- **2025-01-04**: 发现性能问题，计划迁移
- **2025-01-05**: Phase 1 - 批量迁移历史文件
- **2025-01-06**: Phase 2 - 实现双写模式
- **2025-01-07**: Phase 3-5 - 监控和切换
- **2025-01-08**: Phase 6 - 停止 R2 写入
- **2025-01-08**: 准备删除 R2 代码

### 迁移数据
- **文件总数**: 1,041 个
- **数据总量**: 4.3 GB
- **迁移耗时**: 约 2 小时
- **最大文件**: 137 MB（视频）

### 经验教训
1. **地理位置很重要**：R2 海外节点对国内用户不友好
2. **超时是大问题**：Cloudflare 100 秒限制影响大文件
3. **双写保证安全**：迁移期间零中断
4. **异步上传提升体验**：后台备份不影响用户

## 相关文档

- [阿里云 OSS 技术指南](./oss-storage-guide.md)
- [存储迁移计划](./migration-plan.md)
- [API 文档](./api-docs.md)

## 代码清理计划

### 需要删除的文件
1. `/src/lib/r2-storage.ts` - R2 存储库
2. `/tools/migration/sync-r2-to-oss.ts` - 同步脚本
3. `/tools/migration/compare-storage.ts` - 对比工具

### 需要修改的文件
1. `/src/app/api/upload/media/route.ts` - 移除 R2 上传逻辑
2. `/src/app/api/upload/image/route.ts` - 移除 R2 上传逻辑
3. `/src/app/api/feedback/upload/route.ts` - 移除 R2 上传逻辑
4. `/src/env.js` - 移除 R2 环境变量
5. `/src/services/file-migration-service.ts` - 移除 R2 迁移方法

### 需要更新的文档
1. `README.md` - 移除 R2 相关说明
2. `.env.example` - 移除 R2 配置示例
3. `CLAUDE.md` - 更新技术栈说明

---

**注意**: 本文档为历史记录，系统已不再使用 R2 存储。如需恢复 R2 功能，请参考本文档和 Git 历史记录。