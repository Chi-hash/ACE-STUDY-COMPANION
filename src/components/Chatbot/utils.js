export const SESSIONS_KEY = "ace-it-chat-sessions";
export const messagesKey = (sessionId) => `ace-it-chat-messages-${sessionId}`;

export const loadSessions = () => {
    try {
        return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    } catch {
        return [];
    }
};

export const saveSessions = (sessions) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const loadMessages = (sessionId) => {
    try {
        return JSON.parse(localStorage.getItem(messagesKey(sessionId)) || "[]");
    } catch {
        return [];
    }
};

export const saveMessages = (sessionId, messages) => {
    localStorage.setItem(messagesKey(sessionId), JSON.stringify(messages));
};

export const normalizeHistory = (payload) => {
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

export const toLocalDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const getSessionGroups = (sessions) => {
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

export const getResourceId = (doc, index) => {
    const id = doc.id || doc._id || doc.document_id;
    if (id) return id;
    const title = doc.title || doc.name || doc.filename || doc.file_name || doc.originalname;
    return title ? `resource-${title}` : `resource-${index}`;
};

export const getResourceTitle = (doc, index) =>
    doc.title ||
    doc.name ||
    doc.filename ||
    doc.file_name ||
    doc.originalname ||
    doc.original_filename ||
    `Resource ${index + 1}`;

export const getResourceSubject = (doc) => doc.subject || doc.course || "General";

/**
 * Formats selected documents into a concise context string for the AI.
 * Implements head-and-tail slicing and summary prioritization to fit within token limits.
 */
export const formatContext = (selectedDocuments) => {
    if (!selectedDocuments || selectedDocuments.length === 0) return "";

    const MAX_TOTAL_CHARS = 4500; // Aiming for a reasonable chunk of the context window
    const TOTAL_DOCS = selectedDocuments.length;

    // Distribute space roughly equally, but allow for some overhead
    const PER_DOC_LIMIT = Math.floor(MAX_TOTAL_CHARS / TOTAL_DOCS);

    return selectedDocuments
        .map((doc, index) => {
            const title = getResourceTitle(doc, index);
            const subject = getResourceSubject(doc);
            const content = (
                doc.content ||
                doc.text ||
                doc.extracted_text ||
                doc.body ||
                doc.description ||
                doc.summary ||
                ""
            ).trim();
            const summary = (doc.summary || "").trim();

            let displayContent = "";

            if (content.length <= PER_DOC_LIMIT) {
                displayContent = content;
            } else if (summary && summary.length <= PER_DOC_LIMIT) {
                displayContent = `[Summary]: ${summary}`;
            } else {
                // Slicing strategy: 70% from beginning (often intro/def), 30% from end (often conclusion)
                const headChars = Math.floor(PER_DOC_LIMIT * 0.7);
                const tailChars = Math.floor(PER_DOC_LIMIT * 0.25);

                const head = content.slice(0, headChars);
                const tail = content.slice(-tailChars);

                displayContent = `${head}\n\n[... content truncated to fit context window ...]\n\n${tail}`;
            }

            return `SOURCE: ${title} | CATEGORY: ${subject}\nCONTENT:\n${displayContent}`;
        })
        .join("\n\n---\n\n");
};
