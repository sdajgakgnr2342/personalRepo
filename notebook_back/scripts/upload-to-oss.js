/**
 * 命令行上传文件到阿里云 OSS
 *
 * 用法:
 *   node scripts/upload-to-oss.js <本地文件路径> [OSS对象键]
 *   node scripts/upload-to-oss.js ./uploads/test.jpg
 *   node scripts/upload-to-oss.js ./uploads/test.jpg attachments/notes/test.jpg
 *
 * 或在 package.json 中:
 *   npm run upload-oss -- ./uploads/test.jpg attachments/notes/test.jpg
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const oss = require('../src/utils/oss');

function printHelp() {
  console.log(`
阿里云 OSS 上传工具

用法:
  node scripts/upload-to-oss.js <本地文件> [对象键]

参数:
  本地文件   必填，要上传的文件路径
  对象键     可选，OSS 中的存储路径；省略则自动生成

示例:
  node scripts/upload-to-oss.js ./uploads/demo.jpg
  node scripts/upload-to-oss.js ./uploads/demo.jpg avatars/demo.jpg

环境变量（写入 notebook_back/.env）:
  OSS_REGION
  OSS_ACCESS_KEY_ID
  OSS_ACCESS_KEY_SECRET
  OSS_BUCKET
  OSS_PREFIX          可选，统一前缀，如 mynotebook
  OSS_ENDPOINT        可选，自定义 Endpoint
  OSS_CUSTOM_DOMAIN   可选，自定义访问域名
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    process.exit(args.length ? 0 : 1);
  }

  if (!oss.isOssEnabled()) {
    console.error('❌ OSS 未配置，请先在 notebook_back/.env 中填写 OSS 相关变量');
    process.exit(1);
  }

  const localFile = args[0];
  const objectKey = args[1] || oss.generateObjectKey('uploads', path.basename(localFile));

  console.log('📤 开始上传...');
  console.log(`   本地文件: ${path.resolve(localFile)}`);
  console.log(`   对象键:   ${oss.buildObjectKey(objectKey)}`);

  const result = await oss.uploadFile(localFile, objectKey);

  console.log('\n✅ 上传成功');
  console.log(`   URL:  ${result.url}`);
  console.log(`   Key:  ${result.objectKey}`);
  console.log(`   Size: ${result.size} bytes`);
}

main().catch((err) => {
  console.error(`\n❌ 上传失败: ${err.message}`);
  process.exit(1);
});
