import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

function AdminDashboard({ navigate }) {
  const tabs = ['Overview', 'Users', 'Papers', 'Reports'];
  const [activeTab, setActiveTab] = useState('Overview');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Overview state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const USERS_PER_PAGE = 10;

  // Papers state
  const [papers, setPapers] = useState([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState(null);

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);

  // Fetch Overview stats
  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setStatsLoading(true);
    try {
      const res = await apiFetch('/api/admin/stats');
      const raw = res?.data?.stats || res?.stats || res?.data || res;
      setStats({
        totalUsers: raw.totalUsers ?? 0,
        students: raw.students ?? raw.totalStudents ?? 0,
        faculty: raw.faculty ?? raw.totalFaculty ?? 0,
        verifiedUsers: raw.verifiedUsers ?? raw.totalVerified ?? 0,
        blockedUsers: raw.blockedUsers ?? raw.totalBlocked ?? 0,
        totalPapers: raw.totalPapers ?? 0,
        totalReports: raw.totalReports ?? 0,
      });
      setStatsError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setStatsError(err.message);
    } finally {
      if (!isSilent) setStatsLoading(false);
    }
  }, []);

  // Fetch Users list
  const fetchUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setUsersLoading(true);
    try {
      const query = new URLSearchParams({
        page: userPage,
        limit: USERS_PER_PAGE,
      });
      if (userSearch.trim()) query.append('search', userSearch.trim());
      if (userRole) query.append('role', userRole);

      const res = await apiFetch(`/api/admin/users?${query.toString()}`);
      const userList = res?.data?.users || res?.users || [];
      const pagination = res?.data?.pagination || res?.pagination;
      setUsers(userList);
      if (pagination?.totalPages) setUserTotalPages(pagination.totalPages);
      setUsersError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setUsersError(err.message);
    } finally {
      if (!isSilent) setUsersLoading(false);
    }
  }, [userPage, userSearch, userRole]);

  // Fetch Papers list
  const fetchPapers = useCallback(async (isSilent = false) => {
    if (!isSilent) setPapersLoading(true);
    try {
      const res = await apiFetch('/api/admin/papers');
      setPapers(res?.data?.papers || res?.papers || []);
      setPapersError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setPapersError(err.message);
    } finally {
      if (!isSilent) setPapersLoading(false);
    }
  }, []);

  // Fetch Reports list
  const fetchReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setReportsLoading(true);
    try {
      const res = await apiFetch('/api/admin/reports');
      setReports(res?.data?.reports || res?.reports || []);
      setReportsError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setReportsError(err.message);
    } finally {
      if (!isSilent) setReportsLoading(false);
    }
  }, []);

  // Trigger fetch on tab change
  useEffect(() => {
    if (activeTab === 'Overview') fetchStats();
    else if (activeTab === 'Users') fetchUsers();
    else if (activeTab === 'Papers') fetchPapers();
    else if (activeTab === 'Reports') fetchReports();
  }, [activeTab, fetchStats, fetchUsers, fetchPapers, fetchReports]);

  // Real-time polling: auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'Overview') fetchStats(true);
      else if (activeTab === 'Users') fetchUsers(true);
      else if (activeTab === 'Papers') fetchPapers(true);
      else if (activeTab === 'Reports') fetchReports(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, fetchStats, fetchUsers, fetchPapers, fetchReports]);

  // Block / Unblock user
  const toggleBlockUser = async (userId, block) => {
    const endpoint = `/api/admin/users/${userId}/${block ? 'block' : 'unblock'}`;
    try {
      await apiFetch(endpoint, { method: 'PATCH' });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, isBlocked: block } : u)));
      fetchStats(true);
    } catch (err) {
      alert(`Failed to ${block ? 'block' : 'unblock'} user: ${err.message}`);
    }
  };

  // Delete user account
  const deleteUser = async (userId, userName, userEmail) => {
    const displayName = userName || userEmail || 'this user';
    if (!window.confirm(`Are you sure you want to permanently delete "${displayName}"? This will delete their account, all uploaded papers, and associated data. This action cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      fetchStats(true);
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  // Delete paper
  const deletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;
    try {
      await apiFetch(`/api/admin/papers/${paperId}`, { method: 'DELETE' });
      setPapers(prev => prev.filter(p => p.id !== paperId));
      fetchStats(true);
    } catch (err) {
      alert(`Failed to delete paper: ${err.message}`);
    }
  };

  // Update report status (e.g. resolve report)
  const updateReportStatus = async (reportId, status) => {
    try {
      await apiFetch(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, status } : r)));
      fetchStats(true);
    } catch (err) {
      alert(`Failed to update report status: ${err.message}`);
    }
  };

  // Delete reported paper and resolve report in one action
  const deletePaperAndResolveReport = async (reportId, paperId) => {
    if (!window.confirm('Are you sure you want to delete this reported paper and mark this report as resolved?')) return;
    try {
      await apiFetch(`/api/admin/papers/${paperId}`, { method: 'DELETE' });
      await apiFetch(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
        headers: { 'Content-Type': 'application/json' },
      });
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
      setPapers(prev => prev.filter(p => p.id !== paperId));
      fetchStats(true);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleManualRefresh = () => {
    if (activeTab === 'Overview') fetchStats();
    else if (activeTab === 'Users') fetchUsers();
    else if (activeTab === 'Papers') fetchPapers();
    else if (activeTab === 'Reports') fetchReports();
  };

  const renderOverview = () => {
    if (statsLoading && !stats) return <p style={{ padding: '24px 0', color: 'var(--muted)' }}>Loading live statistics...</p>;
    if (statsError) return <p className="field-error">Error loading stats: {statsError}</p>;
    if (!stats) return null;

    const cards = [
      { label: 'Total Users', value: stats.totalUsers },
      { label: 'Students', value: stats.students },
      { label: 'Faculty', value: stats.faculty },
      { label: 'Verified Users', value: stats.verifiedUsers },
      { label: 'Blocked Users', value: stats.blockedUsers },
      { label: 'Total Papers', value: stats.totalPapers },
      { label: 'Total Reports', value: stats.totalReports },
    ];

    return (
      <div className="stat-cards">
        {cards.map(card => (
          <div key={card.label} className="stat-card">
            <p className="stat-label">{card.label}</p>
            <p className="stat-number">{card.value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div>
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, college ID, or email..."
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
          />
          <select
            className="admin-filter-select"
            value={userRole}
            onChange={(e) => { setUserRole(e.target.value); setUserPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {usersLoading && users.length === 0 ? (
          <p style={{ padding: '24px 0', color: 'var(--muted)' }}>Loading users...</p>
        ) : usersError ? (
          <p className="field-error">Error loading users: {usersError}</p>
        ) : users.length === 0 ? (
          <p style={{ padding: '24px 0', color: 'var(--muted)' }}>No users found matching your query.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>College ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Email Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td><code>{u.collegeId}</code></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{ textTransform: 'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isEmailVerified ? (
                        <span style={{ color: 'var(--teal)', fontWeight: 700 }}>Verified</span>
                      ) : (
                        <span style={{ color: 'var(--coral)', fontWeight: 600 }}>Pending</span>
                      )}
                    </td>
                    <td>
                      {u.isBlocked ? (
                        <span style={{ color: 'var(--coral)', fontWeight: 700 }}>Blocked</span>
                      ) : (
                        <span style={{ color: '#2e7d32', fontWeight: 600 }}>Active</span>
                      )}
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {u.role === 'admin' ? (
                        <span style={{ color: 'var(--muted)', fontSize: '.75rem' }}>Protected Admin</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => toggleBlockUser(u.id, !u.isBlocked)}
                            className="admin-btn"
                            style={{
                              color: u.isBlocked ? 'var(--teal)' : 'var(--ink)',
                              borderColor: u.isBlocked ? 'var(--teal)' : 'var(--line)',
                            }}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id, u.name, u.email)}
                            className="admin-btn admin-btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {userTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '16px' }}>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage(p => Math.max(p - 1, 1))}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
                  Page {userPage} of {userTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={userPage >= userTotalPages}
                  onClick={() => setUserPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPapers = () => {
    if (papersLoading && papers.length === 0) return <p style={{ padding: '24px 0', color: 'var(--muted)' }}>Loading papers...</p>;
    if (papersError) return <p className="field-error">Error: {papersError}</p>;
    if (papers.length === 0) return <p style={{ padding: '24px 0', color: 'var(--muted)' }}>No papers found in the repository.</p>;

    return (
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Department</th>
              <th>Term / Year</th>
              <th>Uploader</th>
              <th>Uploaded At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {papers.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.subject}</td>
                <td>{p.department}</td>
                <td>{p.semester} / {p.year}</td>
                <td>{p.uploader?.name || p.User?.name || 'Unknown'}</td>
                <td>{p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/papers/${p.id}`)}
                      className="admin-btn"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePaper(p.id)}
                      className="admin-btn admin-btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const [reportFilter, setReportFilter] = useState('');

  const filteredReports = reportFilter
    ? reports.filter(r => (r.status || 'pending') === reportFilter)
    : reports;

  const renderReports = () => {
    return (
      <div>
        <div className="admin-toolbar">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['', 'pending', 'reviewed', 'resolved', 'rejected'].map(status => (
              <button
                key={status}
                type="button"
                className={`admin-btn ${reportFilter === status ? 'admin-btn-active' : ''}`}
                style={{
                  background: reportFilter === status ? 'var(--ink)' : 'var(--white)',
                  color: reportFilter === status ? 'var(--white)' : 'var(--ink)',
                  borderColor: reportFilter === status ? 'var(--ink)' : 'var(--line)',
                  textTransform: 'capitalize',
                }}
                onClick={() => setReportFilter(status)}
              >
                {status || 'All Reports'} ({status ? reports.filter(r => (r.status || 'pending') === status).length : reports.length})
              </button>
            ))}
          </div>
        </div>

        {reportsLoading && reports.length === 0 ? (
          <p style={{ padding: '24px 0', color: 'var(--muted)' }}>Loading reports...</p>
        ) : reportsError ? (
          <p className="field-error">Error: {reportsError}</p>
        ) : filteredReports.length === 0 ? (
          <p style={{ padding: '24px 0', color: 'var(--muted)' }}>No reports found.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Reporter</th>
                  <th>Reason</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id}>
                    <td>
                      {r.paperId ? (
                        <a
                          href={`/papers/${r.paperId}`}
                          onClick={(e) => { e.preventDefault(); navigate(`/papers/${r.paperId}`); }}
                          style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'underline' }}
                        >
                          View Paper
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.reportedBy?.name || r.reporter?.name || 'Anonymous'}</td>
                    <td><span style={{ fontWeight: 600 }}>{r.reason}</span></td>
                    <td style={{ maxWidth: '280px' }}>{r.details || '—'}</td>
                    <td>
                      <span className={`badge badge-${r.status || 'pending'}`} style={{ textTransform: 'capitalize' }}>
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {r.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => updateReportStatus(r.id, 'resolved')}
                            className="admin-btn"
                            style={{ color: '#2e7d32', borderColor: '#2e7d32' }}
                            title="Mark this report as resolved"
                          >
                            ✓ Resolve
                          </button>
                        )}
                        {r.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => updateReportStatus(r.id, 'rejected')}
                            className="admin-btn"
                            title="Reject/dismiss this report"
                          >
                            ✕ Reject
                          </button>
                        )}
                        {r.paperId && r.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => deletePaperAndResolveReport(r.id, r.paperId)}
                            className="admin-btn admin-btn-danger"
                            title="Delete the offending paper and resolve the report"
                          >
                            Delete Paper & Resolve
                          </button>
                        )}
                        <select
                          className="admin-status-select"
                          value={r.status || 'pending'}
                          onChange={e => updateReportStatus(r.id, e.target.value)}
                          title="Change status manually"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverview();
      case 'Users':
        return renderUsers();
      case 'Papers':
        return renderPapers();
      case 'Reports':
        return renderReports();
      default:
        return null;
    }
  };

  return (
    <section className="page-wrap" style={{ padding: '40px 0 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '8px' }}>Administration</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', margin: '0 0 8px' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Manage users, review reports, and moderate content in real time.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
            🟢 Live (Updated {lastRefreshed.toLocaleTimeString()})
          </span>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="admin-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="admin-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', marginBottom: '28px' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? 'admin-tab active' : 'admin-tab'}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              border: 0,
              background: 'transparent',
              borderBottom: tab === activeTab ? '2px solid var(--teal)' : '2px solid transparent',
              color: tab === activeTab ? 'var(--ink)' : 'var(--muted)',
              fontWeight: 700,
              fontSize: '.88rem',
              cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="admin-tab-content">{renderActiveTab()}</div>
    </section>
  );
}

export default AdminDashboard;
