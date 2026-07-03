import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') return toast.error('Only PDF files allowed');
    if (selected.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    try {
      const { data } = await api.post('/api/resumes/presign', {
        filename: file.name,
        contentType: file.type
      });
      await axios.put(data.signedUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      toast.success('Resume uploaded! Analyzing...');
      navigate('/analysis/' + data.resumeId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Resume</h1>
        <p className="text-gray-500 mb-6">PDF only, max 10MB</p>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4">
          <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="file-input" />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-500 text-sm">
              {file ? file.name : 'Click to select a PDF file'}
            </p>
          </label>
        </div>
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: progress + '%'}} />
            </div>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
          {uploading ? 'Uploading...' : 'Upload and Analyze'}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full mt-2 text-gray-500 text-sm hover:underline">
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
