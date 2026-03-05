import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { Users, BookOpen, ClipboardList, AlertCircle, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) setAdmin(JSON.parse(adminData));
    
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3000/admin/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Aktif Kullanıcılar', value: stats?.active_users_week || 0 },
    { name: 'Toplam Kullanıcılar', value: stats?.total_users || 0 },
    { name: 'Toplam Sorular', value: stats?.total_questions || 0 },
    { name: 'Tamamlanan Sınavlar', value: stats?.total_tests || 0 },
  ];

  const pieData = [
    { name: 'Beklemede', value: stats?.pending_moderations || 0 },
    { name: 'Diğer', value: Math.max(0, 10 - (stats?.pending_moderations || 0)) },
  ];

  const COLORS = ['#ff6b6b', '#51cf66'];

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📊 Admin Paneli</h1>
          <p>KPSS Platform Yönetimi</p>
        </div>
        <div className="header-right">
          <div className="admin-info">
            <span className="admin-name">{admin?.full_name}</span>
            <span className="admin-role">{admin?.role === 'super_admin' ? 'Süper Admin' : 'Admin'}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Oturumu Kapat">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button className="nav-btn active" onClick={() => navigate('/admin/dashboard')}>
          📊 Gösterge Paneli
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/users')}>
          👥 Kullanıcılar
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/questions')}>
          📝 Sorular
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/moderation')}>
          ⚠️ Moderasyon
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/logs')}>
          📋 İşlem Günlüğü
        </button>
        <button className="nav-btn" onClick={() => navigate('/admin/settings')}>
          ⚙️ Ayarlar
        </button>
      </nav>

      <main className="dashboard-content">
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon users">
              <Users size={32} />
            </div>
            <div className="stat-info">
              <h3>Toplam Kullanıcılar</h3>
              <p className="stat-value">{stats?.total_users || 0}</p>
              <small>Kayıtlı kullanıcı sayısı</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon questions">
              <BookOpen size={32} />
            </div>
            <div className="stat-info">
              <h3>Toplam Sorular</h3>
              <p className="stat-value">{stats?.total_questions || 0}</p>
              <small>Veritabanındaki sorular</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon tests">
              <ClipboardList size={32} />
            </div>
            <div className="stat-info">
              <h3>Tamamlanan Sınavlar</h3>
              <p className="stat-value">{stats?.total_tests || 0}</p>
              <small>Başlık toplam sınav sayısı</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon alerts">
              <AlertCircle size={32} />
            </div>
            <div className="stat-info">
              <h3>Beklemede Moderasyon</h3>
              <p className="stat-value">{stats?.pending_moderations || 0}</p>
              <small>İncelenmeyi bekleyen içerik</small>
            </div>
          </div>
        </section>

        <section className="charts-section">
          <div className="chart-container full">
            <h2>📈 Sistem İstatistikleri</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container half">
            <h2>🔔 Moderasyon Durumu</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container half">
            <h2>⚡ Hızlı İşlemler</h2>
            <div className="quick-actions">
              <button className="action-btn primary">
                ➕ Yeni Soru Ekle
              </button>
              <button className="action-btn">
                👤 Yeni Kullanıcı Ekle
              </button>
              <button className="action-btn">
                📊 Rapor İndir
              </button>
              <button className="action-btn">
                🔧 Ayarları Düzenle
              </button>
            </div>
          </div>
        </section>

        <section className="recent-activity">
          <h2>📋 Son İşlemler</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">Şimdi</span>
              <span className="activity-desc">Admin paneline giriş yapıldı</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">2 saat önce</span>
              <span className="activity-desc">Yeni sınav oluşturuldu</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">5 saat önce</span>
              <span className="activity-desc">Sistem ayarları güncellendiğini</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">1 gün önce</span>
              <span className="activity-desc">Kullanıcı raporu oluştu</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
