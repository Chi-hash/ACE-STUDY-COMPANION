import React from "react";
import { FaBook } from "react-icons/fa";
import { getResourceId } from "./utils";

const getResourceTitle = (doc, index) =>
  doc.title ||
  doc.name ||
  doc.filename ||
  doc.file_name ||
  doc.originalname ||
  doc.original_filename ||
  `Resource ${index + 1}`;

const getResourceSubject = (doc) => doc.subject || doc.course || "General";

export function ResourcePicker({
  showResourcePicker,
  setShowResourcePicker,
  selectedResourceIds,
  setSelectedResourceIds,
  documents,
}) {
  return (
    <div className="chatbot-resources">
      <div className="chatbot-resources-header">
        <button
          className={`chatbot-btn resource-btn ${showResourcePicker ? "active" : ""}`}
          onClick={() => setShowResourcePicker((prev) => !prev)}
          title={showResourcePicker ? "Hide resources" : "Use resources"}
        >
          <FaBook />
          <span>Resources</span>
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
  );
}

export default ResourcePicker;
