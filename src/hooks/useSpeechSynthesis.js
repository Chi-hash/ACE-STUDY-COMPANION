import { useState, useCallback, useEffect } from 'react';

/**
 * useSpeechSynthesis - A hook for Text-to-Speech using window.speechSynthesis.
 */
export const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setSupported(true);
        }
    }, []);

    const cancel = useCallback(() => {
        if (!supported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [supported]);

    const speak = useCallback((text) => {
        if (!supported || !text) return;

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis error:', event);
            setIsSpeaking(false);
        };

        // Optional: Customize voice, pitch, and rate if needed
        // const voices = window.speechSynthesis.getVoices();
        // utterance.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    }, [supported]);

    return {
        isSpeaking,
        supported,
        speak,
        cancel
    };
};

export default useSpeechSynthesis;
