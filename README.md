#  VPS Management Dashboard

A comprehensive, real-time Virtual Private Server (VPS) monitoring and management dashboard. Built with modern web technologies, this application provides an intuitive interface to track server resources, manage Docker containers, and monitor system services.

## ✨ Features

- **Real-time Resource Monitoring:** Visual charts and metrics for CPU, RAM, Disk Usage, and Network I/O.
- **Docker Container Management:** View running containers, execute actions (start, stop, restart), and inspect container logs directly from the dashboard.
- **Service Monitoring:** Track the status of various server services and view service timelines.
- **Data Export:** Generate and download detailed PDF reports of your server's performance and status.
- **Authentication & Security:** Secure access powered by Supabase Auth.
- **Modern UI/UX:** Fully responsive design with Dark/Light mode support, built using Tailwind CSS and shadcn/ui.

## 🛠️ Tech Stack

- **Framework:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Database:** [Supabase](https://supabase.com/) (Database, Auth, and Edge Functions)
- **Charts:** [Recharts](https://recharts.org/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Package Manager:** npm / bun

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (or Bun) installed on your local machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <YOUR_GIT_URL>
   cd amarvps

2. **Install dependencies:**
Using npm:
npm install

3.**Set up Environment Variables:**
Create a .env file in the root directory and add your Supabase configuration:

VITE_SUPABASE_URL=your_supabase_project_url

VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

4.**Start the development server:**
npm run dev
# or
bun run dev

5.**Open the app:**

Open your browser and navigate to the local URL provided by Vite (usually http://localhost:8080 or http://localhost:5173).

🗄️ **Project Structure**

/src/components/dashboard: Contains widgets for server metrics (CPU, RAM, Disk, Network) and container tables.


/src/components/ui: Reusable UI components from shadcn/ui.


/src/hooks: Custom React hooks for fetching VPS data, managing metrics history, and container actions.


/src/pages: Main application views (Dashboard, Settings, Auth, etc.).


/supabase/functions: Edge functions handling server monitoring, container actions, and keep-alive checks.


🧪 **Testing**
To run the test suite using Vitest:
npm run test

For watch mode:
npm run test:watch

📦 **Build for Production**
To create a production-ready build:
npm run build
This will output the optimized static files to the dist directory.
   

