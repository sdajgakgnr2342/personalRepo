const express = require('express');

const app = express();

// 内置中间件
app.use(express.json());      // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true }));  // 解析表单数据

// 示例路由
app.get('/', (req, res) => {
  res.json({ message: 'node版本 = ::Node v24!' });
  res.json({ message: '项目启动成功 = ::SUCCESS!' });
});

// 挂载路由
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

module.exports = app;