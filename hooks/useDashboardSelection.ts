import { useState, useEffect, useCallback } from "react";
import { Student, StudentStatus } from "../types";

interface UseDashboardSelectionProps {
  students: Student[];
  onStatusToggle: (id: string, newStatus: StudentStatus) => void;
}

export const useDashboardSelection = ({
  students,
  onStatusToggle,
}: UseDashboardSelectionProps) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // 自动选择第一个学生
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    } else if (selectedStudentId && !students.find((s) => s.id === selectedStudentId)) {
      if (students.length > 0) {
        setSelectedStudentId(students[0].id);
      }
    }
  }, [students, selectedStudentId]);

  // 过滤学生
  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.id.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      (s.class && s.class.toLowerCase().includes(term))
    );
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentIndex = filteredStudents.findIndex((s) => s.id === selectedStudentId);
      if (e.key === "ArrowUp" && currentIndex > 0) {
        e.preventDefault();
        setSelectedStudentId(filteredStudents[currentIndex - 1].id);
      } else if (e.key === "ArrowDown" && currentIndex < filteredStudents.length - 1) {
        e.preventDefault();
        setSelectedStudentId(filteredStudents[currentIndex + 1].id);
      } else if (e.key === " " && selectedStudent) {
        e.preventDefault();
        onStatusToggle(
          selectedStudent.id,
          selectedStudent.status === StudentStatus.Absent
            ? StudentStatus.Pending
            : StudentStatus.Absent
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredStudents, selectedStudentId, selectedStudent, onStatusToggle]);

  const handleToggleSelect = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  }, [filteredStudents]);

  return {
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentIds,
    selectedStudent,
    searchTerm,
    setSearchTerm,
    filteredStudents,
    handleToggleSelect,
    handleSelectAll,
  };
};
