import React, { RefObject } from "react";
import { Student, AppConfig } from "../../types";
import { ROISettingsDialog } from "../ROISettingsDialog";
import { ExcelImportDialog } from "../ExcelImportDialog";

interface DashboardDialogsProps {
  showROISettings: boolean;
  showExcelImportDialog: boolean;
  excelFile: File | null;
  selectedStudent: Student | undefined;
  listInputRef: RefObject<HTMLInputElement>;
  config: AppConfig;
  onCloseROISettings: () => void;
  onCloseExcelImport: () => void;
  onExcelImport: (students: Student[]) => void;
}

export const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  showROISettings,
  showExcelImportDialog,
  excelFile,
  selectedStudent,
  listInputRef,
  config,
  onCloseROISettings,
  onCloseExcelImport,
  onExcelImport,
}) => {
  return (
    <>
      <ROISettingsDialog
        isOpen={showROISettings}
        onClose={onCloseROISettings}
        sampleImageUrl={selectedStudent?.imageUrl}
      />

      <ExcelImportDialog
        isOpen={showExcelImportDialog}
        onClose={() => {
          onCloseExcelImport();
          if (listInputRef.current) {
            listInputRef.current.value = "";
          }
        }}
        onImport={onExcelImport}
        file={excelFile}
        config={config}
      />
    </>
  );
};
