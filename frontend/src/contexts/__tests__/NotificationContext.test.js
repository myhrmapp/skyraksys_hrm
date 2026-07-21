import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { NotificationProvider, useNotifications } from '../NotificationContext';

const TestConsumer = () => {
  const { notifications, showInfo } = useNotifications();

  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      <button onClick={() => showInfo('hello notification')}>Show</button>
    </div>
  );
};

describe('NotificationContext', () => {
  it('tracks notifications in the shared notification store', async () => {
    render(
      <SnackbarProvider>
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Show'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count').textContent).toBe('1');
    });
  });
});
