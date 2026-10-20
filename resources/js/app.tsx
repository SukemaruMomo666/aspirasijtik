import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { colors, fonts } from './utils/designTokens';
import './app.css';

// Pages
import Home from './pages/Home';
import FormAsperasi from './pages/FormAsperasi';
import StatusCheck from './pages/StatusCheck';
import PublicAsperasi from './pages/PublicAsperasi';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Global styles
const globalStyles = `
  :root {
    --ink: ${colors.ink};
    --ink2: ${colors.ink2};
    --ink3: ${colors.ink3};
    --seal: ${colors.seal};
    --seal-deep: ${colors.sealDeep};
    --seal-soft: ${colors.sealSoft};
    --paper: ${colors.paper};
    --card: ${colors.card};
    --rule: ${colors.rule};
    --rule2: ${colors.rule2};
    --brass: ${colors.brass};
    --s1: ${colors.status.diterima};
    --s2: ${colors.status.diproses};
    --s3: ${colors.status.selesai};
    --s4: ${colors.status.ditolak};
    --mono: ${fonts.mono};
    --sans: ${fonts.sans};
    --disp: ${fonts.display};
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${fonts.sans};
    color: ${colors.ink};
    background: ${colors.paper};
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 2.5px solid ${colors.focus};
    outline-offset: 2px;
    border-radius: 3px;
  }

  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
    border: 0;
    background: none;
  }

  input, select, textarea {
    font: inherit;
    color: inherit;
  }

  a {
    color: ${colors.seal};
  }
`;

function App() {
  return (
    <>
      <style>{globalStyles}</style>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/form" element={<FormAsperasi />} />
          <Route path="/status" element={<StatusCheck />} />
          <Route path="/publik" element={<PublicAsperasi />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard initialSection="users" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

const root = document.getElementById('app');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}

