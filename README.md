🗳️ India General Election 2024 — Interactive Explorer
A React-based interactive web application that visualizes the complete results of the 2024 Indian General Election across 541 constituencies and 8,900+ candidates — making raw election data explorable, searchable, and visually engaging.
🔗 Live Demo  |  📊 Data Source: Election Commission of India

📸 Preview

(Add a screenshot of your app here — drag and drop an image into this section on GitHub)


✨ Features

🔍 Constituency Search — Search by constituency name, candidate name, or party across all 36 states
📉 Close Race Filter — Find constituencies decided by razor-thin margins (customizable threshold: 5K / 10K / 25K / 50K votes)
📊 Party Analysis — Top 20 parties ranked by seats won with vote totals and visual bars
🧾 Candidate Drill-Down — Click any constituency to see the full candidate list with vote share bars and margin breakdown
📱 Responsive Design — Works on desktop and mobile


🛠️ Tech Stack
LayerTechnologyFrontendReact 18, JSXBuild ToolViteData ParsingPapaParse (CSV → JSON)IconsLucide ReactStylingCustom CSS (no UI framework)HostingNetlify

📁 Project Structure
india-election-2024-explorer/
├── public/
│   └── election-data.json     # Preprocessed election data (8,900+ rows)
├── src/
│   ├── ElectionExplorer.jsx   # Main React component
│   └── style.css              # Global styles
├── index.html                 # App entry point
├── package.json
└── README.md

🚀 Run Locally
Prerequisites: Node.js installed
bash# Clone the repo
git clone https://github.com/skailashh/india-election-2024-explorer.git
cd india-election-2024-explorer

# Install dependencies
npm install

# Start development server
npm run dev
Then open http://localhost:5173 in your browser.

📊 Dataset

Source: 2024 Indian General Election official results
Coverage: 541 constituencies across 36 states and union territories
Records: 8,902 candidate entries
Fields: State, Constituency, Candidate, Party, EVM Votes, Postal Votes, Total Votes, % of Votes, Result


💡 How It Was Built
This project was built using AI-assisted development with Claude (Anthropic), combining:

Product thinking to define the feature scope and user experience
Python scripting to clean and transform raw CSV data into JSON
React component architecture for interactive UI
Deployment pipeline via Netlify for production hosting
