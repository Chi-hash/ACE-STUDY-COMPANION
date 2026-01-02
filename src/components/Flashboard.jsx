import React, { useState, useEffect } from "react";
import "../styles/flashcard.css";

import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaRedo,
  FaChevronLeft,
  FaChevronRight,
  FaBookOpen,
  FaEye,
  FaEyeSlash,
  FaFolder,
  FaFolderOpen,
  FaArrowLeft,
  FaHashtag,
  FaClock,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBrain,
} from "react-icons/fa";

// Spaced Repetition Functions (simplified)
const SpacedRepetitionScheduler = {
  initializeCard: (id) => ({
    id,
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReviewDate: new Date(),
    lastReviewed: new Date(),
  }),

  scheduleNextReview: (reviewData, quality) => {
    const newData = { ...reviewData };
    newData.repetitions++;

    if (quality < 3) {
      newData.interval = 1;
      newData.repetitions = 0;
    } else {
      if (newData.repetitions === 1) {
        newData.interval = 1;
      } else if (newData.repetitions === 2) {
        newData.interval = 6;
      } else {
        newData.interval = Math.round(newData.interval * newData.easeFactor);
      }
    }

    newData.easeFactor =
      newData.easeFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newData.easeFactor < 1.3) newData.easeFactor = 1.3;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newData.interval);
    newData.nextReviewDate = nextDate;
    newData.lastReviewed = new Date();

    return newData;
  },

  getDueCards: (reviewCards) => {
    const today = new Date();
    return reviewCards.filter((card) => new Date(card.nextReviewDate) <= today);
  },

  getStudyOrder: (dueCards) => {
    return [...dueCards].sort((a, b) => {
      if (a.repetitions !== b.repetitions) return a.repetitions - b.repetitions;
      return new Date(a.nextReviewDate) - new Date(b.nextReviewDate);
    });
  },

  getPerformanceAnalytics: (reviewCards) => {
    const today = new Date();
    const dueToday = reviewCards.filter((card) => {
      const reviewDate = new Date(card.nextReviewDate);
      return reviewDate.toDateString() === today.toDateString();
    }).length;

    const overdueCards = reviewCards.filter(
      (card) => new Date(card.nextReviewDate) < today
    ).length;
    const masteredCards = reviewCards.filter(
      (card) => card.repetitions >= 5
    ).length;
    const averageEaseFactor =
      reviewCards.reduce((sum, card) => sum + card.easeFactor, 0) /
        reviewCards.length || 0;

    return {
      dueToday,
      overdueCards,
      masteredCards,
      averageEaseFactor,
    };
  },
};

export function Flashcards() {
  const [flashcards, setFlashcards] = useState([]);
  const [reviewData, setReviewData] = useState({});

  const [mode, setMode] = useState("subjects"); // 'browse', 'study', 'create', 'subjects', 'topics', 'spaced-review'
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyProgress, setStudyProgress] = useState(0);
  const [newCard, setNewCard] = useState({
    front: "",
    back: "",
    subject: "",
    topic: "",
    difficulty: "medium",
  });
  const [editingCard, setEditingCard] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [studyCards, setStudyCards] = useState([]);
  const [showQualityButtons, setShowQualityButtons] = useState(false);

  // Load flashcards and review data from localStorage
  useEffect(() => {
    const savedFlashcards = localStorage.getItem("ace-it-flashcards");
    const savedReviewData = localStorage.getItem("ace-it-review-data");

    if (savedFlashcards) {
      setFlashcards(JSON.parse(savedFlashcards));
    } else {
      // Initialize with sample data
      const sampleCards = [
        {
          id: 1,
          front: "What is the derivative of x²?",
          back: "2x",
          subject: "Mathematics",
          topic: "Calculus",
          difficulty: "easy",
          correctCount: 8,
          totalAttempts: 10,
        },
        {
          id: 2,
          front: "What is the integral of 2x?",
          back: "x² + C",
          subject: "Mathematics",
          topic: "Calculus",
          difficulty: "medium",
          correctCount: 5,
          totalAttempts: 8,
        },
        {
          id: 3,
          front: "Who wrote 'Romeo and Juliet'?",
          back: "William Shakespeare",
          subject: "Literature",
          topic: "Shakespeare",
          difficulty: "easy",
          correctCount: 12,
          totalAttempts: 15,
        },
        {
          id: 4,
          front: "What is the chemical formula for water?",
          back: "H₂O",
          subject: "Chemistry",
          topic: "Basic Compounds",
          difficulty: "easy",
          correctCount: 5,
          totalAttempts: 6,
        },
        {
          id: 5,
          front: "What is the periodic symbol for sodium?",
          back: "Na",
          subject: "Chemistry",
          topic: "Periodic Table",
          difficulty: "medium",
          correctCount: 3,
          totalAttempts: 5,
        },
      ];
      setFlashcards(sampleCards);
      localStorage.setItem("ace-it-flashcards", JSON.stringify(sampleCards));
    }

    if (savedReviewData) {
      setReviewData(JSON.parse(savedReviewData));
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (flashcards.length > 0) {
      localStorage.setItem("ace-it-flashcards", JSON.stringify(flashcards));
    }
  }, [flashcards]);

  useEffect(() => {
    if (Object.keys(reviewData).length > 0) {
      localStorage.setItem("ace-it-review-data", JSON.stringify(reviewData));
    }
  }, [reviewData]);

  // Initialize review data for cards that don't have it
  useEffect(() => {
    const newReviewData = { ...reviewData };
    let hasChanges = false;

    flashcards.forEach((card) => {
      if (!newReviewData[card.id]) {
        newReviewData[card.id] = SpacedRepetitionScheduler.initializeCard(
          card.id
        );
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setReviewData(newReviewData);
    }
  }, [flashcards]);

  // Get organized data
  const subjects = [...new Set(flashcards.map((card) => card.subject))].map(
    (subject) => ({
      name: subject,
      topics: [
        ...new Set(
          flashcards
            .filter((card) => card.subject === subject)
            .map((card) => card.topic)
        ),
      ],
    })
  );

  // Get spaced repetition analytics
  const spacedRepetitionAnalytics =
    SpacedRepetitionScheduler.getPerformanceAnalytics(
      Object.values(reviewData)
    );

  const getCardsForTopic = (subject, topic) => {
    return flashcards.filter(
      (card) => card.subject === subject && card.topic === topic
    );
  };

  const handleCreateCard = () => {
    if (newCard.front && newCard.back && newCard.subject && newCard.topic) {
      const card = {
        id: Date.now(),
        front: newCard.front,
        back: newCard.back,
        subject: newCard.subject,
        topic: newCard.topic,
        difficulty: newCard.difficulty,
        correctCount: 0,
        totalAttempts: 0,
      };
      setFlashcards([...flashcards, card]);
      setNewCard({
        front: "",
        back: "",
        subject: "",
        topic: "",
        difficulty: "medium",
      });
      setMode("subjects");
    }
  };

  const handleDeleteCard = (id) => {
    setFlashcards(flashcards.filter((card) => card.id !== id));
  };

  const handleNextCard = () => {
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleAnswer = (correct) => {
    if (correct) {
      setShowQualityButtons(true);
      return;
    }

    handleSpacedRepetitionAnswer(1);
  };

  const handleSpacedRepetitionAnswer = (quality) => {
    const studyCard = studyCards[currentCardIndex];
    const currentReviewData = reviewData[studyCard.id];

    if (currentReviewData) {
      const updatedReviewData = SpacedRepetitionScheduler.scheduleNextReview(
        currentReviewData,
        quality
      );
      setReviewData((prev) => ({
        ...prev,
        [studyCard.id]: updatedReviewData,
      }));
    }

    const updatedCards = [...flashcards];
    const cardIndex = updatedCards.findIndex(
      (card) => card.id === studyCard.id
    );

    if (cardIndex !== -1) {
      updatedCards[cardIndex].totalAttempts++;
      if (quality >= 3) {
        updatedCards[cardIndex].correctCount++;
      }
      setFlashcards(updatedCards);
    }

    setShowQualityButtons(false);

    const newProgress = ((currentCardIndex + 1) / studyCards.length) * 100;
    setStudyProgress(newProgress);

    setTimeout(() => {
      if (currentCardIndex < studyCards.length - 1) {
        handleNextCard();
      } else {
        setMode("subjects");
        setCurrentCardIndex(0);
        setStudyProgress(0);
      }
    }, 1500);
  };

  const startStudySession = (subject, topic) => {
    const cards = getCardsForTopic(subject, topic);
    setStudyCards(cards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setShowQualityButtons(false);
    setStudyProgress(0);
    setMode("study");
  };

  const startSpacedRepetitionSession = () => {
    const reviewCards = Object.values(reviewData);
    const dueCards = SpacedRepetitionScheduler.getDueCards(reviewCards);
    const sortedCards = SpacedRepetitionScheduler.getStudyOrder(dueCards);

    const cards = sortedCards
      .map((reviewCard) => flashcards.find((card) => card.id === reviewCard.id))
      .filter((card) => card !== undefined);

    setStudyCards(cards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setShowQualityButtons(false);
    setStudyProgress(0);
    setMode("study");
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "badge-easy";
      case "medium":
        return "badge-medium";
      case "hard":
        return "badge-hard";
      default:
        return "badge-outline";
    }
  };

  const getSubjectColor = (index) => {
    const colors = [
      "subject-dot-blue",
      "subject-dot-green",
      "subject-dot-purple",
      "subject-dot-orange",
      "subject-dot-pink",
    ];
    return colors[index % colors.length];
  };

  // Study Mode View
  if (mode === "study" && studyCards.length > 0) {
    const currentCard = studyCards[currentCardIndex];
    return (
      <div className="study-container space-y-6">
        {/* Back Button */}
        <button
          className="btn btn-outline mb-4"
          onClick={() => setMode("browse")}
        >
          <FaArrowLeft className="w-4 h-4 mr-2" />
          Back to {selectedSubject} → {selectedTopic}
        </button>

        {/* Study Progress */}
        <div className="study-progress">
          <div className="progress-header">
            <h3 className="font-medium">Study Session Progress</h3>
            <span className="text-sm text-muted">
              {currentCardIndex + 1} of {studyCards.length}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${studyProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="flashcard">
          <div className="flashcard-header">
            <span className={getDifficultyColor(currentCard.difficulty)}>
              {currentCard.difficulty}
            </span>
            <span className="badge badge-outline">
              {currentCard.subject} → {currentCard.topic}
            </span>
          </div>
          <div className="flashcard-content">
            <div className="text-center space-y-4">
              <h3 className="card-front">{currentCard.front}</h3>

              {showAnswer && (
                <div className="card-back">
                  <p className="text-muted">{currentCard.back}</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="btn btn-outline"
                >
                  <FaEye className="w-4 h-4 mr-2" />
                  Show Answer
                </button>
              ) : (
                <div className="space-y-4">
                  {!showQualityButtons ? (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAnswer(false)}
                      >
                        Incorrect
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAnswer(true)}
                      >
                        Correct
                      </button>
                    </div>
                  ) : (
                    <div className="quality-buttons">
                      <p className="quality-label">
                        How well did you know this?
                      </p>
                      <div className="quality-grid">
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(5)}
                        >
                          <FaCheckCircle className="w-4 h-4 mr-2 icon-green" />
                          Perfect - Easy recall
                        </button>
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(4)}
                        >
                          <FaCheckCircle className="w-4 h-4 mr-2 icon-blue" />
                          Correct - With hesitation
                        </button>
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(3)}
                        >
                          <FaExclamationTriangle className="w-4 h-4 mr-2 icon-yellow" />
                          Correct - With difficulty
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-buttons">
          <button
            className="btn btn-outline"
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
          >
            <FaChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <button
            className="btn btn-outline"
            onClick={() => setMode("subjects")}
          >
            Exit Study Mode
          </button>

          <button
            className="btn btn-outline"
            onClick={handleNextCard}
            disabled={currentCardIndex === studyCards.length - 1}
          >
            Next
            <FaChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // Create Card View
  if (mode === "create") {
    return (
      <div className="study-container space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Create New Flashcard</h3>
          <button
            className="btn btn-outline"
            onClick={() => setMode("subjects")}
          >
            Cancel
          </button>
        </div>

        <div className="card-item p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Front (Question)</label>
              <textarea
                className="textarea"
                value={newCard.front}
                onChange={(e) =>
                  setNewCard({ ...newCard, front: e.target.value })
                }
                placeholder="Enter the question or prompt..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Back (Answer)</label>
              <textarea
                className="textarea"
                value={newCard.back}
                onChange={(e) =>
                  setNewCard({ ...newCard, back: e.target.value })
                }
                placeholder="Enter the answer..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <input
                  className="input"
                  type="text"
                  value={newCard.subject}
                  onChange={(e) =>
                    setNewCard({ ...newCard, subject: e.target.value })
                  }
                  placeholder="e.g., Mathematics, Science, History"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <input
                  className="input"
                  type="text"
                  value={newCard.topic}
                  onChange={(e) =>
                    setNewCard({ ...newCard, topic: e.target.value })
                  }
                  placeholder="e.g., Calculus, Chemistry, World War II"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select
                className="select"
                value={newCard.difficulty}
                onChange={(e) =>
                  setNewCard({ ...newCard, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              onClick={handleCreateCard}
              className="btn btn-primary w-full"
            >
              Create Flashcard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Topics View
  if (mode === "topics" && selectedSubject) {
    const subject = subjects.find((s) => s.name === selectedSubject);
    if (!subject) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-outline"
              onClick={() => setMode("subjects")}
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </button>
            <div>
              <h2 className="text-2xl font-medium">{selectedSubject}</h2>
              <p className="text-muted">
                {subject.topics.length} topics available
              </p>
            </div>
          </div>
          <button onClick={() => setMode("create")} className="btn btn-primary">
            <FaPlus className="w-4 h-4 mr-2" />
            Add Card
          </button>
        </div>

        <div className="subjects-grid">
          {subject.topics.map((topic, index) => {
            const cards = getCardsForTopic(selectedSubject, topic);
            return (
              <div key={topic} className="subject-card">
                <div className="subject-header">
                  <div className="subject-title">
                    <FaHashtag className="w-4 h-4 text-blue-500" />
                    <span>{topic}</span>
                  </div>
                  <span className="badge badge-outline">
                    {cards.length} cards
                  </span>
                </div>
                <div className="subject-content">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Difficulty mix:</span>
                  </div>
                  <div className="flex gap-1">
                    {["easy", "medium", "hard"].map((difficulty) => {
                      const count = cards.filter(
                        (card) => card.difficulty === difficulty
                      ).length;
                      return count > 0 ? (
                        <span
                          key={difficulty}
                          className={`badge ${getDifficultyColor(difficulty)}`}
                        >
                          {count} {difficulty}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSelectedTopic(topic);
                        setMode("browse");
                      }}
                      style={{ flex: 1 }}
                    >
                      <FaBookOpen className="w-3 h-3 mr-1" />
                      Browse
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startStudySession(selectedSubject, topic)}
                      disabled={cards.length === 0}
                      style={{ flex: 1 }}
                    >
                      Study
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Browse Cards View
  if (mode === "browse" && selectedSubject && selectedTopic) {
    const cards = getCardsForTopic(selectedSubject, selectedTopic);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-outline"
              onClick={() => setMode("topics")}
            >
              <FaArrowLeft className="w-4 h-4 mr-2" />
              Back to {selectedSubject}
            </button>
            <div>
              <h2 className="text-2xl font-medium">
                {selectedSubject} → {selectedTopic}
              </h2>
              <p className="text-muted">{cards.length} cards in this topic</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("create")}
              className="btn btn-primary"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Add Card
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => startStudySession(selectedSubject, selectedTopic)}
              disabled={cards.length === 0}
            >
              <FaBookOpen className="w-4 h-4 mr-2" />
              Study All
            </button>
          </div>
        </div>

        <div className="cards-grid">
          {cards.map((card) => {
            const cardReviewData = reviewData[card.id];
            const isOverdue =
              cardReviewData &&
              new Date(cardReviewData.nextReviewDate) < new Date();
            const isDueToday =
              cardReviewData &&
              new Date(cardReviewData.nextReviewDate.toDateString()) ===
                new Date(new Date().toDateString());

            return (
              <div
                key={card.id}
                className={`card-item ${
                  isOverdue
                    ? "card-item-overdue"
                    : isDueToday
                    ? "card-item-due"
                    : ""
                }`}
              >
                <div className="card-header">
                  <div className="flex flex-wrap gap-1">
                    <span className={getDifficultyColor(card.difficulty)}>
                      {card.difficulty}
                    </span>
                    {isOverdue && (
                      <span className="badge badge-destructive">
                        <FaClock className="w-3 h-3 mr-1" />
                        Overdue
                      </span>
                    )}
                    {isDueToday && !isOverdue && (
                      <span className="badge badge-secondary">
                        <FaCalendarAlt className="w-3 h-3 mr-1" />
                        Due Today
                      </span>
                    )}
                  </div>
                  <div className="card-actions">
                    <button
                      className="action-btn"
                      onClick={() => setEditingCard(card)}
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <FaTrashAlt className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <p className="card-question">{card.front}</p>
                  <p className="card-answer">{card.back}</p>
                  <div className="card-footer">
                    {card.totalAttempts > 0 && (
                      <span>
                        Success rate:{" "}
                        {Math.round(
                          (card.correctCount / card.totalAttempts) * 100
                        )}
                        %
                      </span>
                    )}
                    {cardReviewData && cardReviewData.repetitions > 0 && (
                      <span>
                        Next:{" "}
                        {new Date(
                          cardReviewData.nextReviewDate
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {cards.length === 0 && (
          <div className="empty-state">
            <FaBookOpen className="empty-icon" />
            <h3 className="empty-title">No flashcards in this topic yet</h3>
            <p className="empty-description">
              Create your first flashcard for {selectedTopic}
            </p>
            <button
              onClick={() => setMode("create")}
              className="btn btn-primary mt-4"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Create First Card
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default: Subjects View
  return (
    <div className="flashcards-container space-y-6">
      {/* Header */}
      <div className="flashcards-header">
        <div>
          <h2 className="flashcards-title">Flashcards</h2>
          <p className="flashcards-subtitle">
            {flashcards.length} cards organized in {subjects.length} subjects
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={startSpacedRepetitionSession}
            disabled={
              spacedRepetitionAnalytics.dueToday === 0 &&
              spacedRepetitionAnalytics.overdueCards === 0
            }
          >
            <FaBrain className="w-4 h-4 mr-2" />
            Smart Review (
            {spacedRepetitionAnalytics.dueToday +
              spacedRepetitionAnalytics.overdueCards}
            )
          </button>
          <button onClick={() => setMode("create")} className="btn btn-primary">
            <FaPlus className="w-4 h-4 mr-2" />
            Create Card
          </button>
        </div>
      </div>

      {/* Learning Insights */}
      <div className="insights-card">
        <div className="insights-header">
          <FaBrain className="insights-icon" />
          <h3 className="font-medium">Learning Progress</h3>
        </div>
        <div className="insights-grid">
          <div className="text-center">
            <div className="stat-value stat-mastered">
              {spacedRepetitionAnalytics.masteredCards}
            </div>
            <p className="stat-label">Mastered</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-due">
              {spacedRepetitionAnalytics.dueToday}
            </div>
            <p className="stat-label">Due Today</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-overdue">
              {spacedRepetitionAnalytics.overdueCards}
            </div>
            <p className="stat-label">Overdue</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-ease">
              {spacedRepetitionAnalytics.averageEaseFactor.toFixed(1)}
            </div>
            <p className="stat-label">Avg Ease</p>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="subjects-grid">
        {subjects.map((subject, index) => {
          const subjectCards = flashcards.filter(
            (card) => card.subject === subject.name
          );
          const averageSuccess =
            subjectCards.length > 0
              ? Math.round(
                  subjectCards.reduce(
                    (acc, card) =>
                      acc +
                      (card.totalAttempts > 0
                        ? (card.correctCount / card.totalAttempts) * 100
                        : 0),
                    0
                  ) / subjectCards.length
                )
              : 0;

          return (
            <div key={subject.name} className="subject-card">
              <div className="subject-header">
                <div className="subject-title">
                  <div
                    className={`subject-dot ${getSubjectColor(index)}`}
                  ></div>
                  <span>{subject.name}</span>
                </div>
                <FaFolderOpen className="w-4 h-4 text-muted" />
              </div>
              <div className="subject-content">
                <div className="subject-row">
                  <span className="row-label">Topics:</span>
                  <span className="badge badge-secondary">
                    {subject.topics.length}
                  </span>
                </div>
                <div className="subject-row">
                  <span className="row-label">Cards:</span>
                  <span className="badge badge-outline">
                    {subjectCards.length}
                  </span>
                </div>
                {averageSuccess > 0 && (
                  <div className="subject-row">
                    <span className="row-label">Avg. Success:</span>
                    <span
                      className={
                        averageSuccess >= 70
                          ? "badge badge-secondary"
                          : "badge badge-outline"
                      }
                    >
                      {averageSuccess}%
                    </span>
                  </div>
                )}
                <button
                  className="subject-button"
                  onClick={() => {
                    setSelectedSubject(subject.name);
                    setMode("topics");
                  }}
                >
                  Explore Topics
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="empty-state">
          <FaFolder className="empty-icon" />
          <h3 className="empty-title">No subjects yet</h3>
          <p className="empty-description">
            Create your first flashcard to get started
          </p>
          <button
            onClick={() => setMode("create")}
            className="btn btn-primary mt-4"
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Create Your First Card
          </button>
        </div>
      )}
    </div>
  );
}

export default Flashcards;
