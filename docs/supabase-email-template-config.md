# Supabase Email Template Configuration

## Email Template Setup

To configure the custom email template in Supabase Dashboard:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select "Magic Link" template
3. Replace the default template with the following HTML:

### Email Template HTML

```html
<h2>Your Login Code</h2>
<p>Hi there!</p>
<p>Here's your 6-digit verification code to login to Municipal Portal:</p>
<h1 style="font-size: 32px; font-weight: bold; text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px; letter-spacing: 8px;">{{ .Token }}</h1>
<p>This code will expire in 60 minutes.</p>
<p>If you didn't request this code, you can safely ignore this email.</p>
<hr>
<p style="font-size: 12px; color: #666;">
  This email was sent from the Municipal Complaint Management System.
  <br>
  If you have any questions, please contact your local municipal office.
</p>
```

### Subject Line
```
Your Municipal Portal Verification Code
```

### Configuration Steps

1. **Authentication Settings:**
   - Enable "Enable email confirmations"
   - Set "Email confirmation redirect URL" to: `${window.location.origin}/`
   - Set "Email confirmation token validity" to: 3600 seconds (1 hour)

2. **SMTP Configuration:**
   - Configure custom SMTP settings for reliable delivery
   - Use municipal domain email for sender address
   - Test email delivery with various email providers

3. **Rate Limiting:**
   - Set appropriate rate limits for OTP requests
   - Configure cooldown periods to prevent abuse

## Environment Variables

Add these to your environment configuration:

```env
VITE_SUPABASE_URL=https://zaymnihhizooxnjozibm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Testing Checklist

- [ ] Email template renders correctly with OTP token
- [ ] Subject line is appropriate for municipal context
- [ ] Email delivery works across major email providers (Gmail, Outlook, Yahoo)
- [ ] OTP expiration time is properly configured
- [ ] Rate limiting prevents abuse
- [ ] Email styling is consistent with municipal branding