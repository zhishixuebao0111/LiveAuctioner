import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import type { Role } from '@liveauctioner/shared';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ username, password, role });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h2>注册</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
            <p className="form-help">用户名长度 3-20 个字符。</p>
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="form-help">密码至少 6 个字符。</p>
          </div>
          <div className="form-group">
            <label>角色</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="BUYER">买家</option>
              <option value="SELLER">卖家</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="auth-link">
          已有账号？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
