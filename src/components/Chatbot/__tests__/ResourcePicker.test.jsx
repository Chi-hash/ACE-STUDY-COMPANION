import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResourcePicker from '../ResourcePicker';

// Mock react-icons
/* global vi */
vi.mock('react-icons/fa', () => ({
  FaBook: () => <span data-testid="fa-book" />,
}));

describe('ResourcePicker', () => {
  const mockDocuments = [
    { id: '1', title: 'Doc 1', subject: 'Math' },
    { id: '2', filename: 'doc2.pdf', subject: 'Physics' },
  ];
  const mockSetSelectedResourceIds = vi.fn();
  const mockSetShowResourcePicker = vi.fn();

  const defaultProps = {
    showResourcePicker: false,
    setShowResourcePicker: mockSetShowResourcePicker,
    selectedResourceIds: [],
    setSelectedResourceIds: mockSetSelectedResourceIds,
    documents: mockDocuments,
  };

  it('renders the toggle button', () => {
    render(<ResourcePicker {...defaultProps} />);
    expect(screen.getByText('Resources')).toBeDefined();
    expect(screen.getByTestId('fa-book')).toBeDefined();
  });

  it('calls setShowResourcePicker when toggle button is clicked', () => {
    render(<ResourcePicker {...defaultProps} />);
    const button = screen.getByText('Resources').closest('button');
    fireEvent.click(button);
    expect(mockSetShowResourcePicker).toHaveBeenCalled();
  });

  it('renders the list when showResourcePicker is true', () => {
    render(<ResourcePicker {...defaultProps} showResourcePicker={true} />);
    expect(screen.getByText('Doc 1')).toBeDefined();
    expect(screen.getByText('doc2.pdf')).toBeDefined();
    expect(screen.getByText('Math')).toBeDefined();
    expect(screen.getByText('Physics')).toBeDefined();
  });

  it('calls setSelectedResourceIds when a resource is clicked', () => {
    render(<ResourcePicker {...defaultProps} showResourcePicker={true} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(mockSetSelectedResourceIds).toHaveBeenCalled();
  });

  it('shows empty message when no documents exist', () => {
    render(<ResourcePicker {...defaultProps} showResourcePicker={true} documents={[]} />);
    expect(screen.getByText('No resources found in your library yet.')).toBeDefined();
  });

  it('shows selected count when resources are selected', () => {
    render(<ResourcePicker {...defaultProps} selectedResourceIds={['1', '2']} />);
    expect(screen.getByText('2 selected')).toBeDefined();
  });
});
