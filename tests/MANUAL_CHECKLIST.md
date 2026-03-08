# Post-Deployment Smoke Test Checklist

## Every Deployment (2 minutes)
- [ ] Homepage loads on mobile (check on your phone)
- [ ] Google OAuth login works
- [ ] Dashboard loads after login
- [ ] Can start a new prep kit
- [ ] Generation completes without error
- [ ] Can view generated answers on prep session page
- [ ] Can log out

## Weekly (10 minutes)
- [ ] Full onboarding flow on mobile Safari
- [ ] Full onboarding flow on mobile Chrome
- [ ] Try creating a prep kit for a different company
- [ ] Try editing an answer inline
- [ ] Try regenerating an answer
- [ ] Try copying an answer
- [ ] Check that credit count is correct
- [ ] Check dark mode renders properly

## After Security Changes
- [ ] Try accessing /dashboard without login (should redirect)
- [ ] Try accessing someone else's prep URL (should fail)
- [ ] Check SecurityHeaders.com score (target A+)
- [ ] Run npm audit (zero high/critical)
- [ ] Check browser console for CSP violations

## After SEO Changes
- [ ] Check Google Search Console for crawl errors
- [ ] Verify sitemap.xml loads with all URLs
- [ ] Check OG tags with https://www.opengraph.xyz/
- [ ] Test structured data with Google Rich Results Test
- [ ] Check mobile rendering with Chrome DevTools
