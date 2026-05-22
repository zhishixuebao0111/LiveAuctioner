import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { ROLE_TEXT } from '../utils/display';

export default function Layout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <div className="brand-block">
            <Link to="/" className="logo">Price Killer</Link>
            <span className="brand-tagline">高价值商品公开竞价系统</span>
          </div>

          <nav className="nav">
            <Link to="/" className="nav-link">首页</Link>
            <Link to="/products" className="nav-link">商品广场</Link>
            <Link to="/auctions" className="nav-link">竞拍大厅</Link>
          </nav>

          <div className="nav-actions">
            {user ? (
              <>
                <Link to="/orders" className="nav-link">我的订单</Link>
                {(user.role === 'SELLER' || user.role === 'ADMIN') && (
                  <div className="nav-secondary-links">
                    <Link to="/seller/products" className="nav-link">商品管理</Link>
                    <Link to="/seller/auctions" className="nav-link">拍卖管理</Link>
                    <Link to="/seller/orders" className="nav-link">订单管理</Link>
                    {user.role === 'ADMIN' && (
                      <>
                        <Link to="/admin/products/reviews" className="nav-link">审核后台</Link>
                        <Link to="/admin/orders/arbitration" className="nav-link">订单仲裁</Link>
                      </>
                    )}
                  </div>
                )}
                <Link to="/profile" className="user-chip">
                  <span className="user-chip-name">{user.username}</span>
                  <span className="user-chip-role">{ROLE_TEXT[user.role]}</span>
                </Link>
                <button className="btn btn-sm btn-secondary" onClick={logout}>退出</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">登录</Link>
                <Link to="/register" className="btn btn-sm btn-primary">注册</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
