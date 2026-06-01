// API服务 - 连接后端数据库
const API = {
    baseURL: 'http://localhost:3000/api',
    token: null,
    
    // 设置token
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    },
    
    // 获取token
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('auth_token');
        }
        return this.token;
    },
    
    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }
            
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },
    
    // 用户注册
    async register(username, password, nickname) {
        return await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, nickname })
        });
    },
    
    // 用户登录
    async login(username, password) {
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    },
    
    // 获取所有情绪记录
    async getEmotions() {
        return await this.request('/emotions');
    },
    
    // 创建情绪记录
    async createEmotion(emotion) {
        return await this.request('/emotions', {
            method: 'POST',
            body: JSON.stringify({
                type: emotion.type,
                content: emotion.text,
                image_url: emotion.image,
                position_x: emotion.x,
                position_y: emotion.y
            })
        });
    },
    
    // 删除情绪记录
    async deleteEmotion(id) {
        return await this.request(`/emotions/${id}`, {
            method: 'DELETE'
        });
    },
    
    // 同步本地数据到数据库
    async syncEmotions(emotions) {
        return await this.request('/emotions/sync', {
            method: 'POST',
            body: JSON.stringify({ emotions })
        });
    },
    
    // 检查是否已登录
    isLoggedIn() {
        return !!this.getToken();
    },
    
    // 登出
    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }
};