import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchResumes(); }, []);

  const fetchResumes = async () => {
    try {
      const { data } = await api.get('/api/resumes');
      setResumes(data);
    } catch (err) {
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!window.confirm('Delete "' + filename + '"? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete('/api/resumes/' + id);
      setResumes(prev => prev.filter(r => r.id !== id));
      toast.success('Resume deleted');
    } catch (err) {
      toast.error('Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const statusColor = (status) => ({
    uploaded: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }[status] || 'bg-gray-100 text-gray-800');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Resume Analyzer </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Resumes</h2>
            <p className="text-sm text-gray-400 mt-1">{resumes.length} resume{resumes.length !== 1 ? 's' : ''} uploaded</p>
          </div>
          <Link to="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Upload Resume
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-gray-500 font-medium mb-2">No resumes yet</p>
            <p className="text-gray-400 text-sm mb-4">Upload your resume to get AI-powered analysis</p>
            <Link to="/upload"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              Upload your first resume
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map(resume => (
              <div key={resume.id}
                className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl flex-shrink-0">📄</div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{resume.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(resume.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className={"text-xs px-2 py-1 rounded-full font-medium " + statusColor(resume.status)}>
                    {resume.status}
                  </span>

                  {resume.status === 'done' && (
                    <Link to={"/analysis/" + resume.id}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">
                      View
                    </Link>
                  )}

                  {resume.status === 'failed' && (
                    <Link to="/upload"
                      className="text-sm text-orange-500 hover:underline font-medium">
                      Retry
                    </Link>
                  )}

                  <button
                    onClick={() => handleDelete(resume.id, resume.filename)}
                    disabled={deletingId === resume.id}
                    className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded font-medium disabled:opacity-50 transition-colors">
                    {deletingId === resume.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
