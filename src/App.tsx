import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TopBar, Masthead } from './components/Masthead';
import { Ticker } from './components/Ticker';
import { SiteNav } from './components/SiteNav';
import { Footer } from './components/Footer';
import { RequireAuth, RequireStaff } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { CategoryPage } from './pages/CategoryPage';
import { ArticlePage } from './pages/ArticlePage';
import { MatchCenter } from './pages/MatchCenter';
import { SearchPage } from './pages/SearchPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { MemberSpace } from './pages/MemberSpace';
import { Admin } from './pages/Admin';
import { About, Contact, Confidentialite, MentionsLegales, NotFound, Team } from './pages/Legal';

function Layout() {
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <TopBar />
      <Masthead />
      <Ticker />
      <SiteNav />
      <main id="contenu">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rubrique/:slug" element={<CategoryPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/matchs" element={<MatchCenter />} />
          <Route path="/recherche" element={<SearchPage />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Signup />} />
          <Route
            path="/membre"
            element={
              <RequireAuth>
                <MemberSpace />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireStaff>
                <Admin />
              </RequireStaff>
            }
          />
          <Route path="/a-propos" element={<About />} />
          <Route path="/equipe" element={<Team />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
