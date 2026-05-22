import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { authApi, type CreditLevel, type CreditLog } from '../api/auth';
import { depositApi, type DepositRecord } from '../api/deposits';
import {
  formatDate,
  formatCurrency,
  formatDateTime,
  ROLE_TEXT,
  DEPOSIT_STATUS_TEXT,
  getCreditLevelInfo,
} from '../utils/display';

export default function Profile() {
  const { user, recharge } = useAuthStore();
  const [amount, setAmount] = useState('100');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [creditLevel, setCreditLevel] = useState<CreditLevel | null>(null);
  const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
  const [creditLogsTotal, setCreditLogsTotal] = useState(0);
  const [creditLogsPage, setCreditLogsPage] = useState(1);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loadingCredit, setLoadingCredit] = useState(true);

  useEffect(() => {
    const loadCreditData = async () => {
      setLoadingCredit(true);
      try {
        const [levelRes, logsRes, depositsRes] = await Promise.all([
          authApi.getCreditLevel(),
          authApi.getCreditLogs(creditLogsPage, 10),
          depositApi.getMyDeposits(),
        ]);
        setCreditLevel(levelRes.data.data);
        setCreditLogs(logsRes.data.data.logs);
        setCreditLogsTotal(logsRes.data.data.pagination.total);
        setDeposits(depositsRes.data.data);
      } catch {
        // silent fail for credit data
      } finally {
        setLoadingCredit(false);
      }
    };
    loadCreditData();
  }, [creditLogsPage]);

  if (!user) return null;

  const levelInfo = getCreditLevelInfo(user.creditScore);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextAmount = Number(amount);

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setError('充值金额必须大于 0');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await recharge(nextAmount);
      setAmount('100');
    } catch (err: any) {
      setError(err.response?.data?.message || '充值失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page profile-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>个人中心</h1>
          <p className="section-copy">统一查看当前账号角色、余额、信用分和注册信息。</p>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="profile-card">
        <div className="profile-item">
          <span className="label">用户名</span>
          <span className="value">{user.username}</span>
        </div>
        <div className="profile-item">
          <span className="label">角色</span>
          <span className="value">{ROLE_TEXT[user.role]}</span>
        </div>
        <div className="profile-item">
          <span className="label">余额</span>
          <span className="value">{formatCurrency(user.balance)}</span>
        </div>
        <div className="profile-item">
          <span className="label">冻结余额</span>
          <span className="value">{formatCurrency(user.frozenBalance)}</span>
        </div>
        <form className="recharge-form" onSubmit={handleRecharge}>
          <div>
            <label>模拟充值</label>
            <p>用于订单支付和竞拍保证金，不接入真实支付渠道。</p>
          </div>
          <div className="recharge-actions">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="输入充值金额"
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '充值中...' : '充值'}
            </button>
          </div>
        </form>
        {error && <div className="error-msg">{error}</div>}
        <div className="profile-item">
          <span className="label">信用分</span>
          <span className="value">
            {user.creditScore}
            <span className={`credit-level-badge credit-level-${levelInfo.color}`}>
              {levelInfo.label}
            </span>
          </span>
        </div>
        <div className="profile-item">
          <span className="label">违规次数</span>
          <span className="value">{user.violationCount}</span>
        </div>
        <div className="profile-item">
          <span className="label">注册时间</span>
          <span className="value">{formatDate(user.createdAt)}</span>
        </div>
      </div>

      {/* 信用等级说明 */}
      {creditLevel && (
        <div className="credit-level-card">
          <h3>信用等级说明</h3>
          <div className="credit-level-info">
            <div className="credit-level-detail">
              <span>当前等级</span>
              <strong className={`credit-level-text-${levelInfo.color}`}>{levelInfo.label}</strong>
            </div>
            <div className="credit-level-detail">
              <span>保证金比例</span>
              <strong>{creditLevel.depositRate * 100}%</strong>
            </div>
            <div className="credit-level-detail">
              <span>状态说明</span>
              <strong>{levelInfo.description}</strong>
            </div>
          </div>
          <div className="credit-level-tiers">
            <div className={`credit-tier ${user.creditScore >= 80 ? 'active' : ''}`}>
              <span className="tier-label">正常</span>
              <span className="tier-range">≥ 80</span>
              <span className="tier-rate">10%</span>
            </div>
            <div className={`credit-tier ${user.creditScore >= 60 && user.creditScore < 80 ? 'active' : ''}`}>
              <span className="tier-label">警告</span>
              <span className="tier-range">60-79</span>
              <span className="tier-rate">20%</span>
            </div>
            <div className={`credit-tier ${user.creditScore >= 40 && user.creditScore < 60 ? 'active' : ''}`}>
              <span className="tier-label">受限</span>
              <span className="tier-range">40-59</span>
              <span className="tier-rate">30%</span>
            </div>
            <div className={`credit-tier ${user.creditScore >= 20 && user.creditScore < 40 ? 'active restricted' : ''}`}>
              <span className="tier-label">严重受限</span>
              <span className="tier-range">20-39</span>
              <span className="tier-rate">30%</span>
            </div>
            <div className={`credit-tier ${user.creditScore < 20 ? 'active banned' : ''}`}>
              <span className="tier-label">封禁</span>
              <span className="tier-range">&lt; 20</span>
              <span className="tier-rate">-</span>
            </div>
          </div>
        </div>
      )}

      {/* 保证金记录 */}
      <div className="profile-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Deposits</p>
            <h2>保证金记录</h2>
          </div>
        </div>
        {loadingCredit ? (
          <div className="loading">加载中...</div>
        ) : deposits.length === 0 ? (
          <div className="empty-state">暂无保证金记录</div>
        ) : (
          <div className="deposit-list">
            {deposits.map((deposit) => (
              <div key={deposit.id} className="deposit-card">
                <div className="deposit-card-header">
                  <span className={`status-badge status-deposit-${deposit.status.toLowerCase()}`}>
                    {DEPOSIT_STATUS_TEXT[deposit.status]}
                  </span>
                  <span className="deposit-amount">{formatCurrency(deposit.amount)}</span>
                </div>
                <div className="deposit-card-body">
                  <h4>{deposit.auction.product.name}</h4>
                  <div className="deposit-meta">
                    <span>拍品当前价: {formatCurrency(deposit.auction.currentPrice)}</span>
                    <span>创建时间: {formatDateTime(deposit.createdAt)}</span>
                  </div>
                </div>
                <div className="deposit-card-footer">
                  <Link to={`/auctions/${deposit.auctionId}`} className="btn btn-sm btn-secondary">
                    查看拍品
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 信用变动记录 */}
      <div className="profile-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Credit History</p>
            <h2>信用变动记录</h2>
          </div>
        </div>
        {loadingCredit ? (
          <div className="loading">加载中...</div>
        ) : creditLogs.length === 0 ? (
          <div className="empty-state">暂无信用变动记录</div>
        ) : (
          <>
            <div className="credit-log-list">
              {creditLogs.map((log) => (
                <div key={log.id} className="credit-log-row">
                  <div className={`credit-log-change ${log.change >= 0 ? 'positive' : 'negative'}`}>
                    {log.change >= 0 ? '+' : ''}{log.change}
                  </div>
                  <div className="credit-log-info">
                    <span className="credit-log-reason">{log.reason}</span>
                    <span className="credit-log-time">{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
            {creditLogsTotal > 10 && (
              <div className="pagination">
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={creditLogsPage <= 1}
                  onClick={() => setCreditLogsPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  第 {creditLogsPage} 页 / 共 {Math.ceil(creditLogsTotal / 10)} 页
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={creditLogsPage >= Math.ceil(creditLogsTotal / 10)}
                  onClick={() => setCreditLogsPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
