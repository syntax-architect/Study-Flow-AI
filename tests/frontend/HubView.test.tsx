import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HubView } from '../../src/views/HubView';
import '@testing-library/jest-dom';

// Mock motion
jest.mock('motion/react', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: jest.fn().mockResolvedValue('fake-token') }),
  useUser: () => ({ user: { id: 'user-123' } })
}));

// Mock fetch
global.fetch = jest.fn();

describe('HubView', () => {
  const defaultProps = {
    selectedUnitId: 'unit-active',
    onSelectUnit: jest.fn(),
    onNavigateToChatWithQuery: jest.fn(),
    soundEnabled: false,
    onNotify: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ([]) // mock empty data
    });
  });

  it('renders the HubView correctly', async () => {
    render(<HubView {...defaultProps} />);
    
    // It should render the initial loading/header state
    expect(screen.getByText('Active Studies')).toBeInTheDocument();
    expect(screen.getByText(/Honest AI Study Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/for JEE & NEET/i)).toBeInTheDocument();
    
    // Wait for the fetch effects to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2); // One for mastery, one for recommendations
    });
  });

  it('calls onNavigateToChatWithQuery when clicking sample questions', async () => {
    render(<HubView {...defaultProps} />);
    
    const sampleBtns = screen.getAllByRole('button');
    // Just click the first button that might navigate to chat, or look for specific text
    const sampleBtn = screen.getByText(/In-Scope NCERT/i);
    fireEvent.click(sampleBtn);
    
    expect(defaultProps.onNavigateToChatWithQuery).toHaveBeenCalledWith(
      expect.stringContaining('A car of mass 1500 kg drives at 20 m/s')
    );

    // Wait for the fetch effects to settle to avoid act(...) warnings
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
