# HITU CTF Arena - Deployment Guide

## Prerequisites
- Supabase project with database set up
- Node.js 18+ and npm
- Domain/hosting service

## 1. Database Setup

### Run Migrations
Execute these SQL files in Supabase SQL Editor in order:

1. **Create base tables and RLS policies** (already done)
2. **Run the admin setup script**:
   ```sql
   -- In Supabase SQL Editor, run setup-admin.sql content
   -- Replace 'your-admin-user-id' with actual user UUID
   ```

## 2. Environment Configuration

Create `.env` file in project root:
```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project_id.supabase.co
```

## 3. Build Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

## 4. Deploy Static Files

Upload the `dist/` folder contents to your hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting

## 5. Supabase Configuration

### Enable Authentication
1. Go to Authentication > Settings
2. Configure site URL and redirect URLs
3. Set up email templates if needed

### Storage Setup
1. Storage > Buckets
2. Create `challenge-files` bucket (already done)
3. Set public access for challenge files

### Edge Functions (Optional)
Deploy any edge functions if you add server-side logic.

## 6. Admin Setup

1. Register an admin user through the app
2. Get the user ID from Supabase Auth > Users
3. Run the admin setup SQL script
4. Verify admin access at `/admin`

## 7. CTF Configuration

1. Admin goes to `/ctf-settings`
2. Sets start/end times
3. Enables CTF when ready
4. Users register at `/ctf-registration`

## 8. Domain Configuration

Set up custom domain in:
- Supabase Dashboard > Settings > Custom Domains
- Hosting service DNS settings

## 9. SSL Certificate

Most hosting services provide automatic SSL. Verify HTTPS is working.

## 10. Monitoring & Maintenance

### Logs
- Supabase Dashboard > Logs
- Monitor authentication and database errors

### Backups
- Enable automated backups in Supabase
- Export important data regularly

### Performance
- Monitor response times
- Optimize large queries
- Consider CDN for static assets

## Security Checklist

- [x] RLS policies enabled on all tables
- [x] Admin roles properly assigned
- [x] CTF access controls in place
- [x] File uploads secured
- [x] Authentication required for sensitive operations
- [x] SQL injection protection (via Supabase)
- [x] XSS protection (via React + sanitization)

## Troubleshooting

### Common Issues

1. **Blank page after deployment**
   - Check environment variables
   - Verify Supabase keys are correct
   - Check browser console for errors

2. **Authentication not working**
   - Verify redirect URLs in Supabase
   - Check site URL configuration
   - Ensure HTTPS is enabled

3. **Database connection errors**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure tables exist

4. **File uploads failing**
   - Check storage bucket permissions
   - Verify storage policies

### Support
- Check Supabase documentation
- Review browser developer tools
- Check server logs in hosting platform

## Post-Deployment Tasks

1. **Test all user flows**
2. **Verify admin functionality**
3. **Test team creation/joining**
4. **Validate challenge submission**
5. **Check scoreboard updates**
6. **Test CTF timer functionality**

## Scaling Considerations

- **Database**: Supabase handles scaling automatically
- **Storage**: Use CDN for file serving
- **Compute**: Static hosting scales automatically
- **Monitoring**: Set up alerts for errors

---

**🎉 HITU CTF Arena is now ready for production deployment!**