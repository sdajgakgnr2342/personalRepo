const db = require('../config/db');

// 获取所有用户
const getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM core_user');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('数据库查询失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};


module.exports = {
  getUsers,
};