# Pre-Check-in Reminders

This edge function prepares and sends pre-check-in reminder emails 24 hours before guest arrival.

## Features

- Automatically runs every 15 minutes via pg_cron
- Calculates driving distance and time from nearest major city
- Generates personalized emails with:
  - Property details and dates
  - Google Maps & Apple Maps directions
  - Check-in time and instructions
  - Host contact information
- Caches travel calculations for 24 hours
- Idempotent (won't send duplicates)

## Email Integration

Currently, the function **prepares** email data but doesn't send emails. To enable actual email delivery, integrate your preferred provider:

### Option 1: Add SMTP credentials
Set environment variables and use nodemailer or similar.

### Option 2: Integrate with your email service
Add API calls to SendGrid, Postmark, Mailgun, etc.

### Option 3: Use Supabase Auth emails
Configure custom SMTP in Supabase Auth settings.

## Testing

To test locally:
```bash
supabase functions serve send-precheckin-reminders
```

Then trigger manually:
```bash
curl -X POST http://localhost:54321/functions/v1/send-precheckin-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Database Tables

- `bookings.pre_checkin_reminder_sent_at` - Timestamp when reminder was sent
- `properties.pre_checkin_reminder_enabled` - Toggle per property
- `properties.pre_checkin_send_time` - Custom send time (default 09:00)
- `property_travel_cache` - 24h cache for distance/time calculations
