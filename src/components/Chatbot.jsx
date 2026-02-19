import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/chatbot.css";
import { chatAPI, libraryAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";

const SESSIONS_KEY = "ace-it-chat-sessions";
const messagesKey = (sessionId) => `ace-it-chat-messages-${sessionId}`;

const loadSessions = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveSessions = (sessions) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

const loadMessages = (sessionId) => {
  try {
    return JSON.parse(localStorage.getItem(messagesKey(sessionId)) || "[]");
  } catch {
    return [];
  }
};

const saveMessages = (sessionId, messages) => {
  localStorage.setItem(messagesKey(sessionId), JSON.stringify(messages));
};

const normalizeHistory = (payload) => {
  if (!payload) return [];
  const raw =
    payload.history ||
    payload.messages ||
    payload.chat_history ||
    payload.data ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const role =
        item.role ||
        item.sender ||
        (item.is_user ? "user" : "assistant") ||
        "assistant";
      const content =
        item.content || item.message || item.text || item.response || "";
      if (!content) return null;
      return {
        id: item.id || `${role}-${index}-${Date.now()}`,
        role,
        content,
        createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      };
    })
    .filter(Boolean);
};

const toLocalDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getSessionGroups = (sessions) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const weekAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7,
  );

  const groups = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  sessions.forEach((session) => {
    const createdAt = toLocalDate(session.createdAt);
    if (createdAt >= today) {
      groups.Today.push(session);
    } else if (createdAt >= yesterday) {
      groups.Yesterday.push(session);
    } else if (createdAt >= weekAgo) {
      groups["Previous 7 Days"].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  return Object.entries(groups).filter(([, list]) => list.length > 0);
};

const getResourceId = (doc, index) =>
  doc.id || doc._id || doc.document_id || `resource-${index}`;

const getResourceTitle = (doc, index) =>
  doc.title ||
  doc.name ||
  doc.filename ||
  doc.file_name ||
  doc.originalname ||
  doc.original_filename ||
  `Resource ${index + 1}`;

const getResourceSubject = (doc) => doc.subject || doc.course || "General";

export function Chatbot() {
  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState(
    sessions[0]?.id || null,
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentsRef = useRef([]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => toLocalDate(b.createdAt) - toLocalDate(a.createdAt),
    );
    return getSessionGroups(sorted);
  }, [sessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const cached = loadMessages(activeSessionId);
    if (cached.length) {
      setMessages(cached);
    }

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setError("");
      try {
        const response = await chatAPI.getChatHistory(activeSessionId);
        const history = normalizeHistory(response);
        if (history.length) {
          setMessages(history);
          saveMessages(activeSessionId, history);
        }
      } catch (err) {
        setError("Unable to load chat history.");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeSessionId]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const response = await libraryAPI.getDocuments(uid);
        setDocuments(response.documents || response.library || []);
      } catch (err) {
        setError("Unable to load resources.");
      }
    };

    loadDocuments();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      saveMessages(activeSessionId, messages);
    }
  }, [messages, activeSessionId]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, []);

  const resizeTextarea = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleCreateSession = async () => {
    setError("");
    try {
      const response = await chatAPI.createChatSession();
      const newId =
        response.session_id || response.sessionId || response.id || null;
      if (!newId) {
        throw new Error("No session id returned");
      }
      const newSession = {
        id: newId,
        title: "New chat",
        createdAt: new Date().toISOString(),
      };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      saveSessions(updated);
      setActiveSessionId(newId);
      setMessages([]);
    } catch (err) {
      setError("Could not start a new chat.");
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    const hasAttachments = attachments.length > 0;
    if ((!trimmed && !hasAttachments) || !activeSessionId || isSending) return;
    setIsSending(true);
    setError("");

    const activeResources = documents.filter((doc, index) =>
      selectedResourceIds.includes(getResourceId(doc, index)),
    );
    const attachmentSummary = hasAttachments
      ? attachments
          .map((file) => `- ${file.name} (${file.typeLabel})`)
          .join("\n")
      : "";
    const resourceContext = activeResources.length
      ? `Reference these resources when answering:\n${activeResources
          .map((doc, index) => {
            const title = getResourceTitle(doc, index);
            const subject = getResourceSubject(doc);
            const summary = doc.summary || doc.description || "";
            return `- ${title} (Subject: ${subject})${
              summary ? `: ${summary}` : ""
            }`;
          })
          .join("\n")}\n\n${trimmed ? `User question: ${trimmed}` : ""}`
      : trimmed;
    const attachmentContext = attachmentSummary
      ? `\n\nUser attached files:\n${attachmentSummary}`
      : "";
    const messagePayload = `${resourceContext}${attachmentContext}`.trim();

    const now = new Date().toISOString();
    const attachmentMessages = attachments.map((file, index) => ({
      id: `user-attachment-${Date.now()}-${index}`,
      role: "user",
      type: file.type,
      content: file.name,
      url: file.previewUrl,
      fileSize: file.size,
      createdAt: now,
    }));

    const userMessage = trimmed
      ? {
          id: `user-${Date.now()}`,
          role: "user",
          type: "text",
          content: trimmed,
          createdAt: now,
        }
      : null;

    setMessages((prev) => [
      ...prev,
      ...attachmentMessages,
      ...(userMessage ? [userMessage] : []),
    ]);
    setInput("");
    setAttachments([]);

    try {
      const response = await chatAPI.sendMessage(activeSessionId, messagePayload);
      const replyText =
        response.response ||
        response.reply ||
        response.message ||
        response.answer ||
        "";
      if (!replyText) {
        throw new Error("Empty response");
      }
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: replyText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (activeSession?.title === "New chat" && trimmed) {
        const nextTitle = trimmed.slice(0, 40);
        const updatedSessions = sessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, title: nextTitle }
            : session,
        );
        setSessions(updatedSessions);
        saveSessions(updatedSessions);
      }
    } catch (err) {
      setError("Message failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const buildAttachment = (file, type) => ({
    id: `${type}-${file.name}-${file.lastModified}`,
    type,
    typeLabel: type === "image" ? "image" : "file",
    name: file.name,
    size: file.size,
    previewUrl: type === "image" ? URL.createObjectURL(file) : "",
  });

  const handleAddAttachments = (files, type) => {
    if (!files || !files.length) return;
    const next = Array.from(files).map((file) => buildAttachment(file, type));
    setAttachments((prev) => [...prev, ...next]);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => {
      const removed = prev.find((file) => file.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((file) => file.id !== id);
    });
  };

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const renderMessageContent = (message) => {
    if (message.type === "image" && message.url) {
      return (
        <div className="chatbot-message-bubble image">
          <img src={message.url} alt={message.content} />
          <span className="chatbot-attachment-name">{message.content}</span>
        </div>
      );
    }

    if (message.type === "file") {
      return (
        <div className="chatbot-message-bubble file">
          <div className="chatbot-file-card">
            <div>
              <span className="chatbot-attachment-name">{message.content}</span>
              {message.fileSize ? (
                <span className="chatbot-attachment-meta">
                  {formatFileSize(message.fileSize)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return <div className="chatbot-message-bubble">{message.content}</div>;
  };

  return (
    <div className="chatbot-page">
      <aside className="chatbot-sidebar">
        <div className="chatbot-sidebar-header">
          <h3>Felix AI</h3>
          <p>Your study assistant</p>
        </div>
        <button className="chatbot-btn primary" onClick={handleCreateSession}>
          + New chat
        </button>
        <div className="chatbot-session-list">
          {sessions.length === 0 ? (
            <div className="chatbot-empty">No chats yet.</div>
          ) : (
            groupedSessions.map(([label, list]) => (
              <div key={label} className="chatbot-session-group">
                <p className="chatbot-session-label">{label}</p>
                {list.map((session) => (
                  <button
                    key={session.id}
                    className={`chatbot-session ${
                      activeSessionId === session.id ? "active" : ""
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <span>{session.title || "Untitled chat"}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="chatbot-main">
        <div className="chatbot-panel">
          <header className="chatbot-header">
            <div className="chatbot-header-title">
              <h2>Felix AI</h2>
            </div>
            <div className="chatbot-status">
              {isLoadingHistory ? "Loading..." : "Online"}
            </div>
          </header>

          {error && <div className="chatbot-error">{error}</div>}

          <section className="chatbot-messages">
            {activeSessionId ? (
              messages.length === 0 ? (
                <div className="chatbot-empty-state">
                  <div className="chatbot-empty-icon">AI</div>
                  <h3>How can I help you today?</h3>
                  <p>Ask me anything — I’m here to help.</p>
                  <div className="chatbot-suggestion-grid">
                    {[
                      "Explain quantum computing in simple terms",
                      "Write a Python script to sort a list",
                      "Summarize the key ideas of stoicism",
                      "Give me creative ideas for a birthday party",
                    ].map((text) => (
                      <button
                        key={text}
                        className="chatbot-suggestion-card"
                        onClick={() => setInput(text)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chatbot-message-list">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chatbot-message ${message.role}`}
                    >
                      {renderMessageContent(message)}
                      <span className="chatbot-message-time">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )
            ) : (
              <div className="chatbot-empty-state">
                <h3>Create a chat</h3>
                <p>Start a new session to talk with Felix AI.</p>
                <button
                  className="chatbot-btn primary"
                  onClick={handleCreateSession}
                >
                  New chat
                </button>
              </div>
            )}
          </section>

          <div className="chatbot-resources">
            <div className="chatbot-resources-header">
              <button
                className="chatbot-btn ghost"
                onClick={() => setShowResourcePicker((prev) => !prev)}
              >
                {showResourcePicker ? "Hide resources" : "Use resources"}
              </button>
              {selectedResourceIds.length > 0 && (
                <span className="chatbot-resource-count">
                  {selectedResourceIds.length} selected
                </span>
              )}
            </div>
            {showResourcePicker && (
              <div className="chatbot-resources-list">
                {documents.length === 0 ? (
                  <p className="chatbot-resources-empty">
                    No resources found in your library yet.
                  </p>
                ) : (
                  documents.map((doc, index) => {
                    const id = getResourceId(doc, index);
                    const title = getResourceTitle(doc, index);
                    const subject = getResourceSubject(doc);
                    const checked = selectedResourceIds.includes(id);
                    return (
                      <label key={id} className="chatbot-resource-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedResourceIds((prev) =>
                              checked
                                ? prev.filter((value) => value !== id)
                                : [...prev, id],
                            );
                          }}
                        />
                        <div>
                          <span>{title}</span>
                          <small>{subject}</small>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <form
            className="chatbot-input"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={imageInputRef}
              className="chatbot-hidden-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                handleAddAttachments(event.target.files, "image")
              }
            />
            <input
              ref={fileInputRef}
              className="chatbot-hidden-input"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xlsx"
              multiple
              onChange={(event) =>
                handleAddAttachments(event.target.files, "file")
              }
            />

            {attachments.length > 0 && (
              <div className="chatbot-attachments">
                {attachments.map((file) => (
                  <div key={file.id} className="chatbot-attachment-chip">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.id)}
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="chatbot-input-row">
              <div className="chatbot-input-actions">
                <button
                  type="button"
                  className="chatbot-btn ghost"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!activeSessionId || isSending}
                >
                  Image
                </button>
                <button
                  type="button"
                  className="chatbot-btn ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activeSessionId || isSending}
                >
                  File
                </button>
                <button
                  type="button"
                  className="chatbot-btn ghost"
                  disabled={!activeSessionId || isSending}
                >
                  Mic
                </button>
              </div>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Message Assistant..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!activeSessionId || isSending}
              />
              <button
                className="chatbot-send-btn"
                type="submit"
                disabled={
                  !activeSessionId ||
                  isSending ||
                  (!input.trim() && attachments.length === 0)
                }
              >
                ↑
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Chatbot;
