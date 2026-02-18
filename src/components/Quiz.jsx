import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaRedo,
  FaTrophy,
  FaBook,
  FaCloudUploadAlt,
  FaFilePdf,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";
import "../styles/quiz.css";
import { quizAPI } from "../services/apiClient.js";

export function Quiz() {
  const [quizMode, setQuizMode] = useState("setup"); // setup, active, results
  const [folders, setFolders] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [quizType, setQuizType] = useState("mixed"); // mixed, multiple-choice, true-false, typed
  const [questionCount, setQuestionCount] = useState(10);
  const [examMode, setExamMode] = useState(false);
  const [sourceTab, setSourceTab] = useState("flashcards"); // flashcards, document
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generatedQuizId, setGeneratedQuizId] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const buildFoldersFromFlashcards = (cards = []) => {
    const subjectMap = new Map();

    cards.forEach((card) => {
      if (!card?.subject || !card?.topic) return;
      const subjectName = card.subject.trim();
      const topicName = card.topic.trim();
      if (!subjectName || !topicName) return;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          id: subjectName,
          name: subjectName,
          topics: new Map(),
        });
      }

      const subjectEntry = subjectMap.get(subjectName);
      if (!subjectEntry.topics.has(topicName)) {
        subjectEntry.topics.set(topicName, {
          id: `${subjectName}::${topicName}`,
          name: topicName,
          flashcards: [],
        });
      }

      subjectEntry.topics.get(topicName).flashcards.push(card);
    });

    return Array.from(subjectMap.values())
      .map((subject) => ({
        ...subject,
        topics: Array.from(subject.topics.values()),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  useEffect(() => {
    const storedFlashcards = JSON.parse(
      localStorage.getItem("ace-it-flashcards") || "[]"
    );
    setFolders(buildFoldersFromFlashcards(storedFlashcards));
  }, []);

  const selectedSubject = useMemo(
    () => folders.find((folder) => folder.id === selectedSubjectId) || null,
    [folders, selectedSubjectId]
  );

  const selectedTopic = useMemo(() => {
    if (!selectedSubject) return null;
    return (
      selectedSubject.topics.find((topic) => topic.id === selectedTopicId) ||
      null
    );
  }, [selectedSubject, selectedTopicId]);

  useEffect(() => {
    if (!selectedSubject) {
      setSelectedTopicId("");
      return;
    }
    const exists = selectedSubject.topics.some(
      (topic) => topic.id === selectedTopicId
    );
    if (!exists) setSelectedTopicId("");
  }, [selectedSubject, selectedTopicId]);

  useEffect(() => {
    if (quizMode !== "active" || !timerEnabled) return;
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [quizMode, timerEnabled]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const availableCards = useMemo(() => {
    if (selectedTopic) return selectedTopic.flashcards.length;
    if (selectedSubject) {
      return selectedSubject.topics.reduce(
        (sum, topic) => sum + (topic.flashcards?.length || 0),
        0
      );
    }
    return folders.reduce(
      (sum, subject) =>
        sum +
        subject.topics.reduce(
          (topicSum, topic) => topicSum + (topic.flashcards?.length || 0),
          0
        ),
      0
    );
  }, [folders, selectedSubject, selectedTopic]);

  useEffect(() => {
    if (availableCards === 0) return;
    if (questionCount > availableCards) {
      setQuestionCount(Math.max(5, Math.min(availableCards, 50)));
    }
  }, [availableCards, questionCount]);

  const history = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("quiz_history") || "[]");
    } catch {
      return [];
    }
  }, [quizMode]);

  const averageScore = useMemo(() => {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, item) => sum + (item.percentage || 0), 0);
    return Math.round(total / history.length);
  }, [history]);

  const formatHistoryDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const today = new Date();
    const diffMs = today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const generateQuizQuestions = (folder, topic) => {
    let flashcards = [];

    if (topic) {
      flashcards = topic.flashcards || [];
    } else if (folder) {
      folder.topics.forEach((t) => {
        flashcards = flashcards.concat(t.flashcards || []);
      });
    } else {
      folders.forEach((f) => {
        f.topics.forEach((t) => {
          flashcards = flashcards.concat(t.flashcards || []);
        });
      });
    }

    if (flashcards.length === 0) return [];

    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    return limited.map((card) => {
      const types = ["multiple-choice", "true-false", "typed"];
      const type =
        quizType === "mixed"
          ? types[Math.floor(Math.random() * types.length)]
          : quizType;

      if (type === "multiple-choice") {
        const wrongAnswers = shuffled
          .filter((c) => c.id !== card.id)
          .map((c) => c.back)
          .filter(Boolean)
          .slice(0, 3);

        const allOptions = [card.back, ...wrongAnswers].sort(
          () => Math.random() - 0.5
        );

        return {
          id: card.id,
          type: "multiple-choice",
          question: card.front,
          correctAnswer: card.back,
          options: allOptions,
        };
      }

      if (type === "true-false") {
        const otherBacks = shuffled
          .filter((c) => c.id !== card.id)
          .map((c) => c.back)
          .filter(Boolean);
        const useTrue = otherBacks.length === 0 || Math.random() > 0.5;
        const statement = useTrue
          ? card.back
          : otherBacks[Math.floor(Math.random() * otherBacks.length)];

        return {
          id: card.id,
          type: "true-false",
          question: `True or False: ${card.front}`,
          statement,
          correctAnswer: useTrue,
          options: ["True", "False"],
        };
      }

      return {
        id: card.id,
        type: "typed",
        question: card.front,
        correctAnswer: card.back,
      };
    });
  };

  const normalizeQuizQuestions = (quizItems = []) => {
    const normalizeOptions = (item) => {
      if (Array.isArray(item.options)) {
        return item.options.filter((opt) => opt !== undefined && opt !== null);
      }

      if (item.options && typeof item.options === "object") {
        const orderedKeys = ["A", "B", "C", "D", "a", "b", "c", "d"];
        const collected = orderedKeys
          .filter((key) => Object.prototype.hasOwnProperty.call(item.options, key))
          .map((key) => item.options[key]);
        if (collected.length > 0) return collected;
        return Object.values(item.options);
      }

      if (typeof item.options === "string") {
        return item.options
          .split(/\r?\n|[|;]/)
          .map((opt) => opt.trim())
          .filter(Boolean);
      }

      const optionFields = [
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
      ];
      const fromFields = optionFields
        .map((field) => item[field])
        .filter((value) => value !== undefined && value !== null && value !== "");
      return fromFields;
    };

    const mapAnswerToOption = (answer, options) => {
      if (!options || options.length === 0) return answer;
      if (typeof answer === "number") {
        const index = answer - 1;
        return options[index] ?? answer;
      }
      const letterMatch = String(answer).trim().match(/^([A-Da-d])$/);
      if (letterMatch) {
        const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        return options[index] ?? answer;
      }
      return answer;
    };

    return quizItems.map((item, index) => {
      const rawOptions = normalizeOptions(item);
      const hasOptions = rawOptions.length > 0;
      const normalizedOptions = hasOptions ? rawOptions : [];
      const mappedAnswer = mapAnswerToOption(item.answer, normalizedOptions);

      if (hasOptions && normalizedOptions.length === 2) {
        const optionLabels = normalizedOptions.map((opt) =>
          String(opt).toLowerCase()
        );
        const isTrueFalse =
          optionLabels.includes("true") && optionLabels.includes("false");
        if (isTrueFalse) {
          return {
            id: `quiz-${Date.now()}-${index}`,
            type: "true-false",
            question: item.question || "Untitled question",
            statement: item.question || "Untitled statement",
            correctAnswer:
              String(mappedAnswer).toLowerCase() === "true" ? true : false,
            options: normalizedOptions,
          };
        }
      }

      if (hasOptions) {
        return {
          id: `quiz-${Date.now()}-${index}`,
          type: "multiple-choice",
          question: item.question || "Untitled question",
          correctAnswer: mappedAnswer,
          options: normalizedOptions,
        };
      }

      return {
        id: `quiz-${Date.now()}-${index}`,
        type: "typed",
        question: item.question || "Untitled question",
        correctAnswer: item.answer,
      };
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGenerationError("");
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type)) {
      setGenerationError(
        "Unsupported file type. Use PDF, DOCX, PPTX, XLS, or XLSX."
      );
      setUploadedFile(null);
      return;
    }
    setUploadedFile({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
      raw: file,
    });
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setGenerationError("");
    setGeneratedQuizId(null);
  };

  const handleGenerateQuiz = async () => {
    if (!uploadedFile?.raw) return;
    setIsAnalyzing(true);
    setGenerationError("");

    try {
      const response = await quizAPI.generateQuizFromFile(uploadedFile.raw);
      const quizItems = response.quiz || response.quizzes || [];
      const normalized = normalizeQuizQuestions(quizItems);
      if (normalized.length === 0) {
        throw new Error("No quiz questions returned.");
      }
      setGeneratedQuizId(response.id || response.quiz_id || null);
      setQuestions(normalized);
      setUserAnswers(new Array(normalized.length).fill(null));
      setCurrentQuestionIndex(0);
      setTimeElapsed(0);
      setShowFeedback(false);
      setQuizMode("active");
    } catch (error) {
      console.error("Error generating quiz from file:", error);
      if (error?.response) {
        console.error("Quiz API response:", error.response.data);
      }
      setGenerationError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate quiz. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateFromText = async () => {
    if (!documentText.trim()) {
      setGenerationError("Please paste some study material first.");
      return;
    }
    setIsAnalyzing(true);
    setGenerationError("");

    try {
      const response = await quizAPI.generateQuizFromText(documentText.trim());
      const quizItems = response.quiz || response.quizzes || [];
      const normalized = normalizeQuizQuestions(quizItems);
      if (normalized.length === 0) {
        throw new Error("No quiz questions returned.");
      }
      setGeneratedQuizId(response.id || response.quiz_id || null);
      setQuestions(normalized);
      setUserAnswers(new Array(normalized.length).fill(null));
      setCurrentQuestionIndex(0);
      setTimeElapsed(0);
      setShowFeedback(false);
      setQuizMode("active");
    } catch (error) {
      console.error("Error generating quiz from text:", error);
      if (error?.response) {
        console.error("Quiz API response:", error.response.data);
      }
      setGenerationError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate quiz. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startQuiz = () => {
    const generated = generateQuizQuestions(selectedSubject, selectedTopic);
    if (generated.length === 0) {
      alert("No flashcards available for this selection.");
      return;
    }
    setQuestions(generated);
    setUserAnswers(new Array(generated.length).fill(null));
    setCurrentQuestionIndex(0);
    setTimeElapsed(0);
    setShowFeedback(false);
    setQuizMode("active");
  };

  const handleAnswer = (answer) => {
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = answer;
    setUserAnswers(updatedAnswers);

    if (!examMode) {
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          finishQuiz(updatedAnswers);
        }
      }, 900);
    } else {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        finishQuiz(updatedAnswers);
      }
    }
  };

  const finishQuiz = (answers = userAnswers) => {
    const correctCount = questions.reduce((sum, question, index) => {
      const userAnswer = answers[index];
      if (question.type === "multiple-choice" || question.type === "typed") {
        return userAnswer &&
          userAnswer.toString().toLowerCase().trim() ===
            question.correctAnswer.toString().toLowerCase().trim()
          ? sum + 1
          : sum;
      }
      if (question.type === "true-false") {
        return userAnswer === question.correctAnswer ? sum + 1 : sum;
      }
      return sum;
    }, 0);

    const percentage = Math.round((correctCount / questions.length) * 100);
    const result = {
      id: Date.now(),
      date: new Date().toISOString(),
      subject: selectedSubject?.name || "All Subjects",
      topic: selectedTopic?.name || "All Topics",
      score: correctCount,
      total: questions.length,
      percentage,
      timeElapsed,
      type: quizType,
      mode: examMode ? "Exam" : "Practice",
    };

    const history = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    history.unshift(result);
    localStorage.setItem("quiz_history", JSON.stringify(history.slice(0, 50)));

    if (generatedQuizId) {
      quizAPI
        .saveQuizScore(generatedQuizId, correctCount, questions.length)
        .catch((error) =>
          console.error("Error saving quiz score:", error)
        );
    }

    setQuizMode("results");
  };

  const resetQuiz = () => {
    setQuizMode("setup");
    setQuestions([]);
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setTimeElapsed(0);
    setShowFeedback(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      if (question.type === "multiple-choice" || question.type === "typed") {
        if (
          userAnswer &&
          userAnswer.toString().toLowerCase().trim() ===
            question.correctAnswer.toString().toLowerCase().trim()
        ) {
          correct += 1;
        }
      } else if (question.type === "true-false") {
        if (userAnswer === question.correctAnswer) correct += 1;
      }
    });
    return { correct, total: questions.length };
  };

  const activeTopicClass = selectedSubject
    ? "opacity-100"
    : "opacity-50 pointer-events-none";

  if (folders.length === 0) {
    return (
      <div className="quiz-container animate-fade-in flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <FaBook className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          No Flashcards Found
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mb-8">
          Create some flashcards first, then return here to start a quiz.
        </p>
        <a
          href="/flashcards"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Create Flashcards
        </a>
      </div>
    );
  }

  if (quizMode === "setup") {
    return (
      <div className="quiz-page">
        <div className="quiz-page-header">
          <h1>New Quiz Session</h1>
          <p>
            Configure your quiz parameters to test your knowledge. Choose from
            your flashcard decks or upload a document to generate questions.
          </p>
        </div>

        <div className="quiz-page-grid">
          <div className="quiz-page-left">
            <div className="quiz-card quiz-setup-card">
              <div className="quiz-source-tabs">
                <span
                  className="quiz-source-indicator"
                  data-active={sourceTab}
                />
                <button
                  className={`quiz-source-tab ${
                    sourceTab === "flashcards" ? "active" : ""
                  }`}
                  onClick={() => setSourceTab("flashcards")}
                >
                  From Flashcards
                </button>
                <button
                  className={`quiz-source-tab ${
                    sourceTab === "document" ? "active" : ""
                  }`}
                  onClick={() => setSourceTab("document")}
                >
                  From Document
                </button>
              </div>

              {sourceTab === "flashcards" ? (
                <>
                  <div className="quiz-setup-row">
                    <div>
                      <p className="quiz-label">Subject</p>
                      <select
                        className="quiz-select"
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                      >
                        <option value="">All Subjects</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={activeTopicClass}>
                      <p className="quiz-label">Topic</p>
                      <select
                        className="quiz-select"
                        value={selectedTopicId}
                        onChange={(e) => setSelectedTopicId(e.target.value)}
                        disabled={!selectedSubject}
                      >
                        <option value="">All Topics</option>
                        {selectedSubject?.topics.map((topic) => (
                          <option key={topic.id} value={topic.id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="quiz-type-container">
                    <p className="quiz-label">Quiz Type</p>
                    <div className="quiz-type-grid">
                      {[
                        { id: "mixed", label: "Mixed" },
                        { id: "multiple-choice", label: "MCQ" },
                        { id: "true-false", label: "True/False" },
                        { id: "typed", label: "Typed" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          className={`quiz-type-card ${
                            quizType === option.id ? "active" : ""
                          }`}
                          onClick={() => setQuizType(option.id)}
                        >
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="quiz-count-container">
                    <div className="quiz-count-header">
                      <p className="quiz-label">Question Count</p>
                      <span className="quiz-count-value">
                        {Math.min(questionCount, availableCards || questionCount)} Questions
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max={Math.max(5, Math.min(availableCards || 50, 50))}
                      step="5"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="quiz-slider"
                    />
                    <div className="quiz-count-scale">
                      <span>5</span>
                      <span>50</span>
                    </div>
                  </div>

                  <div>
                    <p className="quiz-label">Mode</p>
                    <div className="quiz-mode-grid">
                      <button
                        className={`quiz-mode-card ${
                          !examMode ? "active" : ""
                        }`}
                        onClick={() => setExamMode(false)}
                      >
                        <div>
                          <p className="quiz-mode-title">Practice</p>
                          <p className="quiz-mode-desc">Immediate feedback</p>
                        </div>
                      </button>
                      <button
                        className={`quiz-mode-card ${
                          examMode ? "active" : ""
                        }`}
                        onClick={() => setExamMode(true)}
                      >
                        <div>
                          <p className="quiz-mode-title">Exam</p>
                          <p className="quiz-mode-desc">Results at end</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                    <div className="quiz-document-panel">
                  {isAnalyzing && (
                    <div className="quiz-document-overlay">
                      <FaSpinner className="quiz-spinner" />
                      <p>Analyzing document...</p>
                    </div>
                  )}

                      {generationError && (
                        <div className="quiz-upload-error">
                          {generationError}
                        </div>
                      )}

                  {!uploadedFile ? (
                    <div
                      className="quiz-upload-area"
                      onClick={() =>
                        document.getElementById("quiz-file-upload")?.click()
                      }
                    >
                      <FaCloudUploadAlt className="quiz-upload-icon" />
                      <p className="quiz-upload-title">Upload study material</p>
                      <p className="quiz-upload-subtitle">
                        PDF or TXT files supported
                      </p>
                      <input
                        id="quiz-file-upload"
                        type="file"
                          accept=".pdf,.docx,.pptx,.xls,.xlsx,.txt"
                        className="quiz-upload-input"
                        onChange={handleFileUpload}
                      />
                      <button className="quiz-button quiz-button-secondary">
                        Select File
                      </button>
                    </div>
                  ) : (
                    <div className="quiz-file-preview">
                      <div className="quiz-file-meta">
                        <FaFilePdf className="quiz-file-icon" />
                        <div>
                          <p className="quiz-file-name">{uploadedFile.name}</p>
                          <p className="quiz-file-size">{uploadedFile.size}</p>
                        </div>
                      </div>
                      <button
                        className="quiz-remove-file"
                        onClick={removeUploadedFile}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateQuiz}
                    className="quiz-button quiz-button-primary quiz-button-full"
                    disabled={!uploadedFile || isAnalyzing}
                  >
                    <FaPlay className="mr-2" />
                    Generate Quiz
                  </button>

                  <div className="quiz-text-divider">
                    <span>or paste text</span>
                  </div>

                  <textarea
                    className="quiz-textarea"
                    placeholder="Paste your study material here..."
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                  />

                  <button
                    onClick={handleGenerateFromText}
                    className="quiz-button quiz-button-secondary quiz-button-full"
                    disabled={isAnalyzing}
                  >
                    Generate from Text
                  </button>
                </div>
              )}

              <div className="quiz-setup-footer">
                <div className="quiz-toggle-row">
                  <button
                    className={`quiz-toggle ${
                      timerEnabled ? "active" : ""
                    }`}
                    onClick={() => setTimerEnabled((prev) => !prev)}
                    aria-pressed={timerEnabled}
                  >
                    <span className="quiz-toggle-thumb" />
                  </button>
                  <span>Timer</span>
                </div>
                <button
                  onClick={startQuiz}
                  className="quiz-button quiz-button-primary"
                  disabled={availableCards === 0 || sourceTab === "document"}
                >
                  <FaPlay className="mr-2" />
                  Start Quiz
                </button>
              </div>
            </div>
          </div>

          <div className="quiz-page-right">
            <div className="quiz-card quiz-overview-card">
              <h3>Overview</h3>
              <div className="quiz-overview-grid">
                <div className="quiz-overview-item">
                  <div className="quiz-overview-value">{averageScore}%</div>
                  <div className="quiz-overview-label">Avg. Score</div>
                </div>
                <div className="quiz-overview-item">
                  <div className="quiz-overview-value">{history.length}</div>
                  <div className="quiz-overview-label">Quizzes</div>
                </div>
              </div>
            </div>

            <div className="quiz-card quiz-history-card">
              <div className="quiz-history-header">
                <h3>Recent Activity</h3>
                <span className="quiz-history-link">View All</span>
              </div>
              <div className="quiz-history-list">
                {history.slice(0, 4).map((item) => (
                  <div key={item.id} className="quiz-history-item">
                    <div>
                      <p className="quiz-history-title">
                        {item.subject || "All Subjects"}
                      </p>
                      <p className="quiz-history-date">
                        {formatHistoryDate(item.date)}
                      </p>
                    </div>
                    <span className="quiz-history-score">
                      {item.percentage || 0}%
                    </span>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="quiz-history-empty">
                    No quiz history yet. Start a quiz to see results here.
                  </p>
                )}
              </div>
              <button className="quiz-button quiz-button-secondary quiz-button-full">
                View Full History
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizMode === "active") {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const questionTotal = questions.length;
    const canGoBack = currentQuestionIndex > 0;
    const canSkip = currentQuestionIndex < questionTotal - 1;
    const handleSkip = () => {
      if (currentQuestionIndex < questionTotal - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        finishQuiz();
      }
    };
    const handleBack = () => {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setShowFeedback(false);
      }
    };

    return (
      <div className="quiz-active-page">
        <div className="quiz-active-header">
          <div className="quiz-active-title">
            <h2>Quiz in Progress</h2>
            <p>
              {selectedSubject?.name || "All Subjects"} –{" "}
              {selectedTopic?.name || "All Topics"}
            </p>
          </div>
          <div className="quiz-active-info">
            {timerEnabled && (
              <div className="quiz-timer">
                <FaClock />
                <span>{formatTime(timeElapsed)}</span>
              </div>
            )}
            <div className="quiz-active-count">
              {currentQuestionIndex + 1} / {questionTotal}
            </div>
          </div>
        </div>

        <div className="quiz-progress">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="quiz-question-card">
          <div className="quiz-question-meta">
            <span className="quiz-question-type">
              {currentQuestion.type.replace("-", " ")}
            </span>
            <span className="quiz-question-step">
              Question {currentQuestionIndex + 1} of {questionTotal}
            </span>
          </div>
          <h3 className="quiz-question-text">{currentQuestion.question}</h3>

          {currentQuestion.type === "multiple-choice" && (
            <div className="quiz-options">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={showFeedback}
                  className={`quiz-option-button ${
                    showFeedback
                      ? option === currentQuestion.correctAnswer
                        ? "correct"
                        : userAnswers[currentQuestionIndex] === option
                        ? "incorrect"
                        : ""
                      : ""
                  }`}
                >
                  <div className="quiz-option-content">
                    <span>{option}</span>
                    {showFeedback &&
                      option === currentQuestion.correctAnswer && (
                        <FaCheckCircle className="text-green-500" />
                      )}
                    {showFeedback &&
                      userAnswers[currentQuestionIndex] === option &&
                      option !== currentQuestion.correctAnswer && (
                        <FaTimesCircle className="text-red-500" />
                      )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === "true-false" && (
            <div className="quiz-options">
              <p className="text-sm text-muted-foreground mb-2">
                {currentQuestion.statement}
              </p>
              {["True", "False"].map((label) => {
                const value = label === "True";
                return (
                  <button
                    key={label}
                    onClick={() => handleAnswer(value)}
                    disabled={showFeedback}
                    className={`quiz-option-button ${
                      showFeedback
                        ? value === currentQuestion.correctAnswer
                          ? "correct"
                          : userAnswers[currentQuestionIndex] === value
                          ? "incorrect"
                          : ""
                        : ""
                    }`}
                  >
                    <div className="quiz-option-content">
                      <span>{label}</span>
                      {showFeedback &&
                        value === currentQuestion.correctAnswer && (
                          <FaCheckCircle className="text-green-500" />
                        )}
                      {showFeedback &&
                        userAnswers[currentQuestionIndex] === value &&
                        value !== currentQuestion.correctAnswer && (
                          <FaTimesCircle className="text-red-500" />
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "typed" && (
            <div className="quiz-options">
              <input
                type="text"
                placeholder="Type your answer..."
                value={userAnswers[currentQuestionIndex] || ""}
                onChange={(e) => {
                  const updated = [...userAnswers];
                  updated[currentQuestionIndex] = e.target.value;
                  setUserAnswers(updated);
                }}
                disabled={showFeedback}
                className={`quiz-typed-input ${
                  showFeedback
                    ? userAnswers[currentQuestionIndex] &&
                      userAnswers[currentQuestionIndex]
                        .toString()
                        .toLowerCase()
                        .trim() ===
                        currentQuestion.correctAnswer
                          .toString()
                          .toLowerCase()
                          .trim()
                      ? "correct"
                      : "incorrect"
                    : ""
                }`}
              />
              {!showFeedback && (
                <button
                  className="quiz-button quiz-button-primary quiz-button-full"
                  onClick={() =>
                    handleAnswer(userAnswers[currentQuestionIndex])
                  }
                  disabled={!userAnswers[currentQuestionIndex]}
                >
                  Submit Answer
                </button>
              )}
              {showFeedback &&
                userAnswers[currentQuestionIndex] &&
                userAnswers[currentQuestionIndex]
                  .toString()
                  .toLowerCase()
                  .trim() !==
                  currentQuestion.correctAnswer
                    .toString()
                    .toLowerCase()
                    .trim() && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Correct answer: {currentQuestion.correctAnswer}
                  </p>
                )}
            </div>
          )}

          <div className="quiz-question-actions">
            <button
              className="quiz-button quiz-button-secondary"
              onClick={handleBack}
              disabled={!canGoBack}
            >
              Back
            </button>
            {!showFeedback && (
              <button
                className="quiz-button quiz-button-secondary"
                onClick={handleSkip}
                disabled={!canSkip}
              >
                Skip
              </button>
            )}
            <button
              className="quiz-button quiz-button-outline"
              onClick={finishQuiz}
            >
              End Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizMode === "results") {
    const { correct, total } = calculateScore();
    const percentage = Math.round((correct / total) * 100);
    const performanceMessage =
      percentage >= 90
        ? "Excellent work! You've mastered this topic."
        : percentage >= 75
        ? "Great job! A little more practice will make it perfect."
        : percentage >= 50
        ? "Solid effort. Review the tricky questions and try again."
        : "Keep going! Practice makes progress.";
    const isAnswerCorrect = (question, index) => {
      const userAnswer = userAnswers[index];
      if (question.type === "multiple-choice" || question.type === "typed") {
        return (
          userAnswer &&
          userAnswer.toString().toLowerCase().trim() ===
            question.correctAnswer.toString().toLowerCase().trim()
        );
      }
      if (question.type === "true-false") {
        return userAnswer === question.correctAnswer;
      }
      return false;
    };

    return (
      <div className="quiz-results-page">
        <div className="quiz-card quiz-results-card">
          <div className="quiz-results-header">
            <div className="quiz-trophy-icon">
              <FaTrophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="quiz-results-title">Quiz Complete!</h2>
              <p className="quiz-results-subtitle">{performanceMessage}</p>
            </div>
            <div className="quiz-results-stats">
              <div className="quiz-stat">
                <p className="quiz-stat-value">{percentage}%</p>
                <p className="quiz-stat-label">Score</p>
              </div>
              <div className="quiz-stat">
                <p className="quiz-stat-value">
                  {correct}/{total}
                </p>
                <p className="quiz-stat-label">Correct</p>
              </div>
              <div className="quiz-stat">
                <p className="quiz-stat-value">
                  {timerEnabled ? formatTime(timeElapsed) : "—"}
                </p>
                <p className="quiz-stat-label">Time</p>
              </div>
            </div>
            <div className="quiz-results-actions">
              <button
                onClick={startQuiz}
                className="quiz-button quiz-button-primary"
              >
                <FaRedo className="mr-2" />
                Retake Quiz
              </button>
              <button
                onClick={resetQuiz}
                className="quiz-button quiz-button-secondary"
              >
                New Quiz
              </button>
            </div>
          </div>
        </div>

        <div className="quiz-card quiz-review-card">
          <div className="quiz-review-header">
            <h3>Review Answers</h3>
            <span>{questions.length} questions</span>
          </div>
          <div className="quiz-review-list">
            {questions.map((question, index) => {
              const correctAnswer = question.correctAnswer;
              const userAnswer = userAnswers[index];
              const isCorrect = isAnswerCorrect(question, index);
              return (
                <div
                  key={question.id || index}
                  className={`quiz-review-item ${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                >
                  <div>
                    <p className="quiz-review-question">
                      {index + 1}. {question.question}
                    </p>
                    <p className="quiz-review-answer">
                      Your answer: {userAnswer?.toString() || "No answer"}
                    </p>
                    {!isCorrect && (
                      <p className="quiz-review-correct">
                        Correct answer: {correctAnswer?.toString()}
                      </p>
                    )}
                  </div>
                  {isCorrect ? (
                    <FaCheckCircle className="quiz-review-icon correct" />
                  ) : (
                    <FaTimesCircle className="quiz-review-icon incorrect" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Quiz;
