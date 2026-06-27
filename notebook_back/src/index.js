require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const uploadConfig = require('./config/upload');
const attachmentStorage = require('./utils/attachmentStorage');

const authRoutes = require('./routes/authRoutes');
const notebookRoutes = require('./routes/notebookRoutes');
const itemRoutes = require('./routes/itemRoutes');
const userRoutes = require('./routes/userRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// 兼容历史本地上传文件；新上传均走阿里云 OSS
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  let uploadsWritable = false;
  try {
    fs.mkdirSync(attachmentStorage.uploadRoot, { recursive: true });
    fs.accessSync(attachmentStorage.uploadRoot, fs.constants.W_OK);
    uploadsWritable = true;
  } catch {
    uploadsWritable = false;
  }
  res.json({
    ok: true,
    attachmentStorage: uploadConfig.getAttachmentStorageMode(),
    uploadMaxAttachmentMb: Math.round(uploadConfig.maxAttachmentBytes / (1024 * 1024)),
    uploadsDir: attachmentStorage.uploadRoot,
    uploadsWritable,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/notebook', notebookRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-db', async (_req, res) => {
    const db = require('./config/db');
    try {
      const [result] = await db.query('SELECT 1 + 1 AS result');
      res.json({ success: true, message: '数据库连接成功', data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: '数据库连接失败', error: error.message });
    }
  });
}

app.get('/', (_req, res) => {
  res.json({ message: 'myNotebook API Server', version: '1.0.0' });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || '服务器错误' });
});

const server = app.listen(PORT);

server.on('listening', () => {
  let uploadsWritable = false;
  try {
    fs.mkdirSync(attachmentStorage.uploadRoot, { recursive: true });
    fs.accessSync(attachmentStorage.uploadRoot, fs.constants.W_OK);
    uploadsWritable = true;
  } catch {
    uploadsWritable = false;
  }
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(
    `📎 附件: ${uploadConfig.getAttachmentStorageMode()}, 上限 ${uploadConfig.maxAttachmentLabel}, 目录 ${attachmentStorage.uploadRoot}, 可写=${uploadsWritable}`
  );
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 端口 ${PORT} 已被占用，无法启动后端！`);
    console.error('请先结束占用该端口的进程，再重新运行 npm run dev：');
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error('  taskkill /PID <进程ID> /F\n');
  } else {
    console.error('❌ 服务器启动失败:', err.message);
  }
  process.exit(1);
});

module.exports = app;