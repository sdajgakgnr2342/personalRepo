/**
 * 加密工具类 - 企业级加密方案
 * 提供多种加密方式的统一接口
 * 
 * @author Your Name
 * @version 2.0.0
 * 
 * 功能列表：
 * 1. bcrypt - 用户密码存储（最安全）
 * 2. AES-256-GCM - 敏感数据加密存储（可解密）
 * 3. HMAC-SHA256 - API签名验证
 * 4. SHA-256 - 文件完整性校验
 * 5. UUID/Random - 生成唯一ID
 * 6. Base64 - 数据传输编码
 * 
 * 使用前请在 .env 中配置：
 * ENCRYPTION_KEY=32字节十六进制密钥（用于AES加密）
 * API_SECRET=API签名密钥（用于HMAC）
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class CryptoUtil {
  constructor() {
    // ========== AES-256-GCM 配置 ==========
    this.aesAlgorithm = 'aes-256-gcm';
    
    // 从环境变量读取AES密钥
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
      console.warn('⚠️  警告：未设置 ENCRYPTION_KEY，AES加解密功能将不可用');
      this.aesKey = null;
    } else {
      this.aesKey = Buffer.from(keyHex, 'hex');
      if (this.aesKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY 必须是32字节（64个十六进制字符）');
      }
    }
    
    // ========== HMAC 配置 ==========
    this.apiSecret = process.env.API_SECRET || 'default-api-secret-key-change-me';
    
    // ========== bcrypt 配置 ==========
    this.bcryptSaltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  }

  /**
   * ===============================================
   * 1. bcrypt - 用户密码存储（推荐用于密码）
   * ===============================================
   */
  
  /**
   * 哈希密码（bcrypt）
   * @param {string} password - 明文密码
   * @returns {Promise<string>} bcrypt哈希值
   * 
   * @example
   * // 用户注册时
   * const hashedPwd = await cryptoUtil.hashPassword('user123456');
   * // 存储到数据库: INSERT INTO users (password) VALUES (hashedPwd)
   */
  async hashPassword(password) {
    if (!password) {
      throw new Error('密码不能为空');
    }
    if (password.length < 6) {
      throw new Error('密码长度至少6位');
    }
    return await bcrypt.hash(password, this.bcryptSaltRounds);
  }

  /**
   * 验证密码
   * @param {string} password - 用户输入的明文密码
   * @param {string} hash - 数据库存储的bcrypt哈希值
   * @returns {Promise<boolean>} 验证是否通过
   * 
   * @example
   * // 用户登录时
   * const isValid = await cryptoUtil.verifyPassword(inputPwd, storedHash);
   * if (isValid) {
   *   // 密码正确，生成token
   * }
   */
  async verifyPassword(password, hash) {
    if (!password || !hash) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  }

  /**
   * ===============================================
   * 2. AES-256-GCM - 敏感数据加密（可解密）
   * ===============================================
   */
  
  /**
   * AES-256-GCM 加密
   * 用途：存储需要解密的数据（身份证、手机号、银行卡等）
   * 优势：自带认证标签，可检测数据是否被篡改
   * 
   * @param {string} text - 明文数据
   * @returns {string} 加密后的字符串（格式：IV:认证标签:密文）
   * @throws {Error} 未配置密钥或加密失败
   * 
   * @example
   * // 存储用户手机号
   * const encryptedPhone = cryptoUtil.encrypt('13800138000');
   * await db.users.update({ phone: encryptedPhone });
   * 
   * // 存储身份证号
   * const encryptedIdCard = cryptoUtil.encrypt('123456199001011234');
   * 
   * // 存储API密钥
   * const encryptedApiKey = cryptoUtil.encrypt('sk-1234567890');
   */
  encrypt(text) {
    if (!this.aesKey) {
      throw new Error('AES密钥未配置，请在.env中设置ENCRYPTION_KEY');
    }
    if (!text || typeof text !== 'string') {
      throw new Error('加密数据必须是非空字符串');
    }
    
    try {
      // GCM模式推荐使用12字节的IV
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.aesAlgorithm, this.aesKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 获取认证标签（用于验证完整性）
      const authTag = cipher.getAuthTag();
      
      // 返回格式：IV(24字符):认证标签(32字符):密文
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`AES加密失败: ${error.message}`);
    }
  }

  /**
   * AES-256-GCM 解密
   * @param {string} encryptedText - encrypt() 方法生成的密文
   * @returns {string} 解密后的明文
   * @throws {Error} 解密失败（可能是密钥错误或数据被篡改）
   * 
   * @example
   * // 读取并解密手机号
   * const user = await db.users.findById(1);
   * const phone = cryptoUtil.decrypt(user.phone);
   * console.log(phone); // 输出: 13800138000
   * 
   * // 批量解密
   * const users = await db.users.findAll();
   * users.forEach(user => {
   *   user.phone = cryptoUtil.decrypt(user.phone);
   *   user.idCard = cryptoUtil.decrypt(user.idCard);
   * });
   */
  decrypt(encryptedText) {
    if (!this.aesKey) {
      throw new Error('AES密钥未配置，请在.env中设置ENCRYPTION_KEY');
    }
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('解密数据必须是非空字符串');
    }
    
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('密文格式错误');
      }
      
      const decipher = crypto.createDecipheriv(
        this.aesAlgorithm,
        this.aesKey,
        Buffer.from(ivHex, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`AES解密失败: ${error.message}`);
    }
  }

  /**
   * ===============================================
   * 3. HMAC-SHA256 - API签名验证
   * ===============================================
   */
  
  /**
   * 生成HMAC-SHA256签名
   * 用途：API请求签名、Webhook验证、JWT签名
   * 
   * @param {string|object} data - 待签名的数据
   * @param {string} secret - 签名密钥（可选，默认使用API_SECRET）
   * @returns {string} 签名字符串（十六进制）
   * 
   * @example
   * // API请求签名
   * const params = { userId: 123, timestamp: Date.now() };
   * const signature = cryptoUtil.signRequest(params);
   * // 发送请求: POST /api/user?signature=${signature}
   * 
   * // Webhook签名验证
   * const payload = { orderId: '12345', status: 'paid' };
   * const mySignature = cryptoUtil.signRequest(payload, webhookSecret);
   * if (mySignature === receivedSignature) {
   *   // 验证通过
   * }
   * 
   * // 生成JWT风格的签名
   * const header = { alg: 'HS256', typ: 'JWT' };
   * const payload = { userId: 1, exp: Date.now() + 3600000 };
   * const data = `${JSON.stringify(header)}.${JSON.stringify(payload)}`;
   * const jwtSignature = cryptoUtil.signRequest(data);
   */
  signRequest(data, secret = null) {
    const useSecret = secret || this.apiSecret;
    
    // 如果是对象，转为JSON字符串
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    return crypto.createHmac('sha256', useSecret)
      .update(dataStr)
      .digest('hex');
  }

  /**
   * 验证API签名
   * @param {string|object} data - 原始数据
   * @param {string} signature - 待验证的签名
   * @param {string} secret - 签名密钥（可选）
   * @returns {boolean} 签名是否有效
   * 
   * @example
   * // 验证请求签名
   * app.post('/api/webhook', (req, res) => {
   *   const { signature, ...data } = req.body;
   *   const isValid = cryptoUtil.verifySignature(data, signature);
   *   if (!isValid) {
   *     return res.status(401).json({ error: 'Invalid signature' });
   *   }
   *   // 处理请求...
   * });
   */
  verifySignature(data, signature, secret = null) {
    if (!signature) return false;
    const expectedSignature = this.signRequest(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * ===============================================
   * 4. SHA-256 - 文件完整性校验
   * ===============================================
   */
  
  /**
   * 计算 SHA-256 哈希值
   * 用途：文件完整性校验、数据指纹、防篡改
   * 
   * @param {string|Buffer} data - 输入数据
   * @returns {string} 64位十六进制哈希值
   * 
   * @example
   * // 文件完整性校验
   * const fileBuffer = fs.readFileSync('file.zip');
   * const fileHash = cryptoUtil.sha256(fileBuffer);
   * console.log(`文件SHA-256: ${fileHash}`);
   * 
   * // 数据指纹
   * const userData = { id: 1, name: '张三', version: 1 };
   * const fingerprint = cryptoUtil.sha256(JSON.stringify(userData));
   * 
   * // 密码哈希（不推荐，请使用bcrypt）
   * const passwordHash = cryptoUtil.sha256(password);
   */
  sha256(data) {
    if (!data) return '';
    
    const dataBuffer = Buffer.isBuffer(data) ? data : String(data);
    return crypto.createHash('sha256').update(dataBuffer).digest('hex');
  }

  /**
   * 计算大文件的 SHA-256（流式处理，节省内存）
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 哈希值
   * 
   * @example
   * const fileHash = await cryptoUtil.sha256File('./upload/backup.zip');
   * console.log('大文件哈希:', fileHash);
   */
  async sha256File(filePath) {
    const fs = require('fs');
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * ===============================================
   * 5. UUID / 随机字符串 - 生成唯一ID
   * ===============================================
   */
  
  /**
   * 生成 UUID v4
   * 用途：数据库主键、分布式ID、会话标识
   * 
   * @returns {string} UUID格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * 
   * @example
   * // 订单号生成
   * const orderId = cryptoUtil.uuid();
   * console.log(orderId); // "550e8400-e29b-41d4-a716-446655440000"
   * 
   * // 用户ID
   * const userId = cryptoUtil.uuid();
   * 
   * // 日志追踪ID
   * const traceId = cryptoUtil.uuid();
   * logger.info('Request started', { traceId });
   */
  uuid() {
    return crypto.randomUUID();
  }

  /**
   * 生成安全的随机字符串
   * 用途：Token、API密钥、重置密码链接
   * 
   * @param {number} length - 字节长度（默认32字节，生成64字符）
   * @param {string} encoding - 编码格式：'hex'|'base64'|'base64url'（默认hex）
   * @returns {string} 随机字符串
   * 
   * @example
   * // 生成重置密码Token
   * const resetToken = cryptoUtil.randomBytes(32);
   * await db.users.update({ resetToken, resetExpires: Date.now() + 3600000 });
   * 
   * // 生成API Key
   * const apiKey = cryptoUtil.randomBytes(24, 'base64url');
   * 
   * // 生成Session ID
   * const sessionId = cryptoUtil.randomBytes(16);
   */
  randomBytes(length = 32, encoding = 'hex') {
    return crypto.randomBytes(length).toString(encoding);
  }

  /**
   * 生成随机数字（验证码）
   * @param {number} length - 数字长度（默认6位）
   * @returns {string} 纯数字字符串
   * 
   * @example
   * // 短信验证码
   * const smsCode = cryptoUtil.randomNumbers(6);
   * // 发送短信: 您的验证码是 ${smsCode}
   * 
   * // 支付验证码
   * const payCode = cryptoUtil.randomNumbers(4);
   * 
   * // 邀请码
   * const inviteCode = cryptoUtil.randomNumbers(8);
   */
  randomNumbers(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * 生成带时间戳的唯一ID（保证时间顺序）
   * 格式：时间戳(13位) + 随机数(6位)
   * 
   * @returns {string} 唯一ID
   * 
   * @example
   * // 生成有序订单号
   * const orderNo = cryptoUtil.sortedId();
   * console.log(orderNo); // "1703123456789123456"
   */
  sortedId() {
    const timestamp = Date.now();
    const random = this.randomNumbers(6);
    return `${timestamp}${random}`;
  }

  /**
   * ===============================================
   * 6. Base64 - 数据传输编码
   * ===============================================
   */
  
  /**
   * Base64 编码
   * 注意：这不是加密！只是编码格式转换
   * 用途：在URL、Cookie、HTTP头中传输二进制数据
   * 
   * @param {string|Buffer} data - 待编码的数据
   * @returns {string} Base64字符串
   * 
   * @example
   * // HTTP Basic认证
   * const auth = cryptoUtil.encodeBase64(`${username}:${password}`);
   * // Authorization: Basic ${auth}
   * 
   * // URL中传递特殊字符
   * const encodedEmail = cryptoUtil.encodeBase64('user@example.com');
   * // https://api.com/user/${encodedEmail}
   * 
   * // 图片Base64
   * const imageBase64 = cryptoUtil.encodeBase64(imageBuffer);
   */
  encodeBase64(data) {
    if (!data) return '';
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    return buffer.toString('base64');
  }

  /**
   * Base64 解码
   * @param {string} base64Str - Base64字符串
   * @returns {string} 解码后的文本
   * 
   * @example
   * // 解码HTTP Basic认证
   * const authHeader = 'Basic dXNlcjpwYXNz';
   * const base64 = authHeader.split(' ')[1];
   * const credentials = cryptoUtil.decodeBase64(base64);
   * const [username, password] = credentials.split(':');
   * 
   * // 解码URL参数
   * const encoded = 'dXNlckBleGFtcGxlLmNvbQ==';
   * const email = cryptoUtil.decodeBase64(encoded);
   */
  decodeBase64(base64Str) {
    if (!base64Str) return '';
    return Buffer.from(base64Str, 'base64').toString('utf8');
  }

  /**
   * ===============================================
   * 工具方法
   * ===============================================
   */
  
  /**
   * 脱敏显示（保护隐私）
   * @param {string} text - 原文
   * @param {number} startLen - 开头保留位数（默认3）
   * @param {number} endLen - 结尾保留位数（默认4）
   * @param {string} mask - 掩码字符（默认*）
   * @returns {string} 脱敏后的字符串
   * 
   * @example
   * cryptoUtil.mask('13800138000'); // "138****8000"
   * cryptoUtil.mask('张三', 0, 0); // "**"
   * cryptoUtil.mask('1234567890123456', 4, 4); // "1234********3456"
   */
  mask(text, startLen = 3, endLen = 4, mask = '*') {
    if (!text) return '';
    if (text.length <= startLen + endLen) {
      return mask.repeat(text.length);
    }
    const start = text.slice(0, startLen);
    const end = text.slice(-endLen);
    const maskLen = text.length - startLen - endLen;
    return start + mask.repeat(maskLen) + end;
  }

  /**
   * 安全比较（防止时序攻击）
   * @param {string} a - 字符串A
   * @param {string} b - 字符串B
   * @returns {boolean} 是否相等
   */
  safeCompare(a, b) {
    if (!a || !b) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch (error) {
      return false;
    }
  }
}

// 导出单例
module.exports = new CryptoUtil();