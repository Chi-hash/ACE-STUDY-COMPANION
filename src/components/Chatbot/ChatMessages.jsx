import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { FaVolumeUp, FaStop, FaBook } from "react-icons/fa";

// Splits text into alternating non-math / math segments.
// Handles: $$...$$, \begin{...}...\end{...}, and inline $...$
function parseMathSegments(text) {
  const segments = [];
  // Match display math: $$...$$  OR  \begin{...}...\end{...}
  const displayRe = /\$\$[\s\S]+?\$\$|\\begin\{[^}]+\}[\s\S]+?\\end\{[^}]+\}/g;
  let last = 0;
  let m;
  while ((m = displayRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", content: text.slice(last, m.index) });
    segments.push({ type: "block-math", content: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", content: text.slice(last) });

  // Now split any remaining text segments on inline $...$
  const result = [];
  for (const seg of segments) {
    if (seg.type !== "text") { result.push(seg); continue; }
    const inlineRe = /\$([^$\n]+?)\$/g;
    let p = 0;
    let im;
    while ((im = inlineRe.exec(seg.content)) !== null) {
      if (im.index > p) result.push({ type: "text", content: seg.content.slice(p, im.index) });
      result.push({ type: "inline-math", content: im[1] });
      p = im.index + im[0].length;
    }
    if (p < seg.content.length) result.push({ type: "text", content: seg.content.slice(p) });
  }
  return result;
}

function renderKatex(raw, displayMode) {
  try {
    // Strip $$ wrappers and \begin/\end for display math
    let expr = raw;
    if (displayMode) {
      expr = expr.replace(/^\$\$|\$\$$/g, "").trim();
    }
    if (typeof window !== "undefined" && window.katex) {
      return window.katex.renderToString(expr, { displayMode, throwOnError: false });
    }
    // KaTeX not loaded yet — fall back to raw text
    return null;
  } catch {
    return null;
  }
}

function MathRenderer({ text }) {
  const segments = useMemo(() => parseMathSegments(text), [text]);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "block-math") {
          const html = renderKatex(seg.content, true);
          if (html) return <div key={i} className="math-block" dangerouslySetInnerHTML={{ __html: html }} />;
          return <pre key={i} className="math-raw">{seg.content}</pre>;
        }
        if (seg.type === "inline-math") {
          const html = renderKatex(seg.content, false);
          if (html) return <span key={i} className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
          return <code key={i}>{seg.content}</code>;
        }
        // Plain text — render with ReactMarkdown
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm, remarkBreaks]}>
            {seg.content}
          </ReactMarkdown>
        );
      })}
    </>
  );
}

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const formatMessageText = (message) => {
  let raw = String(message?.content || "").trim();
  if (!raw) return "";

  // Strip hidden study context tags used for Felix's background knowledge
  raw = raw.replace(/\[STUDY_CONTEXT_START\][\s\S]*?\[STUDY_CONTEXT_END\]/g, "").trim();
  if (!raw) return "";

  // Normalize basic HTML formatting to Markdown when backend sends HTML
  raw = raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/?\s*p\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(strong|b)\s*>/gi, "**")
    .replace(/<\s*\/?\s*(em|i)\s*>/gi, "_")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Unescape common markdown sequences when backend escapes them
  raw = raw
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\\`/g, "`");

  const normalized = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  if (normalized.includes("\n")) return normalized;

  const bulletMatches = (normalized.match(/\s[-*•]\s+/g) || []).length;
  if (bulletMatches >= 2) {
    return normalized.replace(/\s[-*•]\s+/g, "\n- ").trim();
  }

  const numberedMatches = (normalized.match(/\s\d+\.\s+/g) || []).length;
  if (numberedMatches >= 2) {
    return normalized.replace(/\s(\d+\.)\s+/g, "\n$1 ").trim();
  }

  const parenNumberedMatches = (normalized.match(/\s\d+\)\s+/g) || []).length;
  if (parenNumberedMatches >= 2) {
    return normalized.replace(/\s(\d+\))\s+/g, "\n$1 ").trim();
  }

  return normalized;
};

const ChatImageMessage = ({ message }) => {
  const [failed, setFailed] = useState(false);
  const canPreview = Boolean(message.url) && message.previewable !== false && !failed;

  if (canPreview) {
    return (
      <div className="chatbot-message-bubble image">
        <img
          src={message.url}
          alt={message.content || "Uploaded image"}
          onError={() => setFailed(true)}
        />
        <span className="chatbot-attachment-name">{message.content}</span>
      </div>
    );
  }

  return (
    <div className="chatbot-message-bubble file">
      <div className="chatbot-file-card">
        <div>
          <span className="chatbot-attachment-name">{message.content}</span>
          <span className="chatbot-attachment-meta">
            Image preview not supported. Convert to JPG or PNG.
          </span>
        </div>
      </div>
    </div>
  );
};

const renderMessageContent = (message) => {
  if (message.type === "image") {
    return <ChatImageMessage message={message} />;
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

  if (message.type === "resource") {
    return (
      <div className="chatbot-message-bubble file resource">
        <div className="chatbot-file-card">
          <FaBook className="chatbot-resource-bubble-icon" aria-hidden />
          <div>
            <span className="chatbot-attachment-name">{message.content}</span>
            <span className="chatbot-attachment-meta">
              {message.resourceSubject || "General"}
              {" · "}
              From your library
            </span>
          </div>
        </div>
      </div>
    );
  }

  const formatted = formatMessageText(message);
  const hasMath = /\$|\\begin\{/.test(formatted);
  return (
    <div className="chatbot-message-bubble">
      {hasMath ? (
        <MathRenderer text={formatted} />
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {formatted}
        </ReactMarkdown>
      )}
    </div>
  );
};

export function ChatMessages({
  messages,
  activeSessionId,
  handleCreateSession,
  setInput,
  endRef,
  isSending = false,
  speak = () => {},
  cancel = () => {},
  isSpeaking = false,
}) {
  const [activeVoiceMessageId, setActiveVoiceMessageId] = useState(null);
  const messageList = useMemo(() => messages, [messages]);

  return (
    <section className="chatbot-messages">
      {activeSessionId ? (
        messages.length === 0 ? (
          <div className="chatbot-empty-state">
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
            {messageList.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message ${message.role}`}
              >
                <div className="chatbot-message-content">
                  {renderMessageContent(message)}
                  <div className="chatbot-message-actions">
                    <span className="chatbot-message-time">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {message.role === "assistant" && message.type === "text" && (
                      <button
                        className={`chatbot-speech-btn ${isSpeaking && activeVoiceMessageId === message.id ? "speaking" : ""}`}
                        onClick={() => {
                          if (isSpeaking && activeVoiceMessageId === message.id) {
                            cancel();
                            setActiveVoiceMessageId(null);
                          } else {
                            speak(message.content);
                            setActiveVoiceMessageId(message.id);
                          }
                        }}
                        title={isSpeaking && activeVoiceMessageId === message.id ? "Stop Speaking" : "Speak Message"}
                      >
                        {isSpeaking && activeVoiceMessageId === message.id ? <FaStop /> : <FaVolumeUp />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="chatbot-message assistant">
                <div className="chatbot-message-bubble typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )
      ) : (
        <div className="chatbot-empty-state">
          <h3>Create a chat</h3>
          <p>Start a new session to talk with Felix AI.</p>
          <button className="chatbot-btn primary" onClick={handleCreateSession}>
            New chat
          </button>
        </div>
      )}
    </section>
  );
}

export default ChatMessages;
