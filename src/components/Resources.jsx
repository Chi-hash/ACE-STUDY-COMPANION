import React, { useMemo, useRef, useState, useEffect } from "react";
import { FaTimes, FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import "../styles/resources.css";
import { libraryAPI, recommendationsAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";

const DEFAULT_TYPES = ["All", "Video", "Article", "PDF", "Document", "Link"];
const DEFAULT_SORT = ["Newest", "Oldest", "A-Z"];
const API_BASE_URL = "https://student-success-backend.onrender.com";
const SUBJECTS_KEY = "ace-it-resource-subjects";
const SUBJECT_MAP_KEY = "ace-it-library-subject-map";

const inferType = (item) => {
  const raw =
    item?.type ||
    item?.file_type ||
    item?.fileType ||
    item?.mime_type ||
    item?.mimeType ||
    item?.category ||
    "";

  const name = String(raw).toLowerCase();
  const title = String(item?.title || item?.name || "");

  if (name.includes("pdf") || title.endsWith(".pdf")) return "PDF";
  if (name.includes("video") || name.includes("mp4") || name.includes("youtube"))
    return "Video";
  if (name.includes("article")) return "Article";
  if (name.includes("link")) return "Link";
  if (name.includes("doc") || name.includes("word") || title.endsWith(".docx"))
    return "Document";

  return "Document";
};

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeUrl = (value) => {
  if (!value) return "";
  const stringValue = String(value);
  if (stringValue.startsWith("http")) return stringValue;
  return `${API_BASE_URL}${stringValue.startsWith("/") ? "" : "/"}${stringValue}`;
};

const getTitleFromDocument = (doc) => {
  const blockedTitles = new Set([
    "files",
    "file",
    "document",
    "documents",
    "untitled",
    "untitled document",
  ]);

  const nestedFile =
    doc?.file ||
    doc?.document ||
    doc?.doc ||
    (Array.isArray(doc?.files) ? doc.files[0] : null) ||
    null;

  const rawUrl =
    doc.url ||
    doc.file_url ||
    doc.fileUrl ||
    doc.link ||
    doc.download_url ||
    doc.downloadUrl ||
    doc.file_path ||
    doc.filePath ||
    doc.path ||
    nestedFile?.url ||
    nestedFile?.file_url ||
    nestedFile?.filePath ||
    nestedFile?.path ||
    "";

  const urlName = rawUrl
    ? decodeURIComponent(String(rawUrl).split("?")[0]).split("/").pop()
    : "";

  // Priority list of candidates
  const candidates = [
    doc.title,
    doc.name,
    doc.original_filename,
    doc.originalname,
    doc.filename,
    doc.file_name,
    doc.fileName,
    doc.file?.name,
    doc.file?.filename,
    doc.file?.originalname,
    doc.document?.filename,
    doc.document?.originalname,
    nestedFile?.name,
    nestedFile?.filename,
    nestedFile?.originalname,
    urlName,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleanBox = String(candidate).trim();
    if (!cleanBox) continue;
    const normalized = cleanBox.toLowerCase();
    
    if (!blockedTitles.has(normalized)) {
      return cleanBox;
    }
  }

  return "Untitled Resource";
};

const getSubjectFromDocument = (doc) => {
  return (
    doc.subject ||
    doc.course ||
    doc.metadata?.subject ||
    doc.meta?.subject ||
    doc.document?.subject ||
    doc.file?.subject ||
    (Array.isArray(doc.tags) ? doc.tags[0] : null) ||
    doc.category ||
    "General"
  );
};

const loadSubjectMap = () => {
  try {
    return JSON.parse(localStorage.getItem(SUBJECT_MAP_KEY) || "{}");
  } catch {
    return {};
  }
};

const persistSubjectMap = (map) => {
  localStorage.setItem(SUBJECT_MAP_KEY, JSON.stringify(map));
};

export function Resources() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [activeTab, setActiveTab] = useState("library");
  const [documents, setDocuments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectMode, setSubjectMode] = useState("existing");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [subjectMap, setSubjectMap] = useState(loadSubjectMap());
  const [previewResource, setPreviewResource] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadSaved = () => {
      try {
        return JSON.parse(localStorage.getItem("ace-it-resources") || "[]");
      } catch {
        return [];
      }
    };

    const loadResources = async () => {
      setIsLoading(true);
      setError("");

      try {
        const uid = auth.currentUser?.uid;
        const [docsResult, recsResult] = await Promise.allSettled([
          uid ? libraryAPI.getDocuments(uid) : Promise.resolve({ documents: [] }),
          recommendationsAPI.getRecommendations(),
        ]);

        const docPayload =
          docsResult.status === "fulfilled" ? docsResult.value : {};
        const recPayload =
          recsResult.status === "fulfilled" ? recsResult.value : {};

        setDocuments(docPayload.documents || docPayload.library || []);
        setRecommendations(recPayload.recommendations || []);
        setSavedResources(loadSaved());

        const flashcardSubjects = new Set();
        try {
          const savedFlashcards = JSON.parse(
            localStorage.getItem("ace-it-flashcards") || "[]",
          );
          savedFlashcards.forEach((card) => {
            if (card?.subject) flashcardSubjects.add(card.subject);
          });
        } catch {
          // no-op
        }

        const storedSubjects = new Set(loadSaved().map((item) => item.subject));
        const existingSubjects = new Set([
          ...flashcardSubjects,
          ...storedSubjects,
        ]);

        try {
          const storedResourceSubjects = JSON.parse(
            localStorage.getItem(SUBJECTS_KEY) || "[]",
          );
          storedResourceSubjects.forEach((s) => existingSubjects.add(s));
        } catch {
          // no-op
        }

        const options = Array.from(existingSubjects)
          .filter((s) => s && s !== "General")
          .sort((a, b) => a.localeCompare(b));
        if (!options.length) {
          options.push("General");
        }
        setSubjectOptions(options);
        if (!selectedSubject && options.length) {
          setSelectedSubject(options[0]);
        }
      } catch (err) {
        console.error("Error loading resources:", err);
        setError("Failed to load resources. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadResources();
  }, []);

  const normalizedLibrary = useMemo(
    () =>
      documents.map((doc, index) => ({
        id: doc.id || doc._id || doc.document_id || `doc-${index}`,
        title: getTitleFromDocument(doc) || "Untitled document",
        description: doc.description || doc.summary || "",
        subject:
          subjectMap[doc.id || doc._id || doc.document_id] ||
          subjectMap[getTitleFromDocument(doc)] ||
          getSubjectFromDocument(doc),
        duration: doc.duration || doc.read_time || "—",
        type: inferType(doc),
        url: normalizeUrl(
          doc.url ||
            doc.file_url ||
            doc.fileUrl ||
            doc.link ||
            doc.download_url ||
            doc.downloadUrl ||
            doc.file_path ||
            doc.filePath ||
            doc.path ||
            doc.file?.url ||
            doc.file?.file_url ||
            doc.file?.filePath ||
            doc.file?.path ||
            doc.document?.url ||
            doc.document?.file_url ||
            doc.document?.filePath ||
            doc.document?.path ||
            (Array.isArray(doc.files) ? doc.files[0]?.url : "") ||
            (Array.isArray(doc.files) ? doc.files[0]?.file_url : "") ||
            "",
        ),
        createdAt:
          normalizeDate(doc.createdAt || doc.created_at || doc.uploaded_at) ||
          null,
        source: "Library",
      })),
    [documents],
  );

  const normalizedRecs = useMemo(
    () =>
      recommendations.map((rec, index) => ({
        id: rec.id || `rec-${index}`,
        title: rec.title || rec.name || "Recommended resource",
        description: rec.reason || rec.description || "",
        subject: rec.subject || rec.topic || "Recommended",
        duration: rec.duration || rec.length || "—",
        type: inferType(rec),
        url: rec.url || rec.link || "",
        createdAt: normalizeDate(rec.createdAt || rec.created_at) || null,
        source: rec.source || "Recommended",
      })),
    [recommendations],
  );

  const normalizedSaved = useMemo(
    () =>
      savedResources.map((item, index) => ({
        id: item.id || `saved-${index}`,
        title: item.title || "Saved resource",
        description: item.description || "",
        subject: item.subject || "General",
        duration: item.duration || "—",
        type: inferType(item),
        url: item.url || "",
        createdAt: normalizeDate(item.createdAt) || null,
        source: item.source || "Saved",
      })),
    [savedResources],
  );

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sourceItems =
      activeTab === "library"
        ? normalizedLibrary
        : activeTab === "saved"
          ? normalizedSaved
          : normalizedRecs;

    let items = sourceItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.title?.toLowerCase().includes(normalizedQuery) ||
        item.subject?.toLowerCase().includes(normalizedQuery) ||
        item.description?.toLowerCase().includes(normalizedQuery);
      const matchesType =
        typeFilter === "All" ||
        item.type?.toLowerCase() === typeFilter.toLowerCase();
      return matchesQuery && matchesType;
    });

    if (sortOrder === "A-Z") {
      items = items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortOrder === "Oldest") {
      items = items.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      );
    } else {
      items = items.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
    }

    return items;
  }, [
    activeTab,
    normalizedLibrary,
    normalizedRecs,
    normalizedSaved,
    query,
    typeFilter,
    sortOrder,
  ]);

  const groupedResources = useMemo(() => {
    const groups = new Map();
    filteredResources.forEach((resource) => {
      const subject = resource.subject || "General";
      if (!groups.has(subject)) {
        groups.set(subject, []);
      }
      groups.get(subject).push(resource);
    });

    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [filteredResources]);

  const handleUploadClick = () => {
    setShowSubjectModal(true);
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPendingFiles(files);
  };

  const handleSaveResource = (resource) => {
    const existing = savedResources.some(
      (item) => item.id === resource.id || item.url === resource.url,
    );
    if (existing) return;

    const updated = [
      ...savedResources,
      {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        subject: resource.subject,
        duration: resource.duration,
        type: resource.type,
        url: resource.url,
        createdAt: resource.createdAt || new Date().toISOString(),
        source: resource.source,
      },
    ];
    setSavedResources(updated);
    localStorage.setItem("ace-it-resources", JSON.stringify(updated));
    setActiveTab("saved");
  };

  const handleDeleteDocument = async (docId, title) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !docId) return;

    setDeletingId(docId);
    setError("");

    const previousDocs = documents;
    setDocuments((prev) => prev.filter((doc) => (doc.id || doc._id || doc.document_id) !== docId));

    try {
      await libraryAPI.deleteDocument(uid, docId);
      const updatedMap = { ...subjectMap };
      delete updatedMap[docId];
      if (title) {
        delete updatedMap[title];
      }
      setSubjectMap(updatedMap);
      persistSubjectMap(updatedMap);
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete document. Please try again.");
      setDocuments(previousDocs);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFiles.length) {
      setShowSubjectModal(false);
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError("Please log in to upload documents.");
      return;
    }

    const subject =
      subjectMode === "new" && newSubjectName.trim()
        ? newSubjectName.trim()
        : selectedSubject || "General";

    if (subjectMode === "new" && newSubjectName.trim()) {
      const stored = new Set(subjectOptions);
      stored.add(newSubjectName.trim());
      const updatedSubjects = Array.from(stored).sort((a, b) =>
        a.localeCompare(b),
      );
      setSubjectOptions(updatedSubjects);
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
      setSelectedSubject(newSubjectName.trim());
      setNewSubjectName("");
      setSubjectMode("existing");
    }

    setUploading(true);
    setError("");

    try {
      const optimisticDocs = pendingFiles.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        title: file.name, // Explicitly use file.name
        name: file.name, // Backup
        filename: file.name, // Backup
        subject,
        type: "Document", // Default type
        file_type: file.type,
        created_at: new Date().toISOString(),
        file_url: "",
      }));

      setDocuments((prev) => [...optimisticDocs, ...prev]);
      
      // Upload files individually to ensure titles are preserved
      await Promise.all(
        pendingFiles.map((file) =>
          libraryAPI.uploadDocuments(uid, [file], file.name)
        )
      );

      const refreshed = await libraryAPI.getDocuments(uid);
      const refreshedDocs = refreshed.documents || refreshed.library || [];

      const updatedMap = { ...subjectMap };
      pendingFiles.forEach((file) => {
        updatedMap[file.name] = subject;
      });
      refreshedDocs.forEach((doc) => {
        const docId = doc.id || doc._id || doc.document_id;
        const title = getTitleFromDocument(doc);
        if (docId && updatedMap[title]) {
          updatedMap[docId] = updatedMap[title];
        }
      });
      setSubjectMap(updatedMap);
      persistSubjectMap(updatedMap);

      setDocuments(refreshedDocs);
      setActiveTab("library");
      setShowSubjectModal(false);
      setPendingFiles([]);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="resources-page">
      <header className="resources-header">
        <div className="resources-header-text">
          <h2>Resources</h2>
          <p>
            Curate study materials, organize by subject, and return anytime.
          </p>
        </div>
        <div className="resources-actions">
          <button
            className="resources-btn outline"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
          <button
            className="resources-btn primary"
            onClick={() => setActiveTab("saved")}
          >
            View Saved
          </button>
        </div>
      </header>

      {showSubjectModal && (
        <div className="resources-modal-backdrop">
          <div className="resources-modal">
            <div className="resources-modal-header">
              <h3>Choose a subject</h3>
              <p>Assign these uploads to a subject.</p>
            </div>
            <div className="resources-modal-body">
              <div className="resources-modal-upload">
                <button
                  className="resources-btn outline"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={uploading}
                >
                  Select files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="resources-hidden-input"
                  multiple
                  onChange={handleUploadFiles}
                />
              </div>
              <div className="resources-modal-toggle">
                <button
                  className={`resources-toggle-btn ${
                    subjectMode === "existing" ? "active" : ""
                  }`}
                  onClick={() => setSubjectMode("existing")}
                >
                  Existing
                </button>
                <button
                  className={`resources-toggle-btn ${
                    subjectMode === "new" ? "active" : ""
                  }`}
                  onClick={() => setSubjectMode("new")}
                >
                  New
                </button>
              </div>

              {subjectMode === "existing" ? (
                <select
                  className="resources-modal-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="resources-modal-input"
                  type="text"
                  placeholder="New subject name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
              )}

              <div className="resources-modal-files">
                {pendingFiles.length === 0 ? (
                  <span className="resources-file-empty">
                    No files selected yet.
                  </span>
                ) : (
                  pendingFiles.map((file) => (
                    <span key={file.name} className="resources-file-pill">
                      {file.name}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="resources-modal-actions">
              <button
                className="resources-btn outline"
                onClick={() => {
                  setShowSubjectModal(false);
                  setPendingFiles([]);
                }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                className="resources-btn primary"
                onClick={handleConfirmUpload}
                disabled={uploading || pendingFiles.length === 0}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="resources-overview">
        <div className="resources-overview-card">
          <p>Library</p>
          <h3>{normalizedLibrary.length}</h3>
        </div>
        <div className="resources-overview-card">
          <p>Saved</p>
          <h3>{normalizedSaved.length}</h3>
        </div>
        <div className="resources-overview-card">
          <p>Recommended</p>
          <h3>{normalizedRecs.length}</h3>
        </div>
      </section>

      <section className="resources-controls">
        <div className="resources-search">
          <input
            type="text"
            placeholder="Search resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="resources-filters">
          <div className="resources-tabs">
            {[
              { id: "library", label: "My Library" },
              { id: "recommended", label: "Recommended" },
              { id: "saved", label: "Saved" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`resources-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {DEFAULT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            {DEFAULT_SORT.map((sort) => (
              <option key={sort} value={sort}>
                {sort}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="resources-grid">
        {isLoading ? (
          <div className="resources-empty">
            <h3>Loading resources...</h3>
            <p>Fetching your latest materials.</p>
          </div>
        ) : error ? (
          <div className="resources-empty">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button
              className="resources-btn primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="resources-empty">
            <h3>No resources yet</h3>
            <p>Add your first resource to build your library.</p>
            <button className="resources-btn primary" onClick={handleUploadClick}>
              Upload Resource
            </button>
          </div>
        ) : (
          <div className="resources-subjects">
            {groupedResources.map(([subject, resources]) => (
              <div key={subject} className="resources-subject-group">
                <div className="resources-subject-header">
                  <h3>{subject}</h3>
                  <span>{resources.length} items</span>
                </div>
                <div className="resources-subject-grid">
                  {resources.map((resource) => (
                    <article key={resource.id} className="resource-card">
                      <div className="resource-card-header">
                        <span className="resource-type">
                          {resource.type || "Document"}
                        </span>
                        <span className="resource-date">
                          {resource.createdAt
                            ? new Date(resource.createdAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                      <h3>{resource.title || "Untitled resource"}</h3>
                      <p>{resource.description || "No description yet."}</p>
                      <div className="resource-meta">
                        <span>{resource.subject || "General"}</span>
                        <span>{resource.duration || "—"}</span>
                      </div>
                      <div className="resource-actions">
                <button
                  className="resources-btn ghost"
                  onClick={() => {
                    if (!resource.url) {
                      setError("No file link available for this resource yet.");
                      return;
                    }
                    setPreviewResource(resource);
                  }}
                >
                  View
                </button>
                        {activeTab !== "saved" && (
                          <button
                            className="resources-btn outline"
                            onClick={() => handleSaveResource(resource)}
                          >
                            Save
                          </button>
                        )}
                        {activeTab === "library" && (
                          <button
                            className="resources-btn danger"
                            onClick={() =>
                              handleDeleteDocument(resource.id, resource.title)
                            }
                            disabled={deletingId === resource.id}
                          >
                            {deletingId === resource.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resource Preview Modal */}
      {previewResource && (
        <div className="resource-preview-overlay" onClick={() => setPreviewResource(null)}>
          <div className="resource-preview-header" onClick={(e) => e.stopPropagation()}>
            <h3 className="resource-preview-title">{previewResource.title}</h3>
            <button className="resource-preview-close" onClick={() => setPreviewResource(null)}>
              <FaTimes />
            </button>
          </div>
          <div className="resource-preview-content" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const url = previewResource.url;
              const type = previewResource.type?.toLowerCase();
              const extension = url.split('.').pop().toLowerCase().split('?')[0];
              
              const isImage = type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
              const isVideo = type === 'video' || ['mp4', 'webm', 'ogg'].includes(extension);
              const isPdf = type === 'pdf' || extension === 'pdf';
              const isOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension);

              if (isImage) {
                return (
                  <img src={url} alt={previewResource.title} className="resource-preview-image" />
                );
              } else if (isVideo) {
                 return (
                  <video controls className="resource-preview-video">
                    <source src={url} />
                    Your browser does not support the video tag.
                  </video>
                );
              } else if (isPdf) {
                 return (
                  <iframe src={url} title={previewResource.title} className="resource-preview-frame" />
                );
              } else if (isOffice) {
                return (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                    title={previewResource.title} 
                    className="resource-preview-frame" 
                  />
                );
              } else {
                return (
                  <div className="resource-preview-unsupported">
                    <p>This file type cannot be previewed directly.</p>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="resource-preview-download-btn"
                    >
                      <FaDownload style={{ marginRight: '0.5rem' }} />
                      Download File
                    </a>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Resources;
