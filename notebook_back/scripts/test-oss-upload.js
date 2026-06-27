#!/usr/bin/env node
/**
 * 在服务器上测试 OSS 连通性与大文件分片上传：
 *   node scripts/test-oss-upload.js
 */
require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const oss = require('../src/utils/oss');

async function main() {
  if (!oss.isOssEnabled()) {
    console.error('OSS 未配置，请检查 .env');
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, '../uploads/tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `oss-test-${Date.now()}.bin`);
  const sizeMb = 55;
  fs.writeFileSync(tmpPath, Buffer.alloc(sizeMb * 1024 * 1024, 1));

  const objectKey = `test/connectivity-${Date.now()}.bin`;
  console.log(`上传 ${sizeMb}MB 测试文件到 OSS...`);
  console.log('region:', process.env.OSS_REGION, 'bucket:', process.env.OSS_BUCKET);

  try {
    const uploaded = await oss.uploadFile(tmpPath, objectKey, {
      contentType: 'application/octet-stream',
    });
    console.log('上传成功:', uploaded.objectKey, uploaded.size);
    await oss.deleteObject(uploaded.objectKey);
    console.log('已删除测试对象');
  } catch (error) {
    console.error('上传失败:', oss.formatOssError(error));
    process.exit(1);
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}

main();
