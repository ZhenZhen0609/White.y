const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// JWT验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'token无效' });
        }
        req.user = user;
        next();
    });
};

// ==================== 用户认证路由 ====================

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, nickname } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 插入用户
        const [result] = await db.execute(
            'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
            [username, hashedPassword, nickname || username]
        );
        
        res.status(201).json({ 
            message: '注册成功',
            userId: result.insertId 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: '用户名已存在' });
        } else {
            res.status(500).json({ error: '注册失败' });
        }
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 查找用户
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        const user = rows[0];
        
        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                nickname: user.nickname
            }
        });
    } catch (error) {
        res.status(500).json({ error: '登录失败' });
    }
});

// ==================== 情绪日记路由 ====================

// 获取所有情绪记录
app.get('/api/emotions', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, type, content, image_url, position_x, position_y, created_at 
             FROM emotions 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 60`,
            [req.user.userId]
        );
        
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '获取记录失败' });
    }
});

// 创建情绪记录
app.post('/api/emotions', authenticateToken, async (req, res) => {
    try {
        console.log('📝 收到创建情绪记录请求:', req.body);
        console.log('👤 用户ID:', req.user.userId);
        
        const { type, content, image_url, position_x, position_y } = req.body;
        
        if (!type || !content) {
            console.log('❌ 类型或内容为空');
            return res.status(400).json({ error: '类型和内容不能为空' });
        }
        
        const [result] = await db.execute(
            `INSERT INTO emotions (user_id, type, content, image_url, position_x, position_y) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.userId, type, content, image_url || null, position_x, position_y]
        );
        
        console.log('✅ 插入成功, ID:', result.insertId);
        
        res.status(201).json({
            message: '记录成功',
            emotionId: result.insertId
        });
    } catch (error) {
        console.error('❌ 创建记录失败:', error);
        res.status(500).json({ error: '记录失败' });
    }
});

// 删除情绪记录
app.delete('/api/emotions/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM emotions WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '记录不存在' });
        }
        
        res.json({ message: '删除成功' });
    } catch (error) {
        res.status(500).json({ error: '删除失败' });
    }
});

// 同步本地数据到数据库
app.post('/api/emotions/sync', authenticateToken, async (req, res) => {
    try {
        const { emotions } = req.body;
        
        if (!Array.isArray(emotions)) {
            return res.status(400).json({ error: '数据格式错误' });
        }
        
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            for (const emotion of emotions) {
                await connection.execute(
                    `INSERT INTO emotions (user_id, type, content, image_url, position_x, position_y, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.user.userId,
                        emotion.type,
                        emotion.text,
                        emotion.image || null,
                        emotion.x,
                        emotion.y,
                        emotion.time ? new Date(emotion.time) : new Date()
                    ]
                );
            }
            
            await connection.commit();
            res.json({ message: '同步成功', count: emotions.length });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ error: '同步失败' });
    }
});

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});