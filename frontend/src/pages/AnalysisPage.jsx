import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { generateResumePDF } from '../utils/generatePDF';

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchResume(); }, [id]);

  const fetchResume = async () => {
    try {
      const { data } = await api.get('/api/resumes/' + id);
      setResume(data);
      if (['processing','pending','uploaded'].includes(data.status)) {
        setTimeout(fetchResume, 5000);
      }
    } catch (err) {
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const parseJSON = (val) => {
    if (!val) return null;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
    return val;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">Loading</div>
        <p className="text-gray-500">Loading analysis...</p>
      </div>
    </div>
  );

  if (!resume) return null;

  const isProcessing = ['pending','uploaded','processing'].includes(resume.status);
  const analysis = resume.analysis;

//   Parse the nested structure correctly
  const rawSkillsData = analysis ? parseJSON(analysis?.skills) : null;
  const actualSkills = rawSkillsData?.skills || rawSkillsData || {};
  const education = rawSkillsData?.education || null;
  const keywords = rawSkillsData?.keywords || [];
  const strengths = rawSkillsData?.strengths || [];
  const improvements = rawSkillsData?.improvements || [];
  const feedback = parseJSON(analysis?.feedback) || [];

  const skillCategories = ['languages','frontend','backend','databases','cloud','tools'];
  const totalSkillCount = skillCategories.reduce(
    (sum, cat) => sum + (actualSkills[cat]?.length || 0), 0
  );

  const handleDownloadPDF = () => {
    generateResumePDF(resume, analysis, {
      ...actualSkills, education, keywords, strengths, improvements
    }, feedback);
  };

  const scoreColor = (s) => s >= 80 ? 'text-green-500' : s >= 50 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = (s) => s >= 80 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-800">
            Back
          </button>
          <h1 className="text-xl font-bold text-blue-600">Resume Analysis</h1>
        </div>
        {resume.status === 'done' && analysis && (
          <button onClick={handleDownloadPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            Download PDF Report
          </button>
        )}
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
            <div className="text-3xl mb-2">Analyzing</div>
            <p className="text-blue-700 font-medium">Analyzing your resume...</p>
            <p className="text-blue-500 text-sm mt-1">This takes 15-30 seconds. Page updates automatically.</p>
          </div>
        )}

        {resume.status === 'done' && analysis && (
          <div className="space-y-4">
            

            {/* Score */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3">Overall Score</h3>
              <div className="flex items-center gap-4">
                <div className={"text-6xl font-bold " + scoreColor(analysis.score)}>
                  {analysis.score}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className={"h-4 rounded-full " + scoreBg(analysis.score)}
                      style={{width: analysis.score + '%'}} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0</span><span>out of 100</span>
                  </div>
                  <p className={"mt-1 text-sm font-medium " + scoreColor(analysis.score)}>
                    {analysis.score >= 80 ? 'Excellent resume!' :
                     analysis.score >= 60 ? 'Good resume - room to improve' :
                     analysis.score >= 40 ? 'Average - needs improvement' :
                     'Needs significant work'}
                  </p>
                </div>
              </div>
            </div>

            {/* Experience + Education */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-bold text-gray-700 mb-2">Experience</h3>
                <p className="text-3xl font-bold text-gray-800">{analysis.experience_years}</p>
                <p className="text-sm text-gray-400">years detected</p>
              </div>
              {education && (
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-bold text-gray-700 mb-2">Education</h3>
                  <p className="text-sm font-medium text-gray-700">{education.highestDegree}</p>
                  {education.institutions && education.institutions[0] && (
                    <p className="text-xs text-gray-400 mt-1">{education.institutions[0]}</p>
                  )}
                </div>
              )}
            </div>

            {/* Skills by Category */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-4">
                Skills Detected ({totalSkillCount})
              </h3>
              {totalSkillCount === 0 ? (
                <p className="text-gray-400 text-sm">No skills detected — try uploading again after redeploying Lambda</p>
              ) : (
                skillCategories.map(category => (
                  actualSkills[category] && actualSkills[category].length > 0 && (
                    <div key={category} className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {actualSkills[category].map(skill => (
                          <span key={skill}
                            className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                ))
              )}
            </div>

            {/* Keywords */}
            {keywords && keywords.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-bold text-gray-700 mb-3">Keywords Found</h3>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(kw => (
                    <span key={kw}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {strengths && strengths.length > 0 && (
              <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-200">
                <h3 className="font-bold text-green-700 mb-3">Strengths</h3>
                <ul className="space-y-2">
                  {strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                      <span className="font-bold mt-0.5">+</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {improvements && improvements.length > 0 && (
              <div className="bg-yellow-50 rounded-xl p-6 shadow-sm border border-yellow-200">
                <h3 className="font-bold text-yellow-700 mb-3">Areas for Improvement</h3>
                <ul className="space-y-2">
                  {improvements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-yellow-700">
                      <span className="mt-0.5">-&gt;</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            {feedback && feedback.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-bold text-gray-700 mb-3">Detailed Feedback</h3>
                <ul className="space-y-2">
                  {feedback.map((item, i) => (
                    <li key={i} className={"flex items-start gap-2 text-sm p-2 rounded-lg " + (
                      item.startsWith('MISSING') ? 'bg-red-50 text-red-700' :
                      item.startsWith('WARNING') ? 'bg-orange-50 text-orange-700' :
                      item.startsWith('SUGGESTED') ? 'bg-blue-50 text-blue-700' :
                      item.startsWith('LOW') ? 'bg-yellow-50 text-yellow-700' :
                      'bg-green-50 text-green-700'
                    )}>
                      <span className="font-bold flex-shrink-0">
                        {item.startsWith('MISSING') ? '[X]' :
                         item.startsWith('WARNING') ? '[!]' :
                         item.startsWith('SUGGESTED') ? '[i]' :
                         item.startsWith('LOW') ? '[v]' : '[ok]'}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}

        {resume.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Analysis failed</p>
            <p className="text-red-400 text-sm mt-1">Please try uploading again</p>
            <button onClick={() => navigate('/upload')}
              className="mt-3 text-sm text-red-600 hover:underline">
              Upload again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
