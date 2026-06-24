# 文件保险库 · 加密方案说明

本文档描述 myNotebook「隐私空间 / 文件保险库」的端到端加密设计，涵盖密钥层次、算法参数、数据格式与恢复流程。

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| 客户端加密 | 文件明文仅在浏览器内存中解密，上传前已完成加密 |
| 服务端零知识 | OSS 与数据库仅存储密文；服务端无法在无用户密码/VMK 的情况下读取文件内容 |
| 独立保险柜密码 | 与登录密码、计算器暗号完全分离 |
| 忘记密码可恢复 | 管理员人工审核后可重置保险柜密码，**不丢失已上传文件** |
| 大文件支持 | 分块加密上传，单文件上限 1GB（可配置） |

---

## 2. 密钥层次

```
用户保险柜密码
    │
    ▼ PBKDF2-SHA256（310,000 次迭代 + 随机盐）
KEK（Key Encryption Key，256 bit）
    │
    ├──► key_check = HMAC-SHA256(KEK, "mynotebook-vault-v1")
    │         （服务端仅存 key_check，用于校验密码，不存明文密码）
    │
    └──► wrapped_vmk = AES-256-GCM(KEK, VMK)
              │
              ▼
         VMK（Vault Master Key，256 bit，随机生成，长期不变）
              │
              ├──► admin_recovery_blob = AES-256-GCM(adminKey, VMK)  【仅服务端，用于人工恢复】
              │
              └──► wrapped_fek = AES-256-GCM(VMK, FEK)  【每个文件一个 FEK】
                        │
                        ▼
                   FEK（File Encryption Key，256 bit，每文件随机）
                        │
                        ├──► enc_name / enc_mime = AES-256-GCM(FEK, 明文元数据)
                        └──► 文件分块密文 = AES-256-GCM(FEK, 明文块)
```

### 密钥说明

| 密钥 | 长度 | 生命周期 | 存储位置 |
|------|------|----------|----------|
| 保险柜密码 | 用户输入 | 用户记忆 | 不存储 |
| `vault_salt` | 16 字节 | 永久 | 数据库 `vault_profile` |
| KEK | 32 字节 | 解锁时在内存中推导 | 不存储 |
| VMK | 32 字节 | 保险库开通后不变 | 以 `wrapped_vmk` 密文存库；解锁后暂存浏览器 `sessionStorage` |
| FEK | 32 字节 | 每文件独立 | 以 `wrapped_fek` 密文存库 |
| `key_check` | 32 字节 | 永久 | 数据库 `vault_profile` |

---

## 3. 算法与参数

### 3.1 密码推导（KEK）

- **算法**：PBKDF2
- **哈希**：SHA-256
- **迭代次数**：310,000（默认，存于 `kdf_params` JSON）
- **盐**：16 字节随机数（`vault_salt`）
- **输出**：256 bit → 用作 AES-256-GCM 密钥

实现位置：前端 `myNotebook/src/crypto/vault/crypto.js`

### 3.2 对称加密（通用）

- **算法**：AES-256-GCM
- **IV**：12 字节随机数（每段密文独立）
- **Auth Tag**：16 字节

**密文二进制布局**（客户端与管理员恢复模块统一）：

```
┌──────────┬──────────┬─────────────────┐
│ IV (12B) │ Tag (16B)│ Ciphertext (变长) │
└──────────┴──────────┴─────────────────┘
```

Base64 编码后写入数据库或经 HTTPS 传输。

### 3.3 密码校验（key_check）

不存储密码明文，也不存储 VMK。解锁时客户端用输入密码推导 KEK，计算：

```
key_check = HMAC-SHA256(KEK, "mynotebook-vault-v1")
```

服务端用常量时间比较 `key_check` 与库中值是否一致。

### 3.4 文件清单完整性（manifestHmac）

```
manifest = { chunkCount, sizePlain, chunkSize }
manifestHmac = HMAC-SHA256(VMK, JSON.stringify(manifest))
```

下载解密前客户端重新计算并比对，防止元数据被篡改。

---

## 4. 开通保险库流程

1. 用户在浏览器输入保险柜密码（≥ 8 位）。
2. 客户端生成：
   - 随机 `VMK`（32 字节）
   - 随机 `vault_salt`（16 字节）
   - `wrapped_vmk`、`key_check`
3. 客户端将 **VMK（Base64）** 经 HTTPS **一次性**提交给服务端。
4. 服务端用 `VAULT_ADMIN_RECOVERY_KEY` 派生用户专属密钥，生成 `admin_recovery_blob` 后**立即丢弃 VMK 明文**。
5. 写入 `vault_profile`，返回 `vaultSession`（JWT，用于后续 API 鉴权）。

> **说明**：VMK 经 HTTPS 传一次是「人工恢复」与「零知识」之间的工程权衡；之后服务端不再保留 VMK 明文。

---

## 5. 文件上传加密流程

```
原始文件 (File)
    │
    ▼ 客户端（需已解锁，内存中有 VMK）
生成 FEK（32 字节随机）
    │
    ├─ enc_name  ← AES-GCM(FEK, UTF-8 文件名)
    ├─ enc_mime  ← AES-GCM(FEK, UTF-8 MIME)
    ├─ wrapped_fek ← AES-GCM(VMK, FEK)
    └─ manifestHmac ← HMAC-SHA256(VMK, manifest)
    │
    ▼ 按 chunkSize（默认 4MB）分块
每块 plainChunk → cipherChunk = AES-GCM(FEK, plainChunk)
    │
    ▼ POST /api/vault/files/upload/init（JSON 元数据）
    ▼ POST /api/vault/files/upload/:id/chunk?index=N（application/octet-stream）
    ▼ POST /api/vault/files/upload/complete
    │
    ▼ OSS 存储路径
vault/{userId}/{uploadId}/0.enc
vault/{userId}/{uploadId}/1.enc
...
```

### 默认限制（可通过 `.env` 调整）

| 配置项 | 默认值 |
|--------|--------|
| 单文件上限 | 1 GB |
| 用户配额 | 20 GB |
| 分块大小 | 4 MB |

---

## 6. 文件下载 / 预览解密流程

1. 客户端携带 `X-Vault-Session` 请求 `GET /api/vault/files/:id/download`，获取元数据（`wrapped_fek`、`enc_name`、`enc_mime`、`manifestHmac`、分块数量）。
2. 对每个分块请求 `GET /api/vault/files/:id/chunk/:index`（**后端代理 OSS**，避免浏览器跨域问题）。
3. 客户端在本地执行：
   - `FEK = AES-GCM-Decrypt(VMK, wrapped_fek)`
   - 校验 `manifestHmac`
   - 逐块 `plain = AES-GCM-Decrypt(FEK, cipherChunk)`
   - 解密文件名、MIME，合并为 `Blob`
4. 预览 / 下载均在浏览器内存中完成，明文不经过服务端。

---

## 7. 管理员恢复流程（忘记保险柜密码）

服务端使用环境变量 `VAULT_ADMIN_RECOVERY_KEY`（≥ 32 字符）：

```
adminKey = SHA256(VAULT_ADMIN_RECOVERY_KEY)
userAdminKey = HMAC-SHA256(adminKey, userId)
admin_recovery_blob = AES-256-GCM(userAdminKey, VMK)
```

### 恢复步骤

1. 用户提交恢复申请。
2. 管理员审核通过后，服务端从 `admin_recovery_blob` 解出 VMK。
3. 生成随机 `recoveryToken`（64 字符 hex），计算 `token_hash = SHA256(recoveryToken)`。
4. 将 VMK 包裹为 `vmk_escrow = AES-256-GCM(SHA256(recoveryToken), VMK)` 写入 `vault_recovery_token`。
5. 管理员将 `recoveryToken` **安全线下**告知用户。
6. 用户凭 `recoveryToken` 取回 VMK，设置新保险柜密码，重新生成 `wrapped_vmk` 与 `key_check`。

> 管理员可重置密码绑定，**无法查看 OSS 中的文件明文**（仍需 FEK + VMK 在客户端解密）。

---

## 8. 数据库与 OSS 存储内容

### 8.1 数据库（密文 / 元数据）

**`vault_profile`（每用户一条）**

| 字段 | 内容 |
|------|------|
| `vault_salt` | KDF 盐（明文二进制） |
| `kdf_params` | PBKDF2 参数 JSON |
| `wrapped_vmk` | VMK 密文 |
| `admin_recovery_blob` | VMK 管理员恢复密文 |
| `key_check` | 密码校验 HMAC |
| `used_bytes` / `quota_bytes` | 配额统计（明文大小） |

**`vault_file`（每文件一条）**

| 字段 | 内容 |
|------|------|
| `wrapped_fek` | FEK 密文 |
| `enc_name` / `enc_mime` | 文件名 / MIME 密文 |
| `manifest_hmac` | 清单 HMAC |
| `size_plain` / `size_cipher` | 大小统计 |
| `storage_key` | OSS 路径前缀 |
| `chunk_count` / `chunk_size` | 分块信息 |

### 8.2 OSS

仅存储 AES-GCM 加密后的二进制分块（`.enc`），无文件名、无 MIME、无密钥。

---

## 9. 会话与鉴权

| 机制 | 用途 |
|------|------|
| JWT（`Authorization: Bearer`） | 登录身份 |
| `vaultSession`（`X-Vault-Session` 头） | 保险库解锁后会话，默认 15 分钟 |
| VMK in `sessionStorage` | 同标签页内免重复输入密码；锁定 / 退出后清除 |

上传、下载、列表、删除等操作需要 **登录 + vaultSession**。开通 / 解锁 / 恢复申请仅需登录。

---

## 10. 安全边界说明

**服务端无法做到**

- 在无保险柜密码且无恢复流程的情况下解密用户文件
- 查看 OSS 上文件的原始内容

**服务端可以**

- 看到密文 blob、文件大小、分块数量、上传时间
- 在配置 `VAULT_ADMIN_RECOVERY_KEY` 且审核通过后，协助重置保险柜密码（VMK 不变，文件可继续解密）
- 删除用户文件（密文）

**客户端风险**

- XSS 可能窃取内存 / `sessionStorage` 中的 VMK → 需保持前端安全编码习惯
- 用户遗失保险柜密码且未完成恢复 → 无法解密（设计如此）

---

## 11. 相关代码路径

| 模块 | 路径 |
|------|------|
| 前端加密库 | `myNotebook/src/crypto/vault/crypto.js` |
| 前端保险库状态 | `myNotebook/src/stores/vault.js` |
| 后端保险库 API | `notebook_back/src/controllers/vaultController.js` |
| 管理员恢复 | `notebook_back/src/utils/vaultAdmin.js` |
| 配置 | `notebook_back/src/config/vault.js` |
| 数据库迁移 | `notebook_back/sql/migration_vault.sql` |

---

## 12. 环境变量

```env
VAULT_ADMIN_RECOVERY_KEY=   # 管理员恢复主密钥，≥32 字符，勿泄露、勿随意更换
VAULT_MAX_FILE_BYTES=1073741824
VAULT_DEFAULT_QUOTA_BYTES=21474836480
VAULT_CHUNK_BYTES=4194304
VAULT_UNLOCK_SESSION_MINUTES=15
VAULT_RECOVERY_TOKEN_HOURS=24
```

---

*文档版本：与当前代码实现一致（PBKDF2 + AES-256-GCM + 分块上传 + 后端分块代理下载）。*
