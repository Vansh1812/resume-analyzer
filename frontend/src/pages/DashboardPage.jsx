import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        <h1 className="text-xl font-bold text-blue-600">Resume Analyzer</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Resumes</h2>
          <Link to="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            Upload Resume
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No resumes yet</p>
            <Link to="/upload" className="text-blue-600 hover:underline">
              Upload your first resume
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map(resume => (
              <div key={resume.id}
                className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{resume.filename}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={"text-xs px-2 py-1 rounded-full font-medium " + statusColor(resume.status)}>
                    {resume.status}
                  </span>
                  {resume.status === 'done' && (
                    <Link to={"/analysis/" + resume.id}
                      className="text-sm text-blue-600 hover:underline font-medium">
                      View Analysis
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
