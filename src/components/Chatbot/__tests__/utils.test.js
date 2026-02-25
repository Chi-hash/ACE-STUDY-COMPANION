import {
    normalizeHistory,
    getSessionGroups,
    getResourceTitle,
    getResourceSubject,
    formatContext
} from '../utils';

describe('Chatbot Utilities', () => {
    describe('formatContext', () => {
        it('should return an empty string if no documents are provided', () => {
            expect(formatContext([])).toBe('');
            expect(formatContext(null)).toBe('');
        });

        it('should preserve full content for small documents', () => {
            const docs = [{ title: 'Small', content: 'Short text' }];
            const context = formatContext(docs);
            expect(context).toContain('Short text');
            expect(context).not.toContain('[... content truncated');
        });

        it('should prioritize summary if content is too large', () => {
            const largeContent = 'A'.repeat(5000);
            const summary = 'Brief summary';
            const docs = [{ title: 'Large', content: largeContent, summary }];
            // PER_DOC_LIMIT will be 4500 if one doc
            const context = formatContext(docs);
            expect(context).toContain('[Summary]: Brief summary');
        });

        it('should use head-and-tail slicing for very large documents without summaries', () => {
            const largeContent = 'START' + 'A'.repeat(5000) + 'END';
            const docs = [{ title: 'Very Large', content: largeContent }];
            const context = formatContext(docs);
            expect(context).toContain('START');
            expect(context).toContain('END');
            expect(context).toContain('[... content truncated');
        });
    });
    describe('normalizeHistory', () => {
        it('should return an empty array if payload is null', () => {
            expect(normalizeHistory(null)).toEqual([]);
        });

        it('should normalize different history formats into a standard structure', () => {
            const payload = {
                history: [
                    { role: 'user', content: 'Hello', createdAt: '2023-10-01T10:00:00Z' },
                    { sender: 'assistant', message: 'Hi there', created_at: '2023-10-01T10:01:00Z' }
                ]
            };
            const normalized = normalizeHistory(payload);
            expect(normalized).toHaveLength(2);
            expect(normalized[0].role).toBe('user');
            expect(normalized[1].role).toBe('assistant');
            expect(normalized[1].content).toBe('Hi there');
        });

        it('should handle is_user boolean flag', () => {
            const payload = {
                data: [{ is_user: true, text: 'User message' }]
            };
            const normalized = normalizeHistory(payload);
            expect(normalized[0].role).toBe('user');
        });
    });

    describe('getSessionGroups', () => {
        it('should group sessions by date (Today, Yesterday, etc.)', () => {
            const now = new Date();
            const today = now.toISOString();
            const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString();

            const sessions = [
                { id: '1', title: 'Today Chat', createdAt: today },
                { id: '2', title: 'Yesterday Chat', createdAt: yesterday }
            ];

            const groups = getSessionGroups(sessions);
            expect(groups).toHaveLength(2);
            expect(groups[0][0]).toBe('Today');
            expect(groups[1][0]).toBe('Yesterday');
        });
    });

    describe('Resource Helpers', () => {
        it('should get correct resource title', () => {
            expect(getResourceTitle({ title: 'Manual' }, 0)).toBe('Manual');
            expect(getResourceTitle({ filename: 'test.pdf' }, 0)).toBe('test.pdf');
            expect(getResourceTitle({}, 5)).toBe('Resource 6');
        });

        it('should get correct resource subject', () => {
            expect(getResourceSubject({ subject: 'Math' })).toBe('Math');
            expect(getResourceSubject({ course: 'Physics' })).toBe('Physics');
            expect(getResourceSubject({})).toBe('General');
        });
    });
});
