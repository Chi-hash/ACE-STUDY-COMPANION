import React, { useEffect } from "react";
import { FaImage, FaPaperclip, FaMicrophone, FaPaperPlane, FaStop, FaBook } from "react-icons/fa";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import useAudioRecorder from "../../hooks/useAudioRecorder";
import { getResourceId, getResourceTitle } from "./utils";

export function ChatInput({
  input,
  setInput,
  isSending,
  activeSessionId,
  handleSend,
  handleKeyDown,
  attachments,
  handleAddAttachments,
  handleRemoveAttachment,
  imageInputRef,
  fileInputRef,
  textareaRef,
  selectedDocuments = [],
  setSelectedResourceIds = () => {},
  handleSendAudio = () => {},
}) {
  const { isListening, transcript } = useSpeechRecognition();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleSendAudio);

  // Still allow transcription to fill input if user just wants to dictate
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  return (
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

      {(attachments.length > 0 || selectedDocuments.length > 0) && (
        <div className="chatbot-attachments">
          {selectedDocuments.map((doc, index) => {
            const id = getResourceId(doc, index);
            const title = getResourceTitle(doc, index);
            return (
              <div key={id} className="chatbot-attachment-chip library-resource">
                <FaBook className="chip-icon" />
                <span>{title}</span>
                <button
                  type="button"
                  onClick={() => setSelectedResourceIds(prev => prev.filter(vid => vid !== id))}
                  aria-label={`Remove ${title}`}
                >
                  ×
                </button>
              </div>
            );
          })}
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
            className="chatbot-icon-btn"
            onClick={() => imageInputRef.current?.click()}
            disabled={!activeSessionId || isSending}
            title="Upload Image"
          >
            <FaImage />
          </button>
          <button
            type="button"
            className="chatbot-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeSessionId || isSending}
            title="Upload File"
          >
            <FaPaperclip />
          </button>
          <button
            type="button"
            className={`chatbot-icon-btn ${isRecording ? "is-listening" : ""}`}
            onClick={toggleVoice}
            disabled={!activeSessionId || isSending}
            title={isRecording ? "Stop Recording" : "Audio Chat"}
          >
            {isRecording ? <FaStop /> : <FaMicrophone />}
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
          <FaPaperPlane />
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
