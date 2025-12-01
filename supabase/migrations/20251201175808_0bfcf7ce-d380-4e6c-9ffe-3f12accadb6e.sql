-- Add email templates to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS email_templates jsonb DEFAULT '{
  "booking_confirmation": {
    "enabled": true,
    "subject": "Booking Confirmation - {property_name}",
    "message": "Dear {guest_name},\n\nThank you for booking {property_name}!\n\nBooking Details:\n- Check-in: {check_in_date} at {check_in_time}\n- Check-out: {check_out_date} at {check_out_time}\n- Guests: {number_of_guests}\n- Total: {total_amount} {currency}\n\nWe look forward to welcoming you!\n\nBest regards,\nYour Host"
  },
  "pre_arrival": {
    "enabled": true,
    "subject": "Your Stay is Coming Up - {property_name}",
    "message": "Hi {guest_name},\n\nYour stay at {property_name} is approaching!\n\nCheck-in Information:\n- Date: {check_in_date}\n- Time: {check_in_time}\n- Address: {property_address}\n\nCheck-in Instructions:\n{check_in_instructions}\n\nIf you have any questions, feel free to reach out.\n\nLooking forward to hosting you!\n\nBest regards,\nYour Host"
  },
  "check_out": {
    "enabled": true,
    "subject": "Check-out Information - {property_name}",
    "message": "Hello {guest_name},\n\nWe hope you enjoyed your stay at {property_name}!\n\nCheck-out Details:\n- Date: {check_out_date}\n- Time: {check_out_time}\n\nPlease ensure:\n- All doors and windows are locked\n- Lights and heating/cooling are turned off\n- Keys are returned as instructed\n\nThank you for staying with us!\n\nBest regards,\nYour Host"
  },
  "thank_you": {
    "enabled": true,
    "subject": "Thank You for Staying with Us!",
    "message": "Dear {guest_name},\n\nThank you for choosing {property_name} for your stay!\n\nWe hope you had a wonderful experience. We would love to hear about your stay and welcome any feedback.\n\nWe hope to see you again soon!\n\nWarm regards,\nYour Host"
  }
}'::jsonb;