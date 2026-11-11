<div align="center">

# AMSOULNESS
### Portfolio & Creative Tools Hub

**A personal space for code, creativity, and thoughtful digital experiences.**

[![Portfolio](https://img.shields.io/badge/Portfolio-aslns.online-111827?style=for-the-badge&logo=vercel&logoColor=white)](https://aslns.online)
[![Tools Hub](https://img.shields.io/badge/Explore-Tools_Hub-7C3AED?style=for-the-badge&logo=react&logoColor=white)](https://aslns.online/tools)
[![GitHub](https://img.shields.io/badge/Source-GitHub-24292f?style=for-the-badge&logo=github&logoColor=white)](https://github.com/amsoulness/portfolio)

**[View Portfolio](https://aslns.online) · [Launch Tools](https://aslns.online/tools) · [Explore Source](https://github.com/amsoulness/portfolio)**

</div>

---

## ✦ Overview

**AMSOULNESS / ASLNS** is a personal portfolio and interactive tools collection built to bring together development, visual design, and useful browser-based experiences.

The project has two connected experiences:

- **Portfolio** — a visually designed home for personal introduction, skills, experience, and creative work.
- **Tools Hub** — a collection of eight practical utilities, presented in a cohesive, responsive interface.

Built with **React, TypeScript, and Vite**, with animation powered by **Motion** and iconography from **Lucide**.

## ✦ Live Experiences

| Experience | Description | Link |
| :--- | :--- | :--- |
| **Portfolio** | Personal profile, skills, experience, and creative presentation | **[aslns.online](https://aslns.online)** |
| **Tools Hub** | A collection of useful, interactive web utilities | **[aslns.online/tools](https://aslns.online/tools)** |

## ✦ Tools Collection

| Tool | What it does |
| :--- | :--- |
| **Image Compressor** | Reduce image file size |
| **Image Converter** | Convert images between supported formats |
| **QR Code Studio** | Generate QR codes |
| **JSON Formatter** | Format and inspect JSON |
| **Color Lab** | Explore and work with colors |
| **Text Utilities** | Perform useful text operations |
| **Password Generator** | Generate passwords |
| **Developer Encoder** | Encode and decode developer-oriented text formats |

> Tool behavior and supported formats may vary by browser. Try the live [Tools Hub](https://aslns.online/tools) for the current experience.

## ✦ Design Philosophy

- **Expressive by design** — a distinct visual identity across the portfolio and tools.
- **Motion with purpose** — transitions and interactions that support the experience.
- **One connected ecosystem** — a consistent visual language from portfolio to utilities.
- **Responsive layouts** — designed for different screen sizes.
- **Useful, not just beautiful** — interactive tools alongside the visual storytelling.

## ✦ Tech Stack

<div align="center">

![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-Custom_Styling-1572B6?style=flat-square&logo=css&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployment-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

| Layer | Technology |
| :--- | :--- |
| UI | React 19 |
| Language | TypeScript |
| Build & development | Vite 8 |
| Styling | CSS |
| Animation | Motion |
| Icons | Lucide React |
| QR generation | `qrcode` |
| Quality checks | ESLint, TypeScript |
| Hosting | Vercel |

## ✦ Project Structure

```text
portfolio/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── App.tsx             # Portfolio experience
│   ├── App.css             # Portfolio styles
│   ├── ToolsHub.tsx        # Tools collection
│   ├── ToolsHub.css        # Tools Hub styles
│   ├── index.css           # Global styles
│   └── main.tsx            # Application entry point
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── vercel.json
└── README.md
```

## ✦ Run Locally

**Requirements:** A recent Node.js version compatible with the project's Vite and TypeScript dependencies, plus npm.

```bash
# Clone the repository
git clone https://github.com/amsoulness/portfolio.git

# Enter the project
cd portfolio

# Install exact locked dependencies
npm ci

# Start the development server
npm run dev
```

Open the local URL shown by Vite (typically `http://localhost:5173`).

### Available Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the local development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## ✦ Deployment

The production website is hosted on **Vercel**.

For a Vercel deployment of this repository:

1. Import the GitHub repository into Vercel.
2. Use the **Vite** framework preset.
3. Set the build command to `npm run build` and output directory to `dist`.
4. Deploy and configure your preferred domain.

The included `vercel.json` supports client-side routes such as `/tools`.

## ✦ About the Creator

This project is part of the **AMSOULNESS / ASLNS** creative development journey: exploring software, experimenting with interfaces, and building practical experiences for the web.

See the live [portfolio](https://aslns.online) for more about the creator, skills, and work.

## ✦ Contributing & Feedback

Suggestions, bug reports, and thoughtful improvements are welcome through [GitHub Issues](https://github.com/amsoulness/portfolio/issues).

## ✦ License

No open-source license is declared in this repository. Unless a license is added, the source code remains subject to applicable copyright law. Please request permission before reusing or redistributing it.

---

<div align="center">

### Built with curiosity. Designed with intention.

**AMSOULNESS / ASLNS**

[Portfolio](https://aslns.online) · [Tools Hub](https://aslns.online/tools) · [GitHub](https://github.com/amsoulness/portfolio)

</div>
