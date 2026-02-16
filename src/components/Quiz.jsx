import React, { useEffect, useMemo, useState } from "react";
import {
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaRedo,
  FaTrophy,
  FaBook,
} from "react-icons/fa";
import "../styles/quiz.css";

export function Quiz() {
  const [quizMode, setQuizMode] = useState("setup"); // setup, active, results
  const [folders, setFolders] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [quizType, setQuizType] = useState("mixed"); // mixed, multiple-choice, true-false, typed
  const [questionCount, setQuestionCount] = useState(10);
  const [examMode, setExamMode] = useState(false);
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
    if (quizMode !== "active") return;
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [quizMode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      <div className="quiz-container animate-fade-in space-y-8">
        <div className="quiz-header">
          <h2 className="quiz-title">Quiz Mode</h2>
          <p className="quiz-subtitle">
            Choose your topic and start testing your knowledge.
          </p>
        </div>

        <div className="quiz-grid">
          <div className="quiz-card">
            <div className="quiz-card-header">
              <h3 className="quiz-card-title">Quiz Setup</h3>
            </div>
            <div className="quiz-card-content space-y-6">
              <div className="quiz-form-group">
                <label className="quiz-label">Select Subject</label>
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

              <div
                className={`quiz-form-group transition-opacity duration-300 ${activeTopicClass}`}
              >
                <label className="quiz-label">Select Topic</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="quiz-form-group">
                  <label className="quiz-label">Quiz Type</label>
                  <select
                    className="quiz-select"
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value)}
                  >
                    <option value="mixed">Mixed Questions</option>
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="typed">Type Answer</option>
                  </select>
                </div>

                <div className="quiz-form-group">
                  <label className="quiz-label">Mode</label>
                  <div className="flex items-center gap-3">
                    <button
                      className={`quiz-button ${
                        examMode ? "quiz-button-secondary" : "quiz-button-primary"
                      }`}
                      onClick={() => setExamMode(false)}
                    >
                      Practice
                    </button>
                    <button
                      className={`quiz-button ${
                        examMode ? "quiz-button-primary" : "quiz-button-secondary"
                      }`}
                      onClick={() => setExamMode(true)}
                    >
                      Exam
                    </button>
                  </div>
                </div>
              </div>

              <div className="quiz-form-group">
                <label className="quiz-label flex justify-between">
                  <span>Number of Questions</span>
                  <span className="quiz-slider-value">{questionCount}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="quiz-slider"
                />
              </div>

              <button
                onClick={startQuiz}
                className="quiz-button quiz-button-primary quiz-button-full text-lg py-3"
              >
                <FaPlay className="mr-2" />
                Start Quiz
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

    return (
      <div className="quiz-active-container space-y-6">
        <div className="quiz-active-header">
          <div>
            <h2 className="text-2xl font-bold">Quiz in Progress</h2>
            <p className="text-sm text-muted-foreground">
              {selectedSubject?.name || "All Subjects"} –{" "}
              {selectedTopic?.name || "All Topics"}
            </p>
          </div>
          <div className="quiz-active-info">
            <div className="quiz-timer">
              <FaClock />
              <span>{formatTime(timeElapsed)}</span>
            </div>
            <div className="font-medium">
              {currentQuestionIndex + 1} / {questions.length}
            </div>
          </div>
        </div>

        <div className="quiz-progress">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="quiz-question-card">
          <span className="quiz-question-type">
            {currentQuestion.type.replace("-", " ")}
          </span>
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
        </div>
      </div>
    );
  }

  if (quizMode === "results") {
    const { correct, total } = calculateScore();
    const percentage = Math.round((correct / total) * 100);

    return (
      <div className="quiz-results-container space-y-6">
        <div className="quiz-card">
          <div className="quiz-results-header">
            <div className="quiz-trophy-icon">
              <FaTrophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="quiz-results-title">Quiz Complete!</h2>
              <p className="text-muted-foreground mt-2">
                Great job! Here are your results.
              </p>
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
                <p className="quiz-stat-value">{formatTime(timeElapsed)}</p>
                <p className="quiz-stat-label">Time</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={startQuiz}
                className="quiz-button quiz-button-primary flex-1"
              >
                <FaRedo className="mr-2" />
                Retake Quiz
              </button>
              <button
                onClick={resetQuiz}
                className="quiz-button quiz-button-secondary flex-1"
              >
                New Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Quiz;
