import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/chatbot.css";
import { chatAPI, libraryAPI, userAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";

// Sub-components
import ChatSidebar from "./Chatbot/ChatSidebar";
import ChatHeader from "./Chatbot/ChatHeader";
import ChatMessages from "./Chatbot/ChatMessages";
import ResourcePicker from "./Chatbot/ResourcePicker";
import ChatInput from "./Chatbot/ChatInput";
import useSpeechSynthesis from "../hooks/useSpeechSynthesis";

import {
  loadSessions,
  saveSessions,
  loadMessages,
  saveMessages,
  normalizeHistory,
  getSessionGroups,
  getResourceId,
  getResourceTitle,
  getResourceSubject,
  toLocalDate,
  formatContext,
} from "./Chatbot/utils";

export function Chatbot({
  selectedResourceIds = [],
  setSelectedResourceIds = () => {},
}) {
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
  const [attachments, setAttachments] = useState([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const attachmentsRef = useRef([]);
  const [userProfile, setUserProfile] = useState(null);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("ace-it-voice-enabled") === "true";
  });
  const { speak, cancel, isSpeaking } = useSpeechSynthesis();

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
        console.error("Fetch history error:", err);
        setError("Unable to load chat history.");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("ace-it-voice-enabled", voiceEnabled);
    if (!voiceEnabled) {
      cancel();
    }
  }, [voiceEnabled, cancel]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && lastMessage.content) {
        speak(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled, speak]);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await userAPI.getProfile();
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loadFlashcards = useCallback(async () => {
    try {
      const response = await flashcardAPI.getFlashcards();
      setFlashcardSets(response.flashcards || []);
    } catch (err) {
      console.error("Failed to load flashcards:", err);
    }
  }, []);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const loadDocuments = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const response = await libraryAPI.getDocuments(uid);
      setDocuments(response.documents || response.library || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (showResourcePicker) {
      loadDocuments();
    }
  }, [showResourcePicker, loadDocuments]);

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

  const selectedDocuments = useMemo(() => {
    return documents.filter((doc, index) => 
      selectedResourceIds.includes(getResourceId(doc, index))
    );
  }, [documents, selectedResourceIds]);

  const globalContext = useMemo(() => {
    const subjects = userProfile?.profile?.subject 
      ? (Array.isArray(userProfile.profile.subject) ? userProfile.profile.subject.join(", ") : userProfile.profile.subject)
      : "Not specified";
    
    const docTitles = documents.length > 0
      ? documents.map((doc, idx) => getResourceTitle(doc, idx)).join(", ")
      : "None";

    return `[STUDY_CONTEXT_START]
Subjects: ${subjects}
Library Resources: ${docTitles}
[STUDY_CONTEXT_END]`;
  }, [userProfile, documents]);

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
      const newId = response.session_id || response.sessionId || response.id || null;
      if (!newId) throw new Error("No session id returned");
      
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
      setShowMobileSidebar(false);
    } catch (err) {
      console.error("Create session error:", err);
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
      ? attachments.map((file) => `- ${file.name} (${file.typeLabel})`).join("\n")
      : "";
    const resourceContext = activeResources.length
    ? `Reference these resources when answering:\n\n${formatContext(activeResources)}\n\n${trimmed ? `User question: ${trimmed}` : ""}`
    : trimmed;
    const attachmentContext = attachmentSummary ? `\n\nUser attached files:\n${attachmentSummary}` : "";
    const messagePayload = `${globalContext}\n\n${resourceContext}${attachmentContext}`.trim();

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

    setMessages((prev) => [...prev, ...attachmentMessages, ...(userMessage ? [userMessage] : [])]);
    setInput("");
    setAttachments([]);
    setSelectedResourceIds([]);

    try {
      const response = await chatAPI.sendMessage(activeSessionId, messagePayload);
      const replyText = response.response || response.reply || response.message || response.answer || "";
      if (!replyText) throw new Error("Empty response");
      
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
          session.id === activeSessionId ? { ...session, title: nextTitle } : session,
        );
        setSessions(updatedSessions);
        saveSessions(updatedSessions);
      }
    } catch (err) {
      console.error("Send message error:", err);
      setError("Message failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    if (!activeSessionId || isSending) return;
    setIsSending(true);
    setError("");

    try {
      const response = await chatAPI.sendAudioMessage(activeSessionId, audioBlob, globalContext);
      const transcript = response.transcription || "";
      const replyText = response.answer || response.response || "";

      if (transcript) {
        const userMessage = {
          id: `user-audio-${Date.now()}`,
          role: "user",
          type: "text",
          content: transcript,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      if (replyText) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: replyText,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Empty audio response");
      }
    } catch (err) {
      console.error("Send audio error:", err);
      setError("Audio message failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClearMemory = useCallback(async () => {
    if (!activeSessionId) return;
    const confirmed = window.confirm(
      "Clear this chat's memory? This will delete messages in this session."
    );
    if (!confirmed) return;

    setIsSending(true);
    setError("");
    try {
      await chatAPI.clearMemory(activeSessionId);
      setMessages([]);
      localStorage.removeItem(`ace-it-chat-messages-${activeSessionId}`);
    } catch (err) {
      console.error("Clear memory error:", err);
      setError("Failed to clear chat memory.");
    } finally {
      setIsSending(false);
    }
  }, [activeSessionId]);

  const handleRenameSession = useCallback((sessionId, newTitle) => {
    const updatedSessions = sessions.map((s) =>
      s.id === sessionId ? { ...s, title: newTitle } : s
    );
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
  }, [sessions]);

  const handleDeleteSession = useCallback((sessionId) => {
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(updatedSessions);
    saveSessions(updatedSessions);

    // If active session was deleted, switch to another
    if (activeSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
    
    // Clean up messages from local storage
    localStorage.removeItem(`ace-it-chat-messages-${sessionId}`);
  }, [activeSessionId, sessions]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const buildAttachment = (file, type) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isHeic = extension === "heic" || extension === "heif";
    const isImage = type === "image";
    const previewable = isImage && !isHeic;

    return {
      id: `${type}-${file.name}-${file.lastModified}`,
      type,
      typeLabel: type === "image" ? "image" : "file",
      name: file.name,
      size: file.size,
      mimeType: file.type,
      extension,
      previewable,
      previewUrl: previewable ? URL.createObjectURL(file) : "",
    };
  };

  const handleAddAttachments = (files, type) => {
    if (!files || !files.length) return;
    const next = Array.from(files).map((file) => buildAttachment(file, type));
    setAttachments((prev) => [...prev, ...next]);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => {
      const removed = prev.find((file) => file.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((file) => file.id !== id);
    });
  };

  return (
    <div className={`chatbot-page ${!isDesktopSidebarOpen ? "desktop-sidebar-closed" : ""}`}>
      <div
        className={`chatbot-mobile-overlay ${showMobileSidebar ? "visible" : ""}`}
        onClick={() => setShowMobileSidebar(false)}
      />
      
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        handleCreateSession={handleCreateSession}
        handleDeleteSession={handleDeleteSession}
        handleRenameSession={handleRenameSession}
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        groupedSessions={groupedSessions}
      />

      <main className="chatbot-main">
        <div className="chatbot-panel">
          <ChatHeader
            activeSessionTitle={activeSession?.title}
            isLoadingHistory={isLoadingHistory}
            setShowMobileSidebar={setShowMobileSidebar}
            isDesktopSidebarOpen={isDesktopSidebarOpen}
            setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
            voiceEnabled={voiceEnabled}
            setVoiceEnabled={setVoiceEnabled}
            onClearMemory={handleClearMemory}
            canClearMemory={Boolean(activeSessionId)}
          />

          {error && <div className="chatbot-error">{error}</div>}

          <ChatMessages
            messages={messages}
            activeSessionId={activeSessionId}
            handleCreateSession={handleCreateSession}
            setInput={setInput}
            endRef={endRef}
            isSending={isSending}
            speak={speak}
            cancel={cancel}
            isSpeaking={isSpeaking}
          />

          <ResourcePicker
            showResourcePicker={showResourcePicker}
            setShowResourcePicker={setShowResourcePicker}
            selectedResourceIds={selectedResourceIds}
            setSelectedResourceIds={setSelectedResourceIds}
            documents={documents}
          />

          <ChatInput
            input={input}
            setInput={setInput}
            isSending={isSending}
            activeSessionId={activeSessionId}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            attachments={attachments}
            handleAddAttachments={handleAddAttachments}
            handleRemoveAttachment={handleRemoveAttachment}
            imageInputRef={imageInputRef}
            fileInputRef={fileInputRef}
            audioInputRef={audioInputRef}
            textareaRef={textareaRef}
            selectedDocuments={selectedDocuments}
            setSelectedResourceIds={setSelectedResourceIds}
            handleSendAudio={handleSendAudio}
          />
        </div>
      </main>
    </div>
  );
}

export default Chatbot;
