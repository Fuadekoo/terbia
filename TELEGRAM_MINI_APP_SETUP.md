# Telegram Mini App Integration Setup

This document explains how to set up and use the Telegram Mini App integration for your Tarbia project.

## Overview

The integration allows students to access their courses directly through a Telegram Mini App, with automatic user authentication and course redirection.

## Files Created/Modified

### 1. `miniBot.ts`

- Standalone Telegram bot for Mini App functionality
- Retrieves raw init data from Telegram
- Creates web app buttons with student-specific URLs

### 2. `app/api/telegram/validate/route.ts`

- API endpoint to validate Telegram init data
- Extracts user information from init data
- Returns validated user data

### 3. `app/api/student/[wdt_ID]/route.ts`

- API endpoint to fetch student data
- Returns student information with active package details

### 4. `app/[lang]/(user)/student/[wdt_ID]/page.tsx`

- Updated student page to handle Telegram init data
- Validates user data and redirects to active course
- Shows loading states and error handling

### 5. `bot.ts`

- Updated main bot to use Telegram Mini App approach
- Simplified start command for students

## How It Works

1. **Student clicks /start in Telegram**

   - Bot retrieves raw init data using `retrieveRawInitData()`
   - Finds student in database by chat_id
   - Creates web app URL with init data as query parameter

2. **Student clicks web app button**

   - Opens student page with init data
   - Page validates init data via API
   - Fetches student data from database
   - Redirects to active course/chapter

3. **Data Flow**
   ```
   Telegram Bot → Web App → API Validation → Student Data → Course Redirect
   ```

## Setup Instructions

### 1. Environment Variables

Make sure you have these environment variables set:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
FORWARD_URL=your_domain_url
# or
AUTH_URL=your_domain_url
```

### 2. Install Dependencies

The required packages are already in your `package.json`:

- `@tma.js/sdk`

### 3. Start the Services

#### Start Next.js Server

```bash
npm run dev
```

#### Start Telegram Bot

```bash
# In your bot startup file, import and start the mini bot
import { startMiniBot } from './miniBot';

// Start the mini bot
startMiniBot();
```

### 4. Test the Integration

Run the test script:

```bash
node test-telegram-integration.js
```

## Usage

### For Students

1. Open Telegram and find your bot
2. Send `/start` command
3. Click the web app button that appears
4. The app will open and redirect to your active course

### For Admins

- Admins still get the admin panel when using `/start`
- All existing admin functionality remains unchanged

## API Endpoints

### POST `/api/telegram/validate`

Validates Telegram init data and returns user information.

**Request:**

```json
{
  "initData": "user=...&chat_instance=...&auth_date=..."
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "language_code": "en",
    "is_premium": false,
    "allows_write_to_pm": true
  }
}
```

### GET `/api/student/[wdt_ID]`

Fetches student data by student ID.

**Response:**

```json
{
  "wdt_ID": 123,
  "name": "Student Name",
  "subject": "Quran",
  "package": "Basic",
  "isKid": false,
  "activePackage": {
    "id": "package_id",
    "name": "Package Name",
    "courses": [...]
  }
}
```

## Troubleshooting

### Common Issues

1. **"No Telegram init data provided"**

   - Make sure the web app is opened from Telegram
   - Check that the bot is properly configured

2. **"Student not found or inactive"**

   - Verify the student exists in the database
   - Check the student's status is "Active", "Not yet", or "On progress"

3. **"No active course found"**
   - Ensure the student has an active package assigned
   - Check that the package has published courses

### Debug Steps

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database for student data
4. Test with different student IDs

## Security Considerations

- The current implementation uses basic validation
- For production, implement proper Telegram Web App data validation
- Consider adding rate limiting to API endpoints
- Validate user permissions before allowing access

## Future Enhancements

- Add proper Telegram Web App data validation
- Implement user session management
- Add analytics for Mini App usage
- Support for multiple languages in the Mini App
- Add error recovery mechanisms

## Support

If you encounter issues:

1. Check the test script output
2. Review the console logs
3. Verify all environment variables are set
4. Ensure the database connection is working
