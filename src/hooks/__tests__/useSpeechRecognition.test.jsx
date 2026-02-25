import { renderHook, act } from '@testing-library/react';
import useSpeechRecognition from '../useSpeechRecognition';

/* global describe, it, expect, vi, beforeEach */

describe('useSpeechRecognition', () => {
    let MockSpeechRecognition;

    beforeEach(() => {
        vi.clearAllMocks();

        MockSpeechRecognition = vi.fn().mockImplementation(function() {
            return {
                start: vi.fn(),
                stop: vi.fn(),
                continuous: false,
                interimResults: false,
                lang: 'en-US',
                onstart: null,
                onresult: null,
                onerror: null,
                onend: null,
            };
        });

        window.SpeechRecognition = MockSpeechRecognition;
        window.webkitSpeechRecognition = MockSpeechRecognition;
    });

    it('initializes correctly', () => {
        const { result } = renderHook(() => useSpeechRecognition());
        expect(result.current.isListening).toBe(false);
        expect(result.current.transcript).toBe('');
        expect(result.current.error).toBe(null);
    });

    it('starts and stops listening', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
            result.current.startListening();
        });

        // Manually trigger the onstart event
        const recognitionInstance = MockSpeechRecognition.mock.results[0].value;
        act(() => {
            recognitionInstance.onstart();
        });

        expect(result.current.isListening).toBe(true);

        act(() => {
            result.current.stopListening();
        });

        act(() => {
            recognitionInstance.onend();
        });

        expect(result.current.isListening).toBe(false);
    });

    it('handles errors', () => {
        const { result } = renderHook(() => useSpeechRecognition());

        act(() => {
            result.current.startListening();
        });

        const recognitionInstance = MockSpeechRecognition.mock.results[0].value;
        act(() => {
            recognitionInstance.onerror({ error: 'not-allowed' });
        });

        expect(result.current.error).toBe('not-allowed');
        expect(result.current.isListening).toBe(false);
    });
});
