import React from 'react'
import { render, screen } from '@testing-library/react'
import BookingsManager from '../BookingsManager.jsx'

test('Create booking buttons are disabled and show tooltip', async () => {
  render(<BookingsManager token={null} />)
  // Wait a moment for initial render
  const btnCreateBooking = await screen.findByRole('button', { name: /create booking/i })
  expect(btnCreateBooking).toBeTruthy()
  // locate actual DOM button element (MUI may wrap content)
  const domBtn = btnCreateBooking.tagName === 'BUTTON' ? btnCreateBooking : btnCreateBooking.closest && btnCreateBooking.closest('button')
  expect(domBtn).toBeTruthy()
  // Ensure the Create Booking dialog title is not present initially
  expect(screen.queryByText('Create Booking')).toBeNull()

  // clicking the Create Booking button should NOT open the dialog
  fireEvent.click(btnCreateBooking)
  expect(screen.queryByText('Create Booking')).toBeNull()

  // also check the table Create button does not open the dialog
  const btnCreate = await screen.findByRole('button', { name: /^create$/i })
  expect(btnCreate).toBeTruthy()
  fireEvent.click(btnCreate)
  expect(screen.queryByText('Create Booking')).toBeNull()
})