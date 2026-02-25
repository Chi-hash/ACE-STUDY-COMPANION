import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../ChatInput';

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaImage: () => <span data-testid="fa-image" />,
  FaPaperclip: () => <span data-testid="fa-paperclip" />,
  FaMicrophone: () => <span data-testid="fa-microphone" />,
  FaPaperPlane: () => <span data-testid="fa-paper-plane" />,
  FaStop: () => <span data-testid="fa-stop" />,
}));

// Mock useSpeechRecognition
/* global vi */
vi.mock('../../../hooks/useSpeechRecognition', () => ({
  default: vi.fn(() => ({
    isListening: false,
    transcript: '',
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
  })),
}));

import useSpeechRecognition from '../../../hooks/useSpeechRecognition';

describe('ChatInput', () => {
  const mockSetInput = vi.fn();
  const mockHandleSend = vi.fn();
  const mockHandleKeyDown = vi.fn();
  const mockHandleAddAttachments = vi.fn();
  const mockHandleRemoveAttachment = vi.fn();
  const textareaRef = { current: null };
  const imageInputRef = { current: null };
  const fileInputRef = { current: null };

  const defaultProps = {
    input: '',
    setInput: mockSetInput,
    isSending: false,
    activeSessionId: '1',
    handleSend: mockHandleSend,
    handleKeyDown: mockHandleKeyDown,
    attachments: [],
    handleAddAttachments: mockHandleAddAttachments,
    handleRemoveAttachment: mockHandleRemoveAttachment,
    imageInputRef,
    fileInputRef,
    textareaRef,
  };

  it('renders correctly', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Message Assistant...')).toBeDefined();
    expect(screen.getByTestId('fa-image')).toBeDefined();
    expect(screen.getByTestId('fa-paperclip')).toBeDefined();
  });

  it('calls setInput on textarea change', () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Message Assistant...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(mockSetInput).toHaveBeenCalledWith('Hello');
  });

  it('calls handleSend on form submit', () => {
    render(<ChatInput {...defaultProps} input="Hello" />);
    const form = screen.getByPlaceholderText('Message Assistant...').closest('form');
    fireEvent.submit(form);
    expect(mockHandleSend).toHaveBeenCalled();
  });

  it('disables send button when input is empty and no attachments', () => {
    //@ts-ignore
    render(<ChatInput {...defaultProps} input="" attachments={[]} />);
    const sendButton = screen.getByTestId('fa-paper-plane').parentElement;
    expect(sendButton.disabled).toBe(true);
  });

  it('renders attachments correctly', () => {
    const attachments = [{ id: '1', name: 'image.png' }];
    render(<ChatInput {...defaultProps} attachments={attachments} />);
    expect(screen.getByText('image.png')).toBeDefined();
  });

  it('calls handleRemoveAttachment when attachment chip button is clicked', () => {
    const attachments = [{ id: '1', name: 'image.png' }];
    render(<ChatInput {...defaultProps} attachments={attachments} />);
    const removeButton = screen.getByLabelText('Remove image.png');
    fireEvent.click(removeButton);
    expect(mockHandleRemoveAttachment).toHaveBeenCalledWith('1');
  });
});
