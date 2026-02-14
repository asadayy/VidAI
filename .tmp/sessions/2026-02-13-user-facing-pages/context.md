# Task Context: User-Facing Pages (Phase 7)

Session ID: 2026-02-13-user-facing-pages
Created: 2026-02-13T10:00:00Z
Status: in_progress

## Current Request
Build the user-facing (couples) portal for VidAI, including:
- Landing Page (Home) with User Auth (Login/Signup)
- Vendor Discovery (Search + Details)
- Wedding Planning Tools (Budget Planner + AI Chat)
- User Dashboard & Bookings Management

## Context Files (Standards to Follow)
- No explicit context files found. Follow patterns in `src/pages/VendorLanding.jsx` and `src/components/vendor/VendorLayout.jsx`.
- Use `src/api/client.js` for API calls.
- Use `src/context/AuthContext.jsx` for authentication.
- CSS: Use separate `.css` files for each component/page.
- Mobile-first responsive design.

## Reference Files (Source Material to Look At)
- `src/pages/VendorLanding.jsx` (Landing page structure)
- `src/components/vendor/VendorLayout.jsx` (Layout structure)
- `src/api/vendors.js` (Vendor API)
- `src/api/budget.js` (Budget API)
- `src/App.jsx` (Routing)

## External Docs Fetched
- None needed (Internal APIs are known).

## Components
1. **UserLayout**: Navigation bar for logged-in users.
2. **Home**: Public landing page with 'user' role login/signup.
3. **VendorSearch**: `/vendors` list with filters.
4. **VendorDetails**: `/vendors/:slug` profile + booking.
5. **BudgetPlanner**: `/budget` with AI integration.
6. **AIChat**: `/chat` interface.
7. **UserDashboard**: `/dashboard` overview.
8. **UserBookings**: `/bookings` list.

## Constraints
- Use React functional components.
- Use `react-router-dom` hooks (`useNavigate`, `useParams`).
- Use `react-hot-toast` for notifications.
- Ensure role-based access (only 'user' role can access /budget, /chat, etc.).
- Maintain consistent styling with existing vendor portal (pink-orange gradient theme).

## Exit Criteria
- [ ] User can sign up/login as a couple ('user' role).
- [ ] User can search and filter vendors.
- [ ] User can view vendor details and book packages.
- [ ] User can use the AI Budget Planner.
- [ ] User can chat with the AI assistant.
- [ ] User can manage bookings.
