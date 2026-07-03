import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResume();
  }, [id]);

  const fetchResume = async () => {
    try {
      const { data } = await api.get('/api/resumes/' + id);
      setResume(data);
      if (data.status === 'processing' || data.status === 'pending' || data.status === 'uploaded') {
        setTimeout(fetchResume, 5000);
      }
    } catch (err) {
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <p className="text-gray-500">Loading analysis...</p>
      </div>
    </div>
  );

  if (!resume) return null;

  const isProcessing = ['pending', 'uploaded', 'processing'].includes(resume.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-800">
          Back
        </button>
        <h1 className="text-xl font-bold text-blue-600">Resume Analysis</h1>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{resume.filename}</h2>
          <span className={"text-xs px-2 py-1 rounded-full font-medium " + (
            resume.status === 'done' ? 'bg-green-100 text-green-800' :
            resume.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          )}>
            {resume.status}
          </span>
        </div>

        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-blue-700 font-medium">Analyzing your resume...</p>
            <p className="text-blue-500 text-sm mt-1">This takes 15-30 seconds. Page updates automatically.</p>
          </div>
        )}

        {resume.status === 'done' && resume.analysis && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3">Resume Score</h3>
              <div className="flex items-center gap-4">
                <div className={"text-5xl font-bold " + (
                  resume.analysis.score >= 80 ? 'text-green-500' :
                  resume.analysis.score >= 50 ? 'text-yellow-500' : 'text-red-500'
                )}>
                  {resume.analysis.score}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={"h-3 rounded-full " + (
                        resume.analysis.score >= 80 ? 'bg-green-500' :
                        resume.analysis.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{width: resume.analysis.score + '%'}}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">out of 100</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3">
                Skills Detected ({resume.analysis.skills ? resume.analysis.skills.length : 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {resume.analysis.skills && resume.analysis.skills.map(function(skill) {
                  return (
                    <span key={skill} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-1">Experience</h3>
              <p className="text-3xl font-bold text-gray-800">
                {resume.analysis.experience_years}
                <span className="text-lg font-normal text-gray-400"> years detected</span>
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3">Feedback</h3>
              <ul className="space-y-2">
                {resume.analysis.feedback && resume.analysis.feedback.map(function(item, i) {
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-blue-500">→</span>
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {resume.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Analysis failed</p>
            <p className="text-red-400 text-sm mt-1">Please try uploading again</p>
          </div>
        )}
      </div>
    </div>
  );
}
