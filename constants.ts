import { Student, StudentStatus, AppConfig } from "./types";

export const MOCK_STUDENTS: Student[] = [
  {
    id: "2023001",
    name: "Liu Wei",
    status: StudentStatus.Processing,
    fileName: "img_001.jpg",
    score: null,
    maxScore: 15,
    imageUrl: "https://picsum.photos/600/800?random=1",
  },
  {
    id: "2023002",
    name: "Chen Xinyi",
    status: StudentStatus.Graded,
    fileName: "img_002.jpg",
    score: 13,
    maxScore: 15,
    imageUrl: "https://picsum.photos/600/800?random=2",
    gradingResult: {
      totalScore: 13,
      contentScore: 5,
      contentMax: 6,
      languageScore: 8,
      languageMax: 9,
      ocrText:
        "I think that health is very important for us. If we want to keep healthy, we should do exercise every day. For example, we can running in the morning. Running is good for our hearts and lungs.\n\nAlso, we need to eat healthy food. We shouldn't eat too much junk food like hamburgers and chips. They has too much fat and sugar. Vegetables and fruit is good for us. We should eat them more.\n\nFinally, having a good sleep is also important. If we sleep well at night, we will have more energy in the daytime to study. I hope everyone can have a healthy lifestyle.",
      comments: {
        content:
          "The argument is relevant but lacks specific examples. Consider elaborating on 'how' to exercise beyond just running. The structure is logical.",
        language:
          "Good use of vocabulary like 'lifestyle' and 'energy'. Grammar error: 'can running' should be 'can run'. 'Vegetables and fruit is' should be 'are'.",
      },
    },
  },
  {
    id: "2023003",
    name: "Wang Lei",
    status: StudentStatus.Pending,
    fileName: "img_003.jpg",
    score: null,
    maxScore: 15,
    imageUrl: "https://picsum.photos/600/800?random=3",
  },
  {
    id: "2023004",
    name: "Zhang Min",
    status: StudentStatus.Absent,
    fileName: null,
    score: 0,
    maxScore: 15,
  },
  {
    id: "2023005",
    name: "Li Na",
    status: StudentStatus.Graded,
    fileName: "img_005.jpg",
    score: 14,
    maxScore: 15,
    imageUrl: "https://picsum.photos/600/800?random=4",
  },
  {
    id: "2023006",
    name: "Zhao Qiang",
    status: StudentStatus.Failed,
    fileName: "img_006.jpg",
    score: null,
    maxScore: 15,
    imageUrl: "https://picsum.photos/600/800?random=5",
  },
];

export const DEFAULT_CONFIG: AppConfig = {
  apiProvider: "gemini",
  apiKey: "",
  model: "gemini-3-pro",
  baseUrl: "https://generativelanguage.googleapis.com",
  concurrency: 5,
  taskPrompt:
    'Write a passage about "My Favorite Weekend Activity". You should include: 1. What the activity is. 2. Who you do it with. 3. Why you enjoy it.',
  contentPoints: [
    "Must mention activity name",
    "Must mention partners",
    "Must mention reason for enjoyment",
    "",
    "",
    "",
  ],
  contentPointsMode: "points",
  contentPointsText: "",
  // 评分满分设置（默认6+9=15）
  contentMax: 6,
  languageMax: 9,
  // Poe API 配置
  poeApiKey: "",
  poeModel: "gemini-3-pro",
  poeThinkingLevel: "low",
  // 默认全局ROI（覆盖整个图片）
  globalROI: { top: 0, left: 0, width: 100, height: 100 },
};
