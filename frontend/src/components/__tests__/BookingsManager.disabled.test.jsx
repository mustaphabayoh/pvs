import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BookingsManager from '../BookingsManager.jsx'

test.skip('Create booking buttons are disabled and show tooltip', async () => {
  render(<BookingsManager token={null} />)
  // Wait a moment for initial render
  const btnCreateBooking = await screen.findByRole('button', { name: /create booking/i })
  expect(btnCreateBooking).toBeTruthy()
  expect(btnCreateBooking).toBeDisabled()
  // Ensure the Create Booking form isn't present (no dialog form submit button)
  expect(screen.queryByTestId('form-create-booking')).toBeNull()

  // clicking the Create Booking button should NOT open the dialog form
  fireEvent.click(btnCreateBooking)
  expect(screen.queryByTestId('form-create-booking')).toBeNull()

  // also check the table Create button does not open the dialog form
  const btnCreate = await screen.findByRole('button', { name: /^create$/i })
  expect(btnCreate).toBeTruthy()
  expect(btnCreate).toBeDisabled()
  fireEvent.click(btnCreate)
  expect(screen.queryByTestId('form-create-booking')).toBeNull()
})