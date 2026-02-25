import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatSidebar from '../ChatSidebar';

// Mock react-icons
/* global vi */
vi.mock('react-icons/fa', () => ({
  FaTimes: () => <span data-testid="fa-times" />,
  FaEdit: () => <span data-testid="fa-edit" />,
  FaTrashAlt: () => <span data-testid="fa-trash" />,
  FaCheck: () => <span data-testid="fa-check" />,
}));

describe('ChatSidebar', () => {
  const mockSessions = [
    { id: '1', title: 'Test Chat 1', createdAt: new Date().toISOString() },
    { id: '2', title: 'Test Chat 2', createdAt: new Date().toISOString() },
  ];
  const mockGroupedSessions = [['Today', mockSessions]];
  const mockSetActiveSessionId = vi.fn();
  const mockHandleCreateSession = vi.fn();
  const mockSetShowMobileSidebar = vi.fn();
  const mockHandleDeleteSession = vi.fn();
  const mockHandleRenameSession = vi.fn();

  const defaultProps = {
    sessions: mockSessions,
    activeSessionId: '1',
    setActiveSessionId: mockSetActiveSessionId,
    handleCreateSession: mockHandleCreateSession,
    handleDeleteSession: mockHandleDeleteSession,
    handleRenameSession: mockHandleRenameSession,
    showMobileSidebar: false,
    setShowMobileSidebar: mockSetShowMobileSidebar,
    groupedSessions: mockGroupedSessions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders correctly with sessions', () => {
    render(<ChatSidebar {...defaultProps} />);
    expect(screen.getByText('Felix AI')).toBeDefined();
    expect(screen.getByText('Test Chat 1')).toBeDefined();
    expect(screen.getByText('Test Chat 2')).toBeDefined();
  });

  it('calls setActiveSessionId and closes mobile sidebar on session click', () => {
    render(<ChatSidebar {...defaultProps} />);
    const sessionItem = screen.getByText('Test Chat 2').closest('.chatbot-session-item');
    fireEvent.click(sessionItem);
    expect(mockSetActiveSessionId).toHaveBeenCalledWith('2');
    expect(mockSetShowMobileSidebar).toHaveBeenCalledWith(false);
  });

  it('enters edit mode when edit button is clicked', () => {
    render(<ChatSidebar {...defaultProps} />);
    const editButton = screen.getAllByTestId('fa-edit')[0].closest('button');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('Test Chat 1');
    expect(input).toBeDefined();
  });

  it('calls handleRenameSession when rename is saved', () => {
    render(<ChatSidebar {...defaultProps} />);
    const editButton = screen.getAllByTestId('fa-edit')[0].closest('button');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('Test Chat 1');
    fireEvent.change(input, { target: { value: 'New Name' } });
    
    const checkButton = screen.getByTestId('fa-check').closest('button');
    fireEvent.click(checkButton);
    
    expect(mockHandleRenameSession).toHaveBeenCalledWith('1', 'New Name');
  });

  it('calls handleDeleteSession when delete button is clicked and confirmed', () => {
    render(<ChatSidebar {...defaultProps} />);
    const deleteButton = screen.getAllByTestId('fa-trash')[0].closest('button');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandleDeleteSession).toHaveBeenCalledWith('1');
  });

  it('does not call handleDeleteSession when delete is cancelled', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<ChatSidebar {...defaultProps} />);
    const deleteButton = screen.getAllByTestId('fa-trash')[0].closest('button');
    fireEvent.click(deleteButton);
    
    expect(mockHandleDeleteSession).not.toHaveBeenCalled();
  });

  it('calls handleCreateSession on new chat button click', () => {
    render(<ChatSidebar {...defaultProps} />);
    const newChatButton = screen.getByText('+ New chat');
    fireEvent.click(newChatButton);
    expect(mockHandleCreateSession).toHaveBeenCalled();
  });

  it('shows empty message when no sessions exist', () => {
    render(<ChatSidebar {...defaultProps} sessions={[]} groupedSessions={[]} />);
    expect(screen.getByText('No chats yet.')).toBeDefined();
  });
});
