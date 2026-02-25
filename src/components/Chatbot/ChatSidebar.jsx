import React, { useState } from "react";
import { FaTimes, FaEdit, FaTrashAlt, FaCheck } from "react-icons/fa";

export function ChatSidebar({
  sessions,
  activeSessionId,
  setActiveSessionId,
  handleCreateSession,
  handleDeleteSession,
  handleRenameSession,
  showMobileSidebar,
  setShowMobileSidebar,
  groupedSessions,
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [renamingValue, setRenamingValue] = useState("");

  const startRenaming = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setRenamingValue(session.title || "Untitled chat");
  };

  const saveRename = (sessionId) => {
    if (renamingValue.trim()) {
      handleRenameSession(sessionId, renamingValue.trim());
    }
    setEditingSessionId(null);
  };

  const handleRenameKeyDown = (e, sessionId) => {
    if (e.key === "Enter") {
      saveRename(sessionId);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  const deleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      handleDeleteSession(sessionId);
    }
  };

  return (
    <aside className={`chatbot-sidebar ${showMobileSidebar ? "open" : ""}`}>
      <div className="chatbot-sidebar-header">
        <h3>Felix AI</h3>
        <button
          className="chatbot-mobile-close"
          onClick={() => setShowMobileSidebar(false)}
        >
          <FaTimes />
        </button>
      </div>
      <p className="chatbot-subtitle">Your study assistant</p>
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
                <div 
                  key={session.id} 
                  className={`chatbot-session-item ${activeSessionId === session.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setShowMobileSidebar(false);
                  }}
                >
                  {editingSessionId === session.id ? (
                    <div className="chatbot-rename-input-container">
                      <input
                        autoFocus
                        type="text"
                        className="chatbot-rename-input"
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={() => saveRename(session.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button 
                        className="chatbot-rename-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename(session.id);
                        }}
                      >
                        <FaCheck />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="chatbot-session-title">
                        {session.title || "Untitled chat"}
                      </span>
                      <div className="chatbot-session-actions">
                        <button 
                          className="chatbot-session-action edit"
                          onClick={(e) => startRenaming(e, session)}
                          title="Rename"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="chatbot-session-action delete"
                          onClick={(e) => deleteSession(e, session.id)}
                          title="Delete"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default ChatSidebar;
