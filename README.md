# Kudwa Financial Integration Platform

A full-stack financial data integration and reporting dashboard built with React, TypeScript, and Tailwind CSS.

## Features

- **Multi-source ETL**: Integrate financial data from various sources with a unified schema
- **Interactive Data Tables**: View, sort, and filter financial data with expandable rows for detailed breakdowns
- **Data Visualization**: Real-time analytics and interactive charts for financial performance insights
- **Company Management**: Manage multiple companies and their configurations

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI)
- **Routing**: React Router
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with class-variance-authority
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/kudwa-financial-web.git
   cd kudwa-financial-web
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:8080`

## Building for Production

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

- `components/` - React components
  - `ui/` - Shadcn UI components
  - `Dashboard.tsx` - Data visualization components
  - `DataTable.tsx` - Interactive data table
  - `ETLControls.tsx` - ETL process management
  - `CompanyManager.tsx` - Company configuration management
- `pages/` - Application pages
- `lib/` - Utility functions and contexts
- `hooks/` - Custom React hooks
- `public/` - Static assets

## License

[MIT](LICENSE)
