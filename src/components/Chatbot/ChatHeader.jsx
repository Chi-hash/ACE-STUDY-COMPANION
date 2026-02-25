import React from "react";
import { FaBars, FaVolumeUp, FaVolumeMute, FaTrashAlt } from "react-icons/fa";

export function ChatHeader({
  activeSessionTitle,
  isLoadingHistory,
  setShowMobileSidebar,
  isDesktopSidebarOpen,
  setIsDesktopSidebarOpen,
  voiceEnabled,
  setVoiceEnabled,
  onClearMemory,
  canClearMemory = false,
}) {
  return (
    <header className="chatbot-header">
      <button
        className="chatbot-mobile-toggle"
        onClick={() => setShowMobileSidebar(true)}
      >
        <FaBars />
      </button>
      <button
        className="chatbot-desktop-toggle"
        onClick={() => setIsDesktopSidebarOpen((prev) => !prev)}
        title={isDesktopSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
      >
        <FaBars />
      </button>
      <div className="chatbot-header-title">
        <h2>{activeSessionTitle || "New chat"}</h2>
      </div>
      <div className="chatbot-header-actions">
        <button
          className="chatbot-voice-toggle"
          onClick={onClearMemory}
          title="Clear chat memory"
          disabled={!canClearMemory}
        >
          <FaTrashAlt />
        </button>
        <button
          className={`chatbot-voice-toggle ${voiceEnabled ? "enabled" : ""}`}
          onClick={() => setVoiceEnabled(prev => !prev)}
          title={voiceEnabled ? "Disable Felix Voice" : "Enable Felix Voice" }
        >
          {voiceEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
        </button>
        <div className="chatbot-status">
          {isLoadingHistory ? "Loading..." : "Online"}
        </div>
      </div>
    </header>
  );
}

export default ChatHeader;
