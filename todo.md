
## User Login & Team Accounts

- [ ] Add login page with Manus OAuth sign-in button
- [ ] Gate all app routes behind authentication (redirect to login if not signed in)
- [ ] Show logged-in user name and avatar in sidebar footer
- [ ] Add logout button in sidebar
- [ ] Protect all tRPC procedures with protectedProcedure
- [ ] Add Team Members page (admin only) to view all users and change roles
- [ ] Show role badge (Admin / Staff) in sidebar for current user

## Access Code Lock Screen

- [ ] Add ACCESS_CODE secret (server-side env variable)
- [ ] Add tRPC procedure to verify the access code server-side
- [ ] Build lock screen UI (logo, code input, submit button)
- [ ] Store verified session in localStorage so users don't re-enter on every visit
- [ ] Gate all app routes behind the lock screen
