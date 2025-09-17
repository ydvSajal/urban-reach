
# Urban Reach

Urban Reach is a modern web application designed to streamline urban management, reporting, and worker assignments. Built with React, Vite, Tailwind CSS, and Supabase, it provides tools for citizens and workers to interact, report issues, and manage city operations efficiently.

## Features
- **Citizen Dashboard:** Submit and track reports, view status updates, and interact with city services.
- **Worker Dashboard:** Manage assignments, update statuses, and view reports on a map.
- **Bulk Operations:** Export data, perform bulk actions, and manage notifications.
- **Geocoding & Mapping:** Integrated geocoding and interactive maps for location-based reporting.
- **Authentication:** Secure login, password reset, and email notifications via Supabase.
- **Notifications:** Real-time updates and browser notifications for important events.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Functions)
- **Mapping:** Leaflet
- **Testing:** Jest, React Testing Library

## Getting Started
1. **Install dependencies:**
	```sh
	npm install
	```
2. **Start development server:**
	```sh
	npm run dev
	```
3. **Open in browser:**
	Visit [https://urban-reach-1.vercel.app/](https://urban-reach-1.vercel.app/)

## Project Structure
```
urban-reach/
  src/
	 components/      # UI components
	 hooks/           # Custom React hooks
	 integrations/    # Supabase and other integrations
	 lib/             # Utility libraries
	 pages/           # Application pages
  public/            # Static assets
  supabase/          # Supabase config and migrations
  docs/              # Documentation
```

## Supabase Setup
- Configure Supabase credentials in `supabase/config.toml`.
- Run SQL migrations in `supabase/migrations/` for database setup.
- See `docs/supabase-email-template-config.md` for email setup.

## Contribution
Pull requests and issues are welcome! Please follow the code style and add tests for new features.

## License
MIT
