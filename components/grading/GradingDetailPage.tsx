import React, { useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../../contexts/AppContext";
import { StudentStatus } from "../../types";
import { useGradingDetail } from "../../hooks/useGradingDetail";
import { useImageZoomDetail } from "../../hooks/useImageZoomDetail";
import { EssayImagePanel } from "./EssayImagePanel";
import { OcrEditor } from "./OcrEditor";
import { ScoreSummary } from "./ScoreSummary";
import { ScoreSectionContent } from "./ScoreSectionContent";
import { ScoreSectionLanguage } from "./ScoreSectionLanguage";
import { GradingDetailFooter } from "./GradingDetailFooter";

export const GradingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, config, fileMap, updateStudent, updateStudentGradingResult } = useAppContext();
  const student = students.find((s) => s.id === id);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 使用 GradingDetail hook
  const {
    ocrText,
    isRegenerating,
    croppedImageUrl,
    handleOcrTextChange,
    handleRegenerate,
  } = useGradingDetail({
    student,
    config,
    fileMap,
    updateStudent,
    updateStudentGradingResult,
  });

  // 使用缩放 hook
  const {
    zoomLevel,
    displayZoom,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomChange,
    handleWheel,
  } = useImageZoomDetail();

  const handleConfirmAndNext = () => {
    if (!student) return;
    
    const currentIndex = students.findIndex((s) => s.id === student.id);
    const nextGraded = students
      .slice(currentIndex + 1)
      .find((s) => s.status === StudentStatus.Graded && s.gradingResult);

    if (nextGraded) {
      navigate(`/grade/${nextGraded.id}`);
    } else {
      navigate("/");
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-slate-600">Student not found</p>
          <Link to="/" className="text-primary hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!student.gradingResult) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-slate-600">No grading result available</p>
          <Link to="/" className="text-primary hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { gradingResult } = student;

  return (
    <div className="flex flex-col h-screen bg-white font-display text-text-main">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 h-16 shrink-0 z-20 shadow-sm">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="bg-cyan-50 p-2 rounded-lg text-cyan-600 border border-cyan-100 group-hover:bg-cyan-100 transition-colors">
            <span className="material-symbols-outlined text-[24px]">
              arrow_back
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-slate-800">
              Grading Assistant
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Gemini Pro Powered • English Dept.
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none text-slate-800">
                Ms. Sarah Jenkins
              </p>
              <p className="text-xs text-text-secondary">Senior Grader</p>
            </div>
            <div
              className="h-9 w-9 rounded-full bg-cover bg-center border border-slate-200"
              style={{
                backgroundImage: "url('https://picsum.photos/200/200')",
              }}
            ></div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative group/workspace">
        <EssayImagePanel
          student={student}
          croppedImageUrl={croppedImageUrl}
          zoomLevel={zoomLevel}
          displayZoom={displayZoom}
          imageContainerRef={imageContainerRef}
          onWheel={handleWheel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onZoomChange={handleZoomChange}
        />

        {/* Right: Grading Details */}
        <section className="flex-1 flex flex-col bg-white h-full min-w-0">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Grading Review
              </h2>
              <p className="text-sm text-text-secondary">
                Compare OCR transcription with AI analysis below.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50">
            <div className="h-full flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <OcrEditor
                ocrText={ocrText}
                onChange={handleOcrTextChange}
              />

              {/* Scoring */}
              <div className="w-full lg:w-[450px] xl:w-[500px] bg-white p-6 flex flex-col gap-6 shrink-0 shadow-[ -4px_0_24px_rgba(0,0,0,0.02)]">
                <ScoreSummary gradingResult={gradingResult} />
                
                <div className="flex flex-col gap-4">
                  <ScoreSectionContent gradingResult={gradingResult} />
                  <ScoreSectionLanguage gradingResult={gradingResult} />
                </div>
              </div>
            </div>
          </div>

          <GradingDetailFooter
            isRegenerating={isRegenerating}
            onRegenerate={handleRegenerate}
            onBackToList={() => navigate("/")}
            onConfirmAndNext={handleConfirmAndNext}
          />
        </section>
      </main>
    </div>
  );
};
