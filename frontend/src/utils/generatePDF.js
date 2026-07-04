import { jsPDF } from 'jspdf';

export const generateResumePDF = (resume, analysis, skillsData, feedback) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkNewPage = (neededSpace = 20) => {
    if (y + neededSpace > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const drawLine = () => {
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  const writeText = (text, fontSize, fontStyle, color, x, maxWidth) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth || contentWidth);
    lines.forEach(line => {
      checkNewPage(fontSize * 0.5);
      doc.text(line, x || margin, y);
      y += fontSize * 0.45;
    });
  };

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Resume Analysis Report', margin, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(resume.filename, margin, 30);
  doc.text('Generated: ' + new Date().toLocaleDateString(), margin, 38);
  y = 58;

  // Score
  const score = analysis.score;
  const scoreColor = score >= 80 ? [34, 197, 94] : score >= 50 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'F');
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(String(score), margin + 8, y + 24);
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text('/ 100', margin + 28, y + 24);
  const label = score >= 80 ? 'Excellent Resume!' :
    score >= 60 ? 'Good - Room to Improve' :
    score >= 40 ? 'Average - Needs Improvement' : 'Needs Significant Work';
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(label, margin + 55, y + 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Experience: ' + analysis.experience_years + ' years detected', margin + 55, y + 26);
  y += 45;
  drawLine();

  // Education
  if (skillsData && skillsData.education) {
    checkNewPage(30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Education', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text('Highest Degree: ' + skillsData.education.highestDegree, margin, y);
    y += 6;
    if (skillsData.education.institutions && skillsData.education.institutions.length > 0) {
      skillsData.education.institutions.forEach(inst => {
        checkNewPage(8);
        const lines = doc.splitTextToSize('- ' + inst, contentWidth - 4);
        lines.forEach(line => { doc.text(line, margin + 4, y); y += 6; });
      });
    }
    y += 4;
    drawLine();
  }

  // Skills
  const skillCategories = ['languages', 'frontend', 'backend', 'databases', 'cloud', 'tools'];
  const hasSkills = skillsData && skillCategories.some(cat => skillsData[cat] && skillsData[cat].length > 0);
  if (hasSkills) {
    checkNewPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Skills Detected', margin, y);
    y += 8;
    skillCategories.forEach(category => {
      if (skillsData[category] && skillsData[category].length > 0) {
        checkNewPage(16);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 114, 128);
        doc.text(category.toUpperCase(), margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(37, 99, 235);
        const skillText = skillsData[category].join('  |  ');
        const lines = doc.splitTextToSize(skillText, contentWidth - 4);
        lines.forEach(line => { checkNewPage(6); doc.text(line, margin + 2, y); y += 5; });
        y += 3;
      }
    });
    drawLine();
  }

  // Keywords
  if (skillsData && skillsData.keywords && skillsData.keywords.length > 0) {
    checkNewPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Keywords Found', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(109, 40, 217);
    const kwLines = doc.splitTextToSize(skillsData.keywords.join('  |  '), contentWidth);
    kwLines.forEach(line => { checkNewPage(6); doc.text(line, margin, y); y += 6; });
    y += 4;
    drawLine();
  }

  // Strengths
  if (skillsData && skillsData.strengths && skillsData.strengths.length > 0) {
    checkNewPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Strengths', margin, y);
    y += 8;
    skillsData.strengths.forEach(strength => {
      checkNewPage(16);
      doc.setFillColor(240, 253, 244);
      const lines = doc.splitTextToSize('[+] ' + strength, contentWidth - 8);
      const boxHeight = lines.length * 6 + 6;
      doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61);
      lines.forEach((line, i) => { doc.text(line, margin + 4, y + (i * 6)); });
      y += boxHeight + 3;
    });
    y += 2;
    drawLine();
  }

  // Improvements
  if (skillsData && skillsData.improvements && skillsData.improvements.length > 0) {
    checkNewPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Areas for Improvement', margin, y);
    y += 8;
    skillsData.improvements.forEach(item => {
      checkNewPage(16);
      doc.setFillColor(255, 251, 235);
      const lines = doc.splitTextToSize('[>] ' + item, contentWidth - 8);
      const boxHeight = lines.length * 6 + 6;
      doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(161, 98, 7);
      lines.forEach((line, i) => { doc.text(line, margin + 4, y + (i * 6)); });
      y += boxHeight + 3;
    });
    y += 2;
    drawLine();
  }

  // Detailed Feedback
  if (feedback && feedback.length > 0) {
    checkNewPage(20);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Detailed Feedback', margin, y);
    y += 8;
    feedback.forEach(item => {
      checkNewPage(14);
      const isMissing = item.startsWith('MISSING');
      const isWarning = item.startsWith('WARNING');
      const isSuggested = item.startsWith('SUGGESTED');
      const isLow = item.startsWith('LOW');
      const bgColor = isMissing ? [254, 242, 242] : isWarning ? [255, 247, 237] :
        isSuggested ? [239, 246, 255] : isLow ? [254, 252, 232] : [240, 253, 244];
      const textColor = isMissing ? [185, 28, 28] : isWarning ? [194, 65, 12] :
        isSuggested ? [29, 78, 216] : isLow ? [161, 98, 7] : [21, 128, 61];
      const prefix = isMissing ? '[X] ' : isWarning ? '[!] ' : isSuggested ? '[i] ' : isLow ? '[v] ' : '[ok] ';
      doc.setFillColor(...bgColor);
      const lines = doc.splitTextToSize(prefix + item, contentWidth - 8);
      const boxHeight = lines.length * 6 + 6;
      doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      lines.forEach((line, i) => { doc.text(line, margin + 4, y + (i * 6)); });
      y += boxHeight + 3;
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(249, 250, 251);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Resume Analyzer - Confidential Report', margin, pageHeight - 5);
    doc.text('Page ' + i + ' of ' + totalPages, pageWidth - margin - 20, pageHeight - 5);
  }

  doc.save(resume.filename.replace('.pdf', '') + '-analysis-report.pdf');
};
