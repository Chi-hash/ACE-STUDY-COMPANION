import React, { useState, useEffect } from "react";
import {
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaTrophy,
  FaRedo,
  FaChartBar,
  FaBook,
  FaCog,
  FaCloudUploadAlt,
  FaFilePdf,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

export function Quiz() {
  const [quizMode, setQuizMode] = useState("select"); // select, active, results
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizType, setQuizType] = useState("mixed"); // mixed, multiple-choice, true-false, typed
  const [questionCount, setQuestionCount] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timer, setTimer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [folders, setFolders] = useState([]);
  const [examMode, setExamMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // New State for File Upload
  const [activeTab, setActiveTab] = useState("library"); // "library" or "upload"
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File Upload Handlers
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        type: file.type
      });
    }
  };

  const removeFile = (e) => {
    e.stopPropagation(); // Prevent triggering upload click
    setUploadedFile(null);
  };

  // Mock AI Generation Logic
  const generateMockQuestions = (filename) => {
    // Simulate analyzing content based on filename keywords
    const isBiology = filename.toLowerCase().includes('bio');
    const isHistory = filename.toLowerCase().includes('hist');
    
    if (isBiology) {
      return [
        {
          id: Date.now() + 1,
          type: "multiple-choice",
          question: "Which organelle is known as the powerhouse of the cell?",
          correctAnswer: "Mitochondria",
          options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi Apparatus"].sort(() => Math.random() - 0.5)
        },
        {
          id: Date.now() + 2,
          type: "true-false",
          question: "True or False: Photosynthesis occurs in animal cells.",
          correctAnswer: false,
          options: ["True", "False"]
        },
        {
          id: Date.now() + 3,
          type: "typed",
          question: "What is the basic unit of life?",
          correctAnswer: "Cell"
        }
      ];
    } else if (isHistory) {
      return [
        {
          id: Date.now() + 1,
          type: "multiple-choice",
          question: "Who was the first President of the United States?",
          correctAnswer: "George Washington",
          options: ["Thomas Jefferson", "George Washington", "Abraham Lincoln", "John Adams"].sort(() => Math.random() - 0.5)
        },
        {
          id: Date.now() + 2,
          type: "typed",
          question: "In which year did World War II end?",
          correctAnswer: "1945"
        }
      ];
    }
    
    // Default Generic Questions
    return [
      {
        id: Date.now() + 1,
        type: "multiple-choice",
        question: "Based on your document, what is the primary key concept?",
        correctAnswer: "The Main Topic",
        options: ["The Main Topic", "A Minor Detail", "Irrelevant Fact", "Wrong Answer"].sort(() => Math.random() - 0.5)
      },
      {
        id: Date.now() + 2,
        type: "true-false",
        question: "True or False: The text argues that X causes Y.",
        correctAnswer: true,
        options: ["True", "False"]
      },
      {
        id: Date.now() + 3,
        type: "typed",
        question: "What is the conclusion of the second chapter?",
        correctAnswer: "Summary"
      }
    ];
  };

  const handleGenerateQuiz = () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    
    // Simulate API delay
    setTimeout(() => {
      const generatedQuestions = generateMockQuestions(uploadedFile.name);
      setQuestions(generatedQuestions);
      setUserAnswers(new Array(generatedQuestions.length).fill(null));
      setCurrentQuestionIndex(0);
      setTimeElapsed(0);
      setQuizMode("active");
      setShowFeedback(false);
      setShowConfetti(false);
      setIsAnalyzing(false);
    }, 2500); // 2.5s delay for realism
  };

  // Load flashcard folders
  useEffect(() => {
    const storedFolders = JSON.parse(
      localStorage.getItem("flashcard_folders") || "[]"
    );
    setFolders(storedFolders);
  }, []);

  // Timer
  useEffect(() => {
    if (quizMode === "active") {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      setTimer(interval);
      return () => clearInterval(interval);
    } else if (timer) {
      clearInterval(timer);
    }
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
    }

    // Shuffle and limit
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    // Generate different question types
    const generatedQuestions = limited.map((card, index) => {
      const types = ["multiple-choice", "true-false", "typed"];
      let type =
        quizType === "mixed"
          ? types[Math.floor(Math.random() * types.length)]
          : quizType;

      if (type === "multiple-choice") {
        // Generate wrong answers from other cards
        const wrongAnswers = shuffled
          .filter((c) => c.id !== card.id)
          .map((c) => c.back)
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
      } else if (type === "true-false") {
        const isTrue = Math.random() > 0.5;
        return {
          id: card.id,
          type: "true-false",
          question: `True or False: ${card.front}`,
          statement: card.back,
          correctAnswer: isTrue,
          options: ["True", "False"],
        };
      } else {
        // typed
        return {
          id: card.id,
          type: "typed",
          question: card.front,
          correctAnswer: card.back,
        };
      }
    });

    return generatedQuestions;
  };

  const startQuiz = () => {
    const questions = generateQuizQuestions(selectedFolder, selectedTopic);
    setQuestions(questions);
    setUserAnswers(new Array(questions.length).fill(null));
    setCurrentQuestionIndex(0);
    setTimeElapsed(0);
    setQuizMode("active");
    setShowFeedback(false);
    setShowConfetti(false);
  };

  const handleAnswer = (answer) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);

    if (!examMode) {
      setShowFeedback(true);
      // Auto-advance after 1.5 seconds in practice mode
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          finishQuiz(newAnswers);
        }
      }, 1500);
    } else {
      // Exam mode: immediate advance
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        finishQuiz(newAnswers);
      }
    }
  };

  const finishQuiz = (answers = userAnswers) => {
    setQuizMode("results");
    
    // Calculate score
    let correctCount = 0;
    questions.forEach((q, index) => {
      const userAnswer = answers[index];
      if (q.type === "multiple-choice" || q.type === "typed") {
        if (
          userAnswer &&
          userAnswer.toLowerCase().trim() ===
            q.correctAnswer.toLowerCase().trim()
        ) {
          correctCount++;
        }
      } else if (q.type === "true-false") {
        if (userAnswer === q.correctAnswer) {
          correctCount++;
        }
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    if (percentage >= 80) setShowConfetti(true);

    // Save to history
    const quizResult = {
      id: Date.now(),
      date: new Date().toISOString(),
      folder: selectedFolder?.name || "All",
      topic: selectedTopic?.name || "All Topics",
      score: correctCount,
      total: questions.length,
      percentage,
      timeElapsed,
      type: quizType,
      mode: examMode ? "Exam" : "Practice",
    };

    const history = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    history.unshift(quizResult);
    localStorage.setItem("quiz_history", JSON.stringify(history.slice(0, 50)));
  };

  const isAnswerCorrect = (questionIndex) => {
    const question = questions[questionIndex];
    const userAnswer = userAnswers[questionIndex];

    if (question.type === "multiple-choice" || question.type === "typed") {
      return (
        userAnswer &&
        userAnswer.toLowerCase().trim() ===
          question.correctAnswer.toLowerCase().trim()
      );
    } else if (question.type === "true-false") {
      return userAnswer === question.correctAnswer;
    }
    return false;
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (isAnswerCorrect(index)) correct++;
    });
    return { correct, total: questions.length };
  };

  const resetQuiz = () => {
    setQuizMode("select");
    setSelectedFolder(null);
    setSelectedTopic(null);
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setUserAnswers([]);
    setTimeElapsed(0);
    setShowConfetti(false);
  };

// Helper Components
const CircularProgress = ({ percentage }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
    return (
      <svg viewBox="0 0 100 100" className="circular-chart">
        <path
          className="circle-bg"
          d="M50 14
             a 36 36 0 0 1 0 72
             a 36 36 0 0 1 0 -72"
        />
        <path
          className="circle"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          d="M50 14
             a 36 36 0 0 1 0 72
             a 36 36 0 0 1 0 -72"
        />
        <text x="50" y="55" className="percentage">
          {percentage}%
        </text>
      </svg>
    );
  };
  
const ConfettiRain = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return (
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            }}
          />
        ))}
      </div>
    );
};

  // Quiz Selection Screen
  if (quizMode === "select") {
    // Empty State Check
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
            You need to create some flashcards before you can take a quiz. Go to the Flashcards section to get started!
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

    return (
      <div className="quiz-container animate-fade-in space-y-8">
        <div className="quiz-header">
          <h2 className="quiz-title">Quiz Mode</h2>
          <p className="quiz-subtitle">
            Master your subjects with interactive quizzes
          </p>
        </div>

        <div className="quiz-grid">
          <div className="md:col-span-2 quiz-tabs">
            <div 
              className={`quiz-tab ${activeTab === "library" ? "active" : ""}`}
              onClick={() => setActiveTab("library")}
            >
              My Library
            </div>
            <div 
              className={`quiz-tab ${activeTab === "upload" ? "active" : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              Generate from Material
            </div>
          </div>

          {/* Library Tab */}
          {activeTab === "library" && (
            <div className="quiz-card hover:shadow-lg transition-shadow duration-300">
              <div className="quiz-card-header">
                <h3 className="quiz-card-title flex items-center gap-2">
                  <FaCog className="text-primary" /> Settings
                </h3>
              </div>
              <div className="quiz-card-content space-y-6">
                {/* Select Folder */}
                <div className="quiz-form-group">
                  <label className="quiz-label">Select Subject</label>
                  <select
                    className="quiz-select transition-all focus:ring-2 focus:ring-primary/50"
                    value={selectedFolder?.id || ""}
                    onChange={(e) => {
                      const folder = folders.find((f) => f.id === e.target.value);
                      setSelectedFolder(folder);
                      setSelectedTopic(null);
                    }}
                  >
                    <option value="">All Subjects</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Topic */}
                <div className={`quiz-form-group transition-opacity duration-300 ${activeTopicClass}`}>
                  <label className="quiz-label">Select Topic</label>
                  <select
                    className="quiz-select transition-all"
                    value={selectedTopic?.id || ""}
                    onChange={(e) => {
                      const topic = selectedFolder?.topics.find(
                        (t) => t.id === e.target.value
                      );
                      setSelectedTopic(topic);
                    }}
                    disabled={!selectedFolder}
                  >
                    <option value="">All Topics</option>
                    {selectedFolder?.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quiz Type */}
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

                  {/* Exam Mode Toggle */}
                  <div className="quiz-form-group">
                    <label className="quiz-label flex items-center justify-between cursor-pointer group">
                      <span>Exam Mode</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={examMode}
                          onChange={(e) => setExamMode(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${examMode ? 'bg-primary' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${examMode ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {examMode ? "No immediate feedback. Results at end." : "Immediate feedback after each answer."}
                    </p>
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="quiz-form-group">
                  <label className="quiz-label flex justify-between">
                    <span>Number of Questions</span>
                    <span className="quiz-slider-value text-primary font-bold">{questionCount}</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="quiz-slider w-full accent-primary"
                  />
                </div>

                <button
                  onClick={startQuiz}
                  disabled={folders.length === 0}
                  className="quiz-button quiz-button-primary quiz-button-full text-lg py-3 shadow-md hover:shadow-lg transform active:scale-95 transition-all"
                >
                  <FaPlay className="mr-2" />
                  <span>Start Quiz</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="quiz-card hover:shadow-lg transition-shadow duration-300">
               <div className="quiz-card-header">
                <h3 className="quiz-card-title flex items-center gap-2">
                  <FaCloudUploadAlt className="text-primary" /> Upload Material
                </h3>
              </div>
              <div className="quiz-card-content space-y-6 relative">
                 {isAnalyzing && (
                    <div className="quiz-loading-overlay">
                      <div className="spinner"></div>
                      <p className="text-white font-semibold">Analyzing document...</p>
                      <p className="text-gray-300 text-sm mt-1">Generating relevant questions</p>
                    </div>
                 )}

                 {!uploadedFile ? (
                    <div 
                      className="quiz-upload-area"
                      onClick={() => document.getElementById('quiz-file-upload').click()}
                    >
                      <FaCloudUploadAlt className="quiz-upload-icon" />
                      <h4 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">
                        Click to upload a file
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        Supported formats: PDF, TXT
                      </p>
                      <input 
                        type="file" 
                        id="quiz-file-upload"
                        className="hidden"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                      />
                      <button className="quiz-button quiz-button-secondary">
                        Select File
                      </button>
                    </div>
                 ) : (
                    <div className="quiz-file-preview">
                        <div className="quiz-file-info">
                            <FaFilePdf className="text-red-500 text-2xl" />
                            <div>
                                <p className="quiz-file-name">{uploadedFile.name}</p>
                                <p className="quiz-file-size">{uploadedFile.size}</p>
                            </div>
                        </div>
                        <button 
                            className="quiz-remove-file"
                            onClick={removeFile}
                        >
                            <FaTrash />
                        </button>
                    </div>
                 )}

                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <FaCog /> AI Settings
                    </h5>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                        The AI will analyze your document and generate questions focusing on key concepts.
                    </p>
                 </div>

                 <button
                    onClick={handleGenerateQuiz}
                    disabled={!uploadedFile}
                    className="quiz-button quiz-button-primary quiz-button-full text-lg py-3 shadow-md hover:shadow-lg transform active:scale-95 transition-all"
                  >
                    <FaPlay className="mr-2" />
                    <span>Generate Quiz</span>
                  </button>
              </div>
            </div>
          )}

          {/* Recent Quiz History - Always visible or moved? 
              Let's keep it visible in grid for layout balance if possible, 
              or maybe move it to full width below. 
              For now keeping existing structure but wrapping conditional. 
          */}
          <QuizHistory />
        </div>
      </div>
    );
  }

  // Active Quiz Screen logic continues...
  const activeTopicClass = selectedFolder ? "opacity-100" : "opacity-50 pointer-events-none";

  // Active Quiz Screen
  if (quizMode === "active") {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="quiz-active-container space-y-6">
        {/* Header */}
        <div className="quiz-active-header">
          <div>
            <h2 className="text-2xl font-bold">Quiz in Progress</h2>
            <p className="text-sm text-muted-foreground">
              {selectedFolder?.name || "All Subjects"} -{" "}
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

        {/* Progress Bar */}
        <div className="quiz-progress">
          <div
            className="quiz-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="quiz-question-card">
              <span className="quiz-question-type">
                {currentQuestion.type.replace("-", " ")}
              </span>
              <h3 className="quiz-question-text">
                {currentQuestion.question}
              </h3>

            {/* Multiple Choice */}
            {currentQuestion.type === "multiple-choice" && (
              <div className="quiz-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
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
                      {showFeedback && option === currentQuestion.correctAnswer && (
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

            {/* True/False */}
            {currentQuestion.type === "true-false" && (
              <div className="quiz-options">
                {[true, false].map((value) => (
                  <button
                    key={value.toString()}
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
                      <span>{value ? "True" : "False"}</span>
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
                ))}
              </div>
            )}

            {/* Typed Answer */}
            {currentQuestion.type === "typed" && (
              <div className="quiz-options">
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={userAnswers[currentQuestionIndex] || ""}
                  onChange={(e) => {
                    const newAnswers = [...userAnswers];
                    newAnswers[currentQuestionIndex] = e.target.value;
                    setUserAnswers(newAnswers);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && userAnswers[currentQuestionIndex]) {
                      handleAnswer(userAnswers[currentQuestionIndex]);
                    }
                  }}
                  disabled={showFeedback}
                  className={`quiz-typed-input ${
                    showFeedback
                      ? isAnswerCorrect(currentQuestionIndex)
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
                {showFeedback && !isAnswerCorrect(currentQuestionIndex) && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Correct answer: {currentQuestion.correctAnswer}
                  </p>
                )}
              </div>
            )}
        </div>

        {/* Skip Button */}
        {!showFeedback && (
          <button
            onClick={() => {
              if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
              } else {
                finishQuiz();
              }
            }}
            className="quiz-button quiz-button-secondary quiz-button-full"
          >
            Skip Question
          </button>
        )}
      </div>
    );
  }

  // Results Screen
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
                Great job! Here are your results
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

            {/* Performance Message */}
            <div className="quiz-performance-message">
              <p>
                {percentage >= 90
                  ? "🎉 Excellent work! You've mastered this material!"
                  : percentage >= 70
                  ? "👍 Good job! Keep practicing to improve."
                  : percentage >= 50
                  ? "📚 Not bad! Review the material and try again."
                  : "💪 Keep studying! Practice makes perfect."}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={startQuiz} className="quiz-button quiz-button-primary flex-1">
                <FaRedo className="mr-2" />
                Retake Quiz
              </button>
              <button onClick={resetQuiz} className="quiz-button quiz-button-secondary flex-1">
                New Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Review Answers */}
        <div className="quiz-card">
          <div className="quiz-card-header">
            <h3 className="quiz-card-title">Review Answers</h3>
          </div>
          <div className="quiz-card-content space-y-4">
            {questions.map((question, index) => {
              const correct = isAnswerCorrect(index);
              return (
                <div
                  key={index}
                  className={`quiz-review-item ${
                    correct ? "correct" : "incorrect"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="quiz-review-question">
                        {index + 1}. {question.question}
                      </p>
                      <p className="mt-2">
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={`quiz-review-answer ${correct ? "correct" : "incorrect"}`}>
                          {userAnswers[index]?.toString() || "No answer"}
                        </span>
                      </p>
                      {!correct && (
                        <p className="mt-1">
                          <span className="text-muted-foreground">
                            Correct answer:{" "}
                          </span>
                          <span className="quiz-review-answer correct">
                            {question.correctAnswer?.toString()}
                          </span>
                        </p>
                      )}
                    </div>
                    {correct ? (
                      <FaCheckCircle className="text-green-500 text-xl flex-shrink-0" />
                    ) : (
                      <FaTimesCircle className="text-red-500 text-xl flex-shrink-0" />
                    )}
                  </div>
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

function QuizHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    setHistory(stored.slice(0, 5));
  }, []);

  return (
    <div className="quiz-card">
      <div className="quiz-card-header">
        <h3 className="quiz-card-title">
          <FaChartBar />
          <span>Recent Quiz History</span>
        </h3>
      </div>
      <div className="quiz-card-content">
        {history.length === 0 ? (
          <div className="quiz-history-empty">
            <FaBook className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No quiz history yet</p>
            <p className="text-sm">Start a quiz to see your results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((quiz) => (
              <div
                key={quiz.id}
                className="quiz-history-item"
              >
                <div className="quiz-history-header">
                  <span className="quiz-history-folder">{quiz.folder}</span>
                  <span
                    className={`quiz-history-score ${
                      quiz.percentage >= 70 ? "high" : "medium"
                    }`}
                  >
                    {quiz.percentage}%
                  </span>
                </div>
                <div className="quiz-history-footer">
                  <span>{quiz.topic}</span>
                  <span>
                    {quiz.score}/{quiz.total} correct
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;